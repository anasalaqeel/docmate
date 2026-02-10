import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
} from "@heroui/react";
import { SparklesIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@heroui/react";
import { toast } from "sonner";
import { usersService } from "../../../services/usersService";
import { parseZodErrors } from "../../../utils/errorHandlers";
import type { User, Role } from "../../../types/users";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (user: User) => void;
  roles: Role[];
}

export function CreateUserModal({ isOpen, onClose, onUserCreated, roles }: CreateUserModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    phone: "",
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

    setFormData({ ...formData, password: newPassword });
    toast.success("Password generated!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({});

    try {
      setIsLoading(true);
      const userData = {
        ...formData,
        roleIds: Array.from(selectedKeys).map((id) => parseInt(id)),
      };
      const newUser = await usersService.createUser(userData);
      toast.success("User created successfully!");
      onUserCreated(newUser);
      handleClose();
    } catch (error: unknown) {
      console.error("Create user error:", error);
      const zodErrors = parseZodErrors(error);
      if (Object.keys(zodErrors).length > 0) {
        setErrors(zodErrors);
        toast.error("Please fix the validation errors");
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to create user";
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedKeys(new Set([]));
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      phone: "",
    });
    setErrors({});
    onClose();
  };

  const handleRoleSelectionChange = (keys: unknown) => {
    if (keys === "all") {
      setSelectedKeys(new Set(roles.map((role) => role.id.toString())));
    } else {
      setSelectedKeys(new Set(Array.from(keys as Set<string>)));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        body: "max-h-[70vh] overflow-y-auto",
      }}
    >
      <ModalContent
        style={{ background: "var(--grud-surface)", border: "1px solid var(--grud-border-color)" }}
      >
        <ModalHeader className="text-[var(--grud-text)]">Create New User</ModalHeader>
        <ModalBody>
          <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                isRequired
                errorMessage={errors.name}
                isInvalid={!!errors.name}
                classNames={{
                  inputWrapper: "border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                  input: "text-[var(--grud-text)]",
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
                classNames={{
                  inputWrapper: "border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                  input: "text-[var(--grud-text)]",
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Password"
                type={isPasswordVisible ? "text" : "password"}
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                isRequired
                description="Must be at least 12 characters with uppercase, lowercase, number, and special character"
                errorMessage={errors.password}
                isInvalid={!!errors.password}
                autoComplete="new-password"
                classNames={{
                  inputWrapper: "border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                  input: "text-[var(--grud-text)]",
                }}
                endContent={
                  <div className="flex items-center gap-1">
                    <Tooltip content="Generate secure password">
                      <Button isIconOnly size="sm" variant="light" onPress={generatePassword}>
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
                label="Phone Number"
                type="tel"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                errorMessage={errors.phone}
                isInvalid={!!errors.phone}
                classNames={{
                  inputWrapper: "border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                  input: "text-[var(--grud-text)]",
                }}
              />
            </div>

            <Select
              classNames={{
                base: "max-w-xs",
                trigger:
                  "min-h-12 py-2 border-[var(--grud-border-color)] bg-[var(--grud-surface-alt)]",
                value: "text-[var(--grud-text)]",
              }}
              isMultiline={true}
              label="Roles"
              placeholder="Select roles"
              selectionMode="multiple"
              selectedKeys={selectedKeys}
              onSelectionChange={handleRoleSelectionChange}
              isRequired
              errorMessage={errors.roleIds}
              isInvalid={!!errors.roleIds}
              renderValue={(items) => {
                return (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <Chip
                        key={item.key}
                        variant="flat"
                        style={{
                          background: "rgba(var(--grud-primary-rgb, 102, 126, 234), 0.1)",
                          color: "var(--grud-primary)",
                        }}
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
                <SelectItem key={role.id.toString()}>{role.name}</SelectItem>
              ))}
            </Select>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" color="primary" isLoading={isLoading}>
            Create User
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
