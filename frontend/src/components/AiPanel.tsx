import { useState } from "react";
import { Card, CardBody, Input, Button, Select, SelectItem } from "@heroui/react";
import { toast } from "sonner";
import Switch from "./ui/Switch";
import { SparklesIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useSetting } from "../hooks/useSettings";
import { settingsService } from "../services/settingsService";
import { testAskAiConnection, fetchProviderModels } from "../services/aiService";

interface ProviderPreset {
  key: string;
  label: string;
  defaultBaseUrl: string;
  keyRequired: boolean;
  showBaseUrl: boolean;
  hint: string;
}

const PROVIDERS: ProviderPreset[] = [
  {
    key: "ollama",
    label: "Ollama (Local)",
    defaultBaseUrl: "http://localhost:11434",
    keyRequired: false,
    showBaseUrl: true,
    hint: "Local AI on your machine. Ensure Ollama is running. No API key needed.",
  },
  {
    key: "lmstudio",
    label: "LM Studio (Local)",
    defaultBaseUrl: "http://localhost:1234",
    keyRequired: false,
    showBaseUrl: true,
    hint: "Local models running via LM Studio Local Server. No API key needed.",
  },
  {
    key: "vllm",
    label: "vLLM / LocalAI (Local)",
    defaultBaseUrl: "http://localhost:8000",
    keyRequired: false,
    showBaseUrl: true,
    hint: "Self-hosted high-throughput inference engine on port 8000.",
  },
  {
    key: "openai",
    label: "OpenAI",
    defaultBaseUrl: "",
    keyRequired: true,
    showBaseUrl: false,
    hint: "Official OpenAI models (GPT-4o, GPT-4o-mini).",
  },
  {
    key: "anthropic",
    label: "Anthropic Claude",
    defaultBaseUrl: "",
    keyRequired: true,
    showBaseUrl: false,
    hint: "Official Anthropic models (Claude 3.5 Sonnet, Claude Sonnet 4.5).",
  },
  {
    key: "google",
    label: "Google Gemini",
    defaultBaseUrl: "",
    keyRequired: true,
    showBaseUrl: false,
    hint: "Official Google Gemini models (Gemini 2.0 Flash, Gemini 1.5 Pro).",
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com",
    keyRequired: true,
    showBaseUrl: true,
    hint: "DeepSeek API (DeepSeek-V3, DeepSeek-R1). Fast and cost-effective.",
  },
  {
    key: "groq",
    label: "Groq",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    keyRequired: true,
    showBaseUrl: true,
    hint: "Ultra-fast inference (Llama 3.3 70B, Mixtral). Requires Groq API key.",
  },
  {
    key: "openrouter",
    label: "OpenRouter (300+ Models)",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    keyRequired: true,
    showBaseUrl: true,
    hint: "Unified gateway providing access to 300+ models from all providers via one key.",
  },
  {
    key: "mistral",
    label: "Mistral AI",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    keyRequired: true,
    showBaseUrl: true,
    hint: "Mistral models (Mistral Large, Mistral Small, Codestral).",
  },
  {
    key: "perplexity",
    label: "Perplexity",
    defaultBaseUrl: "https://api.perplexity.ai",
    keyRequired: true,
    showBaseUrl: true,
    hint: "Perplexity online search models (Sonar, Sonar Pro).",
  },
  {
    key: "xai",
    label: "xAI (Grok)",
    defaultBaseUrl: "https://api.x.ai/v1",
    keyRequired: true,
    showBaseUrl: true,
    hint: "xAI models (Grok 2). Requires xAI API key.",
  },
  {
    key: "together",
    label: "Together AI",
    defaultBaseUrl: "https://api.together.xyz/v1",
    keyRequired: true,
    showBaseUrl: true,
    hint: "Fast cloud hosting for open-weights models.",
  },
  {
    key: "fireworks",
    label: "Fireworks AI",
    defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
    keyRequired: true,
    showBaseUrl: true,
    hint: "Low-latency inference engine for leading models.",
  },
  {
    key: "zai",
    label: "Z.ai (GLM / Zhipu)",
    defaultBaseUrl: "https://api.z.ai/api/paas/v4",
    keyRequired: true,
    showBaseUrl: true,
    hint: "Z.ai GLM models (GLM-4 Flash, GLM-4 Plus). OpenAI-compatible endpoint.",
  },
  {
    key: "custom",
    label: "Custom OpenAI-compatible",
    defaultBaseUrl: "",
    keyRequired: true,
    showBaseUrl: true,
    hint: "Any other OpenAI-compatible gateway (Cerebras, SambaNova, Cloudflare, etc.).",
  },
];

export default function AiPanel() {
  const { value: aiEnabled, update: updateAiEnabled } = useSetting({
    key: "ai.enabled",
    fallbackValue: false,
  });
  const { value: provider, update: updateProvider } = useSetting({
    key: "ai.provider",
    fallbackValue: "ollama",
  });
  const { value: model, update: updateModel } = useSetting({
    key: "ai.model",
    fallbackValue: "",
  });
  const { value: baseUrl, update: updateBaseUrl } = useSetting({
    key: "ai.baseUrl",
    fallbackValue: "",
  });
  const { value: apiKey, update: updateApiKey } = useSetting({
    key: "ai.apiKey",
    fallbackValue: "",
  });
  const { value: maxOutputTokens, update: updateMaxOutputTokens } = useSetting({
    key: "ai.maxOutputTokens",
    fallbackValue: 1024,
  });

  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [isManualModel, setIsManualModel] = useState(false);

  const inputClassNames = {
    inputWrapper:
      "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
    input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
  };

  const activeProvider =
    PROVIDERS.find((p) => p.key === (provider ?? "ollama")) ?? PROVIDERS[0];

  const [isTesting, setIsTesting] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleProviderSelect = (newKey: string) => {
    const preset = PROVIDERS.find((p) => p.key === newKey);
    if (!preset) return;
    updateProvider(newKey);
    updateBaseUrl(preset.defaultBaseUrl);
    setDiscoveredModels([]);
    setIsManualModel(false);
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const res = await fetchProviderModels({
        provider: provider ?? "ollama",
        baseUrl: baseUrl ?? "",
        apiKey: apiKey ?? "",
      });
      if (!res.ok) {
        toast.error(res.error || "Could not fetch models");
        return;
      }
      setDiscoveredModels(res.models);
      if (res.models.length > 0) {
        toast.success(`Discovered ${res.models.length} models from ${activeProvider.label}`);
        setIsManualModel(false);
        if (!model || !res.models.includes(model)) {
          updateModel(res.models[0]);
        }
      } else {
        toast.info("No models returned by the provider");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch models");
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = async (showToast = true) => {
    setIsSaving(true);
    try {
      const settings: Record<string, unknown> = {
        "ai.enabled": aiEnabled,
        "ai.provider": provider ?? "ollama",
        "ai.model": model ?? "",
        "ai.baseUrl": baseUrl ?? "",
        "ai.apiKey": apiKey ?? "",
        "ai.maxOutputTokens":
          typeof maxOutputTokens === "number" && maxOutputTokens > 0 ? maxOutputTokens : 1024,
      };
      const result = await settingsService.updateSettings(settings);
      if (!result.success) {
        const firstError = result.errors ? Object.values(result.errors)[0] : undefined;
        toast.error(firstError || result.message || "Could not save AI settings");
        return false;
      }
      if (showToast) {
        toast.success("AI settings saved successfully");
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save AI settings");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Saves the current form values first, so the test always validates what
  // is on screen.
  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      if (!(await handleSave(false))) {
        return;
      }
      const result = await testAskAiConnection();
      if (!result.ok) {
        toast.error(`Connection failed: ${result.error ?? "unknown error"}`);
        return;
      }
      if (result.availableModels && result.availableModels.length > 0) {
        setDiscoveredModels(result.availableModels);
        if (!model || !result.availableModels.includes(model)) {
          updateModel(result.availableModels[0]);
        }
        setIsManualModel(false);
      }
      if (!result.modelFound) {
        const available = (result.availableModels ?? []).slice(0, 8).join(", ");
        toast.warning(
          `Server reachable at ${result.baseUrl}, but the model "${result.model}" was not found there.` +
            (available ? ` Available models: ${available}` : "")
        );
        return;
      }
      toast.success(`Connected — ${result.model} is available at ${result.baseUrl}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="w-5 h-5" style={{ color: "var(--docmate-primary)" }} />
            <h3 className="text-lg font-semibold">AI Assistant (Ask AI)</h3>
          </div>

          <Switch isSelected={aiEnabled} onValueChange={updateAiEnabled}>
            Enable the Ask AI assistant
          </Switch>
          <p className="text-sm mt-1" style={{ color: "var(--docmate-text-secondary)" }}>
            Shows an "Ask AI" button on documentation pages so readers can ask questions about the
            content. Answers are generated by the provider configured below; the API key never
            leaves the server.
          </p>

          <div>
            <Select
              label="Provider"
              selectedKeys={[activeProvider.key]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                if (typeof selected === "string") handleProviderSelect(selected);
              }}
              variant="bordered"
              isDisabled={!aiEnabled}
            >
              {PROVIDERS.map((p) => (
                <SelectItem key={p.key}>{p.label}</SelectItem>
              ))}
            </Select>
            <p className="text-xs mt-1.5" style={{ color: "var(--docmate-text-secondary)" }}>
              {activeProvider.hint}
            </p>
          </div>

          {/* Model Selection */}
          <div>
            {discoveredModels.length > 0 && !isManualModel ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--docmate-text)]">
                    Model ({discoveredModels.length} available)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsManualModel(true)}
                      className="text-xs text-[var(--docmate-primary)] hover:underline cursor-pointer"
                    >
                      Enter custom name
                    </button>
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      title="Refresh models from provider"
                      aria-label="Refresh models"
                      isDisabled={!aiEnabled || isFetchingModels}
                      onPress={handleFetchModels}
                      className="text-[var(--docmate-text-secondary)] hover:text-[var(--docmate-primary)] h-6 w-6 min-w-6"
                    >
                      <ArrowPathIcon className={`w-3.5 h-3.5 ${isFetchingModels ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
                <Select
                  aria-label="Select Model"
                  placeholder="Select a model from the list"
                  selectedKeys={model ? [model] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    if (typeof selected === "string") updateModel(selected);
                  }}
                  variant="bordered"
                  isDisabled={!aiEnabled}
                >
                  {discoveredModels.map((m) => (
                    <SelectItem key={m} textValue={m}>
                      {m}
                    </SelectItem>
                  ))}
                </Select>
                <p className="text-xs text-[var(--docmate-text-secondary)]">
                  Pick a model fetched live from your {activeProvider.label} instance.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--docmate-text)]">Model</label>
                  {discoveredModels.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsManualModel(false)}
                      className="text-xs text-[var(--docmate-primary)] hover:underline cursor-pointer"
                    >
                      Pick from discovered list ({discoveredModels.length})
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    aria-label="Model"
                    placeholder="Enter model name or click Fetch"
                    value={model ?? ""}
                    onValueChange={updateModel}
                    variant="bordered"
                    isDisabled={!aiEnabled}
                    classNames={inputClassNames}
                    list="discovered-models-list"
                    className="flex-1"
                  />
                  <Button
                    variant="flat"
                    isDisabled={!aiEnabled || isFetchingModels}
                    onPress={handleFetchModels}
                    className="bg-[var(--docmate-surface-alt)] text-[var(--docmate-text)] border border-[var(--docmate-border-color)] hover:border-[var(--docmate-primary)] flex items-center gap-1.5 shrink-0"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${isFetchingModels ? "animate-spin" : ""}`} />
                    {isFetchingModels ? "Fetching…" : "Fetch models"}
                  </Button>
                </div>
                {discoveredModels.length > 0 && (
                  <datalist id="discovered-models-list">
                    {discoveredModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                )}
                <p className="text-xs text-[var(--docmate-text-secondary)]">
                  Click &ldquo;Fetch models&rdquo; to query available models from your {activeProvider.label} instance, or enter a model name manually.
                </p>
              </div>
            )}
          </div>

          {activeProvider.showBaseUrl && (
            <Input
              label="API Base URL"
              placeholder={activeProvider.defaultBaseUrl || "http://localhost:11434"}
              value={baseUrl ?? ""}
              onValueChange={updateBaseUrl}
              variant="bordered"
              isDisabled={!aiEnabled}
              description="Server URL. The /v1 API path is added automatically when missing."
              classNames={inputClassNames}
            />
          )}

          <Input
            label={activeProvider.keyRequired ? "API Key" : "API Key (Optional)"}
            type="password"
            placeholder={activeProvider.keyRequired ? "••••••••" : "Not required for local AI"}
            value={apiKey ?? ""}
            onValueChange={updateApiKey}
            variant="bordered"
            isDisabled={!aiEnabled}
            description={
              activeProvider.keyRequired
                ? "Required for hosted providers. Can also be set via the AI_API_KEY environment variable."
                : "Leave empty for local Ollama / LM Studio instances."
            }
            classNames={inputClassNames}
          />

          <Input
            label="Max output tokens"
            type="number"
            placeholder="1024"
            value={String(maxOutputTokens ?? 1024)}
            onValueChange={(value) => {
              const parsed = Number(value);
              updateMaxOutputTokens(Number.isFinite(parsed) && parsed > 0 ? parsed : 1024);
            }}
            variant="bordered"
            isDisabled={!aiEnabled}
            description="Upper bound on the length of each AI answer"
            classNames={inputClassNames}
          />

          <div className="rounded-lg p-3.5 text-xs bg-[var(--docmate-surface-alt)] border border-[var(--docmate-border-color)] text-[var(--docmate-text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--docmate-text)]">Looking for a different provider? </span>
            Select <strong>Custom OpenAI-compatible</strong> or <strong>OpenRouter</strong>. Docmate works with any service implementing the OpenAI Chat specification (including Cerebras, SambaNova, Cloudflare Workers AI, HuggingFace, etc.).
          </div>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="flat"
          onPress={handleTestConnection}
          isDisabled={!aiEnabled || isTesting}
          className="bg-[var(--docmate-surface-alt)] text-[var(--docmate-text)] shadow-sm hover:shadow-md transition-shadow"
        >
          {isTesting ? "Testing…" : "Test connection"}
        </Button>
        <Button
          color="primary"
          onPress={() => handleSave(true)}
          isLoading={isSaving}
          isDisabled={isSaving}
          className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 px-8"
        >
          Save AI Settings
        </Button>
      </div>
    </div>
  );
}
