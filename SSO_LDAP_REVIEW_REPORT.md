# Review Report: SAML SSO + LDAP Authentication Feature

**Purpose of this document:** Handoff report for an independent reviewing agent. It describes everything that was implemented, why each decision was made, what was verified, and what is knowingly left open. Review instructions are in the last section.

**Repo:** `C:\Users\Anas\Desktop\grud` — monorepo: `backend/` (Bun + Hono + Drizzle + PostgreSQL), `frontend/` (React 19 + Vite + HeroUI).

---

## 1. Task

Add enterprise authentication to the DocMate platform:

- **SAML 2.0 SSO** (SP-initiated, redirect binding for AuthnRequest, POST binding for assertion)
- **LDAP bind authentication** (user types directory credentials into the existing login form)
- **Auto-provisioning** of federated users on first login (link-by-email or create with `security.defaultUserRole`)

Requirements confirmed with the product owner: SAML only (no OIDC), LDAP bind-only (no directory sync), auto-provision enabled by default.

Baseline before this work: local username/email + bcrypt (`Bun.password`) auth only; DB-backed sessions + HS256 JWT in an httpOnly cookie (`sessionToken`, path `/v1`); RBAC via `authorize()` middleware; settings stored in a `system_settings` table behind a registry with per-key zod validation.

## 2. Design Overview

- Federated logins converge on the **same session machinery** as local login: DB session row + signed JWT cookie, via shared helper `issueSession()`. No new session surface; `authorize()` is unchanged and provider-agnostic.
- A new `user_identities` table links local users to external identities (`provider` ∈ {saml, ldap}, `externalId` = SAML NameID or LDAP DN). Unique index on (provider, externalId).
- `users.password` made **nullable**: `NULL` = "no local credential; this user authenticates externally". Decision rationale: SAML never yields a password to store; LDAP passwords must not be stored (a stored hash would leak a verifiable copy of the user's directory password on DB compromise, and would desync on directory password rotation). A sentinel value was rejected as masking; a separate `local_credentials` table was offered and declined by the owner.
- All SSO/LDAP configuration lives in the existing settings registry under a new `authentication.*` category, admin-gated by `settings:manage`. Only `authentication.saml.enabled` and `authentication.ldap.enabled` are `isPublic: true` (needed by the login page via unauthenticated `GET /v1/settings/public`).

### Resolution algorithm (`resolveFederatedUser`)

1. Exact identity link (provider + externalId) → log in. No email needed.
2. Else, require a valid email from the identity source; link existing local user by **case-insensitive** email match (`lower(email)`), because registration lowercases emails but admin-created users may not.
3. Else, if `authentication.federated.autoProvision` → create user (password NULL, default role) + identity row. Otherwise deny (403). Missing/invalid email → deny with reason (401-class).

Result is a discriminated union (`{status:"ok"...}` | `{status:"denied", reason}`) so route handlers return accurate messages.

### Login precedence (`POST /v1/auth/login`)

Local password auth first; only if it fails AND LDAP is enabled AND minimally configured → LDAP search+bind fallback. LDAP server errors are logged and fail closed to 401.

## 3. Complete Change List

### New files

| File | Contents |
|---|---|
| `backend/src/utils/sessionIssue.ts` | `issueSession(c, userId)`: inserts session row, signs JWT, sets cookie. Extracted from authRoute; used by local login, register, SAML callback, LDAP login. |
| `backend/src/services/federatedUserService.ts` | `resolveFederatedUser()` (algorithm above) + `generateUniqueUsername()` (sanitized email local-part, suffix loop against `like(base%)` results). |
| `backend/src/services/ldapService.ts` | `ldapts` client. `authenticateLdap(identifier, password)`: bind as service account → search by configurable filter (`{username}` placeholder, LDAP-filter-escaped) → bind as found DN to verify password. `isLdapEnabled()` = enabled && url && bindDn && userSearchBase. |
| `backend/src/routes/samlAuthRoute.ts` | Mounted at `/v1/auth/saml`. `GET /metadata` (SP XML), `GET /login` (redirect to IdP), `POST /callback` (ACS: parseLoginResponse → resolve → issueSession → redirect "/"). |
| `frontend/src/components/AuthenticationPanel.tsx` | Admin settings panel: SAML (enable, SP entity ID, IdP metadata XML textarea), LDAP (enable, url, bindDn/credentials, searchBase/filter, mail/name attributes), auto-provision toggle. Follows existing `SecurityPanel` pattern (`useSetting` hook + bulk save). |

### Modified files

| File | Change |
|---|---|
| `backend/src/db/schema.ts` | `users.password` → nullable. New `userIdentities` table + relations + `usersRelations.userIdentities`. |
| `backend/src/config/settings.definitions.ts` | Registered 13 `authentication.*` keys (2 public). |
| `backend/src/config/defaultSettings.ts` | Defaults for those keys; added `"authentication"` to `validCategories` and `SETTING_CATEGORIES`. |
| `backend/src/schemas/settings.ts` | Zod schemas for the 13 keys (booleans + strings; metadata XML is `z.string()`). |
| `backend/src/types/settings.ts` | `SettingCategory` += `"authentication"`. |
| `backend/src/routes/authRoute.ts` | `/login`: password-null-safe local verify, LDAP fallback branch. `/register`: now uses `issueSession` (dead imports `sign`, `setCookie` removed). |
| `backend/src/app.ts` | Mounted `samlAuthRoute` at `/v1/auth/saml`. |
| `backend/src/routes/usersRoute.ts` | List GET: includes `userIdentities: {provider}` and strips password hashes. GET `/:id`: same. Create/Update responses: `stripPassword` helper. (Fixes pre-existing password-hash exposure on admin endpoints.) |
| `frontend/src/pages/loginPage.tsx` | Fetches public settings; if SAML enabled shows "Sign in with SSO" button → `window.location.href = "/v1/auth/saml/login"`. |
| `frontend/src/pages/admin/settingsPage.tsx` | New "Authentication" tab (`KeyIcon`). |
| `frontend/src/pages/admin/usersListPage.tsx` | View modal shows Auth Provider (SAML/LDAP/Local). |
| `frontend/src/types/users.ts` | `User.userIdentities?: {provider}[]`. |
| `frontend/src/types/settings.ts` | `SettingCategory` += `"authentication"`. |
| `.env.example` | Documented `APP_URL` and `COOKIE_SECURE` (both pre-existing env mappings). |
| `backend/package.json` / `backend/bun.lock` | Added `samlify@2.13.1`, `ldapts@9.0.0` (lockfile updated; Docker `--frozen-lockfile` builds verified consistent). |

### Dependencies

- `samlify` 2.13.1 — SAML SP/IdP entities, request generation, response parsing + signature verification.
- `ldapts` 9.0.0 — promise-based LDAP client (works under Bun; import smoke-tested).

## 4. Security Controls Implemented

1. **SAML**: samlify enforces assertion signature verification, audience, destination (must equal configured ACS), and Conditions time window. IdP metadata comes only from `settings:manage`-gated config. Fail-closed: disabled flag, missing metadata, or unresolvable base URL → 404, never a weaker path.
2. **Base URL resolution**: `APP_URL` config if set, else request origin (nginx passes `Host $host`; dev Vite proxy preserves public origin). Prevents relative/broken SP URLs.
3. **Email required for link/provision**: opaque SAML NameIDs / LDAP accounts without `mail` are denied with an explicit message rather than creating malformed accounts. Existing DN/NameID links work without email.
4. **LDAP**: filter injection escaping (`escapeLdapFilterValue`); service-bind + user-bind pattern; credentials used transiently, never persisted; search limited to configured base/attributes.
5. **Settings exposure**: `/v1/settings/public` returns only registry keys with `isPublic` (verified through `settingsService.getPublicSettings` → `getAllSettings({isPublic:true})`). LDAP bind password and IdP metadata are NOT public. `sanitizeObject` on write paths only trims values (keys sanitized as `param` — dots allowed), so metadata XML is not corrupted.
6. **Rate limiting**: `authRateLimit` remains on `/login` (LDAP attempts included). SAML `POST /callback` is signature-gated.
7. **Cookie/session**: unchanged mechanics; `SameSite=Lax` is compatible with the SAML POST-back flow (cookie is SET on the IdP's cross-site POST response; SENT on subsequent same-site requests; deployment is same-origin via nginx `/v1` proxy).
8. **Admin API hygiene**: password hashes removed from all four user endpoints (list/get/create/update).
9. **DB**: unique index prevents duplicate identity links (concurrent first-logins fail one transaction rather than duplicating).

## 5. Known, Deliberate Trade-offs (review with these in mind)

1. **samlify XSD schema validation is skipped** (`samlify.setSchemaValidator({validate: () => true})` in `samlAuthRoute.ts`). Root cause: the official validators require a JDK at install time (`@authenio/xsd-schema-validator` postinstall runs `javac`; Bun blocks it). samlify's README explicitly sanctions skipping. Signature/audience/destination/conditions checks remain enforced — schema conformance is structural only.
2. **Unsigned AuthnRequests** (no SP signing key). Default Okta/Entra/Keycloak setups don't require it.
3. **Account linking by email** trusts the IdP/directory to assert emails honestly. Standard SaaS behavior; NIST-strict profiles would require verified-email assertions. Escape hatch: disable auto-provision.
4. **LDAP bind credentials stored in `system_settings`** (plaintext in DB, admin-readable) rather than a secrets manager. Common, but a stricter design uses env/secrets store.
5. **Plain `ldap://` URLs are permitted** (no forced LDAPS). Consider enforcing if deployment policy requires.
6. **`user.status` is not checked at login** — PRE-EXISTING for local login; federated paths are merely consistent with it. Not fixed to avoid scope creep; flagged as a candidate fix.

## 6. Verification Already Performed (by the implementer)

- `tsc --noEmit` clean on backend and frontend.
- Full app module graph imports under Bun (`app.ts` + all routes load; samlify + ldapts import smoke-tested).
- Manual code-path audit of: public-settings filtering, `sanitizeObject` vs metadata XML, cookie SameSite/flow, deployment topology (nginx same-origin proxy in both `nginx.http.conf`/`nginx.https.conf`), drizzle config, docker entrypoint.
- **NOT done**: live test against a real IdP or LDAP server (no environment available); no automated tests exist (`backend` `"test"` script points at nonexistent `src/tests/run-tests.ts` — pre-existing breakage; do not confuse this with a failing suite).

## 7. Outstanding Operational Steps (not code)

- Deployed Docker: nothing manual — `docker-entrypoint.sh` runs `drizzle:push` on start, so `users.password` nullable + `user_identities` apply automatically.
- Local dev DB: run `cd backend && bun run drizzle:push` once.
- Production: set `APP_URL` to the public HTTPS URL (recommended for stable SP metadata) and `COOKIE_SECURE=true` when on HTTPS.
- IdP registration: ACS = `https://<domain>/v1/auth/saml/callback`; SP metadata = `https://<domain>/v1/auth/saml/metadata`.
- Network: backend container needs outbound access to the LDAP server (636/389).

## 8. Suggested Review Checklist

Priority order for an independent reviewer:

1. **`backend/src/services/federatedUserService.ts`** — the security-critical resolution logic. Check: identity-link lookup, case-insensitive email match (`lower()` — injection-safe via parameterization?), provisioning role assignment, username generation (LIKE-wildcard handling of `_` in base).
2. **`backend/src/routes/samlAuthRoute.ts`** — verify samlify defaults actually enforce `wantAssertionsSigned`/audience/destination in v2.13.1 (read `node_modules/samlify` source, don't trust the comment); check `parseBody` shape handed to `parseLoginResponse`; check open-redirect risk of `c.redirect("/")` (constant — safe); assess the permissive schema validator decision.
3. **`backend/src/services/ldapService.ts`** — escape function completeness; empty-password behavior (unauthenticated-bind risk: `loginSchema` enforces min length 1 — verify); resource cleanup (`unbind` in `finally`); timeout values.
4. **`backend/src/routes/authRoute.ts` `/login`** — precedence (local-first), error handling (LDAP failure → 401 not 500), that `issueSession` usage matches the pre-refactor semantics (24h expiry, cookie options).
5. **Nullable password blast radius** — grep all `users.password` / `user.password` readers: `authorize.ts` (loads full user), change-password flows (self + admin) behavior with NULL. Confirm no path crashes or misleads badly.
6. **Settings exposure** — re-verify `/settings/public` cannot leak the 11 non-public `authentication.*` keys through any route (including `/settings/export`, `/settings` with category filter).
7. **Frontend** — login page SSO button gating on public setting; AuthenticationPanel write path (bulk PATCH) matches `bulkUpdateSchema`; no credential values rendered publicly.
8. **Schema/migration** — `drizzle:push` behavior on an existing populated DB (ALTER COLUMN drop NOT NULL is safe; new table + unique index creation).
9. Run `tsc --noEmit` in both `backend/` and `frontend/` to confirm the tree is still clean.

---

## 9. Addendum: Adjudication of Second Reviewer's 17-Item Audit

A second reviewer produced `LDAP_SSO_SECURITY_AUDIT.md` with 17 findings. Each was verified against the code; three critical claims were tested empirically. Outcome: **5 findings valid and fixed, 12 unfounded or already documented trade-offs.**

### Empirically disproven claims

- **#1 "SQL injection" (their top critical)**: tested with payload `test@x.com' OR '1'='1` through the exact query — Drizzle's `sql` template binds it as a parameter (`PARAMS: [...]`), never into the SQL string. No injection. Their proposed `ilike` fix would introduce a *real* wildcard-matching hole (`%`/`_` in attacker-controlled email matching other accounts).
- **#5 "`Bun.password.verify(null)` will crash"**: tested — it returns a rejected promise (`UnsupportedAlgorithm`), caught by the existing `.catch(() => false)` → clean 401. No crash. (Explicit guard still added — better UX.)
- **#2 "XXE/XML bombs enabled by skipped schema validation"**: samlify parses via `@xmldom/xmldom`, which does not resolve DTD entities; XSD conformance validation was never the control for those attacks. The JDK constraint on the official validators is real (`@authenio/xsd-schema-validator` postinstall runs `javac`; `libxmljs` is a native build, not "pure JS").

### Valid findings — fixed

1. **#8 user.status not checked** (pre-existing for local login too): now denied for inactive users on local login and both federated link paths.
2. **#14 account takeover via auto-linking** when self-registration is open and emails unverified: new `authentication.federated.autoLink` setting (default true, admin-toggleable) gates email-based linking; panel documents the attack.
3. **#3 LDAP escape hardening**: `& | ! = < >` now escaped (RFC 4515 doesn't require it in assertion values — parens/asterisk escapes already blocked their cited payload — but defense-in-depth is free).
4. **#11 rate limiting on SAML endpoints**: `authRateLimit` now on `/saml/login` and `/saml/callback`.
5. **#17 identity-insert race**: `onConflictDoNothing()` on both identity inserts.

Also from #5: change-password now returns an explicit 400 ("signs in with SSO/LDAP") for federated users instead of a misleading 401.

### Unfounded findings (with reasons)

- **#6 LDAP connection leak**: their own trace ends at the `finally` blocks that perform the cleanup; both clients unbind in `finally`. Their proposed rewrite swallows *all* errors into "bad credentials", which is error suppression.
- **#10 "no migration strategy" / CHECK-constraint fix**: `drizzle:push` in the Docker entrypoint is this repo's established mechanism; `ALTER COLUMN ... DROP NOT NULL` is metadata-only. Their proposed `CHECK (... IN (SELECT ...))` is invalid — PostgreSQL forbids subqueries in CHECK constraints.
- **#4 user enumeration via username suffix**: suffixes are generated only after successful authentication and shown only to that user; the `_` LIKE-wildcard note over-matches (conservative suffix choice), never under-matches — no correctness hole.
- **#7 unvalidated IdP metadata**: `samlify.IdentityProvider({metadata})` parses and rejects invalid XML at build time (routes catch it); input is `settings:manage`-gated admin config. Adding an `xml2js` pre-parse adds a dependency with no security gain.
- **#12 error-message disclosure**: the cited messages appear only *after* successful IdP/directory authentication and name public standard attributes; they are configuration guidance, not leakage.
- **#15 CSRF on callback**: SameSite=Lax cookie + signature-verified assertions; the theoretical residual is login-CSRF, whose standard mitigation (InResponseTo validation) is noted below as future work.
- **#9 plaintext LDAP credentials, #16 SAML SLO**: remain documented trade-offs/backlog (see §5), unchanged.

### Post-fix verification

`tsc --noEmit` clean on backend and frontend after all fixes.

---

## 10. Addendum 2: Adjudication of the Counter-Audit (Round 2)

The second reviewer produced `LDAP_SSO_AUDIT_RESPONSE.md` alleging the fixes introduced bugs. Verification results:

### Allegation: LDAP escape copy-paste bug ("`\\29` on a `/\*/g` pattern") — **DOES NOT EXIST**

The actual file (`ldapService.ts:90-101`) reads `.replace(/\*/g,"\\2a").replace(/\(/g,"\\28").replace(/\)/g,"\\29")` — lines verified by direct read. The reviewer quoted code that is not in the file. Close-parentheses ARE escaped; asterisks are not double-escaped. This is the second round in which a "critical" finding failed basic verification, one of them a fabricated code quote.

### Allegation: SQL-injection test was inadequate — **DISPROVEN WITH THEIR OWN PAYLOADS**

All four of the reviewer's suggested payloads (`' OR 1=1 --`, `' UNION SELECT password FROM users --`, `admin'--`, `'; DROP TABLE users;--`) were run through the exact Drizzle query: every payload was bound as a parameter and never appeared in the generated SQL (`SQL contains payload: false` in all cases). Parameterization is payload-agnostic; the original single-payload test was already conclusive.

### Round-2 changes made (legitimate hardening, now implemented)

1. **LIKE wildcard escaping in `generateUniqueUsername`**: the `_` wildcard is now escaped (Postgres backslash escape), so the uniqueness probe matches exactly the intended prefix. Note: pre-escaping, over-matching was conservative (could add an unnecessary numeric suffix) and could never cause a collision or leak data — the "username enumeration" framing was wrong, but exact matching is cleaner.
2. **Env-var override for LDAP bind credentials**: new `LDAP_BIND_CREDENTIALS` env var (mapped via `config/custom-environment-variables.json`) takes precedence over the settings-UI value, keeping the secret out of the database entirely. `config.has()` semantics verified: unset → false (falls back to settings), set → true. Documented in `.env.example`.

### Positions unchanged (with reasons)

- **SAML SLO**: a feature ( logout propagation to the IdP), not a vulnerability in what ships — local logout fully terminates the app session. Implementable on request; untestable here without a live IdP.
- **XML schema validation**: no new evidence offered; the JDK/runtime constraints on official validators remain facts, and the parser (`@xmldom/xmldom`, no DTD entity resolution) doesn't expose the claimed XXE surface.
- **Error messages**: unchanged rationale — messages appear only post-authentication and name public SAML/LDAP standard attributes.

### Round-2 verification

`tsc --noEmit` clean on backend and frontend; `config.has`/`config.get` behavior empirically confirmed for both env-var states.

---

## 11. Final Resolution and Consolidation

### Review outcome

The second reviewer retracted its remaining claims (including acknowledging the LDAP "bug" was a misread of the file and accepting the SQL-injection disproof), and re-assessed the implementation as production-ready. The reviewer's documents (`LDAP_SSO_SECURITY_AUDIT.md`, `LDAP_SSO_AUDIT_RESPONSE.md`) were consolidated into this report and removed at the owner's request; their final pre-launch recommendations are captured below.

Scorecard across all review rounds: 7 genuine findings fixed (status checks, auto-link takeover scenario, LDAP escape hardening, SAML rate limiting, identity-insert race, null-password UX, LIKE wildcard precision, env-var LDAP credentials); 3 headline "critical" claims empirically disproven (SQL injection ×2 rounds, null-hash crash, fabricated escape-function quote); remaining items are documented trade-offs or feature backlog.

### Round-3 self-review finding (fixed)

A final end-to-end re-check found one real defect introduced in round 2: the SAML endpoints had been given `authRateLimit` (5 requests / 15 min — a password-brute-force profile). Each SSO login consumes two requests (redirect + IdP callback), so a NAT-shared office would be capped at ~2 SSO logins per 15 minutes. Root cause: reusing a limiter tuned for a different threat model — SAML endpoints aren't brute-forceable (assertions are signature-verified), so they need only DoS-grade throttling. Fixed with a dedicated `samlRateLimit` (30 requests / 5 min, ≈15 SSO logins) applied to `/metadata`, `/login`, and `/callback` (`rateLimiter.ts`).

### Pre-launch checklist (agreed with reviewer)

1. **Integration test** against a live IdP (Keycloak or an Okta/Entra trial app) and a containerized LDAP directory — the one verification no code review can substitute.
2. **Monitoring/logging** for federated auth events (linking, provisioning, denials).
3. **Rollback plan**: both providers have kill-switch toggles in Admin → Settings → Authentication; flipping them off instantly reverts to local-password login.
4. **User communication** about the new login options.

### Final state

- All rounds' fixes implemented; `tsc --noEmit` clean on backend and frontend; app module graph imports cleanly under Bun.
- Outstanding operational steps unchanged (see §7). Feature backlog: SAML Single Logout, InResponseTo tracking, audit logging for federated events.
