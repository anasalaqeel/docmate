import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import { UserIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { usersService } from "../../../services/usersService";
import { parseZodErrors } from "../../../utils/errorHandlers";
import type { User } from "../../../types/users";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (user: User) => void;
  user: User | null;
}

export function EditUserModal({ isOpen, onClose, onUserUpdated, user }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setErrors({});

    try {
      setIsLoading(true);
      const updatedUser = await usersService.updateUser(user.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
      });
      toast.success("User updated successfully!");
      onUserUpdated(updatedUser);
      handleClose();
    } catch (error: unknown) {
      console.error("Update user error:", error);
      const zodErrors = parseZodErrors(error);
      if (Object.keys(zodErrors).length > 0) {
        setErrors(zodErrors);
        toast.error("Please fix the validation errors");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to update user";
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", phone: "" });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl" placement="center">
      <ModalContent style={{ background: 'var(--grud-surface)', border: '1px solid var(--grud-border-color)' }}>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--grud-primary-rgb, 102, 126, 234), 0.1)' }}>
              <UserIcon className="w-6 h-6 text-[var(--grud-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--grud-text)]">Edit User</h2>
              <p className="text-sm" style={{ color: 'var(--grud-text-secondary)' }}>Update user information</p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              isRequired
              errorMessage={errors.name}
              isInvalid={!!errors.name}
              size="lg"
              classNames={{
                inputWrapper: "border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                input: "text-[var(--grud-text)]"
              }}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              isRequired
              errorMessage={errors.email}
              isInvalid={!!errors.email}
              size="lg"
              classNames={{
                inputWrapper: "border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                input: "text-[var(--grud-text)]"
              }}
            />
            <Input
              label="Phone Number"
              type="tel"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              errorMessage={errors.phone}
              isInvalid={!!errors.phone}
              size="lg"
              classNames={{
                inputWrapper: "border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                input: "text-[var(--grud-text)]"
              }}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" color="primary" isLoading={isLoading}>
            Update User
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
