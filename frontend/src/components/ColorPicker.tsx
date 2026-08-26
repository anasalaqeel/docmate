import React from "react";
import { Input, Tooltip } from "@heroui/react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

// Simple hex color validation
const isValidHexColor = (color: string): boolean => {
  if (!color) return false;
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

export interface ColorPickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  description?: string;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  variant?: "flat" | "bordered" | "faded" | "underlined";
  className?: string;
  error?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isAccentMode?: boolean;
  disabledMessage?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  description,
  placeholder = "#000000",
  size = "sm",
  variant = "bordered",
  className = "",
  error,
  isInvalid: externalInvalid,
  isDisabled,
  isAccentMode,
  disabledMessage,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  // Validate hex color format
  const isInvalidFormat = React.useMemo(() => {
    if (!value || value === "") return false;
    return !isValidHexColor(value);
  }, [value]);

  const isInvalid = externalInvalid || !!error || isInvalidFormat;

  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <label className={`block text-sm font-medium transition-colors ${(isDisabled && !isAccentMode) ? "text-[var(--docmate-primary)]" : "text-[var(--docmate-text)]"}`}>
            {label}
          </label>
          {description && (
            <Tooltip content={description} placement="right" showArrow closeDelay={0}>
              <InformationCircleIcon className="w-4 h-4 text-[var(--docmate-text-secondary)] cursor-help" />
            </Tooltip>
          )}
        </div>
        {(isDisabled || isAccentMode) && (
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isAccentMode ? "bg-[var(--docmate-success)]/10 text-[var(--docmate-success)] border-[var(--docmate-success)]/20" : "bg-[var(--docmate-primary)]/10 text-[var(--docmate-primary)] border-[var(--docmate-primary)]/20"}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isAccentMode ? "Accent" : "In Use"}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          description={(isDisabled && !isAccentMode) ? undefined : description}
          variant={(isDisabled && !isAccentMode) ? "flat" : variant}
          size={size}
          isReadOnly={isDisabled && !isAccentMode}
          className={`flex-1 ${className}`}
          color={isInvalidFormat ? "danger" : ((isDisabled && !isAccentMode) ? "primary" : undefined)}
          isInvalid={isInvalid}
          errorMessage={isInvalidFormat ? "Please enter a valid hex color (e.g., #ff5733 or #f53)" : error}
          classNames={{
            inputWrapper: (isDisabled && !isAccentMode) ? "bg-[var(--docmate-surface-alt)] border-dashed border-[var(--docmate-primary)]/30 cursor-default" : "",
            input: (isDisabled && !isAccentMode) ? "cursor-default text-[var(--docmate-text-secondary)]" : "",
          }}
          startContent={
            <div
              className={`w-5 h-5 rounded-sm border border-default-300 relative overflow-hidden ${(isDisabled && !isAccentMode) ? "opacity-80" : ""}`}
              style={{ backgroundColor: (value && !isInvalidFormat) ? value : "#000000" }}
            >
              {!(isDisabled && !isAccentMode) && (
                <input
                  type="color"
                  value={isValidHexColor(value || "") ? value : "#000000"}
                  onChange={handleInputChange}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0 border-0 p-0 m-0 bg-transparent"
                  title="Choose color"
                />
              )}
            </div>
          }
        />
      </div>
      {(isDisabled && !isAccentMode) && disabledMessage && (
        <p className="text-xs text-[var(--docmate-primary)] font-medium bg-[var(--docmate-primary)]/5 p-2 rounded-lg border border-[var(--docmate-primary)]/10">
          ✨ {disabledMessage}
        </p>
      )}
    </div>
  );
};

export default ColorPicker;
