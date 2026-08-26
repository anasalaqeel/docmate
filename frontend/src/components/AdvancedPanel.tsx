import { useState, useEffect } from "react";
import { Card, CardBody, Textarea, Button, Alert, Spinner } from "@heroui/react";
import Switch from "./ui/Switch";
import {
  AdjustmentsHorizontalIcon,
  CodeBracketIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { settingsService } from "../services/settingsService";

export default function AdvancedPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Custom code settings
  const [customCSS, setCustomCSS] = useState("");
  const [customJS, setCustomJS] = useState("");

  // Analytics settings
  const [enableAnalytics, setEnableAnalytics] = useState(false);
  const [enableTracking, setEnableTracking] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const allSettings = await settingsService.getAllSettings();

        const cssSetting = allSettings.find(s => s.key === "advanced.customCSS");
        const jsSetting = allSettings.find(s => s.key === "advanced.customJavaScript");
        const analyticsSetting = allSettings.find(s => s.key === "advanced.enableAnalytics");
        const trackingSetting = allSettings.find(s => s.key === "advanced.enableTracking");

        setCustomCSS(cssSetting?.value as string || "");
        setCustomJS(jsSetting?.value as string || "");
        setEnableAnalytics(analyticsSetting?.value as boolean || false);
        setEnableTracking(trackingSetting?.value as boolean || false);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);

      const settings = {
        "advanced.customCSS": customCSS,
        "advanced.customJavaScript": customJS,
        "advanced.enableAnalytics": enableAnalytics,
        "advanced.enableTracking": enableTracking,
      };

      const result = await settingsService.updateSettings(settings);
      return result.success;
    } catch (error) {
      console.error("Failed to save settings:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" label="Loading advanced settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Code */}
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CodeBracketIcon className="w-5 h-5" style={{ color: 'var(--docmate-primary)' }} />
            <h3 className="text-lg font-semibold">Custom Code Injection</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--docmate-text)' }}>Custom CSS</label>
              <Textarea
                placeholder="Enter custom CSS code here..."
                value={customCSS}
                onChange={(e) => setCustomCSS(e.target.value)}
                description="Custom CSS will be injected into the head of every page"
                variant="bordered"
                minRows={6}
                maxRows={12}
                className="font-mono text-sm"
                classNames={{
                  inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                  input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                  description: "text-[var(--docmate-text-secondary)]"
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--docmate-text)' }}>Custom JavaScript</label>
              <Textarea
                placeholder="Enter custom JavaScript code here..."
                value={customJS}
                onChange={(e) => setCustomJS(e.target.value)}
                description="Custom JavaScript will be executed on page load"
                variant="bordered"
                minRows={6}
                maxRows={12}
                className="font-mono text-sm"
                classNames={{
                  inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                  input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                  description: "text-[var(--docmate-text-secondary)]"
                }}
              />
            </div>
          </div>

          <Alert
            color="warning"
            title="Security Warning"
            description="Custom code can potentially compromise security. Only add code from trusted sources."
            variant="flat"
          />
        </CardBody>
      </Card>

      {/* Analytics and Tracking */}
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5" style={{ color: 'var(--docmate-primary)' }} />
            <h3 className="text-lg font-semibold">Analytics & Tracking</h3>
          </div>

          <div className="space-y-4">
            <Switch isSelected={enableAnalytics} onValueChange={setEnableAnalytics}>
              Enable Analytics
            </Switch>
            <p className="text-sm mt-1" style={{ color: 'var(--docmate-text-secondary)' }}>
              Enable analytics tracking for usage statistics and insights
            </p>

            <Switch
              isSelected={enableTracking}
              onValueChange={setEnableTracking}
              isDisabled={!enableAnalytics}
            >
              Enable User Behavior Tracking
            </Switch>
            <p className="text-sm mt-1" style={{ color: 'var(--docmate-text-secondary)' }}>
              Enable user behavior tracking for optimization
            </p>
          </div>

          <Alert
            color="default"
            title="Privacy Considerations"
            description="Ensure compliance with privacy regulations when enabling tracking features."
            variant="flat"
          />
        </CardBody>
      </Card>

      {/* Additional Advanced Options */}
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AdjustmentsHorizontalIcon className="w-5 h-5" style={{ color: 'var(--docmate-primary)' }} />
            <h3 className="text-lg font-semibold">Advanced Options</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--docmate-border-color)' }}>
              <h4 className="font-medium mb-2">Debug Mode</h4>
              <p className="text-sm mb-3" style={{ color: 'var(--docmate-text-secondary)' }}>
                Enable debug mode for development and troubleshooting. This will show additional
                information in the browser console and may impact performance.
              </p>
              <Switch isSelected={false} onValueChange={() => {}}>
                Enable Debug Mode
              </Switch>
            </div>

            <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--docmate-border-color)' }}>
              <h4 className="font-medium mb-2">Performance Monitoring</h4>
              <p className="text-sm mb-3" style={{ color: 'var(--docmate-text-secondary)' }}>
                Monitor application performance and identify bottlenecks. This may slightly impact
                performance due to monitoring overhead.
              </p>
              <Switch isSelected={false} onValueChange={() => {}}>
                Enable Performance Monitoring
              </Switch>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button 
          color="primary" 
          onPress={handleSave} 
          isDisabled={saving}
          className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 px-8"
        >
          {saving ? <Spinner size="sm" /> : "Save Advanced Settings"}
        </Button>
      </div>
    </div>
  );
}
