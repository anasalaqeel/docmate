import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Select,
  SelectItem,
  Input,
  Button,
  Chip,
  Alert,
} from "@heroui/react";
import Switch from "./ui/Switch";
import { ShieldCheckIcon, UserGroupIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useSetting } from "../hooks/useSettings";
import { usersService } from "../services/usersService";
import { settingsService } from "../services/settingsService";
import type { UserRole } from "../types/settings";
import type { Role } from "../types/users";

export default function SecurityPanel() {
  // Registration settings
  const { value: registrationEnabled, update: updateRegistrationEnabled } = useSetting({
    key: "security.registrationEnabled",
    fallbackValue: false,
  });
  const { value: requireEmailVerification, update: updateRequireEmailVerification } = useSetting({
    key: "security.requireEmailVerification",
    fallbackValue: false,
  });
  const { value: adminApprovalRequired, update: updateAdminApprovalRequired } = useSetting({
    key: "security.adminApprovalRequired",
    fallbackValue: false,
  });
  const { value: defaultUserRole, update: updateDefaultUserRole } = useSetting({
    key: "security.defaultUserRole",
    fallbackValue: "user",
  });

  // Session settings
  const { value: sessionTimeout, update: updateSessionTimeout } = useSetting({
    key: "security.sessionTimeout",
    fallbackValue: 30,
  });
  const { value: maxSessionsPerUser, update: updateMaxSessionsPerUser } = useSetting({
    key: "security.maxSessionsPerUser",
    fallbackValue: 3,
  });

  // Roles from backend
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesData = await usersService.getAllRoles();
        setRoles(rolesData);
      } catch (error) {
        console.error("Failed to fetch roles:", error);
        setRoles([]); // No roles available
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const handleSave = async () => {
    const settings: Record<string, unknown> = {};

    if (registrationEnabled !== undefined)
      settings["security.registrationEnabled"] = registrationEnabled;
    if (requireEmailVerification !== undefined)
      settings["security.requireEmailVerification"] = requireEmailVerification;
    if (adminApprovalRequired !== undefined)
      settings["security.adminApprovalRequired"] = adminApprovalRequired;
    if (defaultUserRole !== undefined) settings["security.defaultUserRole"] = defaultUserRole;
    if (sessionTimeout !== undefined) settings["security.sessionTimeout"] = sessionTimeout;
    if (maxSessionsPerUser !== undefined)
      settings["security.maxSessionsPerUser"] = maxSessionsPerUser;

    const result = await settingsService.updateSettings(settings);
    return result.success;
  };

  return (
    <div className="space-y-6">
      {/* User Registration */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserGroupIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
            <h3 className="text-lg font-semibold">User Registration</h3>
          </div>

          <div className="space-y-4">
            <Switch isSelected={registrationEnabled} onValueChange={updateRegistrationEnabled}>
              Enable User Registration
            </Switch>
            <p className="text-sm mt-1" style={{ color: 'var(--grud-text-secondary)' }}>
              Allow new users to register for an account
            </p>

            <Switch
              isSelected={requireEmailVerification}
              onValueChange={updateRequireEmailVerification}
              isDisabled={!registrationEnabled}
            >
              Require Email Verification
            </Switch>
            <p className="text-sm mt-1" style={{ color: 'var(--grud-text-secondary)' }}>
              Require users to verify their email address before accessing the system
            </p>

            <Switch
              isSelected={adminApprovalRequired}
              onValueChange={updateAdminApprovalRequired}
              isDisabled={!registrationEnabled}
            >
              Require Admin Approval
            </Switch>
            <p className="text-sm mt-1" style={{ color: 'var(--grud-text-secondary)' }}>
              Require administrator approval for new user accounts
            </p>

            {roles.length > 0 ? (
                <Select
                  items={roles.map((role) => ({ key: role.name, label: role.name }))}
                  label="Default User Role"
                  placeholder="Select default role"
                  selectedKeys={defaultUserRole ? [defaultUserRole] : []}
                  onSelectionChange={(keys) => updateDefaultUserRole(Array.from(keys)[0] as UserRole)}
                  variant="bordered"
                  isDisabled={!registrationEnabled || loadingRoles}
                  classNames={{
                    trigger: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                    value: "text-[var(--grud-text)]",
                    label: "text-[var(--grud-text)]"
                  }}
                >
                  {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                </Select>
            ) : (
              <div className="p-4 border rounded-lg" style={{ borderColor: 'var(--grud-border-color)', background: 'var(--grud-surface-alt)' }}>
                <p className="text-center" style={{ color: 'var(--grud-text-secondary)' }}>
                  {loadingRoles ? "Loading roles..." : "No roles available. Please contact your administrator to set up user roles."}
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Session Management */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
            <h3 className="text-lg font-semibold">Session Management</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--grud-text)' }}>Session Timeout (minutes)</label>
              <Input
                type="number"
                value={sessionTimeout?.toString() ?? ""}
                onChange={(e) => updateSessionTimeout(parseInt(e.target.value) || 30)}
                placeholder="30"
                description="Automatically log users out after period of inactivity"
                variant="bordered"
                min={5}
                max={1440}
                classNames={{
                  inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                  input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
                  description: "text-[var(--grud-text-secondary)]"
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--grud-text)' }}>Maximum Sessions Per User</label>
              <Input
                type="number"
                value={maxSessionsPerUser?.toString() ?? ""}
                onChange={(e) => updateMaxSessionsPerUser(parseInt(e.target.value) || 3)}
                placeholder="3"
                description="Maximum number of concurrent sessions allowed per user"
                variant="bordered"
                min={1}
                max={10}
                classNames={{
                  inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                  input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
                  description: "text-[var(--grud-text-secondary)]"
                }}
              />
            </div>
          </div>

          <Alert
            color="warning"
            title="Session Settings"
            description="Changes to session settings will only affect new sessions. Existing sessions will continue with their current timeout values."
            variant="flat"
          />
        </CardBody>
      </Card>

      {/* Security Recommendations */}
      <Card className="bg-[var(--grud-surface)] border-[var(--grud-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheckIcon className="w-5 h-5" style={{ color: 'var(--grud-primary)' }} />
            <h3 className="text-lg font-semibold">Security Recommendations</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Chip
                size="sm"
                color={requireEmailVerification ? "success" : "warning"}
                variant="flat"
              >
                {requireEmailVerification ? "Enabled" : "Disabled"}
              </Chip>
              <div>
                <p className="text-sm font-medium">Email Verification</p>
                <p className="text-xs" style={{ color: 'var(--grud-text-secondary)' }}>
                  {requireEmailVerification
                    ? "Email verification is enabled, helping prevent fake accounts."
                    : "Consider enabling email verification to reduce fake account creation."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Chip size="sm" color={adminApprovalRequired ? "success" : "default"} variant="flat">
                {adminApprovalRequired ? "Enabled" : "Disabled"}
              </Chip>
              <div>
                <p className="text-sm font-medium">Admin Approval</p>
                <p className="text-xs" style={{ color: 'var(--grud-text-secondary)' }}>
                  {adminApprovalRequired
                    ? "Admin approval is enabled for maximum control."
                    : "Enable admin approval for sensitive environments."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Chip
                size="sm"
                color={
                  sessionTimeout && typeof sessionTimeout === "number" && sessionTimeout <= 120
                    ? "success"
                    : "warning"
                }
                variant="flat"
              >
                {sessionTimeout ? `${sessionTimeout}m` : "30m"}
              </Chip>
              <div>
                <p className="text-sm font-medium">Session Timeout</p>
                <p className="text-xs" style={{ color: 'var(--grud-text-secondary)' }}>
                  {!sessionTimeout || (typeof sessionTimeout === "number" && sessionTimeout <= 120)
                    ? "Session timeout is properly configured for security."
                    : "Consider reducing session timeout for better security."}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button 
          color="primary" 
          onPress={handleSave}
          className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 px-8"
        >
          Save Security Settings
        </Button>
      </div>
    </div>
  );
}
