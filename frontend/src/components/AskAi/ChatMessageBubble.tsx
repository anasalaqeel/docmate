import { memo } from "react";
import { isToolUIPart, type DynamicToolUIPart, type ToolUIPart, type UIMessage } from "ai";
import MarkdownRenderer from "../ui/markdownRenderer";
import styles from "./AskAi.module.css";

type AnyToolPart = ToolUIPart | DynamicToolUIPart;

function getToolPageTitle(part: AnyToolPart): string | null {
  const output = part.output as { title?: string; error?: string } | undefined;
  if (output?.title) return output.title;
  const input = part.input as { pageId?: number } | undefined;
  if (input?.pageId != null) return `page #${input.pageId}`;
  return null;
}

const ToolStatusChip = ({ part }: { part: AnyToolPart }) => {
  const pageTitle = getToolPageTitle(part);
  const outputError = (part.output as { error?: string } | undefined)?.error;
  let label = "Reading documentation…";
  if (part.state === "input-streaming" || part.state === "input-available") {
    label = pageTitle ? `Reading “${pageTitle}”…` : "Reading documentation…";
  } else if (part.state === "output-available") {
    label = pageTitle && !outputError ? `Read “${pageTitle}”` : "Checked the documentation";
  } else if (part.state === "output-error") {
    label = "Could not read that page";
  }
  return <span className={styles.toolChip}>{label}</span>;
};

interface ChatMessageBubbleProps {
  message: UIMessage;
}

/** One chat message: user bubbles are plain text, assistant answers are markdown. */
const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  if (message.role === "user") {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("\n");
    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>{text}</div>
      </div>
    );
  }

  if (message.role !== "assistant") return null;

  return (
    <div className={styles.assistantRow}>
      <div className={styles.assistantBubble}>
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            const text = (part as { type: "text"; text: string }).text;
            if (!text) return null;
            // docId is intentionally not passed: chat answers never need the
            // authenticated OpenAPI fetch MarkdownRenderer would trigger.
            return (
              <MarkdownRenderer
                key={index}
                content={text}
              />
            );
          }
          if (isToolUIPart(part)) {
            return <ToolStatusChip key={index} part={part} />;
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default memo(ChatMessageBubble);
