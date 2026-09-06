import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  SparklesIcon,
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ChatMessageBubble from "./ChatMessageBubble";
import { type UseChatHelpers } from "@ai-sdk/react";
import { type UIMessage } from "ai";
import styles from "./AskAi.module.css";

interface AskAiPanelProps {
  onClose: () => void;
  docId: number;
  pageId?: number;
  docTitle?: string;
  pageTitle?: string;
  variant: "public" | "admin";
  chat: UseChatHelpers<UIMessage>;
}

const SUGGESTIONS = [
  "Summarize this page",
  "What are the key points here?",
  "Where do I find…?",
];

const AskAiPanel = ({ onClose, docTitle, pageTitle, chat }: AskAiPanelProps) => {
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { messages, sendMessage, stop, status, error, clearError, setMessages, regenerate } = chat;

  const timestampsRef = useRef<Record<string, Date>>({});
  
  messages.forEach(m => {
    if (!timestampsRef.current[m.id]) {
      timestampsRef.current[m.id] = new Date();
    }
  });

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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

  const isBusy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setQuestion("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    sendMessage({ text: trimmed });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(question);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`; // Max height 8rem (128px)
  };

  const contextLabel = pageTitle ? `${docTitle ?? "Documentation"} · ${pageTitle}` : (docTitle ?? "Documentation");

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={styles.panel}
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
          messages.map((message: any) => <ChatMessageBubble key={message.id} message={message} timestamp={timestampsRef.current[message.id]} />)
        )}
        {messages.length > 0 && !isBusy && messages[messages.length - 1].role === "assistant" && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
            <button className={styles.suggestionChip} onClick={() => regenerate()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowPathIcon className={styles.actionIcon} /> Regenerate response
            </button>
          </div>
        )}
        {isBusy && status === "submitted" && <div className={styles.typingIndicator}>Thinking…</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          value={question}
          onChange={handleInput}
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
    </motion.div>
  );
};

export default AskAiPanel;
