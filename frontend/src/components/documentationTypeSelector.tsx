import { useState } from "react";
import { Card, CardBody, RadioGroup, Radio, Input, Textarea, Button, Divider } from "@heroui/react";
import Switch from "./ui/Switch";
import { DocumentTextIcon, CodeBracketIcon, PuzzlePieceIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import type { DocumentationType, Documentation } from "../types/docs";
import styles from "../styles/documentationTypeSelector.module.css";

interface DocumentationTypeSelectorProps {
  documentation: Documentation;
  onUpdate: (updates: Partial<Documentation>) => Promise<void> | void;
  isEditing?: boolean;
  isModal?: boolean;
}

const DocumentationTypeSelector = ({ documentation, onUpdate, isEditing = false, isModal = false }: DocumentationTypeSelectorProps) => {
  const [formData, setFormData] = useState({
    type: documentation.type || ("mixed" as DocumentationType),
    baseUrl: documentation.baseUrl || "",
    title: documentation.title || "",
    description: documentation.description || "",
    version: documentation.version || "1.0.0",
    isPublic: documentation.isPublic || false,
    showApiEndpointsInSidebar: documentation.showApiEndpointsInSidebar ?? true, // Default to true
  });

  const [isLoading, setIsLoading] = useState(false);

  const documentationTypes = [
    {
      value: "traditional" as DocumentationType,
      label: "Traditional Documentation",
      description: "Regular documentation with pages, content, and navigation",
      icon: DocumentTextIcon,
      features: ["Rich text content", "Custom navigation", "Static pages", "Markdown support"],
    },
    {
      value: "api" as DocumentationType,
      label: "API Documentation",
      description: "Pure API documentation with OpenAPI/Swagger specifications",
      icon: CodeBracketIcon,
      features: ["OpenAPI 3.1 support", "Interactive API testing", "Schema validation", "Auto-generated docs"],
    },
    {
      value: "mixed" as DocumentationType,
      label: "Mixed Documentation",
      description: "Combination of traditional docs and API specifications",
      icon: PuzzlePieceIcon,
      features: ["Traditional pages", "API operations", "CRUD documentation", "Flexible structure"],
    },
  ];

  const handleTypeChange = (value: string) => {
    const type = value as DocumentationType;
    const updatedData = { ...formData, type };
    setFormData(updatedData);
    if (!isEditing) {
      onUpdate(updatedData);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onUpdate(formData);
      toast.success("Documentation settings saved successfully");
    } catch (error) {
      toast.error("Failed to save documentation settings");
      console.error("Save failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <div className={styles.container}>
        {isModal ? (
          <div className={styles.modalContent}>
            {/* Basic Information */}
            <div className="space-y-6 mb-8 mt-4">
              <Input
                label="Title"
                placeholder="Enter documentation title"
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }));
                  onUpdate({ ...formData, title: e.target.value });
                }}
                isRequired
                variant="bordered"
                classNames={{
                  inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                  input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                  label: "text-[var(--docmate-text)]"
                }}
              />

              <Textarea
                label="Description"
                placeholder="Enter documentation description"
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }));
                  onUpdate({ ...formData, description: e.target.value });
                }}
                minRows={3}
                variant="bordered"
                classNames={{
                  inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                  input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                  label: "text-[var(--docmate-text)]"
                }}
              />

              <Input
                label="Version"
                placeholder="1.0.0"
                value={formData.version}
                onChange={(e) => {
                  const updatedData = { ...formData, version: e.target.value };
                  setFormData(updatedData);
                  onUpdate(updatedData);
                }}
                variant="bordered"
                classNames={{
                  inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border(--docmate-primary)! bg-[var(--docmate-surface-alt)]",
                  input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                  label: "text-[var(--docmate-text)]"
                }}
              />



              <Switch
                isSelected={formData.isPublic}
                onValueChange={(isPublic) => {
                  const updatedData = { ...formData, isPublic };
                  setFormData(updatedData);
                  onUpdate(updatedData);
                }}
                className={styles.switch}
                color="primary"
              >
                Make this documentation public
              </Switch>
            </div>

            <div className="mb-8">
              <h4 className={`text-lg font-semibold mb-6 ${styles.typeTitle}`}>Documentation Type</h4>
            </div>

            <RadioGroup value={formData.type} onValueChange={handleTypeChange} className={styles.radioGroup}>
              {documentationTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`${styles.typeCard} ${formData.type === type.value ? styles.typeCardSelected : ""} transition-all duration-200 cursor-pointer border-2`}
                    isPressable
                    onPress={() => handleTypeChange(type.value)}
                  >
                    <CardBody className={styles.typeCardBody}>
                      <Radio value={type.value} className={styles.radio}>
                        <div className={styles.typeContent}>
                          <div className={styles.typeHeader}>
                            <Icon className={styles.typeIcon} />
                            <div>
                              <h4 className={`font-semibold text-base ${styles.typeTitle}`}>{type.label}</h4>
                              <p className={`text-sm ${styles.typeDescription}`}>{type.description}</p>
                            </div>
                          </div>
                          <ul className={`list-disc list-inside ml-7 text-xs space-y-0.5 ${styles.features}`}>
                            {type.features.map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      </Radio>
                    </CardBody>
                  </Card>
                );
              })}
            </RadioGroup>

            {(formData.type === "api" || formData.type === "mixed") && (
              <>
                <Divider className={`${styles.divider} my-8`} />
                <div className={`${styles.apiSettings} space-y-6`}>
                  <h4 className={`flex items-center gap-2 font-semibold mb-6 ${styles.typeTitle}`}>
                    <GlobeAltIcon className="w-5 h-5 text-[var(--docmate-primary)]" />
                    API Settings
                  </h4>
                  <Input
                    label="Base URL"
                    placeholder="https://api.example.com/v1"
                    value={formData.baseUrl}
                    onChange={(e) => {
                      const updatedData = { ...formData, baseUrl: e.target.value };
                      setFormData(updatedData);
                      onUpdate(updatedData);
                    }}
                    description="The base URL for your API endpoints (used for testing)"
                    variant="bordered"
                    classNames={{
                      inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                      input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                      label: "text-[var(--docmate-text)]"
                    }}
                    startContent={
                      <div className="pointer-events-none flex items-center">
                        <GlobeAltIcon className="w-4 h-4 opacity-40 text-[var(--docmate-primary)]" />
                      </div>
                    }
                  />

                  <Switch
                    isSelected={formData.showApiEndpointsInSidebar}
                    onValueChange={(value) => {
                      const updatedData = { ...formData, showApiEndpointsInSidebar: value };
                      setFormData(updatedData);
                      onUpdate(updatedData);
                    }}
                    className={styles.switch}
                    color="primary"
                  >
                    Show API endpoints in sidebar
                  </Switch>
                  <p className="text-xs -mt-4 ml-7" style={{ color: 'var(--docmate-text-secondary)' }}>
                    When enabled, displays a "🚀 API Endpoints" section in the public documentation sidebar
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className={styles.selectorBody}>
            <div className={styles.header}>
              <h3 className="text-lg font-semibold">Documentation Type</h3>
              <p className="text-sm text-[var(--docmate-text-secondary)]">Choose how you want to structure your documentation</p>
            </div>
            <div className="mt-6">
              <RadioGroup value={formData.type} onValueChange={handleTypeChange} className={styles.radioGroup}>
                {documentationTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.value}
                      className={`${styles.typeCard} ${formData.type === type.value ? styles.typeCardSelected : ""} transition-all duration-200 cursor-pointer border-2`}
                      isPressable
                      onPress={() => handleTypeChange(type.value)}
                    >
                      <CardBody className={styles.typeCardBody}>
                        <Radio value={type.value} className={styles.radio}>
                          <div className={styles.typeContent}>
                            <div className={styles.typeHeader}>
                              <Icon className={styles.typeIcon} />
                              <div>
                                <h4 className={`font-semibold text-base ${styles.typeTitle}`}>{type.label}</h4>
                                <p className={`text-sm ${styles.typeDescription}`}>{type.description}</p>
                              </div>
                            </div>
                            <ul className={`list-disc list-inside ml-7 text-xs space-y-0.5 ${styles.features}`}>
                              {type.features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        </Radio>
                      </CardBody>
                    </Card>
                  );
                })}
              </RadioGroup>

              {(formData.type === "api" || formData.type === "mixed") && (
                <>
                  <Divider className={styles.divider} />
                  <div className={styles.apiSettings}>
                    <h4 className={`flex items-center gap-2 font-semibold mb-4 ${styles.settingsTitle}`}>
                      <GlobeAltIcon className="w-5 h-5 text-[var(--docmate-primary)]" />
                      API Settings
                    </h4>
                    <Input
                      label="Base URL"
                      placeholder="https://api.example.com/v1"
                      value={formData.baseUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, baseUrl: e.target.value }))}
                      description="The base URL for your API endpoints (used for testing)"
                      variant="bordered"
                      classNames={{
                        inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                        input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                        label: "text-[var(--docmate-text)]"
                      }}
                      startContent={
                        <div className="pointer-events-none flex items-center">
                          <GlobeAltIcon className="w-4 h-4 opacity-40 text-[var(--docmate-primary)]" />
                        </div>
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const contentBody = (
    <div className={isModal ? "p-0" : "p-6"}>
      <div className={styles.basicSettings}>
        <Input 
          label="Title" 
          value={formData.title} 
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} 
          isRequired 
          variant="bordered"
          classNames={{
            inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
            input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
            label: "text-[var(--docmate-text)]"
          }}
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          minRows={3}
          variant="bordered"
          classNames={{
            inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
            input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
            label: "text-[var(--docmate-text)]"
          }}
        />

        <Input
          label="Version"
          value={formData.version}
          onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
          placeholder="1.0.0"
          variant="bordered"
          classNames={{
            inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
            input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
            label: "text-[var(--docmate-text)]"
          }}
        />
        <Switch 
          isSelected={formData.isPublic} 
          onValueChange={(isPublic) => setFormData((prev) => ({ ...prev, isPublic }))}
          className={styles.switch}
          color="primary"
        >
          Make this documentation public
        </Switch>
      </div>

      <Divider className={styles.divider} />

      <div className={styles.typeSelection}>
        <h4 className={styles.typeTitle}>Documentation Type</h4>
        <RadioGroup value={formData.type} onValueChange={handleTypeChange} className={styles.compactRadioGroup}>
          {documentationTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.value} className={styles.compactTypeCard}>
                <Radio value={type.value}>
                  <div className={styles.compactTypeContent}>
                    <Icon className={styles.compactTypeIcon} />
                    <div>
                      <span className={styles.compactTypeTitle}>{type.label}</span>
                      <span className={styles.compactTypeDescription}>{type.description}</span>
                    </div>
                  </div>
                </Radio>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {(formData.type === "api" || formData.type === "mixed") && (
        <>
          <Divider className={styles.divider} />
          <div className={styles.apiSettings}>
            <h4 className={styles.settingsTitle}>
              <GlobeAltIcon className={styles.settingsIcon} />
              API Settings
            </h4>
            <Input
              label="Base URL"
              placeholder="https://api.example.com/v1"
              value={formData.baseUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, baseUrl: e.target.value }))}
              description="The base URL for your API endpoints (used for testing)"
              variant="bordered"
              classNames={{
                inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                label: "text-[var(--docmate-text)]"
              }}
              startContent={
                <div className="pointer-events-none flex items-center">
                  <GlobeAltIcon className="w-4 h-4 opacity-40 text-[var(--docmate-primary)]" />
                </div>
              }
            />

            <Switch
              isSelected={formData.showApiEndpointsInSidebar}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, showApiEndpointsInSidebar: value }))}
              className={styles.switch}
              color="primary"
            >
              Show API endpoints in sidebar
            </Switch>
            <p className="text-xs -mt-2 ml-7" style={{ color: 'var(--docmate-text-secondary)' }}>
              When enabled, displays a "🚀 API Endpoints" section in the public documentation sidebar
            </p>
          </div>
        </>
      )}

      {!isModal && (
        <>
          <Divider className={styles.divider} />
          <div className={styles.actions}>
            <Button onPress={handleSubmit} isLoading={isLoading} className={styles.buttonPrimary}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className={styles.container}>
        <div className="mt-4">
          {contentBody}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.editCard}>
        <div className="p-6 border-b border-[var(--docmate-border-color)]">
          <h3 className={styles.typeTitle}>Documentation Settings</h3>
        </div>
        <CardBody className="p-0">
          {contentBody}
        </CardBody>
      </Card>
    </div>
  );
};

export default DocumentationTypeSelector;
