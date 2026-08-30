import { describe, test, expect } from "bun:test";
import {
  slugify,
  parseOrderedSegment,
  orderedSegment,
  parseFrontmatter,
  buildSidebarFromMarkdownFiles,
} from "../utils/markdownSidebar";

describe("markdownSidebar utils", () => {
  test("slugify normalizes titles into file-safe segments", () => {
    expect(slugify("Getting Started!")).toBe("getting-started");
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
    expect(slugify("API")).toBe("api");
  });

  test("parseOrderedSegment extracts a numeric prefix and title-cases the remainder", () => {
    expect(parseOrderedSegment("2-getting-started")).toEqual({
      order: 2,
      title: "Getting Started",
    });
    expect(parseOrderedSegment("10-advanced-usage")).toEqual({
      order: 10,
      title: "Advanced Usage",
    });
  });

  test("parseOrderedSegment falls back to null order when there is no prefix", () => {
    expect(parseOrderedSegment("getting-started")).toEqual({
      order: null,
      title: "Getting Started",
    });
  });

  test("orderedSegment is the inverse of parseOrderedSegment", () => {
    expect(orderedSegment("Getting Started", 1)).toBe("1-getting-started");
    const parsed = parseOrderedSegment(orderedSegment("Advanced Usage", 12));
    expect(parsed).toEqual({ order: 12, title: "Advanced Usage" });
  });

  test("parseFrontmatter reads simple YAML frontmatter", () => {
    const content = `---\ntitle: "Custom Title"\nslug: "custom-slug"\n---\n\n# Body`;
    expect(parseFrontmatter(content)).toEqual(
      expect.objectContaining({ title: "Custom Title", slug: "custom-slug" })
    );
  });

  test("parseFrontmatter returns an empty object when there is no frontmatter", () => {
    expect(parseFrontmatter("# Just a heading")).toEqual({});
  });

  test("buildSidebarFromMarkdownFiles orders siblings by numeric prefix regardless of map insertion order", () => {
    const files = {
      "pages/2-authentication.md": "# Auth",
      "pages/1-getting-started.md": "# Welcome",
    };

    const tree = buildSidebarFromMarkdownFiles(files);

    expect(tree.map((i) => i.title)).toEqual(["Getting Started", "Authentication"]);
    expect(tree.every((i) => i.type === "page")).toBe(true);
  });

  test("buildSidebarFromMarkdownFiles nests folders and sorts children at every level", () => {
    const files = {
      "pages/2-api/2-webhooks.md": "# Webhooks",
      "pages/2-api/1-authentication.md": "# Auth",
      "pages/1-getting-started.md": "# Welcome",
    };

    const tree = buildSidebarFromMarkdownFiles(files);

    expect(tree.map((i) => i.title)).toEqual(["Getting Started", "Api"]);
    const apiFolder = tree.find((i) => i.title === "Api")!;
    expect(apiFolder.type).toBe("folder");
    expect(apiFolder.children.map((i) => i.title)).toEqual(["Authentication", "Webhooks"]);
  });

  test("buildSidebarFromMarkdownFiles respects a custom (empty) pagesPrefix for git-style payloads", () => {
    const files = {
      "2-auth.md": "# Auth",
      "1-intro.md": "# Intro",
    };

    const tree = buildSidebarFromMarkdownFiles(files, "");

    expect(tree.map((i) => i.title)).toEqual(["Intro", "Auth"]);
  });

  test("buildSidebarFromMarkdownFiles falls back to insertion order when there is no numeric prefix", () => {
    const files = {
      "pages/getting-started.md": "# Welcome",
      "pages/authentication.md": "# Auth",
    };

    const tree = buildSidebarFromMarkdownFiles(files);

    expect(tree.map((i) => i.title)).toEqual(["Getting Started", "Authentication"]);
  });
});
