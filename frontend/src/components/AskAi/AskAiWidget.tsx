import { useEffect, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import AskAiPanel from "./AskAiPanel";
import { getAskAiStatus, type AskAiStatus } from "../../services/aiService";
import { useAskAi } from "./useAskAi";
import styles from "./AskAi.module.css";

interface AskAiWidgetProps {
  docId?: number;
  pageId?: number;
  docTitle?: string;
  pageTitle?: string;
  variant: "public" | "admin";
}

const AskAiWidget = ({ docId, pageId, docTitle, pageTitle, variant }: AskAiWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<AskAiStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAskAiStatus()
      .then((status) => {
        if (!cancelled) setStatus(status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const chat = useAskAi({
    docId: docId || 0,
    pageId,
    variant,
  });

  if (!status?.enabled || docId == null) return null;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            type="button"
            className={styles.fab}
            onClick={() => setIsOpen(true)}
            aria-label="Ask AI about this documentation"
            title="Ask AI"
          >
            <SparklesIcon className={styles.fabIcon} />
            <span className={styles.fabLabel}>Ask AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <AskAiPanel
            onClose={() => setIsOpen(false)}
            docId={docId}
            pageId={pageId}
            docTitle={docTitle}
            pageTitle={pageTitle}
            variant={variant}
            chat={chat}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AskAiWidget;
