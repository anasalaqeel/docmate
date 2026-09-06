import { memo, useState } from "react";
import {
  UserIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import MarkdownRenderer from "../ui/markdownRenderer";
import type { ChatMessage } from "./useAskAi";
import styles from "./AskAi.module.css";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeString = message.timestamp
    ? message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : undefined;

  if (message.role === "user") {
    return (
      <div className={styles.userRow}>
        <div className={`${styles.avatar} ${styles.userAvatar}`} title="You">
          <UserIcon className={styles.avatarIcon} />
        </div>
        <div className={styles.userContent}>
          <div className={styles.userBubble}>{message.content}</div>
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

  // Do not render empty assistant bubbles if content hasn't arrived yet
  if (!message.content.trim()) return null;

  return (
    <div className={styles.assistantRow}>
      <div className={`${styles.avatar} ${styles.assistantAvatar}`} title="Docmate AI">
        <SparklesIcon className={styles.avatarIcon} />
      </div>
      <div className={styles.assistantContent}>
        <div className={styles.assistantBubble}>
          <MarkdownRenderer content={message.content} />
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
