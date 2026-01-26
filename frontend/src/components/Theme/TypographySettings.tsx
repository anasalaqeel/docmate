import React from "react";
import { Select, SelectItem } from "@heroui/react";
import { THEME_DEFAULTS } from "../../config/themeDefaults";

interface TypographySettingsProps {
  data: typeof THEME_DEFAULTS.typography;
  onChange: (updates: Partial<typeof THEME_DEFAULTS.typography>) => void;
}

const FONTS = [
  { key: "Inter", label: "Inter" },
  { key: "Roboto", label: "Roboto" },
  { key: "Open Sans", label: "Open Sans" },
  { key: "Lato", label: "Lato" },
  { key: "Poppins", label: "Poppins" },
  { key: "Ubuntu", label: "Ubuntu" },
  { key: "system-ui", label: "System UI" },
];

const CODE_FONTS = [
  { key: "JetBrains Mono", label: "JetBrains Mono" },
  { key: "Fira Code", label: "Fira Code" },
  { key: "Source Code Pro", label: "Source Code Pro" },
  { key: "IBM Plex Mono", label: "IBM Plex Mono" },
  { key: "monospace", label: "Monospace" },
];

const TypographySettings: React.FC<TypographySettingsProps> = ({ data, onChange }) => {
  const renderSelect = (
    label: string, 
    value: string, 
    key: keyof typeof THEME_DEFAULTS.typography, 
    items: typeof FONTS, 
    description: string
  ) => (
    <Select
      items={items}
      label={label}
      placeholder={`Select ${label.toLowerCase()}`}
      selectedKeys={value ? [value.split(',')[0].trim()] : []}
      onSelectionChange={(keys) => {
        const newVal = Array.from(keys)[0] as string;
        if (!newVal) return;
        
        if (key === "fontFamily") {
           // Cascade if matching or default
           const updates: any = { fontFamily: newVal };
           if (data.headingFont === data.fontFamily || !data.headingFont || data.headingFont === 'system-ui') {
             updates.headingFont = newVal;
           }
           if (data.bodyFont === data.fontFamily || !data.bodyFont || data.bodyFont === 'system-ui') {
             updates.bodyFont = newVal;
           }
           onChange(updates);
        } else {
          onChange({ [key]: newVal });
        }
      }}
      description={description}
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
  );

  return (
    <div className="space-y-4">
      {renderSelect("Base Font Family", data.fontFamily, "fontFamily", FONTS, "Default font for application")}
      {renderSelect("Heading Font", data.headingFont, "headingFont", FONTS, "Font for headings and titles")}
      {renderSelect("Body Font", data.bodyFont, "bodyFont", FONTS, "Font for body text and paragraphs")}
      {renderSelect("Code Font", data.codeFont, "codeFont", CODE_FONTS, "Font for code blocks and technical content")}
    </div>
  );
};

export default TypographySettings;
