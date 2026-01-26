import React from "react";
import { Slider, Chip } from "@heroui/react";
import { THEME_DEFAULTS } from "../../config/themeDefaults";

interface RadiusSettingsProps {
  data: typeof THEME_DEFAULTS.borderRadius;
  onChange: (key: keyof typeof THEME_DEFAULTS.borderRadius, val: string) => void;
}

const RadiusSettings: React.FC<RadiusSettingsProps> = ({ data, onChange }) => {
  const renderSlider = (
    label: string, 
    key: keyof typeof THEME_DEFAULTS.borderRadius, 
    fallback: string, 
    step: number = 0.125
  ) => {
    const value = data[key] ?? fallback;
    return (
      <div key={key}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">{label}</label>
          <Chip size="sm" variant="flat" style={{ background: 'rgba(var(--grud-text-secondary-rgb, 100, 116, 139), 0.1)', color: 'var(--grud-text)' }}>
            {value}
          </Chip>
        </div>
        <Slider
          size="md"
          step={step}
          minValue={0}
          maxValue={2}
          value={parseFloat(value)}
          onChange={(v) => onChange(key, `${v}rem`)}
          formatOptions={{ style: "decimal" }}
          className="max-w-md"
          aria-label={label}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderSlider("Small Components", "small", "0.25rem", 0.25)}
      {renderSlider("Medium Components", "medium", "0.375rem")}
      {renderSlider("Large Components", "large", "0.5rem")}
    </div>
  );
};

export default RadiusSettings;
