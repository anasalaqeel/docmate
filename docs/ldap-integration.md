# LDAP Integration Guide

This guide explains how to connect Grud to an external LDAP or Active Directory server for user authentication and role management.

## 1. Overview

LDAP support allows your users to log in to Grud using their existing corporate credentials.
- **Auto-provisioning**: Users are automatically created in Grud upon their first successful LDAP login.
- **Attribute Sync**: User profiles (name, email) are kept in sync with the LDAP directory.
- **Role Mapping**: LDAP group memberships can be mapped to Grud roles (Admin, Moderator, User).
- **Coexistence**: Local accounts and LDAP accounts can exist simultaneously.

## 2. Prerequisites

- **LDAP Server**: OpenLDAP, Microsoft Active Directory, FreeIPA, or any standard LDAPv3 server.
- **Service Account**: A dedicated account with read-only permissions to search users and groups.
- **Network**: Grud must be able to reach the LDAP server on port 389 (LDAP) or 636 (LDAPS).

## 3. Environment Variable Reference

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `LDAP_ENABLED` | boolean | Yes | `false` | Enables LDAP authentication |
| `LDAP_URL` | string | Yes | — | URL of your LDAP server (e.g., `ldap://server:389`) |
| `LDAP_BIND_DN` | string | Yes | — | DN of the service account (e.g., `cn=svc,dc=example,dc=com`) |
| `LDAP_BIND_PASSWORD` | string | Yes | — | Password for the service account |
| `LDAP_SEARCH_BASE` | string | Yes | — | Base DN for user searches (e.g., `ou=users,dc=example,dc=com`) |
| `LDAP_SEARCH_FILTER` | string | Yes | `(uid={{username}})`| Filter to find users. Use `{{username}}` as placeholder. |
| `LDAP_TLS_ENABLED` | boolean | No | `false` | Enable TLS/SSL |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | boolean | No | `true` | Set to `false` for self-signed certificates |
| `LDAP_ATTRIBUTES_USERNAME` | string | No | `uid` | LDAP attribute for username |
| `LDAP_ATTRIBUTES_EMAIL` | string | No | `mail` | LDAP attribute for email |
| `LDAP_ATTRIBUTES_DISPLAY_NAME` | string | No | `cn` | LDAP attribute for display name |
| `LDAP_GROUP_SEARCH_BASE` | string | No | — | Base DN for group searches |
| `LDAP_GROUP_ROLE_MAP` | json | No | `{}` | JSON map of Group DN to Grud Role |

## 4. Quick Start (Microsoft Active Directory)

For Active Directory, use the following typical settings:

```bash
LDAP_SEARCH_FILTER=(sAMAccountName={{username}})
LDAP_ATTRIBUTES_USERNAME=sAMAccountName
LDAP_ATTRIBUTES_EMAIL=mail
LDAP_ATTRIBUTES_FIRST_NAME=givenName
LDAP_ATTRIBUTES_LAST_NAME=sn
LDAP_ATTRIBUTES_DISPLAY_NAME=displayName
LDAP_GROUP_SEARCH_FILTER=(member={{dn}})
```

## 5. Group-to-Role Mapping

You can map LDAP groups to Grud roles using a JSON object in `LDAP_GROUP_ROLE_MAP`.

Example:
```json
LDAP_GROUP_ROLE_MAP='{"cn=GrudAdmins,ou=groups,dc=example,dc=org":"admin", "cn=GrudEditors,ou=groups,dc=example,dc=org":"moderator"}'
```

On every login, Grud will check the user's groups and assign the highest privileged role found in the map. If no match is found, the user receives the role defined in `LDAP_DEFAULT_ROLE` (default is `user`).

## 6. TLS / LDAPS Setup

To use LDAPS:
1. Set `LDAP_URL` to `ldaps://your-server:636`.
2. Set `LDAP_TLS_ENABLED=true`.
3. If using a self-signed certificate and you cannot add the CA to the system trust store, set `LDAP_TLS_REJECT_UNAUTHORIZED=false` (not recommended for production).

## 7. Troubleshooting

| Error | Likely Cause | Fix |
|---|---|---|
| `Invalid credentials` | Wrong bind DN or password | Verify `LDAP_BIND_DN` and `LDAP_BIND_PASSWORD` |
| `User not found` | Search base or filter issue | Check `LDAP_SEARCH_BASE` and `LDAP_SEARCH_FILTER` |
| `ECONNREFUSED` | Network connectivity | Verify server address and firewall rules |
| `unable to verify certificate` | TLS trust issue | Check CA certificates or `LDAP_TLS_REJECT_UNAUTHORIZED` |

## 8. Security Recommendations

- **Use LDAPS**: Always use `ldaps://` in production to protect credentials in transit.
- **Read-Only Account**: The service account should have the absolute minimum permissions required to read the directory.
- **Firewall**: Restrict access to the LDAP server to only the Grud backend IP address.
