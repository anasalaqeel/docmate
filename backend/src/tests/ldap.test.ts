import { describe, expect, it, mock, spyOn, beforeEach } from "bun:test";
import { ldapService } from "../services/ldapService";
import { Client } from "ldapts";

// Mock ldapts Client
mock.module("ldapts", () => {
  return {
    Client: class {
      bind = mock(async () => {});
      unbind = mock(async () => {});
      search = mock(async () => ({ searchEntries: [] }));
    },
  };
});

describe("LdapService", () => {
  beforeEach(() => {
    // Reset mocks if needed
  });

  it("should map LDAP user correctly", () => {
    const entry = {
      dn: "uid=test,ou=users,dc=example,dc=com",
      uid: "testuser",
      mail: "test@example.com",
      cn: "Test User",
      givenName: "Test",
      sn: "User",
    };
    const groups = ["group1", "group2"];
    
    // Using private method access for testing mapping
    const result = (ldapService as any).mapLdapUserToAppUser(entry, groups);
    
    expect(result.username).toBe("testuser");
    expect(result.email).toBe("test@example.com");
    expect(result.name).toBe("Test User");
    expect(result.groups).toEqual(groups);
  });

  it("should get correct role from groups", () => {
    const groups = ["cn=admins,dc=example,dc=com", "other"];
    
    // Spy on the private method getLdapConfig
    const getLdapConfigSpy = spyOn(ldapService as any, "getLdapConfig").mockReturnValue({
      group: {
        roleMap: JSON.stringify({
          "cn=admins,dc=example,dc=com": "admin"
        })
      },
      defaultRole: "user"
    });

    const role = ldapService.getRoleFromGroups(groups);
    expect(role).toBe("admin");
    getLdapConfigSpy.mockRestore();
  });

  it("should return default role if no mapping matches", () => {
    const groups = ["other"];
    const role = ldapService.getRoleFromGroups(groups);
    expect(role).toBe("user");
  });
});
