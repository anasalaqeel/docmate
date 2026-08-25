import React from "react";
import ColorPicker from "../ColorPicker";
import { THEME_DEFAULTS } from "../../config/themeDefaults";

interface ModeSettingsProps {
  mode: "light" | "dark";
  data: typeof THEME_DEFAULTS.light;
  options: typeof THEME_DEFAULTS.options;
  updateFn: (key: keyof typeof THEME_DEFAULTS.light, val: string) => void;
}

const ModeSettings: React.FC<ModeSettingsProps> = ({ mode, data, updateFn }) => (
  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
    <ColorPicker
      label="Primary"
      value={data.primary}
      onChange={(v) => updateFn("primary", v)}
      description={`Main brand color for buttons, backgrounds, and links in ${mode} mode.`}
    />
    <ColorPicker
      label="Secondary"
      value={data.secondary}
      onChange={(v) => updateFn("secondary", v)}
      description={`Secondary brand color for subtle accents and backgrounds in ${mode} mode.`}
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
  </div>
);

export default ModeSettings;
