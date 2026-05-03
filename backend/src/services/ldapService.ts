import { Client, SearchOptions, Entry } from "ldapts";
import config from "config";
import logger from "../logger";

export interface LdapUser {
  dn: string;
  username: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  groups: string[];
}

export class LdapService {
  private getLdapConfig() {
    return config.get("ldap") as any;
  }

  private createClient(): Client {
    const ldapConfig = this.getLdapConfig();
    return new Client({
      url: ldapConfig.url,
      tlsOptions: ldapConfig.tls?.enabled
        ? {
            rejectUnauthorized: ldapConfig.tls.rejectUnauthorized,
          }
        : undefined,
    });
  }

  async authenticateUser(username: string, password: string): Promise<LdapUser | null> {
    const ldapConfig = this.getLdapConfig();
    const client = this.createClient();

    try {
      // 1. Bind with service account
      await client.bind(ldapConfig.bindDn, ldapConfig.bindPassword);

      // 2. Search for user DN
      const searchFilter = ldapConfig.searchFilter.replace("{{username}}", username);
      const searchOptions: SearchOptions = {
        scope: "sub",
        filter: searchFilter,
        attributes: [
          ldapConfig.attributes.username,
          ldapConfig.attributes.email,
          ldapConfig.attributes.firstName,
          ldapConfig.attributes.lastName,
          ldapConfig.attributes.displayName,
        ],
      };

      const { searchEntries } = await client.search(ldapConfig.searchBase, searchOptions);

      if (searchEntries.length === 0) {
        logger.warn(`LDAP user not found: ${username}`);
        return null;
      }

      if (searchEntries.length > 1) {
        logger.error(`Multiple LDAP users found for: ${username}`);
        throw new Error("Multiple users found in LDAP");
      }

      const userEntry = searchEntries[0] as Entry;
      const userDn = userEntry.dn;

      // 3. Bind as user to verify password
      try {
        const userClient = this.createClient();
        await userClient.bind(userDn, password);
        await userClient.unbind();
      } catch (error) {
        logger.warn(`LDAP authentication failed for: ${username}`);
        return null;
      }

      // 4. Fetch groups if mapping is enabled
      let groups: string[] = [];
      try {
        groups = await this.getUserGroups(client, userDn);
      } catch (error) {
        logger.error(`Failed to fetch LDAP groups for ${username}:`, error);
      }

      return this.mapLdapUserToAppUser(userEntry, groups);
    } catch (error) {
      logger.error("LDAP error:", error);
      throw error;
    } finally {
      await client.unbind();
    }
  }

  private async getUserGroups(client: Client, userDn: string): Promise<string[]> {
    const ldapConfig = this.getLdapConfig();
    if (!ldapConfig.group?.searchBase) return [];

    const searchFilter = ldapConfig.group.searchFilter.replace("{{dn}}", userDn);
    const searchOptions: SearchOptions = {
      scope: "sub",
      filter: searchFilter,
      attributes: [ldapConfig.group.attribute],
    };

    const { searchEntries } = await client.search(ldapConfig.group.searchBase, searchOptions);
    return searchEntries.map((entry: any) => entry[ldapConfig.group.attribute] as string);
  }

  private mapLdapUserToAppUser(entry: Entry, groups: string[]): LdapUser {
    const ldapConfig = this.getLdapConfig();
    const attrs = ldapConfig.attributes;

    return {
      dn: entry.dn,
      username: (entry[attrs.username] as string) || "",
      email: (entry[attrs.email] as string) || "",
      name: (entry[attrs.displayName] as string) || (entry[attrs.username] as string) || "",
      firstName: entry[attrs.firstName] as string,
      lastName: entry[attrs.lastName] as string,
      groups,
    };
  }

  getRoleFromGroups(groups: string[]): string {
    const ldapConfig = this.getLdapConfig();
    const roleMapString = ldapConfig.group?.roleMap;
    
    if (!roleMapString || Object.keys(roleMapString).length === 0) {
      return ldapConfig.defaultRole || "user";
    }

    let roleMap: Record<string, string> = {};
    try {
      roleMap = typeof roleMapString === "string" ? JSON.parse(roleMapString) : roleMapString;
    } catch (error) {
      logger.error("Failed to parse LDAP_GROUP_ROLE_MAP:", error);
      return ldapConfig.defaultRole || "user";
    }

    // Sort roles by priority if needed, but here we just take the first match or a specific hierarchy
    // Common hierarchy: superadmin > admin > moderator > user
    const priority = ["superadmin", "admin", "moderator", "user"];
    let bestRole = ldapConfig.defaultRole || "user";
    let bestPriority = Infinity;

    for (const group of groups) {
      const mappedRole = roleMap[group];
      if (mappedRole) {
        const p = priority.indexOf(mappedRole);
        if (p !== -1 && p < bestPriority) {
          bestPriority = p;
          bestRole = mappedRole;
        }
      }
    }

    return bestRole;
  }
}

export const ldapService = new LdapService();
