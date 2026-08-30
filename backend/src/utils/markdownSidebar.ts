export interface ParsedPage {
  title: string;
  slug: string;
  content: any;
  metadata: any;
  created_at?: string;
  updated_at?: string;
}

export interface ParsedSidebarItem {
  id: number;
  title: string;
  type: "folder" | "page" | "divider";
  order: number;
  icon?: string;
  children: ParsedSidebarItem[];
  page?: ParsedPage;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(text: string): string {
  return text.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function parseOrderedSegment(segment: string): { order: number | null; title: string } {
  const match = segment.match(/^(\d+)-(.+)$/);
  if (match) {
    return { order: parseInt(match[1], 10), title: titleCase(match[2]) };
  }
  return { order: null, title: titleCase(segment) };
}

export function orderedSegment(title: string, position: number): string {
  return `${position}-${slugify(title)}`;
}

export function parseFrontmatter(content: string): {
  title?: string;
  slug?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {};
  }

  try {
    const frontmatterData: any = {};

    match[1].split("\n").forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        frontmatterData[key] = value;
      }
    });

    return {
      title: frontmatterData.title,
      slug: frontmatterData.slug,
      metadata: frontmatterData,
      created_at: frontmatterData.created_at,
      updated_at: frontmatterData.updated_at,
    };
  } catch (error) {
    console.warn("Failed to parse frontmatter:", error);
    return {};
  }
}

/**
 * Path segments (folders and the final filename) may carry a numeric ordering
 * prefix ("1-getting-started.md", "2-api/1-auth.md"). Prefixed segments sort
 * by that number; unprefixed segments fall back to a shared insertion-order
 * counter, matching the pre-numeric-prefix behavior.
 */
export function buildSidebarFromMarkdownFiles(
  files: Record<string, Buffer | string>,
  pagesPrefix: string = "pages/"
): ParsedSidebarItem[] {
  const rootSidebarItems: ParsedSidebarItem[] = [];
  const folderMap = new Map<string, ParsedSidebarItem>();
  let fallbackOrder = 0;

  const pageFiles = Object.keys(files).filter(
    (filename) => filename.startsWith(pagesPrefix) && filename.endsWith(".md")
  );

  pageFiles.forEach((filename) => {
    const raw = files[filename];
    const content = typeof raw === "string" ? raw : raw.toString();
    const relativePath = filename.startsWith(pagesPrefix)
      ? filename.slice(pagesPrefix.length)
      : filename;
    const pathParts = relativePath.replace(/\.md$/, "").split("/");
    const pageData = parseFrontmatter(content);

    let currentChildren = rootSidebarItems;
    let currentPath = "";

    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderSegment = pathParts[i];
      currentPath = currentPath ? `${currentPath}/${folderSegment}` : folderSegment;

      if (!folderMap.has(currentPath)) {
        const { order, title } = parseOrderedSegment(folderSegment);
        const folderItem: ParsedSidebarItem = {
          id: -1,
          title,
          type: "folder",
          order: order ?? fallbackOrder++,
          children: [],
        };
        folderMap.set(currentPath, folderItem);
        currentChildren.push(folderItem);
      }

      currentChildren = folderMap.get(currentPath)!.children;
    }

    const fileSegment = pathParts[pathParts.length - 1];
    const { order, title: parsedTitle } = parseOrderedSegment(fileSegment);
    const pageTitle = pageData.title || parsedTitle;

    currentChildren.push({
      id: -1,
      title: pageTitle,
      type: "page",
      order: order ?? fallbackOrder++,
      children: [],
      page: {
        title: pageTitle,
        slug: pageData.slug || slugify(fileSegment.replace(/^\d+-/, "")),
        content: { description: content },
        metadata: pageData.metadata,
        created_at: pageData.created_at,
        updated_at: pageData.updated_at,
      },
    });
  });

  const sortTree = (items: ParsedSidebarItem[]): ParsedSidebarItem[] => {
    items.sort((a, b) => a.order - b.order);
    items.forEach((item) => {
      if (item.children.length > 0) {
        sortTree(item.children);
      }
    });
    return items;
  };

  return sortTree(rootSidebarItems);
}
