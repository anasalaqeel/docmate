import {
  Card,
  CardBody,
  Select,
  SelectItem,
  Input,
  Button,
  Textarea,
  Alert,
} from "@heroui/react";
import Switch from "./ui/Switch";
import { CogIcon, DocumentTextIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useSetting } from "../hooks/useSettings";
import type { DocumentationType } from "../types/settings";
import { settingsService } from "../services/settingsService";

export default function GeneralPanel() {
  // Documentation settings
  const { value: defaultDocType, update: updateDefaultDocType } = useSetting({
    key: "general.defaultDocumentationType",
    fallbackValue: "markdown",
  });
  const { value: defaultDocPublic, update: updateDefaultDocPublic } = useSetting({
    key: "general.defaultDocumentationIsPublic",
    fallbackValue: true,
  });
  const { value: defaultShowApi, update: updateDefaultShowApi } = useSetting({
    key: "general.defaultShowApiEndpoints",
    fallbackValue: true,
  });

  // System settings
  const { value: autoSaveInterval, update: updateAutoSaveInterval } = useSetting({
    key: "general.autoSaveInterval",
    fallbackValue: 30,
  });
  const { value: maintenanceMode, update: updateMaintenanceMode } = useSetting({
    key: "general.maintenanceMode",
    fallbackValue: false,
  });
  const { value: maintenanceMessage, update: updateMaintenanceMessage } = useSetting({
    key: "general.maintenanceMessage",
    fallbackValue: "",
  });

  const handleSave = async () => {
    const settings: Record<string, unknown> = {};

    if (defaultDocType !== undefined) settings["general.defaultDocumentationType"] = defaultDocType;
    if (defaultDocPublic !== undefined)
      settings["general.defaultDocumentationIsPublic"] = defaultDocPublic;
    if (defaultShowApi !== undefined) settings["general.defaultShowApiEndpoints"] = defaultShowApi;
    if (autoSaveInterval !== undefined) settings["general.autoSaveInterval"] = autoSaveInterval;
    if (maintenanceMode !== undefined) settings["general.maintenanceMode"] = maintenanceMode;
    if (maintenanceMessage !== undefined)
      settings["general.maintenanceMessage"] = maintenanceMessage;

    const result = await settingsService.updateSettings(settings);
    return result.success;
  };

  return (
    <div className="space-y-6">
      {/* Documentation Settings */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DocumentTextIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
            <h3 className="text-lg font-semibold">Documentation Defaults</h3>
          </div>

          <div className="space-y-4">
            <Select
              items={[
                { key: "markdown", label: "Markdown" },
                { key: "html", label: "HTML" },
                { key: "text", label: "Plain Text" },
              ]}
              label="Default Documentation Type"
              placeholder="Select default type"
              selectedKeys={defaultDocType ? [defaultDocType] : []}
              onSelectionChange={(keys) =>
                updateDefaultDocType(Array.from(keys)[0] as DocumentationType)
              }
              description="Default format for new documentation"
              variant="bordered"
              classNames={{
                trigger: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                value: "text-[var(--grud-text)]",
                label: "text-[var(--grud-text)]",
                description: "text-[var(--grud-text-secondary)]"
              }}
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>

            <Switch
              isSelected={!!(defaultDocPublic ?? true)}
              onValueChange={updateDefaultDocPublic}
            >
              Default to Public Documentation
            </Switch>
            <p className="text-sm mt-1" style={{ color: 'var(--grud-text-secondary)' }}>
              New documentation will be publicly visible by default
            </p>

            <Switch isSelected={!!(defaultShowApi ?? true)} onValueChange={updateDefaultShowApi}>
              Show API Endpoints by Default
            </Switch>
            <p className="text-sm mt-1" style={{ color: 'var(--grud-text-secondary)' }}>
              Show API endpoints in documentation by default
            </p>
          </div>
        </CardBody>
      </Card>

      {/* System Settings */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CogIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
            <h3 className="text-lg font-semibold">System Configuration</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--grud-text)' }}>Auto-save Interval (seconds)</label>
              <Input
                type="number"
                value={autoSaveInterval?.toString() ?? ""}
                onChange={(e) => updateAutoSaveInterval(parseInt(e.target.value) || 30)}
                placeholder="30"
                description="Automatically save draft content every N seconds"
                variant="bordered"
                min={10}
                max={300}
                classNames={{
                  inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                  input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
                  description: "text-[var(--grud-text-secondary)]"
                }}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Maintenance Mode */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
            <h3 className="text-lg font-semibold">Maintenance Mode</h3>
          </div>

          <div className="space-y-4">
            <Switch isSelected={!!(maintenanceMode ?? false)} onValueChange={updateMaintenanceMode}>
              Enable Maintenance Mode
            </Switch>
            <p className="text-sm mt-1" style={{ color: 'var(--grud-text-secondary)' }}>
              Enable maintenance mode to temporarily disable access for non-admin users
            </p>

            <Textarea
              label="Maintenance Message"
              placeholder="Enter a message to display to users during maintenance"
              value={typeof maintenanceMessage === "string" ? maintenanceMessage : ""}
              onChange={(e) => updateMaintenanceMessage(e.target.value)}
              description="This message will be shown to users when maintenance mode is enabled"
              variant="bordered"
              minRows={3}
              maxRows={6}
              isDisabled={!maintenanceMode}
              classNames={{
                inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
                label: "text-[var(--grud-text)]",
                description: "text-[var(--grud-text-secondary)]"
              }}
            />
          </div>

          {maintenanceMode && (
            <Alert
              color="warning"
              title="Maintenance Mode Active"
              description="Non-admin users cannot access the application while maintenance mode is enabled."
              variant="flat"
            />
          )}
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button 
          color="primary" 
          onPress={handleSave}
          className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 px-8"
        >
          Save General Settings
        </Button>
      </div>
    </div>
  );
}
