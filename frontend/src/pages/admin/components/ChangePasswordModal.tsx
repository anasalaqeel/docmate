import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import { KeyIcon, EyeIcon, EyeSlashIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@heroui/react";
import { toast } from "sonner";
import { usersService } from "../../../services/usersService";
import { parseZodErrors } from "../../../utils/errorHandlers";
import type { User } from "../../../types/users";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function ChangePasswordModal({ isOpen, onClose, user }: ChangePasswordModalProps) {
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const generatePassword = () => {
    const length = 12;
    const charsetLower = "abcdefghijklmnopqrstuvwxyz";
    const charsetUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const charsetNumbers = "0123456789";
    const charsetSpecial = "@#$";

    let password = "";
    password += charsetLower[Math.floor(Math.random() * charsetLower.length)];
    password += charsetUpper[Math.floor(Math.random() * charsetUpper.length)];
    password += charsetNumbers[Math.floor(Math.random() * charsetNumbers.length)];
    password += charsetSpecial[Math.floor(Math.random() * charsetSpecial.length)];

    const easyChars = charsetLower + charsetUpper + charsetNumbers;
    for (let i = password.length; i < length; i++) {
      password += easyChars[Math.floor(Math.random() * easyChars.length)];
    }

    const newPassword = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    setPasswordForm({ newPassword, confirmPassword: newPassword });
    toast.success("Password generated!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setErrors({});

    try {
      setIsLoading(true);
      await usersService.adminResetUserPassword(user.id, {
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      toast.success("Password changed successfully!");
      handleClose();
    } catch (error: unknown) {
      console.error("Password change error:", error);
      const zodErrors = parseZodErrors(error);
      if (Object.keys(zodErrors).length > 0) {
        setErrors(zodErrors);
        toast.error("Please fix the validation errors");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to change password";
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" placement="center">
      <ModalContent style={{ background: 'var(--docmate-surface)', border: '1px solid var(--docmate-border-color)' }}>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--docmate-error-rgb), 0.1)' }}>
              <KeyIcon className="w-6 h-6 text-[var(--docmate-error)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--docmate-text)]">Change Password</h2>
              <p className="text-sm" style={{ color: 'var(--docmate-text-secondary)' }}>
                For: {user?.name} ({user?.email})
              </p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Enter new password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              isRequired
              description="Must be at least 12 characters with uppercase, lowercase, number, and special character"
              errorMessage={errors.newPassword}
              isInvalid={!!errors.newPassword}
              autoComplete="new-password"
              size="lg"
              classNames={{
                inputWrapper: "border-[var(--docmate-border-color)] bg-[var(--docmate-surface-alt)]",
                input: "text-[var(--docmate-text)]"
              }}
              endContent={
                <div className="flex items-center gap-1">
                  <Tooltip content="Generate secure password">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={generatePassword}
                    >
                      <SparklesIcon className="w-4 h-4 opacity-40" />
                    </Button>
                  </Tooltip>
                  <Tooltip content={isPasswordVisible ? "Hide password" : "Show password"}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                      {isPasswordVisible ? (
                        <EyeSlashIcon className="w-4 h-4 opacity-40" />
                      ) : (
                        <EyeIcon className="w-4 h-4 opacity-40" />
                      )}
                    </Button>
                  </Tooltip>
                </div>
              }
            />
            <Input
              label="Confirm Password"
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              isRequired
              errorMessage={errors.confirmPassword}
              isInvalid={!!errors.confirmPassword}
              autoComplete="new-password"
              size="lg"
              classNames={{
                inputWrapper: "border-[var(--docmate-border-color)] bg-[var(--docmate-surface-alt)]",
                input: "text-[var(--docmate-text)]"
              }}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="change-password-form"
            color="primary"
            isLoading={isLoading}
            startContent={<KeyIcon className="w-4 h-4" />}
          >
            Change Password
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
