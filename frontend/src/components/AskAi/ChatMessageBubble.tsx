import { memo, useState } from "react";
import { isToolUIPart, type DynamicToolUIPart, type ToolUIPart, type UIMessage } from "ai";
import {
  UserIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
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

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <span className={styles.toolChip}>
        <BookOpenIcon className={styles.actionIcon} />
        {pageTitle ? `Reading “${pageTitle}”…` : "Searching docs…"}
      </span>
    );
  }

  if (part.state === "output-available") {
    return (
      <span className={styles.toolChip}>
        <CheckCircleIcon className={styles.actionIcon} style={{ color: "var(--docmate-success)" }} />
        {pageTitle && !outputError ? `Consulted “${pageTitle}”` : "Checked documentation"}
      </span>
    );
  }

  if (part.state === "output-error" || outputError) {
    return (
      <span className={styles.toolChip}>
        <ExclamationCircleIcon className={styles.actionIcon} style={{ color: "var(--docmate-error)" }} />
        Could not read page
      </span>
    );
  }

  return null;
};

interface ChatMessageBubbleProps {
  message: UIMessage;
  timestamp?: Date;
}

const ChatMessageBubble = ({ message, timestamp }: ChatMessageBubbleProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeString = timestamp
    ? timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : undefined;

  if (message.role === "user") {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("\n");

    return (
      <div className={styles.userRow}>
        <div className={`${styles.avatar} ${styles.userAvatar}`} title="You">
          <UserIcon className={styles.avatarIcon} />
        </div>
        <div className={styles.userContent}>
          <div className={styles.userBubble}>{text}</div>
          {timeString && (
            <div className={styles.messageFooter}>
              <span className={styles.timestamp}>{timeString}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.role !== "assistant") return null;

  return (
    <div className={styles.assistantRow}>
      <div className={`${styles.avatar} ${styles.assistantAvatar}`} title="Docmate AI">
        <SparklesIcon className={styles.avatarIcon} />
      </div>
      <div className={styles.assistantContent}>
        <div className={styles.assistantBubble}>
          {message.parts.map((part, index) => {
            if (part.type === "text") {
              const text = (part as { type: "text"; text: string }).text;
              if (!text) return null;
              return <MarkdownRenderer key={index} content={text} />;
            }
            if (isToolUIPart(part)) {
              return <ToolStatusChip key={index} part={part} />;
            }
            return null;
          })}
        </div>
        <div className={styles.messageFooter}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy message"}
            aria-label="Copy message"
          >
            {copied ? (
              <>
                <CheckIcon className={styles.actionIcon} style={{ color: "var(--docmate-success)" }} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <DocumentDuplicateIcon className={styles.actionIcon} />
                <span>Copy</span>
              </>
            )}
          </button>
          {timeString && <span className={styles.timestamp}>{timeString}</span>}
        </div>
      </div>
    </div>
  );
};

export default memo(ChatMessageBubble);
