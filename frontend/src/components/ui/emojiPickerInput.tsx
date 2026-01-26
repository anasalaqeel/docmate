import { Input, Button, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { FaceSmileIcon } from "@heroicons/react/24/outline";
import EmojiPicker from "emoji-picker-react";

interface EmojiPickerInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  labelPlacement?: "outside" | "inside" | "outside-left";
  variant?: "flat" | "bordered" | "faded" | "underlined";
  classNames?: {
    input?: string;
    inputWrapper?: string;
    label?: string;
    description?: string;
  };
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}

const EmojiPickerInput = ({
  label = "Icon",
  placeholder = "📝, 🎨, 🚀, 💡",
  value,
  onChange,
  description = "Add an emoji icon to personalize your item",
  labelPlacement = "outside",
  variant = "bordered",
  classNames = {},
  disabled = false,
  size = "md",
  isRequired = false,
  isInvalid = false,
  errorMessage,
}: EmojiPickerInputProps) => {
  const onEmojiClick = (emojiObject: any) => {
    onChange(emojiObject.emoji);
  };

  return (
    <Input
      label={label}
      labelPlacement={labelPlacement}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      variant={variant}
      description={description}
      disabled={disabled}
      size={size}
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      classNames={{
        input: `text-sm pr-12 text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50 ${classNames.input || ""}`,
        inputWrapper: `border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)] ${classNames.inputWrapper || ""}`,
        label: `text-[var(--grud-text)] ${classNames.label || ""}`,
        description: `text-[var(--grud-text-secondary)] ${classNames.description || ""}`,
      }}
      endContent={
        <Popover placement="bottom-end" offset={10}>
          <PopoverTrigger>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="opacity-40 hover:opacity-100 hover:text-[var(--grud-primary)] transition-colors"
              isDisabled={disabled}
            >
              <FaceSmileIcon className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 border border-[var(--grud-border-color)] bg-[var(--grud-surface)] shadow-xl overflow-hidden">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              previewConfig={{
                showPreview: false,
              }}
              searchPlaceholder="Search emojis..."
              height={350}
              width={320}
              theme={document.documentElement.classList.contains('dark') ? 'dark' as any : 'light' as any}
            />
          </PopoverContent>
        </Popover>
      }
    />
  );
};

export default EmojiPickerInput;