import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  SparklesIcon,
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import ChatMessageBubble from "./ChatMessageBubble";
import { useAskAi } from "./useAskAi";
import styles from "./AskAi.module.css";

interface AskAiPanelProps {
  open: boolean;
  onClose: () => void;
  docId: number;
  pageId?: number;
  docTitle?: string;
  pageTitle?: string;
  variant: "public" | "admin";
}

const SUGGESTIONS = [
  "Summarize this page",
  "What are the key points here?",
  "Where do I find…?",
];

const AskAiPanel = ({ open, onClose, docId, pageId, docTitle, pageTitle, variant }: AskAiPanelProps) => {
  // Slide-out animation: keep mounted briefly after close (same pattern as
  // AppLayout's SidebarPeekOverlay).
  const [render, setRender] = useState(open);
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { messages, sendMessage, stop, status, error, clearError, setMessages } = useAskAi({
    docId,
    pageId,
    variant,
  });

  useEffect(() => {
    if (open) {
      setRender(true);
      return;
    }
    const t = setTimeout(() => setRender(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Keep the newest message in view while streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "The AI request failed. Please try again.");
      clearError();
    }
  }, [error, clearError]);

  if (!render) return null;

  const isBusy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setQuestion("");
    sendMessage({ text: trimmed });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(question);
    }
  };

  const contextLabel = pageTitle ? `${docTitle ?? "Documentation"} · ${pageTitle}` : (docTitle ?? "Documentation");

  return (
    <div
      className={styles.panel}
      data-open={open ? "true" : "false"}
      inert={!open ? true : undefined}
      role="dialog"
      aria-label="Ask AI about this documentation"
    >
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <SparklesIcon className={styles.headerSparkle} />
        </div>
        <div className={styles.headerText}>
          <h2 className={styles.headerTitle}>Ask AI</h2>
          <p className={styles.headerContext}>{contextLabel}</p>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setMessages([])}
          aria-label="Clear conversation"
          title="Clear conversation"
        >
          <ArrowPathIcon className={styles.iconButtonIcon} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          aria-label="Close Ask AI panel"
          title="Close"
        >
          <XMarkIcon className={styles.iconButtonIcon} />
        </button>
      </header>

      <div className={styles.messages} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <SparklesIcon className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Ask anything about this documentation</p>
            <p className={styles.emptyHint}>
              Answers come from the page you are reading — and the AI can look up other pages of
              this documentation when needed.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className={styles.suggestionChip}
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
        )}
        {isBusy && status === "submitted" && <div className={styles.typingIndicator}>Thinking…</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        <textarea
          className={styles.input}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this documentation…"
          rows={1}
          aria-label="Your question"
          disabled={isBusy}
        />
        {isBusy ? (
          <button type="button" className={styles.stopButton} onClick={stop} aria-label="Stop generating">
            <StopIcon className={styles.sendIcon} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.sendButton}
            onClick={() => send(question)}
            disabled={!question.trim()}
            aria-label="Send question"
          >
            <PaperAirplaneIcon className={styles.sendIcon} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AskAiPanel;
