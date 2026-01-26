import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { toast } from "sonner";
import { usersService } from "../../../services/usersService";
import type { User } from "../../../types/users";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted: (userId: number) => void;
  user: User | null;
}

export function DeleteUserModal({ isOpen, onClose, onUserDeleted, user }: DeleteUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      await usersService.deleteUser(user.id);
      toast.success("User deleted successfully!");
      onUserDeleted(user.id);
      handleClose();
    } catch (error: unknown) {
      console.error("Delete user error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" placement="center">
      <ModalContent style={{ background: 'var(--grud-surface)', border: '1px solid var(--grud-border-color)' }}>
        <ModalHeader className="text-[var(--grud-text)]">Confirm Delete</ModalHeader>
        <ModalBody>
          <p className="text-[var(--grud-text)]">Are you sure you want to delete "{user?.name}"?</p>
          <p className="text-sm font-medium" style={{ color: 'var(--grud-error)' }}>This action cannot be undone.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose} className="text-[var(--grud-text-secondary)]">
            Cancel
          </Button>
          <Button 
            className="bg-[var(--grud-error)] text-white hover:opacity-90"
            onPress={handleDelete} 
            isLoading={isLoading}
          >
            Delete
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
