Add SAML 2.0 SSO and LDAP bind authentication to DocMate (Bun + Hono backend, React frontend), with auto-provisioning of federated users.

## 1. Dependencies (backend/package.json)
- `samlify` — SAML SP/IdP metadata handling, redirect + POST assertion parsing.
- `ldapts` — promise-based LDAP client (works with Active Directory / OpenLDAP).

## 2. DB schema changes (backend/src/db/schema.ts + drizzle migration)
- Make `users.password` nullable (SSO-only users have no local password).
- New table `user_identities`: id, userId (FK → users), provider (`saml` | `ldap`), externalId (NameID / DN / username), unique index on (provider, externalId).
- Run `drizzle-kit generate` + apply migration.

## 3. Backend — settings registry (new `authentication` category)
Register keys in `settings.definitions.ts` + zod schemas in `schemas/settings.ts` + defaults:
- `auth.saml.enabled`, `auth.saml.entityId` (SP), `auth.saml.idpMetadata` (IdP metadata XML pasted by admin), `auth.saml.certificate` optional.
- `auth.ldap.enabled`, `auth.ldap.url` (e.g. `ldaps://host:636`), `auth.ldap.bindDn`, `auth.ldap.bindCredentials`, `auth.ldap.userSearchBase`, `auth.ldap.userSearchFilter` (default `(sAMAccountName={username})`), `auth.ldap.mailAttribute` (default `mail`), `auth.ldap.nameAttribute` (default `displayName`).
- `auth.federated.autoProvision` (bool, default true) — reuses existing `security.defaultUserRole` for role assignment.
- Mark `auth.saml.enabled` / `auth.ldap.enabled` as public so the login page can show the SSO button without auth.

## 4. Backend — SAML routes (new backend/src/routes/samlAuthRoute.ts)
- `GET /v1/auth/saml/metadata` — serve SP metadata XML from samlify.
- `GET /v1/auth/saml/login` — build AuthnRequest, 302 redirect to IdP.
- `POST /v1/auth/saml/callback` (ACS) — verify/signature-check assertion via samlify, extract NameID/email/name → resolve-or-create user → create session.
Extract the session-creation logic (DB session insert + JWT httpOnly cookie) from `authRoute.ts` into a shared `backend/src/utils/sessionIssue.ts` reused by local login, SAML callback, and LDAP.

## 5. Backend — LDAP bind auth (modify authRoute.ts `/login`)
When `auth.ldap.enabled` and the identifier is not a local-password user (or lookup fails locally), search the user in LDAP via bind DN, then bind with their credentials to verify. On success: resolve-or-create user, issue session. Local password auth remains the fallback/priority.

## 6. User resolution helper (new backend/src/services/federatedUserService.ts)
`resolveFederatedUser(provider, externalId, {email, name})`: look up `user_identities` → link existing user by email if found, else auto-provision (if enabled) with default role, else 403. Sets password = null for provisioned users.

## 7. Frontend
- `loginPage.tsx`: if public settings expose `auth.saml.enabled`, show a "Sign in with SSO" button that does `window.location.href = '/v1/auth/saml/login'`.
- `settingsPage.tsx`: new "Authentication" tab with SAML (paste IdP metadata XML, entity ID, enable) and LDAP (server URL, bind DN/credentials, search base/filter, enable) forms, using existing settings hooks/service.
- Show a "SSO/LDAP" provider badge in admin `usersListPage` (requires a small backend addition to expose identity providers on user read endpoints).

## 8. Security notes
- samlify assertion signature validation is on by default; IdP metadata comes only from admin (`settings:manage` gated).
- LDAP credentials never stored; only used transiently for bind.
- LDAP bind attempts go through the existing `authRateLimit` middleware.
- Session security is unchanged (same JWT cookie + authorize middleware), so no changes needed in `authorize.ts`.

## Testing
- Unit-test federatedUserService resolution logic (mock DB).
- Manual/ scripted checks: SAML metadata endpoint returns valid XML; LDAP login path against a test server (e.g. docker ldap + sample data if available); drizzle migration applies cleanly.