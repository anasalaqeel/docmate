import React, { useState, useEffect, useId } from "react";
import styles from "./Switch.module.css";

export interface SwitchProps {
  isSelected?: boolean;
  defaultSelected?: boolean;
  onValueChange?: (value: boolean) => void;
  isDisabled?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "success" | "warning" | "danger";
  className?: string;
  classNames?: {
    base?: string;
    wrapper?: string;
    track?: string;
    thumb?: string;
    label?: string;
  };
  style?: React.CSSProperties;
  children?: React.ReactNode;
  name?: string;
  value?: string;
}

const Switch = ({
  isSelected,
  defaultSelected = false,
  onValueChange,
  isDisabled = false,
  size = "md",
  color = "primary",
  className = "",
  classNames = {},
  style,
  children,
  name,
  value,
}: SwitchProps) => {
  const [internalSelected, setInternalSelected] = useState(defaultSelected);
  const isControlled = isSelected !== undefined;
  const currentSelected = isControlled ? isSelected : internalSelected;
  const id = useId();

  useEffect(() => {
    if (!isControlled && defaultSelected !== undefined) {
      setInternalSelected(defaultSelected);
    }
  }, [defaultSelected, isControlled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;
    const newValue = e.target.checked;
    if (!isControlled) {
      setInternalSelected(newValue);
    }
    onValueChange?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const newValue = !currentSelected;
      if (!isControlled) {
        setInternalSelected(newValue);
      }
      onValueChange?.(newValue);
    }
  };

  return (
    <label
      className={`
        ${styles.switchBase}
        ${styles[size]}
        ${styles[color]}
        ${currentSelected ? styles.selected : ""}
        ${isDisabled ? styles.disabled : ""}
        ${className}
        ${classNames.base || ""}
      `}
      style={style}
      htmlFor={id}
    >
      <div className={`${styles.wrapper} ${classNames.wrapper || ""}`}>
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={currentSelected}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          name={name}
          value={value}
          aria-checked={currentSelected}
          role="switch"
        />
        <span className={`${styles.track} ${classNames.track || ""}`}>
          <span className={`${styles.thumb} ${classNames.thumb || ""}`} />
        </span>
      </div>
      {children && (
        <span className={`${styles.label} ${classNames.label || ""}`}>{children}</span>
      )}
    </label>
  );
};

export default Switch;
