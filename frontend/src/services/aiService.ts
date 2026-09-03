import { get, post } from "./httpService";

export interface AskAiStatus {
  enabled: boolean;
}

export interface AskAiConnectionTest {
  ok: boolean;
  baseUrl: string;
  provider: string;
  model: string;
  modelFound?: boolean;
  availableModels?: string[];
  error?: string;
}

export async function getAskAiStatus(): Promise<AskAiStatus> {
  const response = await get<{ success: boolean; data?: AskAiStatus; message?: string }>(
    "/docs/ask/status"
  );
  if (!response.success || !response.data) {
    throw new Error(response.message || "Failed to fetch AI status");
  }
  return response.data;
}

/**
 * Absolute stream endpoint for the AI SDK transport, which uses fetch
 * directly (not the axios baseURL "/v1" of httpService).
 */
export function askAiStreamEndpoint(docId: number, variant: "public" | "admin"): string {
  return variant === "public" ? `/v1/docs/public/${docId}/ask` : `/v1/docs/${docId}/ask`;
}

/** Validates the saved AI settings against the configured provider. */
export async function testAskAiConnection(): Promise<AskAiConnectionTest> {
  const response = await post<{ success: boolean; data?: AskAiConnectionTest; message?: string }>(
    "/docs/ask/test"
  );
  if (!response.success || !response.data) {
    throw new Error(response.message || "Failed to test the AI connection");
  }
  return response.data;
}
