import { Card, CardBody, Button, Tabs, Tab } from "@heroui/react";
import Switch from "./ui/Switch";
import { PaintBrushIcon, SunIcon, MoonIcon, SwatchIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { settingsService } from "../services/settingsService";
import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { THEME_DEFAULTS, getThemeFromSettings } from "../config/themeDefaults";
import type { ThemeSettings } from "../config/themeDefaults";
import { toast } from "sonner";
import ModeSettings from "./Theme/ModeSettings";
import TypographySettings from "./Theme/TypographySettings";
import RadiusSettings from "./Theme/RadiusSettings";

export default function ThemePanel() {
  const { refreshTheme } = useTheme();
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    light: { ...THEME_DEFAULTS.light },
    dark: { ...THEME_DEFAULTS.dark },
    options: { ...THEME_DEFAULTS.options },
    typography: { ...THEME_DEFAULTS.typography },
    radius: { ...THEME_DEFAULTS.borderRadius }
  });

  // Load initial values using a single fetch
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const allSettings = await settingsService.getAllSettings();
        const themeSettings = getThemeFromSettings(allSettings);
        
        setFormData({
          light: themeSettings.light,
          dark: themeSettings.dark,
          options: themeSettings.options,
          typography: themeSettings.typography,
          radius: themeSettings.borderRadius
        });
      } catch (error) {
        console.error("Failed to fetch theme settings:", error);
        toast.error("Failed to load theme settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const settings: Record<string, unknown> = {};

    // Light
    settings["theme.colors.primary"] = formData.light.primary;
    settings["theme.colors.secondary"] = formData.light.secondary;
    settings["theme.colors.success"] = formData.light.success;
    settings["theme.colors.warning"] = formData.light.warning;
    settings["theme.colors.danger"] = formData.light.danger;
    settings["theme.colors.background"] = formData.light.background;
    settings["theme.colors.text"] = formData.light.text;
    settings["theme.colors.gradient"] = formData.light.gradient;
    settings["theme.colors.gradientSubtle"] = formData.light.gradientSubtle;

    // Dark
    settings["theme.dark.colors.primary"] = formData.dark.primary;
    settings["theme.dark.colors.secondary"] = formData.dark.secondary;
    settings["theme.dark.colors.success"] = formData.dark.success;
    settings["theme.dark.colors.warning"] = formData.dark.warning;
    settings["theme.dark.colors.danger"] = formData.dark.danger;
    settings["theme.dark.colors.background"] = formData.dark.background;
    settings["theme.dark.colors.text"] = formData.dark.text;
    settings["theme.dark.colors.gradient"] = formData.dark.gradient;
    settings["theme.dark.colors.gradientSubtle"] = formData.dark.gradientSubtle;

    // Options
    settings["theme.options.usePrimaryGradient"] = formData.options.usePrimaryGradient;
    settings["theme.options.useSecondaryGradient"] = formData.options.useSecondaryGradient;

    // Shared
    settings["theme.typography.fontFamily"] = formData.typography.fontFamily;
    settings["theme.typography.headingFont"] = formData.typography.headingFont;
    settings["theme.typography.bodyFont"] = formData.typography.bodyFont;
    settings["theme.typography.codeFont"] = formData.typography.codeFont;
    
    settings["theme.borderRadius.small"] = formData.radius.small;
    settings["theme.borderRadius.medium"] = formData.radius.medium;
    settings["theme.borderRadius.large"] = formData.radius.large;

    const result = await settingsService.updateSettings(settings);
    if (result.success) {
      await refreshTheme();
      toast.success("Settings saved", {
        description: "Your theme preferences have been updated successfully.",
        icon: <CheckCircleIcon className="w-5 h-5 text-success" />
      });
    } else {
      toast.error("Save failed", {
        description: result.message || "An error occurred while saving theme settings.",
        icon: <ExclamationCircleIcon className="w-5 h-5 text-danger" />
      });
    }
    return result.success;
  };

  const updateLight = (key: keyof typeof THEME_DEFAULTS.light, val: string) => 
    setFormData(prev => ({ ...prev, light: { ...prev.light, [key]: val } }));

  const updateDark = (key: keyof typeof THEME_DEFAULTS.dark, val: string) => 
    setFormData(prev => ({ ...prev, dark: { ...prev.dark, [key]: val } }));

  const updateOption = (key: keyof typeof formData.options, val: boolean) =>
    setFormData(prev => ({ ...prev, options: { ...prev.options, [key]: val } }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--grud-primary)]"></div>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="p-0">
          <Tabs 
            aria-label="Theme Mode" 
            variant="underlined"
            classNames={{
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-[var(--grud-border-color)] px-6",
              cursor: "w-full bg-[var(--grud-primary)]",
              tab: "max-w-fit px-0 h-14",
              tabContent: "group-data-[selected=true]:text-[var(--grud-primary)] text-[var(--grud-text-secondary)]",
            }}
          >
            <Tab
              key="light"
              title={
                <div className="flex items-center gap-2">
                  <SunIcon className="w-4 h-4" />
                  <span>Light Mode</span>
                </div>
              }
            >
              <ModeSettings 
                mode="light" 
                data={formData.light} 
                options={formData.options} 
                updateFn={updateLight} 
              />
            </Tab>
            <Tab
              key="dark"
              title={
                <div className="flex items-center gap-2">
                  <MoonIcon className="w-4 h-4" />
                  <span>Dark Mode</span>
                </div>
              }
            >
              <ModeSettings 
                mode="dark" 
                data={formData.dark} 
                options={formData.options} 
                updateFn={updateDark} 
              />
            </Tab>
          </Tabs>
        </CardBody>
      </Card>

      {/* Gradients & Brand Options */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SwatchIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
              <h3 className="text-lg font-semibold">Gradients & Brand Options</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-[var(--grud-surface-alt)] border border-[var(--grud-border-color)]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Use Primary Gradient</span>
                <Switch 
                  isSelected={formData.options.usePrimaryGradient} 
                  onValueChange={(v: boolean) => updateOption("usePrimaryGradient", v)} 
                  size="sm"
                />
              </div>
              <p className="text-xs text-[var(--grud-text-secondary)]">Toggle between solid primary color and the gradient configured in each mode.</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Use Secondary Gradient</span>
                <Switch 
                  isSelected={formData.options.useSecondaryGradient} 
                  onValueChange={(v: boolean) => updateOption("useSecondaryGradient", v)} 
                  size="sm"
                />
              </div>
              <p className="text-xs text-[var(--grud-text-secondary)]">Toggle between solid secondary color and the secondary gradient in each mode.</p>
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* Typography Settings */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PaintBrushIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
            <h3 className="text-lg font-semibold">Typography</h3>
          </div>

          <TypographySettings 
            data={formData.typography} 
            onChange={(updates: Partial<typeof THEME_DEFAULTS.typography>) => setFormData(prev => ({ ...prev, typography: { ...prev.typography, ...updates } }))} 
          />
        </CardBody>
      </Card>

      {/* Border Radius Settings */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PaintBrushIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
            <h3 className="text-lg font-semibold">Border Radius</h3>
          </div>

          <RadiusSettings 
            data={formData.radius} 
            onChange={(key: keyof typeof THEME_DEFAULTS.borderRadius, val: string) => setFormData(prev => ({ ...prev, radius: { ...prev.radius, [key]: val } }))} 
          />
        </CardBody>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button 
          color="primary" 
          onPress={handleSave}
          className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 px-8"
        >
          Save Theme Settings
        </Button>
      </div>
    </div>
  );
}
