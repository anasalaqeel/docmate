import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Chip,
} from "@heroui/react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { usersService } from "../../../services/usersService";
import { parseZodErrors } from "../../../utils/errorHandlers";
import type { User, Role } from "../../../types/users";

interface ManageRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRolesUpdated: (user: User) => void;
  user: User | null;
  roles: Role[];
}

export function ManageRolesModal({ isOpen, onClose, onRolesUpdated, user, roles }: ManageRolesModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when user changes
  useEffect(() => {
    if (user && isOpen) {
      const currentRoleIds = user.userRoles?.map((ur) => ur.role.id.toString()) || [];
      setSelectedKeys(new Set(currentRoleIds));
      setErrors({});
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    setErrors({});

    if (selectedKeys.size === 0) {
      setErrors({ roleIds: "At least one role must be assigned" });
      toast.error("Please select at least one role");
      return;
    }

    try {
      setIsLoading(true);
      const roleIds = Array.from(selectedKeys).map((id) => parseInt(id));
      const updatedUser = await usersService.assignRolesToUser(user.id, roleIds);
      toast.success("Roles updated successfully!");
      onRolesUpdated(updatedUser);
      handleClose();
    } catch (error: unknown) {
      console.error("Update roles error:", error);
      const zodErrors = parseZodErrors(error);
      if (Object.keys(zodErrors).length > 0) {
        setErrors(zodErrors);
        toast.error("Please fix the validation errors");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to update roles";
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedKeys(new Set([]));
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" placement="center">
      <ModalContent style={{ background: 'var(--grud-surface)', border: '1px solid var(--grud-border-color)' }}>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--grud-primary-rgb, 102, 126, 234), 0.1)' }}>
              <ShieldCheckIcon className="w-6 h-6 text-[var(--grud-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--grud-text)]">Manage Roles</h2>
              <p className="text-sm" style={{ color: 'var(--grud-text-secondary)' }}>
                For: {user?.name} ({user?.email})
              </p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          <form id="manage-roles-form" onSubmit={handleSubmit} className="space-y-4">
            <Select
              classNames={{
                base: "max-w-xs",
                trigger: "min-h-12 py-2 border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                value: "text-[var(--grud-text)]"
              }}
              isMultiline={true}
              label="Assign Roles"
              placeholder="Select roles"
              selectionMode="multiple"
              selectedKeys={selectedKeys}
              onSelectionChange={(keys) => {
                if (keys === "all") {
                  setSelectedKeys(new Set(roles.map((r) => r.id.toString())));
                } else {
                  setSelectedKeys(keys as Set<string>);
                }
              }}
              isRequired
              errorMessage={errors.roleIds}
              isInvalid={!!errors.roleIds}
              size="lg"
              renderValue={(items) => {
                return (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <Chip 
                        key={item.key} 
                        variant="flat" 
                        style={{ background: 'rgba(var(--grud-primary-rgb, 102, 126, 234), 0.1)', color: 'var(--grud-primary)' }}
                        startContent={<ShieldCheckIcon className="w-3 h-3" />}
                      >
                        {item.textValue}
                      </Chip>
                    ))}
                  </div>
                );
              }}
            >
              {roles.map((role) => (
                <SelectItem key={role.id.toString()}>
                  {role.name}
                </SelectItem>
              ))}
            </Select>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="manage-roles-form"
            color="primary"
            isLoading={isLoading}
            startContent={<ShieldCheckIcon className="w-4 h-4" />}
          >
            Update Roles
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
