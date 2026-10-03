export type GithubRelease = {
  tag_name?: unknown;
  name?: unknown;
  html_url?: unknown;
  prerelease?: unknown;
  draft?: unknown;
  published_at?: unknown;
  assets?: unknown;
};

export type GithubUpdate = {
  version: string;
  title: string;
  releaseUrl: string;
  apkUrl: string;
  publishedAt?: string;
};

const REPOSITORY = process.env.EXPO_PUBLIC_GITHUB_REPOSITORY || "mkassis37/allergy-guard-android";
const API_URL = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
const APK_NAME = "allergy-guard-android.apk";
const OFFICIAL_HOSTS = new Set(["github.com", "objects.githubusercontent.com"]);

function normalizeVersion(value: string): number[] | null {
  const match = value
    .trim()
    .replace(/^v/i, "")
    .match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

export function compareVersions(left: string, right: string): number {
  const a = normalizeVersion(left);
  const b = normalizeVersion(right);
  if (!a || !b) return 0;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function isOfficialHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && OFFICIAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function parseLatestRelease(
  input: GithubRelease,
  currentVersion: string,
): GithubUpdate | null {
  if (input.draft === true || input.prerelease === true) return null;
  const tag = typeof input.tag_name === "string" ? input.tag_name : "";
  const releaseUrl = input.html_url;
  const version = tag.replace(/^v/i, "");
  if (
    !normalizeVersion(version) ||
    compareVersions(version, currentVersion) <= 0
  )
    return null;
  if (!isOfficialHttpsUrl(releaseUrl)) return null;
  if (!Array.isArray(input.assets)) return null;
  const apk = input.assets.find((asset) => {
    if (!asset || typeof asset !== "object") return false;
    const candidate = asset as {
      name?: unknown;
      browser_download_url?: unknown;
    };
    return (
      candidate.name === APK_NAME &&
      isOfficialHttpsUrl(candidate.browser_download_url)
    );
  }) as { browser_download_url: string } | undefined;
  if (!apk) return null;
  return {
    version,
    title:
      typeof input.name === "string" && input.name.trim()
        ? input.name
        : `حارس الحساسية ${version}`,
    releaseUrl,
    apkUrl: apk.browser_download_url,
    publishedAt:
      typeof input.published_at === "string" ? input.published_at : undefined,
  };
}

export async function findGithubUpdate(
  currentVersion: string,
): Promise<GithubUpdate | null> {
  const response = await fetch(API_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok)
    throw new Error(`GitHub update check failed: ${response.status}`);
  const release = (await response.json()) as GithubRelease;
  return parseLatestRelease(release, currentVersion);
}

export const githubUpdateInfo = {
  repository: REPOSITORY,
  apiUrl: API_URL,
  apkName: APK_NAME,
};
