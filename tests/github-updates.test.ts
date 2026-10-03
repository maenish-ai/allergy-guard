import { describe, expect, it } from "vitest";
import { compareVersions, parseLatestRelease } from "../lib/github-updates";

const release = (overrides: Record<string, unknown> = {}) => ({
  tag_name: "v0.2.5",
  name: "حارس الحساسية v0.2.5",
  html_url:
    "https://github.com/mkassis37/allergy-guard-android/releases/tag/v0.2.5",
  prerelease: false,
  draft: false,
  assets: [
    {
      name: "allergy-guard-android.apk",
      browser_download_url:
        "https://github.com/mkassis37/allergy-guard-android/releases/download/v0.2.5/allergy-guard-android.apk",
    },
  ],
  ...overrides,
});

describe("GitHub updates", () => {
  it("compares semantic versions with an optional v prefix", () => {
    expect(compareVersions("v0.2.5", "0.2.4")).toBe(1);
    expect(compareVersions("0.2.5", "0.2.5")).toBe(0);
    expect(compareVersions("0.2.4", "0.2.5")).toBe(-1);
  });

  it("accepts only a newer stable release with an official APK URL", () => {
    expect(parseLatestRelease(release(), "0.2.4")?.apkUrl).toContain(
      "github.com",
    );
    expect(parseLatestRelease(release(), "0.2.5")).toBeNull();
    expect(
      parseLatestRelease(release({ prerelease: true }), "0.2.4"),
    ).toBeNull();
    expect(
      parseLatestRelease(
        release({
          assets: [
            {
              name: "allergy-guard-android.apk",
              browser_download_url: "http://evil.example/app.apk",
            },
          ],
        }),
        "0.2.4",
      ),
    ).toBeNull();
  });
});
