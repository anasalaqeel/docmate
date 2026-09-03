import { useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { askAiStreamEndpoint } from "../../services/aiService";

interface UseAskAiOptions {
  docId: number;
  pageId?: number;
  variant: "public" | "admin";
}

/**
 * Streaming chat state for the Ask AI panel.
 *
 * The Chat instance is created once per (variant, docId), so the current
 * pageId is read through a ref at send time instead of being baked into the
 * transport — switching pages always asks about the page being viewed.
 */
export function useAskAi({ docId, pageId, variant }: UseAskAiOptions) {
  const pageIdRef = useRef(pageId);
  pageIdRef.current = pageId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: askAiStreamEndpoint(docId, variant),
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { docId, pageId: pageIdRef.current, messages },
        }),
      }),
    [docId, variant]
  );

  const chat = useChat({
    id: `ask-ai-${variant}-${docId}`,
    transport,
  });

  return chat;
}
