import {
  Card,
  CardBody,
  Input,
  Button,
  Textarea,
} from "@heroui/react";
import Switch from "./ui/Switch";
import { KeyIcon, ServerStackIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useSetting } from "../hooks/useSettings";
import { settingsService } from "../services/settingsService";


export default function AuthenticationPanel() {
  // SAML settings
  const { value: samlEnabled, update: updateSamlEnabled } = useSetting({
    key: "authentication.saml.enabled",
    fallbackValue: false,
  });
  const { value: samlEntityId, update: updateSamlEntityId } = useSetting({
    key: "authentication.saml.entityId",
    fallbackValue: "",
  });
  const { value: idpMetadata, update: updateIdpMetadata } = useSetting({
    key: "authentication.saml.idpMetadata",
    fallbackValue: "",
  });

  // LDAP settings
  const { value: ldapEnabled, update: updateLdapEnabled } = useSetting({
    key: "authentication.ldap.enabled",
    fallbackValue: false,
  });
  const { value: ldapUrl, update: updateLdapUrl } = useSetting({
    key: "authentication.ldap.url",
    fallbackValue: "",
  });
  const { value: ldapBindDn, update: updateLdapBindDn } = useSetting({
    key: "authentication.ldap.bindDn",
    fallbackValue: "",
  });
  const { value: ldapBindCredentials, update: updateLdapBindCredentials } = useSetting({
    key: "authentication.ldap.bindCredentials",
    fallbackValue: "",
  });
  const { value: ldapUserSearchBase, update: updateLdapUserSearchBase } = useSetting({
    key: "authentication.ldap.userSearchBase",
    fallbackValue: "",
  });
  const { value: ldapUserSearchFilter, update: updateLdapUserSearchFilter } = useSetting({
    key: "authentication.ldap.userSearchFilter",
    fallbackValue: "(sAMAccountName={username})",
  });
  const { value: ldapMailAttribute, update: updateLdapMailAttribute } = useSetting({
    key: "authentication.ldap.mailAttribute",
    fallbackValue: "mail",
  });
  const { value: ldapNameAttribute, update: updateLdapNameAttribute } = useSetting({
    key: "authentication.ldap.nameAttribute",
    fallbackValue: "displayName",
  });

  // Federated provisioning
  const { value: autoProvision, update: updateAutoProvision } = useSetting({
    key: "authentication.federated.autoProvision",
    fallbackValue: true,
  });
  const { value: autoLink, update: updateAutoLink } = useSetting({
    key: "authentication.federated.autoLink",
    fallbackValue: true,
  });

  const inputClassNames = {
    inputWrapper:
      "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
    input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
  };

  const handleSave = async () => {
    const settings: Record<string, unknown> = {
      "authentication.saml.enabled": samlEnabled,
      "authentication.saml.entityId": samlEntityId ?? "",
      "authentication.saml.idpMetadata": idpMetadata ?? "",
      "authentication.ldap.enabled": ldapEnabled,
      "authentication.ldap.url": ldapUrl ?? "",
      "authentication.ldap.bindDn": ldapBindDn ?? "",
      "authentication.ldap.bindCredentials": ldapBindCredentials ?? "",
      "authentication.ldap.userSearchBase": ldapUserSearchBase ?? "",
      "authentication.ldap.userSearchFilter": ldapUserSearchFilter ?? "(sAMAccountName={username})",
      "authentication.ldap.mailAttribute": ldapMailAttribute ?? "mail",
      "authentication.ldap.nameAttribute": ldapNameAttribute ?? "displayName",
      "authentication.federated.autoProvision": autoProvision,
      "authentication.federated.autoLink": autoLink,
    };
    const result = await settingsService.updateSettings(settings);
    return result.success;
  };

  return (
    <div className="space-y-6">
      {/* SAML SSO */}
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyIcon className="w-5 h-5" style={{ color: "var(--docmate-primary)" }} />
            <h3 className="text-lg font-semibold">SAML SSO</h3>
          </div>

          <Switch isSelected={samlEnabled} onValueChange={updateSamlEnabled}>
            Enable SAML SSO
          </Switch>
          <p className="text-sm mt-1" style={{ color: "var(--docmate-text-secondary)" }}>
            Shows a "Sign in with SSO" button on the login page and accepts SAML assertions from
            your Identity Provider.
          </p>

          <Input
            label="SP Entity ID (optional)"
            placeholder="e.g. https://docs.example.com/v1/auth/saml/metadata"
            value={samlEntityId ?? ""}
            onValueChange={updateSamlEntityId}
            variant="bordered"
            isDisabled={!samlEnabled}
            description="Defaults to this app's metadata URL if left empty"
            classNames={inputClassNames}
          />

          <Textarea
            label="Identity Provider Metadata XML"
            placeholder="Paste the XML metadata from your IdP (Okta, Entra ID, Keycloak, ...)"
            value={idpMetadata ?? ""}
            onValueChange={updateIdpMetadata}
            variant="bordered"
            isDisabled={!samlEnabled}
            minRows={6}
            classNames={inputClassNames}
          />

          <p className="text-sm" style={{ color: "var(--docmate-text-secondary)" }}>
            Register this Assertion Consumer Service URL with your IdP:{" "}
            <code>/v1/auth/saml/callback</code> — and download the SP metadata from{" "}
            <code>/v1/auth/saml/metadata</code> once enabled.
          </p>
        </CardBody>
      </Card>

      {/* LDAP / Active Directory */}
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ServerStackIcon className="w-5 h-5" style={{ color: "var(--docmate-primary)" }} />
            <h3 className="text-lg font-semibold">LDAP / Active Directory</h3>
          </div>

          <Switch isSelected={ldapEnabled} onValueChange={updateLdapEnabled}>
            Enable LDAP Login
          </Switch>
          <p className="text-sm mt-1" style={{ color: "var(--docmate-text-secondary)" }}>
            Users authenticate with their directory username and password on the normal login
            form. Local accounts always take priority.
          </p>

          <Input
            label="Server URL"
            placeholder="ldaps://ldap.example.com:636"
            value={ldapUrl ?? ""}
            onValueChange={updateLdapUrl}
            variant="bordered"
            isDisabled={!ldapEnabled}
            classNames={inputClassNames}
          />
          <Input
            label="Bind DN"
            placeholder="cn=admin,dc=example,dc=com"
            value={ldapBindDn ?? ""}
            onValueChange={updateLdapBindDn}
            variant="bordered"
            isDisabled={!ldapEnabled}
            classNames={inputClassNames}
          />
          <Input
            label="Bind Password"
            type="password"
            placeholder="••••••••"
            value={ldapBindCredentials ?? ""}
            onValueChange={updateLdapBindCredentials}
            variant="bordered"
            isDisabled={!ldapEnabled}
            classNames={inputClassNames}
          />
          <Input
            label="User Search Base"
            placeholder="ou=users,dc=example,dc=com"
            value={ldapUserSearchBase ?? ""}
            onValueChange={updateLdapUserSearchBase}
            variant="bordered"
            isDisabled={!ldapEnabled}
            classNames={inputClassNames}
          />
          <Input
            label="User Search Filter"
            placeholder="(sAMAccountName={username})"
            value={ldapUserSearchFilter ?? ""}
            onValueChange={updateLdapUserSearchFilter}
            variant="bordered"
            isDisabled={!ldapEnabled}
            description="{username} is replaced with the login identifier"
            classNames={inputClassNames}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email Attribute"
              value={ldapMailAttribute ?? "mail"}
              onValueChange={updateLdapMailAttribute}
              variant="bordered"
              isDisabled={!ldapEnabled}
              classNames={inputClassNames}
            />
            <Input
              label="Display Name Attribute"
              value={ldapNameAttribute ?? "displayName"}
              onValueChange={updateLdapNameAttribute}
              variant="bordered"
              isDisabled={!ldapEnabled}
              classNames={inputClassNames}
            />
          </div>
        </CardBody>
      </Card>

      {/* Provisioning */}
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlusIcon className="w-5 h-5" style={{ color: "var(--docmate-primary)" }} />
            <h3 className="text-lg font-semibold">Federated Users</h3>
          </div>

          <Switch isSelected={autoProvision} onValueChange={updateAutoProvision}>
            Auto-provision users on first login
          </Switch>
          <p className="text-sm mt-1" style={{ color: "var(--docmate-text-secondary)" }}>
            When enabled, unknown SSO/LDAP users get a local account (with the default role from
            Security settings) on their first successful login. When disabled, only
            administrator-created or already-linked accounts can sign in.
          </p>

          <Switch isSelected={autoLink} onValueChange={updateAutoLink}>
            Auto-link to existing accounts by email
          </Switch>
          <p className="text-sm mt-1" style={{ color: "var(--docmate-text-secondary)" }}>
            When enabled, an SSO/LDAP login whose email matches an existing local account is
            linked to that account. <strong>Disable this if self-registration is open</strong> and
            emails are not verified — otherwise someone could pre-register another person's email
            and capture their federated login.
          </p>
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          color="primary"
          onPress={handleSave}
          className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 px-8"
        >
          Save Authentication Settings
        </Button>
      </div>
    </div>
  );
}
