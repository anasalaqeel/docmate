import { useCallback, useMemo, useRef, useState } from "react";
import { askAiStreamEndpoint } from "../../services/aiService";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  timestamp: Date;
}

export type ChatPhase = "idle" | "connecting" | "thinking" | "typing" | "error";

interface UseAskAiOptions {
  docId: number;
  pageId?: number;
  variant: "public" | "admin";
}

export function useAskAi({ docId, pageId, variant }: UseAskAiOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const pageIdRef = useRef(pageId);
  pageIdRef.current = pageId;

  const isBusy = phase === "connecting" || phase === "thinking" || phase === "typing";

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPhase("idle");
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
  }, []);

  const runStream = useCallback(
    async (history: ChatMessage[]) => {
      stop();
      setError(null);
      setPhase("connecting");

      const assistantId = crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        timestamp: new Date(),
      };

      setMessages([...history, assistantMessage]);

      const controller = new AbortController();
      abortRef.current = controller;

      // Fail-fast 25s timeout for unresponsive/dead local AI models
      const connectionTimeout = setTimeout(() => {
        controller.abort("Connection timed out waiting for server");
        setPhase("error");
        setError("Connection timed out. Check if your AI server (Ollama) is running.");
        setMessages((prev) => prev.filter((m) => !(m.id === assistantId && !m.content.trim())));
      }, 25_000);

      try {
        const endpoint = askAiStreamEndpoint(docId, variant);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, text/plain",
          },
          body: JSON.stringify({
            docId,
            pageId: pageIdRef.current,
            messages: history.map((m) => ({
              id: m.id,
              role: m.role,
              parts: [{ type: "text", text: m.content }],
            })),
          }),
          signal: controller.signal,
        });

        clearTimeout(connectionTimeout);

        if (!res.ok) {
          let errDetail = `Server error ${res.status}`;
          try {
            const json = await res.json();
            if (json.message) errDetail = json.message;
          } catch {
            // ignore
          }
          setPhase("error");
          setError(errDetail);
          setMessages((prev) => prev.filter((m) => !(m.id === assistantId && !m.content.trim())));
          return;
        }

        setPhase("thinking");

        const reader = res.body?.getReader();
        if (!reader) {
          setPhase("error");
          setError("No response stream body received");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";

        streamLoop: while (true) {
          const { done, value } = await reader.read();
          if (done) break streamLoop;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let newTokens = "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break streamLoop;
              
              try {
                const parsed = JSON.parse(dataStr);
                newTokens +=
                  (parsed.type === "text-delta" && typeof parsed.delta === "string" ? parsed.delta : "") ||
                  parsed.delta?.content ||
                  parsed.choices?.[0]?.delta?.content ||
                  parsed.content ||
                  "";
              } catch {
                newTokens += dataStr;
              }
            } else if (line.startsWith("0:")) {
              try {
                newTokens += JSON.parse(line.slice(2));
              } catch {
                newTokens += line.slice(2);
              }
            } else if (line.startsWith("3:")) {
              let errorMsg = "Generation failed";
              try { errorMsg = JSON.parse(line.slice(2)); } catch { errorMsg = line.slice(2); }
              throw new Error(errorMsg);
            } else if (line.startsWith("d:") || line.startsWith("e:")) {
              try {
                const parsed = JSON.parse(line.slice(2));
                if (parsed.finishReason === "error" || parsed.error) {
                  throw new Error(parsed.error || "Generation stopped unexpectedly");
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue;
                throw e; // Re-throw actual errors so the outer catch can handle them
              }
            }
          }

          if (newTokens) {
            accumulatedText += newTokens;
            setPhase("typing");
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: accumulatedText } : m))
            );
          }
        }

        setPhase("idle");
        setMessages((prev) => {
          const pruned = prev.filter((m) => !(m.id === assistantId && !m.content.trim()));
          return pruned.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m));
        });
      } catch (err: unknown) {
        clearTimeout(connectionTimeout);
        if (!controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : String(err);
          setPhase("error");
          setError(
            msg.includes("Failed to fetch")
              ? "Cannot reach AI server. Is Ollama or the backend running?"
              : msg
          );
          setMessages((prev) => prev.filter((m) => !(m.id === assistantId && !m.content.trim())));
        }
      } finally {
        clearTimeout(connectionTimeout);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [docId, stop, variant]
  );

  const sendMessage = useCallback(
    ({ text }: { text: string }) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      runStream([...messages, userMessage]);
    },
    [isBusy, messages, runStream]
  );

  const regenerate = useCallback(() => {
    if (isBusy || messages.length === 0) return;

    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    runStream(messages.slice(0, lastUserIndex + 1));
  }, [isBusy, messages, runStream]);

  const clearMessages = useCallback(() => {
    stop();
    setError(null);
    setPhase("idle");
    setMessages([]);
  }, [stop]);

  const clearError = useCallback(() => {
    setError(null);
    if (phase === "error") setPhase("idle");
  }, [phase]);

  return useMemo(
    () => ({
      messages,
      phase,
      isBusy,
      error,
      sendMessage,
      stop,
      regenerate,
      clearMessages,
      clearError,
    }),
    [messages, phase, isBusy, error, sendMessage, stop, regenerate, clearMessages, clearError]
  );
}

export type UseAskAiReturn = ReturnType<typeof useAskAi>;
