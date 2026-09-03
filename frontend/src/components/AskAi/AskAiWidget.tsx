import { useEffect, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import AskAiPanel from "./AskAiPanel";
import { getAskAiStatus, type AskAiStatus } from "../../services/aiService";
import styles from "./AskAi.module.css";

interface AskAiWidgetProps {
  docId?: number;
  pageId?: number;
  docTitle?: string;
  pageTitle?: string;
  variant: "public" | "admin";
}

/**
 * Floating "Ask AI" button + slide-in chat panel. Renders nothing unless the
 * deployment has the AI assistant enabled (fail-closed: hides on status
 * fetch errors too).
 */
const AskAiWidget = ({ docId, pageId, docTitle, pageTitle, variant }: AskAiWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<AskAiStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAskAiStatus()
      .then((status) => {
        if (!cancelled) setStatus(status);
      })
      .catch(() => {
        // Fail closed: without a confirmed enabled status, show nothing.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.enabled || docId == null) return null;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className={styles.fab}
          onClick={() => setIsOpen(true)}
          aria-label="Ask AI about this documentation"
          title="Ask AI"
        >
          <SparklesIcon className={styles.fabIcon} />
        </button>
      )}
      <AskAiPanel
        open={isOpen}
        onClose={() => setIsOpen(false)}
        docId={docId}
        pageId={pageId}
        docTitle={docTitle}
        pageTitle={pageTitle}
        variant={variant}
      />
    </>
  );
};

export default AskAiWidget;
