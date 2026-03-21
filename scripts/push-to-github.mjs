/**
 * Creates a public repo on your GitHub account (if missing) and pushes the current branch.
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/push-to-github.mjs [repo-name]
 *
 * Token: https://github.com/settings/tokens — scope "repo" for private repos, "public_repo" for public only.
 */
import { exec } from 'dugite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const project = join(__dirname, '..');
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const repoName = process.argv[2] || 'b2b-scale-of-greatness';

async function git(args) {
  const r = await exec(args, project);
  if (r.exitCode !== 0) {
    throw new Error(`git ${args.join(' ')} failed (${r.exitCode}):\n${r.stderr || r.stdout}`);
  }
  return r;
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...opts.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function main() {
  if (!token) {
    console.error('Missing GITHUB_TOKEN or GH_TOKEN.');
    process.exit(1);
  }

  const { res: userRes, body: user } = await api('https://api.github.com/user');
  if (!userRes.ok) {
    throw new Error(`GitHub user API failed: ${userRes.status} ${JSON.stringify(user)}`);
  }
  const login = user.login;
  console.log('GitHub user:', login);

  let { res: createRes, body: createBody } = await api('https://api.github.com/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: repoName,
      description: 'Image ranking freeform board (Vite + React)',
      private: false,
    }),
  });

  if (createRes.status === 422 && createBody?.errors?.some((e) => String(e.message).includes('already exists'))) {
    console.log('Repository already exists; pushing to existing remote.');
  } else if (!createRes.ok) {
    throw new Error(`Create repo failed: ${createRes.status} ${JSON.stringify(createBody)}`);
  } else {
    console.log('Created:', createBody.html_url);
  }

  const base = `https://github.com/${login}/${repoName}.git`;
  const authed = `https://x-access-token:${token}@github.com/${login}/${repoName}.git`;

  const rem = await exec(['remote'], project);
  if (rem.stdout.includes('origin')) {
    await git(['remote', 'set-url', 'origin', authed]);
  } else {
    await git(['remote', 'add', 'origin', authed]);
  }

  const branch = (await exec(['branch', '--show-current'], project)).stdout.trim() || 'main';
  await git(['push', '-u', 'origin', branch]);
  await git(['remote', 'set-url', 'origin', base]);

  console.log('Done. Remote:', base);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
