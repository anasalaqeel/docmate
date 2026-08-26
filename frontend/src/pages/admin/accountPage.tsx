import { useState } from "react";
import { Card, CardBody, CardHeader, Input, Button, Divider, Chip } from "@heroui/react";
import {
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { Tooltip } from "@heroui/react";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";
import { changePassword } from "../../services/authService";
import { parseZodErrors } from "../../utils/errorHandlers";

import { useLayout } from "../../contexts/layoutContext";
import { AdminSidebar } from "../../components/Sidebar/AdminSidebar";
import { useEffect } from "react";

const AccountPage = () => {
  const { user } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setLayoutData, resetLayoutData } = useLayout();

  useEffect(() => {
    setLayoutData({
      headerTitle: "My Account",
      navbarType: "admin",
      sidebar: <AdminSidebar />,
      showAdminButton: false,
    });
    return () => resetLayoutData();
  }, [setLayoutData, resetLayoutData]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password generator
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

    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // No frontend validation - let backend handle all validation
    try {
      setIsLoading(true);

      const passwordData = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      };

      await changePassword(passwordData);

      toast.success("Password changed successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: unknown) {
      console.error("Password change error:", error);

      // Parse Zod validation errors from backend
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

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "var(--docmate-primary)" }}
          >
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--docmate-text)" }}>
              My Account
            </h1>
            <p className="mt-1" style={{ color: "var(--docmate-text-secondary)" }}>
              Manage your account settings and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information Card */}
      <Card
        style={{
          background: "var(--docmate-surface)",
          borderRadius: "16px",
          boxShadow: "var(--docmate-card-shadow)",
        }}
      >
        <CardHeader className="flex gap-3 px-6 pb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(var(--docmate-primary-rgb), 0.1)" }}
          >
            <UserIcon className="w-5 h-5" style={{ color: "var(--docmate-primary)" }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Profile Information</h2>
            <p className="text-sm" style={{ color: "var(--docmate-text-secondary)" }}>
              Your personal account details
            </p>
          </div>
        </CardHeader>
        <Divider className="mx-6" />
        <CardBody className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "var(--docmate-text-secondary)" }}
              >
                <UserIcon className="w-4 h-4" />
                <span>Full Name</span>
              </div>
              <p className="text-lg font-semibold pl-6">{user.name}</p>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "var(--docmate-text-secondary)" }}
              >
                <UserIcon className="w-4 h-4" />
                <span>Username</span>
              </div>
              <p className="text-lg font-semibold pl-6" style={{ color: "var(--docmate-primary)" }}>
                @{user.username}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "var(--docmate-text-secondary)" }}
              >
                <EnvelopeIcon className="w-4 h-4" />
                <span>Email Address</span>
              </div>
              <p className="text-lg font-semibold pl-6">{user.email}</p>
            </div>

            {/* Roles */}
            <div className="space-y-2 md:col-span-2">
              <div
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "var(--docmate-text-secondary)" }}
              >
                <ShieldCheckIcon className="w-4 h-4" />
                <span>Assigned Roles</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {user.userRoles?.map((ur) => (
                  <Chip
                    key={ur.role.id}
                    variant="flat"
                    color="primary"
                    size="md"
                    startContent={<ShieldCheckIcon className="w-3 h-3" />}
                  >
                    {ur.role.name}
                  </Chip>
                )) || (
                  <Chip variant="flat" color="default">
                    No roles assigned
                  </Chip>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Change Password Card */}
      <Card
        style={{
          background: "var(--docmate-surface)",
          borderRadius: "16px",
          boxShadow: "var(--docmate-card-shadow)",
        }}
      >
        <CardHeader className="flex gap-3 px-6 pb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(var(--docmate-error-rgb), 0.1)" }}
          >
            <KeyIcon className="w-5 h-5" style={{ color: "var(--docmate-error)" }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Change Password</h2>
            <p className="text-sm" style={{ color: "var(--docmate-text-secondary)" }}>
              Update your password to keep your account secure
            </p>
          </div>
        </CardHeader>
        <Divider className="mx-6" />
        <CardBody className="px-6 py-6">
          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-2">
              <Input
                label="Current Password"
                type={isPasswordVisible ? "text" : "password"}
                placeholder="Enter your current password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                isRequired
                errorMessage={errors.currentPassword}
                isInvalid={!!errors.currentPassword}
                autoComplete="current-password"
                size="lg"
                classNames={{
                  input: "text-base",
                }}
              />
            </div>

            <Divider />

            {/* New Password */}
            <div className="space-y-2">
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
                  input: "text-base",
                }}
                endContent={
                  <div className="flex items-center gap-1">
                    <Tooltip content="Generate secure password">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => {
                          const newPassword = generatePassword();
                          setPasswordForm({
                            ...passwordForm,
                            newPassword,
                            confirmPassword: newPassword,
                          });
                          toast.success("Password generated!");
                        }}
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
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Input
                label="Confirm New Password"
                type={isPasswordVisible ? "text" : "password"}
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: passwordForm.newPassword,
                    confirmPassword: e.target.value,
                  })
                }
                isRequired
                errorMessage={errors.confirmPassword}
                isInvalid={!!errors.confirmPassword}
                autoComplete="new-password"
                size="lg"
                classNames={{
                  input: "text-base",
                }}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                color="primary"
                size="lg"
                isLoading={isLoading}
                className="shadow-md hover:shadow-lg transition-shadow"
                startContent={<KeyIcon className="w-4 h-4" />}
              >
                Change Password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default AccountPage;
