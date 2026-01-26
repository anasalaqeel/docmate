import React from "react";
import ColorPicker from "../ColorPicker";
import GradientInput from "../GradientInput";
import { THEME_DEFAULTS } from "../../config/themeDefaults";

interface ModeSettingsProps {
  mode: "light" | "dark";
  data: typeof THEME_DEFAULTS.light;
  options: typeof THEME_DEFAULTS.options;
  updateFn: (key: keyof typeof THEME_DEFAULTS.light, val: string) => void;
}

const ModeSettings: React.FC<ModeSettingsProps> = ({ mode, data, options, updateFn }) => (
  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
    <ColorPicker
      label={options.usePrimaryGradient ? "Primary Brand Color" : "Primary"}
      value={data.primary}
      onChange={(v) => updateFn("primary", v)}
      isAccentMode={options.usePrimaryGradient}
      description={options.usePrimaryGradient
        ? `Brand color for icons, links, and interactive elements when gradient is used in ${mode} mode.`
        : `Main brand color for buttons, backgrounds, and links in ${mode} mode.`}
    />
    <ColorPicker
      label={options.useSecondaryGradient ? "Secondary Brand Color" : "Secondary"}
      value={data.secondary}
      onChange={(v) => updateFn("secondary", v)}
      isAccentMode={options.useSecondaryGradient}
      description={options.useSecondaryGradient
        ? `Secondary brand color for subtle accents and icons in ${mode} mode when gradient is used.`
        : `Secondary brand color for subtle accents and backgrounds in ${mode} mode.`}
    />
    <ColorPicker 
      label="Success" 
      value={data.success} 
      onChange={(v) => updateFn("success", v)} 
      description={`Color for positive actions and success states in ${mode} mode.`}
    />
    <ColorPicker 
      label="Warning" 
      value={data.warning} 
      onChange={(v) => updateFn("warning", v)} 
      description={`Color for cautionary alerts and pending states in ${mode} mode.`}
    />
    <ColorPicker 
      label="Danger" 
      value={data.danger} 
      onChange={(v) => updateFn("danger", v)} 
      description={`Color for destructive actions and error states in ${mode} mode.`}
    />
    <ColorPicker
      label="Background"
      value={data.background}
      onChange={(v) => updateFn("background", v)}
      description={`Primary background color for the application shell in ${mode} mode.`}
    />
    <ColorPicker
      label="Content Text"
      value={data.text}
      onChange={(v) => updateFn("text", v)}
      description={`Primary text color for headlines, paragraphs, and content in ${mode} mode.`}
    />
    
    <div className="col-span-full pt-4 border-t border-[var(--grud-border-color)]">
      <h4 className="text-sm font-semibold mb-4 text-[var(--grud-text-secondary)]">
        {mode === "light" ? "Light" : "Dark"} Mode Gradients
      </h4>
      <div className="space-y-6">
        <GradientInput 
          label="Primary Gradient" 
          value={data.gradient} 
          onChange={(v) => updateFn("gradient", v)} 
          isDisabled={!options.usePrimaryGradient}
          disabledMessage="Enable 'Use Primary Gradient' in Options to edit."
        />
        <GradientInput 
          label="Secondary Gradient" 
          value={data.gradientSubtle} 
          onChange={(v) => updateFn("gradientSubtle", v)}
          isDisabled={!options.useSecondaryGradient}
          disabledMessage="Enable 'Use Secondary Gradient' in Options to edit."
        />
      </div>
    </div>
  </div>
);

export default ModeSettings;
