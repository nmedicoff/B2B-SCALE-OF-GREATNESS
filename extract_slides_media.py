#!/usr/bin/env python3
"""
Google Slides Media Extractor

Extracts all images and videos from a Google Slides presentation using
the Google Slides API and Google Drive API. Supports OAuth 2.0 authentication.
"""

import io
import json
import logging
import mimetypes
import os
import re
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# OAuth 2.0 scopes required for Slides and Drive access
SCOPES = [
    "https://www.googleapis.com/auth/presentations.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

# Output directories (can be overridden via environment variables)
IMAGES_DIR = os.getenv("EXTRACTED_IMAGES_DIR", "extracted_media/images")
VIDEOS_DIR = os.getenv("EXTRACTED_VIDEOS_DIR", "extracted_media/videos")
METADATA_DIR = os.getenv("EXTRACTED_METADATA_DIR", "extracted_media/metadata")

# Credentials file path
CREDENTIALS_PATH = os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")
TOKEN_PATH = os.getenv("GOOGLE_TOKEN_PATH", "token.json")

# OAuth redirect port - must match the URI registered in Google Cloud Console
# Add "http://localhost:8080/" to Authorized redirect URIs for your OAuth client
OAUTH_PORT = int(os.getenv("GOOGLE_OAUTH_PORT", "8080"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# Authentication
# -----------------------------------------------------------------------------


def authenticate() -> Credentials:
    """
    Authenticate with Google APIs using OAuth 2.0.

    Uses credentials.json for initial setup. On first run, opens a browser
    for user consent. Subsequent runs use token.json for automatic refresh.

    Returns:
        Valid Credentials object for API calls.

    Raises:
        FileNotFoundError: If credentials.json is not found.
    """
    creds = None

    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        logger.info("Loaded credentials from token.json")

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            logger.info("Refreshed expired credentials")
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"Credentials file not found: {CREDENTIALS_PATH}. "
                    "Download from Google Cloud Console."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=OAUTH_PORT)
            logger.info("Completed OAuth flow")

        with open(TOKEN_PATH, "w") as token:
            token.write(creds.to_json())

    return creds


# -----------------------------------------------------------------------------
# API Clients
# -----------------------------------------------------------------------------


def get_presentation(
    slides_service, presentation_id: str
) -> dict:
    """
    Retrieve the full presentation data from Google Slides API.

    Handles pagination by fetching all slides. The API returns slides in batches
    when using presentations.pages.get for individual slides, but
    presentations.get returns the full structure.

    Args:
        slides_service: Authenticated Google Slides API service instance.
        presentation_id: The ID of the Google Slides presentation (from the URL).

    Returns:
        The presentation resource dictionary containing slides and metadata.

    Raises:
        googleapiclient.errors.HttpError: On API errors.
    """
    logger.info(f"Fetching presentation: {presentation_id}")

    presentation = (
        slides_service.presentations()
        .get(presentationId=presentation_id)
        .execute()
    )

    slides = presentation.get("slides", [])
    logger.info(f"Retrieved {len(slides)} slide(s)")

    return presentation


# -----------------------------------------------------------------------------
# Image Extraction
# -----------------------------------------------------------------------------


def extract_images(presentation: dict) -> list[dict]:
    """
    Extract all embedded image elements from the presentation.

    Iterates through all slides and page elements, collecting image metadata
    including contentUrl, objectId, and dimensions. Handles both externally
    linked images and Drive-hosted images.

    Args:
        presentation: The presentation resource from get_presentation().

    Returns:
        List of dicts with keys: slide_index, object_id, content_url,
        width, height, title (optional).
    """
    images = []
    slides = presentation.get("slides", [])

    for slide_index, slide in enumerate(slides):
        page_elements = slide.get("pageElements", [])

        for element in page_elements:
            # Check for Image page element
            if "image" in element:
                image_data = element["image"]
                content_url = image_data.get("contentUrl")
                size = element.get("size", {})

                if content_url:
                    image_info = {
                        "slide_index": slide_index,
                        "object_id": element.get("objectId", ""),
                        "content_url": content_url,
                        "width": size.get("width", {}).get("magnitude", 0),
                        "height": size.get("height", {}).get("magnitude", 0),
                    }
                    images.append(image_info)
                    logger.debug(f"Found image on slide {slide_index}: {content_url[:50]}...")

    logger.info(f"Extracted {len(images)} image(s)")
    return images


def _get_file_id_from_url(url: str) -> Optional[str]:
    """
    Extract Google Drive file ID from various URL formats.

    Handles: /file/d/FILE_ID, /open?id=FILE_ID, drive.google.com/open?id=FILE_ID
    """
    try:
        parsed = urlparse(url)
        path = parsed.path
        query = parse_qs(parsed.query)

        # Format: /file/d/FILE_ID
        match = re.search(r"/file/d/([a-zA-Z0-9_-]+)", path)
        if match:
            return match.group(1)

        # Format: ?id=FILE_ID
        if "id" in query:
            return query["id"][0]

        # Format: id=FILE_ID in path (export links)
        match = re.search(r"id=([a-zA-Z0-9_-]+)", url)
        if match:
            return match.group(1)

    except Exception as e:
        logger.debug(f"Could not extract file ID from {url}: {e}")
    return None


def _get_extension_from_url(url: str, default: str = ".png") -> str:
    """Extract file extension from URL or content type."""
    parsed = urlparse(url)
    path = parsed.path
    if "." in path:
        ext = os.path.splitext(path)[1].lower()
        if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"):
            return ext
    return default


# -----------------------------------------------------------------------------
# Video Extraction
# -----------------------------------------------------------------------------


def extract_videos(presentation: dict) -> tuple[list[dict], list[dict]]:
    """
    Extract all embedded video elements from the presentation.

    Separates Drive-hosted videos (downloadable) from YouTube videos
    (metadata only, as downloading requires additional tools).

    Args:
        presentation: The presentation resource from get_presentation().

    Returns:
        Tuple of (drive_videos, youtube_videos). Each item contains:
        - drive: slide_index, object_id, video_id, url
        - youtube: slide_index, object_id, url, video_id (YouTube ID)
    """
    drive_videos = []
    youtube_videos = []
    slides = presentation.get("slides", [])

    for slide_index, slide in enumerate(slides):
        page_elements = slide.get("pageElements", [])

        for element in page_elements:
            if "video" not in element:
                continue

            video_data = element["video"]
            source = str(video_data.get("source", "") or "").upper()
            url = video_data.get("url", "") or ""
            video_id = video_data.get("id", "") or ""

            video_info = {
                "slide_index": slide_index,
                "object_id": element.get("objectId", ""),
                "url": url,
                "video_id": video_id,
            }

            if source == "DRIVE" or (video_id and not url):
                drive_videos.append(video_info)
                logger.debug(f"Found Drive video on slide {slide_index}: {video_id}")
            elif source == "YOUTUBE" or "youtube.com" in url or "youtu.be" in url:
                youtube_videos.append(video_info)
                logger.debug(f"Found YouTube video on slide {slide_index}: {url}")

    logger.info(f"Extracted {len(drive_videos)} Drive video(s), {len(youtube_videos)} YouTube video(s)")
    return drive_videos, youtube_videos


# -----------------------------------------------------------------------------
# Download Utilities
# -----------------------------------------------------------------------------


def download_file(
    drive_service,
    file_id: str,
    output_path: str,
    mime_type: Optional[str] = None,
) -> bool:
    """
    Download a file from Google Drive by file ID.

    Uses the Drive API files.get with alt=media to download file content.
    Creates parent directories as needed.

    Args:
        drive_service: Authenticated Google Drive API service instance.
        file_id: The Drive file ID.
        output_path: Local path to save the file.
        mime_type: Optional MIME type hint for export (e.g., for Google Docs).

    Returns:
        True if download succeeded, False otherwise.
    """
    try:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # For native binary files (images), use alt=media directly
        request = drive_service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()

        with open(output_path, "wb") as f:
            f.write(fh.getvalue())

        logger.info(f"Downloaded: {output_path}")
        return True

    except Exception as e:
        logger.error(f"Failed to download {file_id} to {output_path}: {e}")
        return False


def download_image(
    creds: Credentials,
    image_info: dict,
    index: int,
) -> bool:
    """
    Download a single image from its content URL.

    The contentUrl from Slides may point to Drive or a CDN. We attempt
    to extract the Drive file ID and use the Drive API for authenticated
    download. Fallback: direct fetch with credentials.

    Args:
        creds: OAuth credentials for authenticated requests.
        image_info: Dict from extract_images().
        index: Zero-based index for filename when no original name exists.

    Returns:
        True if download succeeded.
    """
    content_url = image_info.get("content_url", "")
    if not content_url:
        logger.warning(f"Image {index} has no content URL, skipping")
        return False

    file_id = _get_file_id_from_url(content_url)
    ext = _get_extension_from_url(content_url)

    # Generate filename: slide_N_image_M.ext
    slide_idx = image_info.get("slide_index", index)
    filename = f"slide_{slide_idx}_image_{index}{ext}"
    output_path = os.path.join(IMAGES_DIR, filename)

    if file_id:
        try:
            drive_service = build("drive", "v3", credentials=creds)
            return download_file(drive_service, file_id, output_path)
        except Exception as e:
            logger.warning(f"Drive download failed for image {index}, trying URL: {e}")

    # Fallback: fetch URL with credentials
    try:
        from google.auth.transport.requests import AuthorizedSession

        session = AuthorizedSession(creds)
        response = session.get(content_url, timeout=30)
        response.raise_for_status()

        ct = (response.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        ext_from_ct = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
            "image/bmp": ".bmp",
            "image/svg+xml": ".svg",
        }.get(ct)
        if ext_from_ct:
            base, _ = os.path.splitext(output_path)
            output_path = base + ext_from_ct

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(response.content)
        logger.info(f"Downloaded via URL: {output_path}")
        return True

    except Exception as e:
        logger.error(f"Failed to download image {index}: {e}")
        return False


# -----------------------------------------------------------------------------
# Main Orchestration
# -----------------------------------------------------------------------------


def save_youtube_metadata(youtube_videos: list[dict]) -> None:
    """Save YouTube video URLs to a metadata JSON file."""
    Path(METADATA_DIR).mkdir(parents=True, exist_ok=True)
    output_path = os.path.join(METADATA_DIR, "youtube_videos.json")

    with open(output_path, "w") as f:
        json.dump(youtube_videos, f, indent=2)

    logger.info(f"Saved {len(youtube_videos)} YouTube URL(s) to {output_path}")


def download_drive_videos(
    drive_service,
    drive_videos: list[dict],
) -> None:
    """Download all Drive-hosted videos to the videos directory."""
    for i, video_info in enumerate(drive_videos):
        video_id = video_info.get("video_id")
        if not video_id:
            video_id = _get_file_id_from_url(video_info.get("url", ""))
        if not video_id:
            logger.warning(f"Drive video {i} has no ID, skipping")
            continue

        slide_idx = video_info.get("slide_index", i)
        output_path = os.path.join(VIDEOS_DIR, f"slide_{slide_idx}_video_{i}.mp4")
        download_file(drive_service, video_id, output_path)


def main() -> None:
    """Main entry point for the script."""
    import sys

    if len(sys.argv) < 2:
        presentation_id = os.getenv("GOOGLE_SLIDES_PRESENTATION_ID")
        if not presentation_id:
            print("Usage: python extract_slides_media.py <PRESENTATION_ID>")
            print("   or: set GOOGLE_SLIDES_PRESENTATION_ID in environment")
            sys.exit(1)
    else:
        presentation_id = sys.argv[1]

    # Extract ID from full URL if user pasted the entire link
    if "docs.google.com" in presentation_id or "presentation/d/" in presentation_id:
        match = re.search(r"/d/([a-zA-Z0-9_-]+)", presentation_id)
        if match:
            presentation_id = match.group(1)

    logger.info("Starting Google Slides media extraction")

    try:
        creds = authenticate()
        slides_service = build("slides", "v1", credentials=creds)
        drive_service = build("drive", "v3", credentials=creds)

        presentation = get_presentation(slides_service, presentation_id)
        images = extract_images(presentation)
        drive_videos, youtube_videos = extract_videos(presentation)

        # Create output directories
        Path(IMAGES_DIR).mkdir(parents=True, exist_ok=True)
        Path(VIDEOS_DIR).mkdir(parents=True, exist_ok=True)

        # Download images
        for i, img in enumerate(images):
            download_image(creds, img, i)

        # Write which slide indices contain video (so API can mark those images as "moving")
        video_slide_indices = sorted(
            set(v["slide_index"] for v in drive_videos + youtube_videos)
        )
        if video_slide_indices:
            video_indices_path = os.path.join(IMAGES_DIR, "video_slide_indices.json")
            with open(video_indices_path, "w") as f:
                json.dump(video_slide_indices, f)
            logger.info(f"Wrote video slide indices: {video_slide_indices}")

        # Download Drive videos
        download_drive_videos(drive_service, drive_videos)

        # Save YouTube metadata
        if youtube_videos:
            save_youtube_metadata(youtube_videos)

        logger.info(
            f"Done. Images: {len(images)}, Drive videos: {len(drive_videos)}, "
            f"YouTube links: {len(youtube_videos)}"
        )

    except FileNotFoundError as e:
        logger.error(str(e))
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Extraction failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()


# -----------------------------------------------------------------------------
# Dependencies: pip install -r requirements.txt
# -----------------------------------------------------------------------------
