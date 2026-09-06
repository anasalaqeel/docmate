import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  SparklesIcon,
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ChatBubbleBottomCenterTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import ChatMessageBubble from "./ChatMessageBubble";
import type { UseAskAiReturn } from "./useAskAi";
import styles from "./AskAi.module.css";

interface AskAiPanelProps {
  onClose: () => void;
  docId: number;
  pageId?: number;
  docTitle?: string;
  pageTitle?: string;
  variant: "public" | "admin";
  chat: UseAskAiReturn;
}

const SUGGESTIONS = [
  "Summarize this page",
  "What are the prerequisites?",
  "How do I configure this?",
  "What are the common errors or pitfalls?",
];

const IS_TOUCH = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
const ENTER_LABEL = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "Return" : "Enter";

const AskAiPanel = ({ onClose, docTitle, pageTitle, chat }: AskAiPanelProps) => {
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    messages,
    phase,
    isBusy,
    error,
    sendMessage,
    stop,
    regenerate,
    clearMessages,
    clearError,
  } = chat;

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Keep the newest message in view while streaming or thinking
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, phase]);

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
    const maxHeight = 112; // 7rem
    if (e.target.scrollHeight > maxHeight) {
      e.target.style.height = `${maxHeight}px`;
      e.target.style.overflowY = "auto";
    } else {
      e.target.style.height = `${Math.max(e.target.scrollHeight, 22)}px`;
      e.target.style.overflowY = "hidden";
    }
  };

  const contextLabel = pageTitle ? `${docTitle ?? "Documentation"} · ${pageTitle}` : (docTitle ?? "Documentation");

  return (
    <>
      {/* Dim backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={styles.backdrop}
        onClick={onClose}
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={styles.panel}
        role="dialog"
        aria-label="Ask AI about this documentation"
      >
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <SparklesIcon className={styles.headerSparkle} />
          </div>
          <div className={styles.headerText}>
            <div className={styles.headerTitleRow}>
              <h2 className={styles.headerTitle}>Ask AI</h2>
              <span className={styles.headerBadge}>Beta</span>
            </div>
            <p className={styles.headerContext} title={contextLabel}>
              {contextLabel}
            </p>
          </div>
          <div className={styles.headerActions}>
            {messages.length > 0 && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={clearMessages}
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <TrashIcon className={styles.iconButtonIcon} />
              </button>
            )}
            <button
              type="button"
              className={styles.iconButton}
              onClick={onClose}
              aria-label="Close Ask AI panel"
              title="Close"
            >
              <XMarkIcon className={styles.iconButtonIcon} />
            </button>
          </div>
        </header>

        <div className={styles.messages} role="log" aria-live="polite">
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyBadge}>
                <SparklesIcon className={styles.emptyIcon} />
              </div>
              <p className={styles.emptyTitle}>How can I help with this doc?</p>
              <p className={styles.emptyHint}>
                Ask questions about this page, APIs, or guide steps. The AI will look up relevant content automatically.
              </p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.suggestionChip}
                    onClick={() => send(suggestion)}
                  >
                    <ChatBubbleBottomCenterTextIcon className={styles.suggestionChipIcon} />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))
          )}

          {/* Genuine Protocol States: Connecting vs Thinking */}
          {(phase === "connecting" || phase === "thinking") && (
            <div className={styles.typingRow}>
              <div className={`${styles.avatar} ${styles.assistantAvatar}`}>
                <SparklesIcon className={styles.avatarIcon} />
              </div>
              <div className={styles.typingIndicator}>
                <span>{phase === "connecting" ? "Connecting to AI…" : "Thinking…"}</span>
                <div className={styles.typingDots}>
                  <div className={styles.typingDot} />
                  <div className={styles.typingDot} />
                  <div className={styles.typingDot} />
                </div>
              </div>
            </div>
          )}

          {/* Inline Error Card with Retry */}
          {error && (
            <div className={styles.errorCard} role="alert">
              <div className={styles.errorHeader}>
                <ExclamationTriangleIcon className={styles.errorIcon} />
                <span>Response failed</span>
              </div>
              <p className={styles.errorText}>{error}</p>
              <div className={styles.errorActions}>
                {messages.length > 0 && (
                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={regenerate}
                  >
                    <ArrowPathIcon className={styles.actionIcon} />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  type="button"
                  className={styles.dismissButton}
                  onClick={clearError}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Regenerate Action (when successful & idle) */}
          {messages.length > 0 && phase === "idle" && !error && messages[messages.length - 1]?.role === "assistant" && (
            <div className={styles.regenerateRow}>
              <button
                type="button"
                className={styles.regenerateBtn}
                onClick={regenerate}
              >
                <ArrowPathIcon className={styles.actionIcon} />
                <span>Regenerate response</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Modern Pill-Box Composer */}
        <div className={styles.composerArea}>
          <div className={styles.composerBox}>
            <textarea
              ref={textareaRef}
              className={styles.input}
              value={question}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this documentation…"
              rows={1}
              aria-label="Your question"
              disabled={isBusy}
            />
            <div className={styles.composerToolbar}>
              <div className={styles.composerHint}>
                {phase === "connecting" ? (
                  <span>Connecting to AI…</span>
                ) : phase === "thinking" ? (
                  <span>Thinking…</span>
                ) : phase === "typing" ? (
                  <span>AI is typing…</span>
                ) : !IS_TOUCH ? (
                  <>
                    <kbd className={styles.hintKey}>{ENTER_LABEL}</kbd>
                    <span className={styles.hintAction}>to send</span>
                    <span className={styles.hintSep}>·</span>
                    <kbd className={styles.hintKey}>Shift</kbd>
                    <span>+</span>
                    <kbd className={styles.hintKey}>{ENTER_LABEL}</kbd>
                    <span className={styles.hintAction}>new line</span>
                  </>
                ) : null}
              </div>
              <div className={styles.composerActions}>
                {isBusy ? (
                  <button
                    type="button"
                    className={styles.stopButton}
                    onClick={stop}
                    aria-label="Stop generating"
                    title="Stop generating"
                  >
                    <span className={styles.stopSquare} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.sendButton}
                    onClick={() => send(question)}
                    disabled={!question.trim()}
                    aria-label="Send question"
                    title="Send question"
                  >
                    <PaperAirplaneIcon className={styles.sendIcon} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default AskAiPanel;
