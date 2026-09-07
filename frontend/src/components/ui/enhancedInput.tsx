import { Input, Textarea, type InputProps, type TextAreaProps } from '@heroui/react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { forwardRef, type ReactNode } from 'react';
import { css } from '@emotion/css';

export interface EnhancedInputProps extends InputProps {
  // Enhanced props
  error?: string;
  success?: boolean;
  successMessage?: string;
  helpText?: string;
  icon?: ReactNode;
}

export interface EnhancedTextareaProps extends TextAreaProps {
  // Enhanced props
  error?: string;
  success?: boolean;
  successMessage?: string;
  helpText?: string;
}

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(({
  error,
  errorMessage,
  isInvalid,
  success,
  successMessage,
  helpText,
  icon,
  startContent,
  endContent,
  description,
  classNames,
  ...props
}, ref) => {
  const actualError = error || (typeof errorMessage === 'string' ? errorMessage : undefined);
  const actualIsInvalid = isInvalid || !!actualError;

  const getValidationState = (): "valid" | "invalid" | undefined => {
    if (actualIsInvalid) return 'invalid';
    if (success) return 'valid';
    return props.validationState as "valid" | "invalid" | undefined;
  };

  const getEndContent = () => {
    let validationIcon = null;
    if (actualIsInvalid) {
      validationIcon = <ExclamationCircleIcon className={styles.errorIcon} />;
    } else if (success) {
      validationIcon = <CheckCircleIcon className={styles.successIcon} />;
    }

    if (validationIcon && endContent) {
      return (
        <div className="flex items-center gap-2">
          {endContent}
          {validationIcon}
        </div>
      );
    }

    return validationIcon || endContent;
  };

  const getDescription = () => {
    // If the caller uses native errorMessage instead of description, don't double render it in description
    if (actualError && !errorMessage) return actualError;
    if (success && successMessage) return successMessage;
    if (helpText) return helpText;
    return description;
  };

  return (
    <Input
      ref={ref}
      {...props}
      isInvalid={actualIsInvalid}
      errorMessage={actualError || errorMessage}
      validationState={getValidationState()}
      startContent={icon || startContent}
      endContent={getEndContent()}
      description={getDescription()}
      className={`${styles.enhancedInput} ${props.className || ''}`}
      classNames={{
        ...classNames,
        base: `${styles.base} ${classNames?.base || ''}`,
        input: `${styles.input} ${classNames?.input || ''}`,
        inputWrapper: `${styles.inputWrapper} ${classNames?.inputWrapper || ''} ${
          success ? styles.inputWrapperSuccess : ''
        } ${actualIsInvalid ? styles.inputWrapperError : ''}`,
      }}
    />
  );
});

export const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(({
  error,
  errorMessage,
  isInvalid,
  success,
  successMessage,
  helpText,
  description,
  classNames,
  ...props
}, ref) => {
  const actualError = error || (typeof errorMessage === 'string' ? errorMessage : undefined);
  const actualIsInvalid = isInvalid || !!actualError;

  const getValidationState = (): "valid" | "invalid" | undefined => {
    if (actualIsInvalid) return 'invalid';
    if (success) return 'valid';
    return props.validationState as "valid" | "invalid" | undefined;
  };

  const getDescription = () => {
    if (actualError && !errorMessage) return actualError;
    if (success && successMessage) return successMessage;
    if (helpText) return helpText;
    return description;
  };

  return (
    <Textarea
      ref={ref}
      {...props}
      isInvalid={actualIsInvalid}
      errorMessage={actualError || errorMessage}
      validationState={getValidationState()}
      description={getDescription()}
      className={`${styles.enhancedTextarea} ${props.className || ''}`}
      classNames={{
        ...classNames,
        base: `${styles.base} ${classNames?.base || ''}`,
        input: `${styles.input} ${classNames?.input || ''}`,
        inputWrapper: `${styles.inputWrapper} ${classNames?.inputWrapper || ''} ${
          success ? styles.inputWrapperSuccess : ''
        } ${actualIsInvalid ? styles.inputWrapperError : ''}`,
      }}
    />
  );
});

EnhancedInput.displayName = 'EnhancedInput';
EnhancedTextarea.displayName = 'EnhancedTextarea';

// Emotion CSS styles
const styles = {
  enhancedInput: css`
    transition: all 0.2s ease-in-out;

    &:focus-within {
      transform: translateY(-1px);
    }
  `,

  enhancedTextarea: css`
    transition: all 0.2s ease-in-out;

    &:focus-within {
      transform: translateY(-1px);
    }
  `,

  base: css`
    transition: all 0.2s ease-in-out;
  `,

  input: css`
    transition: all 0.2s ease-in-out;
  `,

  inputWrapper: css`
    transition: all 0.2s ease-in-out;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      inset: -2px;
      background: var(--heroui-primary);
      border-radius: inherit;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      z-index: -1;
    }

    &:hover::after {
      opacity: 0.1;
    }
  `,

  inputWrapperSuccess: css`
    border-color: var(--heroui-success) !important;
    box-shadow: 0 0 0 1px var(--heroui-success);
  `,

  inputWrapperError: css`
    border-color: var(--heroui-danger) !important;
    box-shadow: 0 0 0 1px var(--heroui-danger);
  `,

  errorIcon: css`
    width: 1rem;
    height: 1rem;
    color: var(--heroui-danger);
    animation: fadeIn 0.2s ease-in-out;
  `,

  successIcon: css`
    width: 1rem;
    height: 1rem;
    color: var(--heroui-success);
    animation: fadeIn 0.2s ease-in-out;
  `
};