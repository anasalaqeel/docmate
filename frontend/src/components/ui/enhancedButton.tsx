import { Button, Spinner } from "@heroui/react";
import { type ReactNode, forwardRef, useEffect } from "react";
import { motion } from "framer-motion";
import { css } from "@emotion/css";

interface EnhancedButtonProps {
  // Base button props
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  size?: "sm" | "md" | "lg";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  className?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  startContent?: ReactNode;
  endContent?: ReactNode;
  onPress?: () => void;
  onClick?: () => void;
  as?: unknown;
  to?: string;
  href?: string;
  isIconOnly?: boolean;

  // Enhanced props
  loadingText?: string;
  successText?: string;
  showSuccessState?: boolean;
  successDuration?: number;
  onSuccessComplete?: () => void;
  animate?: boolean;
  icon?: ReactNode;
  successIcon?: ReactNode;
}

export const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (
    {
      children,
      isLoading = false,
      loadingText,
      successText,
      showSuccessState = false,
      successDuration,
      onSuccessComplete,
      animate = true,
      icon,
      successIcon,
      startContent,
      endContent,
      as,
      to,
      href,
      ...props
    },
    ref
  ) => {
    useEffect(() => {
      if (showSuccessState && successDuration != null && successDuration > 0) {
        const timer = setTimeout(() => {
          onSuccessComplete?.();
        }, successDuration);

        return () => clearTimeout(timer);
      }
    }, [showSuccessState, successDuration, onSuccessComplete]);
    const buttonContent = () => {
      if (isLoading) {
        return (
          <div className={styles.loadingContent}>
            <Spinner size="sm" color="current" />
            {loadingText || "Loading..."}
          </div>
        );
      }

      if (showSuccessState) {
        return (
          <div className={styles.successContent}>
            {successIcon || "✓"}
            {successText || "Success!"}
          </div>
        );
      }

      return (
        <div className={styles.contentWrapper}>
          {icon && <span className={styles.icon}>{icon}</span>}
          {children}
        </div>
      );
    };

    const ButtonComponent = animate ? motion.div : "div";

    const motionProps = animate
      ? {
          whileTap: { scale: 0.98 },
          whileHover: { scale: 1.02 },
          transition: { duration: 0.1 },
        }
      : {};

    if (animate) {
      return (
        <ButtonComponent {...motionProps} className={styles.motionWrapper}>
          <Button
            ref={ref}
            {...props}
            as={as as undefined}
            to={to}
            href={href}
            isLoading={false}
            startContent={!isLoading && !showSuccessState ? startContent : undefined}
            endContent={!isLoading && !showSuccessState ? endContent : undefined}
            className={`${styles.enhancedButton} ${props.className || ""}`}
          >
            {buttonContent()}
          </Button>
        </ButtonComponent>
      );
    }

    return (
      <Button
        ref={ref}
        {...props}
        as={as as undefined}
        to={to}
        href={href}
        isLoading={false}
        startContent={!isLoading && !showSuccessState ? startContent : undefined}
        endContent={!isLoading && !showSuccessState ? endContent : undefined}
        className={`${styles.enhancedButton} ${props.className || ""}`}
      >
        {buttonContent()}
      </Button>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

// Emotion CSS styles
const styles = {
  enhancedButton: css`
    transition: all 0.2s ease-in-out;
    min-height: 40px;

    &:hover {
      opacity: 0.9 !important;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  `,

  contentWrapper: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `,

  loadingContent: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `,

  successContent: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `,

  motionWrapper: css`
    display: inline-flex;
    padding: 0;
    border: none;
    background: transparent;
  `,

  icon: css`
    display: flex;
    align-items: center;
  `
};
