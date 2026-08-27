import { Client } from "ldapts";
import config from "config";
import { settingsService } from "./settingsService";

export interface LdapUserInfo {
  dn: string;
  email?: string;
  name?: string;
}

async function getLdapSettings() {
  const values = await settingsService.getSettings([
    "authentication.ldap.enabled",
    "authentication.ldap.url",
    "authentication.ldap.bindDn",
    "authentication.ldap.bindCredentials",
    "authentication.ldap.userSearchBase",
    "authentication.ldap.userSearchFilter",
    "authentication.ldap.mailAttribute",
    "authentication.ldap.nameAttribute",
  ]);
  return {
    enabled: values["authentication.ldap.enabled"] as boolean,
    url: values["authentication.ldap.url"] as string,
    bindDn: values["authentication.ldap.bindDn"] as string,
    // Env var takes precedence so deployments can keep the password out of the
    // database entirely (settings UI value is then ignored)
    bindCredentials: config.has("ldap.bindCredentials")
      ? (config.get("ldap.bindCredentials") as string)
      : (values["authentication.ldap.bindCredentials"] as string),
    userSearchBase: values["authentication.ldap.userSearchBase"] as string,
    userSearchFilter: values["authentication.ldap.userSearchFilter"] as string,
    mailAttribute: values["authentication.ldap.mailAttribute"] as string,
    nameAttribute: values["authentication.ldap.nameAttribute"] as string,
  };
}

export async function isLdapEnabled(): Promise<boolean> {
  const { enabled, url, bindDn, userSearchBase } = await getLdapSettings();
  return Boolean(enabled && url && bindDn && userSearchBase);
}

/**
 * Verify credentials against LDAP/Active Directory:
 * search for the user with a service bind, then bind as the found DN.
 * Returns user info on success, null on bad credentials, throws on server errors.
 */
export async function authenticateLdap(
  identifier: string,
  password: string,
): Promise<LdapUserInfo | null> {
  const cfg = await getLdapSettings();
  if (!cfg.enabled || !cfg.url) return null;

  const client = new Client({ url: cfg.url, timeout: 10000, connectTimeout: 10000 });
  try {
    await client.bind(cfg.bindDn, cfg.bindCredentials);

    const filter = cfg.userSearchFilter.replace("{username}", escapeLdapFilterValue(identifier));
    const { searchEntries } = await client.search(cfg.userSearchBase, {
      scope: "sub",
      filter,
      attributes: ["dn", cfg.mailAttribute, cfg.nameAttribute],
    });
    if (searchEntries.length === 0) return null;

    // LDAP attributes can be multi-valued; take the first value only
    const first = (v: unknown): string | undefined =>
      Array.isArray(v) ? (v[0] as string | undefined) : (v as string | undefined);
    const entry = searchEntries[0] as Record<string, unknown>;
    const dn = entry.dn as string;

    // Bind as the found user to verify their password
    const userClient = new Client({ url: cfg.url, timeout: 10000, connectTimeout: 10000 });
    try {
      await userClient.bind(dn, password);
    } finally {
      await userClient.unbind().catch(() => {});
    }

    return {
      dn,
      email: first(entry[cfg.mailAttribute]),
      name: first(entry[cfg.nameAttribute]),
    };
  } finally {
    await client.unbind().catch(() => {});
  }
}

function escapeLdapFilterValue(value: string): string {
  // RFC 4515 requires escaping \ * ( ) and NUL. The remaining metacharacters
  // are literal inside assertion values, but we escape them anyway as
  // defense-in-depth against non-conformant directory servers.
  return value
    .replace(/\\/g, "\\5c")
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00")
    .replace(/&/g, "\\26")
    .replace(/\|/g, "\\7c")
    .replace(/!/g, "\\21")
    .replace(/=/g, "\\3d")
    .replace(/</g, "\\3c")
    .replace(/>/g, "\\3e");
}
