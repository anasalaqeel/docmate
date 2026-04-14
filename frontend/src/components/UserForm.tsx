import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Input, Select, SelectItem, Divider, Chip } from "@heroui/react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { usersService } from "../services/usersService";
import type { Role, CreateUserData } from "../types/users";
import { toast } from "sonner";

interface UserFormData {
  name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  roleIds: number[];
}

interface UserFormErrors {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  phone?: string;
  roleIds?: string;
}

interface UserFormProps {
  user?: {
    name?: string;
    username?: string;
    email?: string;
    phone?: string;
    userRoles?: Array<{ role: { id: number } }>;
  };
  isEditing?: boolean;
}

export interface UserFormRef {
  getFormData: () => CreateUserData;
  getUpdateData: () => Omit<CreateUserData, "password">;
  isFormValid: () => boolean;
}

const UserForm = forwardRef<UserFormRef, UserFormProps>(({ user, isEditing = false }, ref) => {
  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(true);
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    username: "",
    email: "",
    password: "",
    phone: "",
    roleIds: [],
  });
  const [errors, setErrors] = useState<UserFormErrors>({});

  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const roles = await usersService.getAllRoles();
        setRoles(roles);
      } catch {
        toast.error("Failed to load roles");
      } finally {
        setLoadingRoles(false);
      }
    };
    loadRoles();
  }, []);

  // Update form data when user prop changes (for edit mode)
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        password: "",
        phone: user.phone || "",
        roleIds: user.userRoles?.map((ur) => ur.role.id) || [],
      });
    }
  }, [user]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: UserFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!isEditing && !formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.phone && !/^[+]?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditing]);

  // Event handlers
  const handleInputChange = (field: keyof UserFormData, value: string | number[]) => {
    setFormData((prev: UserFormData) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Expose methods to parent component via ref
  useImperativeHandle(
    ref,
    () => ({
      getFormData: (): CreateUserData => {
        return {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          roleIds: formData.roleIds,
        };
      },
      getUpdateData: () => {
        return {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password || undefined,
          phone: formData.phone,
          roleIds: formData.roleIds,
        };
      },
      isFormValid: () => validateForm(),
    }),
    [formData, validateForm]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="Full Name"
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            errorMessage={errors.name}
            isInvalid={!!errors.name}
            isRequired
          />
        </div>
        <div>
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            errorMessage={errors.email}
            isInvalid={!!errors.email}
            isRequired
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="Password"
            type="password"
            placeholder={isEditing ? "Leave blank to keep current password" : "Enter password"}
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            errorMessage={errors.password}
            isInvalid={!!errors.password}
            isRequired={!isEditing}
          />
        </div>
        <div>
          <Input
            label="Phone Number"
            placeholder="Enter phone number (optional)"
            value={formData.phone || ""}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            errorMessage={errors.phone}
            isInvalid={!!errors.phone}
          />
        </div>
      </div>

      <Divider className="my-4" />

      <div>
        <Select
          classNames={{
            base: "max-w-xs",
            trigger: "min-h-12 py-2",
          }}
          isMultiline={true}
          label="Roles"
          placeholder="Select user roles"
          selectionMode="multiple"
          selectedKeys={new Set(formData.roleIds.map((id: number) => id.toString()))}
          onSelectionChange={(keys) =>
            handleInputChange(
              "roleIds",
              Array.from(keys).map((id) => parseInt(id.toString()))
            )
          }
          isLoading={loadingRoles}
              renderValue={(items) => {
                return (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <Chip 
                        key={item.key} 
                        variant="flat" 
                        style={{ background: 'rgba(var(--grud-primary-rgb, 102, 126, 234), 0.1)', color: 'var(--grud-primary)' }}
                        startContent={<ShieldCheckIcon className="w-3 h-3" style={{ color: 'var(--grud-primary)' }} />}
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
      </div>
    </div>
  );
});

UserForm.displayName = "UserForm";

export default UserForm;
