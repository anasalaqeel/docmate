/**
 * Convert a page's stored content value (string, block object, or block array)
 * into plain markdown. Mirrors the export service's conversion so AI answers
 * see exactly the content readers see.
 */
export function contentToMarkdown(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((block) => contentBlockToMarkdown(block)).join("\n\n");
  }

  if (content && typeof content === "object") {
    let result = "";

    const description = (content as Record<string, unknown>).description;
    if (typeof description === "string" && description) {
      result += description;
    }

    const blocks = (content as Record<string, unknown>).blocks;
    if (Array.isArray(blocks) && blocks.length > 0) {
      if (result) result += "\n\n";
      result += blocks.map((block) => contentBlockToMarkdown(block)).join("\n\n");
    }

    if (!Array.isArray(blocks)) {
      const blockResult = contentBlockToMarkdown(content);
      if (blockResult) {
        if (result) result += "\n\n";
        result += blockResult;
      }
    }

    return result;
  }

  return "";
}

function contentBlockToMarkdown(block: unknown): string {
  if (!block || typeof block !== "object") {
    return "";
  }

  const b = block as Record<string, any>;

  switch (b.type) {
    case "heading":
      return `${"#".repeat(b.level || 1)} ${b.text || ""}`;
    case "paragraph":
      return b.text || "";
    case "code":
      return `\`\`\`${b.language || ""}\n${b.code || ""}\n\`\`\``;
    case "list":
      if (b.ordered) {
        return (b.items || []).map((item: unknown, index: number) => `${index + 1}. ${item}`).join("\n");
      }
      return (b.items || []).map((item: unknown) => `- ${item}`).join("\n");
    case "quote":
      return `> ${b.text || ""}`;
    case "image":
      return `![${b.alt || ""}](${b.src || ""})`;
    case "link":
      return `[${b.text || ""}](${b.href || ""})`;
    default:
      return b.text || "";
  }
}
