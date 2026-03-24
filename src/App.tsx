import { useEffect } from "react";
import { BoardCanvas } from "./components/BoardCanvas";
import { ImageUploader } from "./components/ImageUploader";
import pictureOne from "../input/Picture 1.jpg";
import pictureTwo from "../input/Picture 2.png";
import pictureThree from "../input/Picture 3.png";
import pictureFour from "../input/Picture 4.png";
import pictureFive from "../input/Picture 5.jpg";
import pictureSix from "../input/Picture 6.gif";
import {
  PICTURE_TWO_DEFAULT_TITLE,
  PICTURE_TWO_DESCRIPTION,
  PICTURE_TWO_LEGACY_TITLE,
  PICTURE_TWO_CAMPAIGN_FIELDS,
  PICTURE_THREE_DEFAULT_TITLE,
  PICTURE_THREE_DESCRIPTION,
  PICTURE_THREE_PLACEHOLDER_FIELDS,
  INVISIBLE_COLUMN_DEFAULT_TITLE,
  INVISIBLE_COLUMN_PLACEHOLDER_DESCRIPTION
} from "./constants/featuredCards";
import { useShallow } from "zustand/react/shallow";
import { useBoardStore } from "./store/useBoardStore";
import { calculateRankLayout } from "./utils/layout";

const SHELL_DESCRIPTION =
  "Brief: How do we tell the UK that we're investing in cleaner energy?\n\n" +
  "Approach: By telling the UK about some (but not all) of our energy mix";

const SHELL_CAMPAIGN_FIELDS = {
  brand: "Shell",
  campaign: "The UK is Ready for Cleaner Energy",
  date: "2023",
  category: "Energy"
} as const;

function shellCardNeedsSync(img: { description?: string; brand?: string; campaign?: string; date?: string; category?: string }) {
  return (
    (img.description ?? "") !== SHELL_DESCRIPTION ||
    img.brand !== SHELL_CAMPAIGN_FIELDS.brand ||
    img.campaign !== SHELL_CAMPAIGN_FIELDS.campaign ||
    img.date !== SHELL_CAMPAIGN_FIELDS.date ||
    img.category !== SHELL_CAMPAIGN_FIELDS.category
  );
}

function pictureTwoNeedsSync(img: { description?: string; brand?: string; campaign?: string; date?: string; category?: string }) {
  return (
    (img.description ?? "") !== PICTURE_TWO_DESCRIPTION ||
    img.brand !== PICTURE_TWO_CAMPAIGN_FIELDS.brand ||
    img.campaign !== PICTURE_TWO_CAMPAIGN_FIELDS.campaign ||
    img.date !== PICTURE_TWO_CAMPAIGN_FIELDS.date ||
    img.category !== PICTURE_TWO_CAMPAIGN_FIELDS.category
  );
}

function pictureThreeNeedsSync(img: { description?: string; brand?: string; campaign?: string; date?: string; category?: string }) {
  return (
    (img.description ?? "") !== PICTURE_THREE_DESCRIPTION ||
    img.brand !== PICTURE_THREE_PLACEHOLDER_FIELDS.brand ||
    img.campaign !== PICTURE_THREE_PLACEHOLDER_FIELDS.campaign ||
    (img.date ?? "") !== PICTURE_THREE_PLACEHOLDER_FIELDS.date ||
    (img.category ?? "") !== PICTURE_THREE_PLACEHOLDER_FIELDS.category
  );
}

const INVISIBLE_SEED_SRCS = [pictureFour, pictureFive, pictureSix] as const;

function isInvisibleSeedSrc(src: string): boolean {
  return (INVISIBLE_SEED_SRCS as readonly string[]).includes(src);
}

export default function App() {
  const { images, addImages, load } =
    useBoardStore(
      useShallow((s) => ({
        images: s.images,
        addImages: s.addImages,
        load: s.load
      }))
    );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const pictureOneMatches = images.filter(
      (img) =>
        img.title === "Picture 1" ||
        img.title === "Brand: Shell" ||
        img.src === pictureOne
    );

    if (pictureOneMatches.length === 1 && pictureOneMatches[0].title !== "Brand: Shell") {
      const targetId = pictureOneMatches[0].id;
      useBoardStore.setState((state) => ({
        images: state.images.map((img) =>
          img.id === targetId
            ? {
                ...img,
                title: "Brand: Shell",
                ...SHELL_CAMPAIGN_FIELDS,
                description: SHELL_DESCRIPTION,
                rank: 1
              }
            : img
        )
      }));
      useBoardStore.getState().save();
      return;
    }

    if (pictureOneMatches.length === 1 && shellCardNeedsSync(pictureOneMatches[0])) {
      const targetId = pictureOneMatches[0].id;
      useBoardStore.setState((state) => ({
        images: state.images.map((img) =>
          img.id === targetId
            ? { ...img, ...SHELL_CAMPAIGN_FIELDS, description: SHELL_DESCRIPTION, rank: 1 }
            : img
        )
      }));
      useBoardStore.getState().save();
      return;
    }

    if (pictureOneMatches.length > 1) {
      const keepId = pictureOneMatches[0].id;
      useBoardStore.setState((state) => {
        const next = state.images.filter(
          (img) =>
            !(
              (img.title === "Picture 1" ||
                img.title === "Picture 1 (Damaging)" ||
                img.src === pictureOne) &&
              img.id !== keepId
            )
        );
        const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
        return {
          images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
        };
      });
      useBoardStore.getState().save();
      return;
    }

    if (pictureOneMatches.length === 1) return;

    useBoardStore.setState((state) => {
      const next = [
        ...state.images,
        {
          id: crypto.randomUUID(),
          src: pictureOne,
          title: "Brand: Shell",
          ...SHELL_CAMPAIGN_FIELDS,
          description: SHELL_DESCRIPTION,
          rank: 1,
          position: { x: 0, y: 0 },
          createdAt: Date.now()
        }
      ];
      const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
      return {
        images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
      };
    });
    useBoardStore.getState().save();
  }, [images]);

  useEffect(() => {
    const pictureOnePresent = images.some(
      (img) =>
        img.title === "Picture 1" ||
        img.title === "Brand: Shell" ||
        img.src === pictureOne
    );
    if (!pictureOnePresent) return;

    const pictureTwoMatches = images.filter((img) => {
      if (img.src === pictureThree || isInvisibleSeedSrc(img.src)) return false;
      return (
        img.src === pictureTwo ||
        img.title === "Picture 2" ||
        img.title === PICTURE_TWO_DEFAULT_TITLE ||
        img.title === PICTURE_TWO_LEGACY_TITLE
      );
    });

    if (
      pictureTwoMatches.length === 1 &&
      (pictureTwoMatches[0].title === "Picture 2" ||
        pictureTwoMatches[0].title === PICTURE_TWO_LEGACY_TITLE)
    ) {
      const targetId = pictureTwoMatches[0].id;
      useBoardStore.setState((state) => {
        const next = state.images.map((img) =>
          img.id === targetId
            ? {
                ...img,
                title: PICTURE_TWO_DEFAULT_TITLE,
                ...PICTURE_TWO_CAMPAIGN_FIELDS,
                description: PICTURE_TWO_DESCRIPTION,
                rank: 1
              }
            : img
        );
        const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
        return {
          images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
        };
      });
      useBoardStore.getState().save();
      return;
    }

    if (pictureTwoMatches.length === 1 && pictureTwoNeedsSync(pictureTwoMatches[0])) {
      const targetId = pictureTwoMatches[0].id;
      useBoardStore.setState((state) => {
        const next = state.images.map((img) =>
          img.id === targetId
            ? { ...img, ...PICTURE_TWO_CAMPAIGN_FIELDS, description: PICTURE_TWO_DESCRIPTION, rank: 1 }
            : img
        );
        const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
        return {
          images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
        };
      });
      useBoardStore.getState().save();
      return;
    }

    if (pictureTwoMatches.length > 1) {
      const keepId = pictureTwoMatches[0].id;
      useBoardStore.setState((state) => {
        const next = state.images.filter(
          (img) =>
            !(
              (img.title === "Picture 2" ||
                img.title === PICTURE_TWO_DEFAULT_TITLE ||
                img.title === PICTURE_TWO_LEGACY_TITLE ||
                img.src === pictureTwo) &&
              img.id !== keepId
            )
        );
        const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
        return {
          images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
        };
      });
      useBoardStore.getState().save();
      return;
    }

    if (pictureTwoMatches.length === 1) return;

    const shellCard = images.find(
      (img) =>
        img.title === "Brand: Shell" ||
        img.title === "Picture 1" ||
        img.src === pictureOne
    );
    const createdAfterShell = (shellCard?.createdAt ?? Date.now()) + 1;

    useBoardStore.setState((state) => {
      const next = [
        ...state.images,
        {
          id: crypto.randomUUID(),
          src: pictureTwo,
          title: PICTURE_TWO_DEFAULT_TITLE,
          ...PICTURE_TWO_CAMPAIGN_FIELDS,
          description: PICTURE_TWO_DESCRIPTION,
          rank: 1,
          position: { x: 0, y: 0 },
          createdAt: createdAfterShell
        }
      ];
      const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
      return {
        images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
      };
    });
    useBoardStore.getState().save();
  }, [images]);

  useEffect(() => {
    const pictureTwoPresent = images.some(
      (img) =>
        img.src === pictureTwo ||
        img.title === PICTURE_TWO_DEFAULT_TITLE ||
        img.title === "Picture 2"
    );
    if (!pictureTwoPresent) return;

    const pictureThreeMatches = images.filter((img) => {
      if (img.src === pictureTwo || isInvisibleSeedSrc(img.src)) return false;
      return img.src === pictureThree || img.title === "Picture 3";
    });

    if (pictureThreeMatches.length === 1 && pictureThreeMatches[0].title === "Picture 3") {
      const targetId = pictureThreeMatches[0].id;
      useBoardStore.setState((state) => {
        const next = state.images.map((img) =>
          img.id === targetId
            ? {
                ...img,
                title: PICTURE_THREE_DEFAULT_TITLE,
                ...PICTURE_THREE_PLACEHOLDER_FIELDS,
                description: PICTURE_THREE_DESCRIPTION,
                rank: 1
              }
            : img
        );
        const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
        return {
          images: next.map((_img) => ({ ..._img, position: layout[_img.id] ?? _img.position }))
        };
      });
      useBoardStore.getState().save();
      return;
    }

    if (pictureThreeMatches.length === 1 && pictureThreeNeedsSync(pictureThreeMatches[0])) {
      const targetId = pictureThreeMatches[0].id;
      useBoardStore.setState((state) => {
        const next = state.images.map((img) =>
          img.id === targetId
            ? { ...img, ...PICTURE_THREE_PLACEHOLDER_FIELDS, description: PICTURE_THREE_DESCRIPTION, rank: 1 }
            : img
        );
        const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
        return {
          images: next.map((_img) => ({ ..._img, position: layout[_img.id] ?? _img.position }))
        };
      });
      useBoardStore.getState().save();
      return;
    }

    if (pictureThreeMatches.length > 1) {
      const keepId = pictureThreeMatches[0].id;
      useBoardStore.setState((state) => {
        const next = state.images.filter(
          (img) =>
            !(
              (img.title === "Picture 3" ||
                img.title === PICTURE_THREE_DEFAULT_TITLE ||
                img.src === pictureThree) &&
              img.id !== keepId
            )
        );
        const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
        return {
          images: next.map((_img) => ({ ..._img, position: layout[_img.id] ?? _img.position }))
        };
      });
      useBoardStore.getState().save();
      return;
    }

    if (pictureThreeMatches.length === 1) return;

    const p2Card = images.find(
      (img) =>
        img.src === pictureTwo ||
        img.title === PICTURE_TWO_DEFAULT_TITLE ||
        img.title === "Picture 2"
    );
    const createdAfterP2 = (p2Card?.createdAt ?? Date.now()) + 1;

    useBoardStore.setState((state) => {
      const next = [
        ...state.images,
        {
          id: crypto.randomUUID(),
          src: pictureThree,
          title: PICTURE_THREE_DEFAULT_TITLE,
          ...PICTURE_THREE_PLACEHOLDER_FIELDS,
          description: PICTURE_THREE_DESCRIPTION,
          rank: 1,
          position: { x: 0, y: 0 },
          createdAt: createdAfterP2
        }
      ];
      const layout = calculateRankLayout(next, state.rankMin, state.rankMax);
      return {
        images: next.map((_img) => ({ ..._img, position: layout[_img.id] ?? _img.position }))
      };
    });
    useBoardStore.getState().save();
  }, [images]);

  useEffect(() => {
    const rank = 2;
    const title = INVISIBLE_COLUMN_DEFAULT_TITLE;
    const desc = INVISIBLE_COLUMN_PLACEHOLDER_DESCRIPTION;
    const seeds = [
      { src: pictureFour, fileLabel: "Picture 4" as const, prevSrc: null as string | null },
      { src: pictureFive, fileLabel: "Picture 5" as const, prevSrc: pictureFour },
      { src: pictureSix, fileLabel: "Picture 6" as const, prevSrc: pictureFive }
    ];

    let next = [...images];
    let dirty = false;

    for (const seed of seeds) {
      if (seed.prevSrc) {
        const peer = next.some((img) => img.src === seed.prevSrc);
        if (!peer) continue;
      }

      const matches = next.filter(
        (img) => img.src === seed.src || img.title === seed.fileLabel
      );

      if (matches.length > 1) {
        const keepId = matches[0].id;
        next = next.filter(
          (img) =>
            !((img.src === seed.src || img.title === seed.fileLabel) && img.id !== keepId)
        );
        dirty = true;
        continue;
      }

      if (matches.length === 1) {
        const m = matches[0];
        if (m.title === seed.fileLabel) {
          next = next.map((img) =>
            img.id === m.id
              ? { ...img, title, ...PICTURE_THREE_PLACEHOLDER_FIELDS, description: desc, rank }
              : img
          );
          dirty = true;
          continue;
        }
        const needsRank = m.rank !== rank;
        if (pictureThreeNeedsSync(m) || needsRank) {
          next = next.map((img) =>
            img.id === m.id
              ? { ...img, ...PICTURE_THREE_PLACEHOLDER_FIELDS, description: desc, rank }
              : img
          );
          dirty = true;
        }
        continue;
      }

      const createdAt = seed.prevSrc
        ? (next.find((img) => img.src === seed.prevSrc)!.createdAt + 1)
        : Date.now();

      next = [
        ...next,
        {
          id: crypto.randomUUID(),
          src: seed.src,
          title,
          ...PICTURE_THREE_PLACEHOLDER_FIELDS,
          description: desc,
          rank,
          position: { x: 0, y: 0 },
          createdAt
        }
      ];
      dirty = true;
    }

    if (!dirty) return;

    const { rankMin, rankMax } = useBoardStore.getState();
    const layout = calculateRankLayout(next, rankMin, rankMax);
    useBoardStore.setState({
      images: next.map((img) => ({ ...img, position: layout[img.id] ?? img.position }))
    });
    useBoardStore.getState().save();
  }, [images]);

  useEffect(() => {
    const persist = () => {
      useBoardStore.getState().save();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("beforeunload", persist);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", persist);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <main className="min-h-screen bg-black p-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Creative Excellence in B2B</h1>
              <p className="text-sm text-slate-500">
                (according to the 7 point scale)
              </p>
            </div>
          </div>
          <ImageUploader onFiles={addImages} />
        </header>

        <BoardCanvas />
      </div>
    </main>
  );
}
