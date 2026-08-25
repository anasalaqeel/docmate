import { Input, Textarea } from '@heroui/react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { forwardRef, type ReactNode } from 'react';
import { css } from '@emotion/css';

interface EnhancedInputProps {
  // Base input props
  type?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'flat' | 'bordered' | 'underlined' | 'faded';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  classNames?: Record<string, string>;
  startContent?: ReactNode;
  endContent?: ReactNode;
  description?: string;
  autoComplete?: string;
  
  // Enhanced props
  error?: string;
  success?: boolean;
  successMessage?: string;
  helpText?: string;
  icon?: ReactNode;
}

interface EnhancedTextareaProps {
  // Base textarea props
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'flat' | 'bordered' | 'underlined' | 'faded';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  classNames?: Record<string, string>;
  description?: string;
  minRows?: number;
  maxRows?: number;
  
  // Enhanced props
  error?: string;
  success?: boolean;
  successMessage?: string;
  helpText?: string;
}

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(({
  error,
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
  const getValidationState = (): "valid" | "invalid" | undefined => {
    if (error) return 'invalid';
    if (success) return 'valid';
    return undefined;
  };

  const getEndContent = () => {
    if (error) {
      return <ExclamationCircleIcon className={styles.errorIcon} />;
    }
    if (success) {
      return <CheckCircleIcon className={styles.successIcon} />;
    }
    return endContent;
  };

  const getDescription = () => {
    if (error) return error;
    if (success && successMessage) return successMessage;
    if (helpText) return helpText;
    return description;
  };

  return (
    <Input
      ref={ref}
      {...props}
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
        } ${error ? styles.inputWrapperError : ''}`,
      }}
    />
  );
});

export const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(({
  error,
  success,
  successMessage,
  helpText,
  description,
  classNames,
  ...props
}, ref) => {
  const getValidationState = (): "valid" | "invalid" | undefined => {
    if (error) return 'invalid';
    if (success) return 'valid';
    return undefined;
  };

  const getDescription = () => {
    if (error) return error;
    if (success && successMessage) return successMessage;
    if (helpText) return helpText;
    return description;
  };

  return (
    <Textarea
      ref={ref}
      {...props}
      validationState={getValidationState()}
      description={getDescription()}
      className={`${styles.enhancedTextarea} ${props.className || ''}`}
      classNames={{
        ...classNames,
        base: `${styles.base} ${classNames?.base || ''}`,
        input: `${styles.input} ${classNames?.input || ''}`,
        inputWrapper: `${styles.inputWrapper} ${classNames?.inputWrapper || ''} ${
          success ? styles.inputWrapperSuccess : ''
        } ${error ? styles.inputWrapperError : ''}`,
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