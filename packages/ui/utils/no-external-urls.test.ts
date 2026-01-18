/**
 * External Network Audit Tests
 *
 * These tests ensure that Plannotator does not make external network requests,
 * keeping plan data private and the app self-contained.
 *
 * Run: bun test packages/ui/utils/no-external-urls.test.ts
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

// External domains that should NOT appear in production code
const FORBIDDEN_EXTERNAL_URLS = [
  "https://share.plannotator.ai",
  "https://api.github.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://cdnjs.cloudflare.com",
];

// Directories to scan for external URLs
const SCAN_DIRS = [
  "packages/ui",
  "packages/server",
  "packages/editor",
  "packages/review-editor",
  "apps/hook",
];

// Files/patterns to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /dist\//,
  /\.git/,
  /marketing/, // Marketing site may use external resources
];

function getAllFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(p => p.test(fullPath))) {
        continue;
      }

      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        getAllFiles(fullPath, files);
      } else {
        const ext = extname(entry);
        if ([".ts", ".tsx", ".js", ".jsx", ".html", ".css"].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Directory doesn't exist, skip
  }
  return files;
}

function findExternalUrls(content: string): { url: string; line: number }[] {
  const found: { url: string; line: number }[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const url of FORBIDDEN_EXTERNAL_URLS) {
      if (line.includes(url)) {
        found.push({ url, line: i + 1 });
      }
    }
  }

  return found;
}

describe("External Network Audit", () => {
  test("sharing.ts should not contain external share URL", () => {
    const content = readFileSync("packages/ui/utils/sharing.ts", "utf-8");
    const found = findExternalUrls(content);

    expect(found).toEqual([]);
  });

  test("useUpdateCheck.ts should not contain GitHub API URL", () => {
    const content = readFileSync("packages/ui/hooks/useUpdateCheck.ts", "utf-8");
    const found = findExternalUrls(content);

    expect(found).toEqual([]);
  });

  test("index.html should not contain Google Fonts URLs", () => {
    const content = readFileSync("apps/hook/index.html", "utf-8");
    const found = findExternalUrls(content);

    expect(found).toEqual([]);
  });

  test("no production code should contain forbidden external URLs", () => {
    const violations: { file: string; url: string; line: number }[] = [];

    for (const dir of SCAN_DIRS) {
      const files = getAllFiles(dir);

      for (const file of files) {
        const content = readFileSync(file, "utf-8");
        const found = findExternalUrls(content);

        for (const { url, line } of found) {
          violations.push({ file, url, line });
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map(v => `  ${v.file}:${v.line} - ${v.url}`)
        .join("\n");
      throw new Error(`Found ${violations.length} external URL(s):\n${report}`);
    }

    expect(violations).toEqual([]);
  });
});

describe("Sharing Module", () => {
  test("generateShareUrl should return a local URL (no external domain)", async () => {
    // Import dynamically to test the actual module
    const { generateShareUrl } = await import("./sharing");

    const url = await generateShareUrl("# Test Plan", []);

    // Should NOT start with https://share.plannotator.ai
    expect(url.startsWith("https://share.plannotator.ai")).toBe(false);

    // Should be a relative URL or use window.location
    // For clipboard sharing, it should just be a hash
    expect(url.startsWith("#") || url.startsWith("/")).toBe(true);
  });
});
