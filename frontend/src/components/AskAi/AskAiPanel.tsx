import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  SparklesIcon,
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ChatBubbleBottomCenterTextIcon,
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
  "What are the prerequisites?",
  "How do I configure this?",
  "What are the common errors or pitfalls?",
];

const AskAiPanel = ({ onClose, docTitle, pageTitle, chat }: AskAiPanelProps) => {
  const [question, setQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { messages, sendMessage, stop, status, error, clearError, setMessages, regenerate } = chat;

  // Track timestamps safely in a ref without triggering renders
  const timestampsRef = useRef<Record<string, Date>>({});
  for (const m of messages) {
    if (!timestampsRef.current[m.id]) {
      timestampsRef.current[m.id] = new Date();
    }
  }

  // Detect Mac vs Windows/Linux vs Touch device
  const [platformInfo, setPlatformInfo] = useState<{ isTouch: boolean; enterLabel: string }>({
    isTouch: false,
    enterLabel: "Enter",
  });

  useEffect(() => {
    const isTouch =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMac =
      /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    setPlatformInfo({
      isTouch,
      enterLabel: isMac ? "Return" : "Enter",
    });
  }, []);

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
  }, [messages, status]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "The AI request failed. Please try again.");
      clearError();
    }
  }, [error, clearError]);

  const isBusy = (status === "submitted" || status === "streaming") && messages.length > 0;

  const handleClearChat = () => {
    if (isBusy) stop();
    setMessages([]);
  };

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
        initial={{ x: "100%", opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0.9 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
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
                onClick={handleClearChat}
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
            messages.map((message: any) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                timestamp={timestampsRef.current[message.id]}
              />
            ))
          )}

          {/* Assistant is generating / thinking state */}
          {isBusy && status === "submitted" && (
            <div className={styles.typingRow}>
              <div className={`${styles.avatar} ${styles.assistantAvatar}`}>
                <SparklesIcon className={styles.avatarIcon} />
              </div>
              <div className={styles.typingIndicator}>
                <span>Thinking</span>
                <div className={styles.typingDots}>
                  <div className={styles.typingDot} />
                  <div className={styles.typingDot} />
                  <div className={styles.typingDot} />
                </div>
              </div>
            </div>
          )}

          {/* Regenerate Action */}
          {messages.length > 0 && !isBusy && messages[messages.length - 1].role === "assistant" && (
            <div className={styles.regenerateRow}>
              <button
                type="button"
                className={styles.regenerateBtn}
                onClick={() => regenerate()}
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
                {isBusy ? (
                  <span>AI is typing…</span>
                ) : !platformInfo.isTouch ? (
                  <>
                    <kbd className={styles.hintKey}>{platformInfo.enterLabel}</kbd>
                    <span className={styles.hintAction}>to send</span>
                    <span className={styles.hintSep}>·</span>
                    <kbd className={styles.hintKey}>Shift</kbd>
                    <span>+</span>
                    <kbd className={styles.hintKey}>{platformInfo.enterLabel}</kbd>
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
