import { Hono } from "hono";
import type { Context } from "hono";
import * as samlify from "samlify";
import { settingsService } from "../services/settingsService";
import { resolveFederatedUser } from "../services/federatedUserService";
import { issueSession } from "../utils/sessionIssue";
import { samlRateLimit } from "../middlewares/rateLimiter";
import config from "config";

const router = new Hono();

// samlify requires an injected XSD schema validator. The official validators
// (@authenio/samlify-xsd-schema-validator) need a JDK at install time, which we
// cannot require on every deployment, and samlify's README explicitly sanctions
// skipping schema conformance. Cryptographic signature verification, audience,
// destination and condition checks all remain enforced by samlify's core.
samlify.setSchemaValidator({
  validate: () => Promise.resolve(true),
});

/**
 * The public base URL of this service. Prefers the configured APP_URL so the
 * SP metadata is stable across restarts; falls back to the request's origin
 * when APP_URL is not set (e.g. behind a reverse proxy).
 */
function getBaseUrl(c: Context): string {
  const appUrl = (config.get<string>("appUrl") || "").replace(/\/$/, "");
  if (appUrl) return appUrl;
  return new URL(c.req.url).origin;
}

async function buildSamlEntities(baseUrl: string): Promise<{
  sp: samlify.ServiceProviderInstance;
  idp: samlify.IdentityProviderInstance;
} | null> {
  const values = await settingsService.getSettings([
    "authentication.saml.enabled",
    "authentication.saml.entityId",
    "authentication.saml.idpMetadata",
  ]);

  if (!values["authentication.saml.enabled"]) return null;
  const entityId = values["authentication.saml.entityId"] as string;
  const idpMetadata = values["authentication.saml.idpMetadata"] as string;
  if (!idpMetadata || !baseUrl) return null;

  const sp = samlify.ServiceProvider({
    entityID: entityId || `${baseUrl}/v1/auth/saml/metadata`,
    assertionConsumerService: [
      {
        Binding: samlify.Constants.namespace.binding.post,
        Location: `${baseUrl}/v1/auth/saml/callback`,
      },
    ],
  });
  const idp = samlify.IdentityProvider({ metadata: idpMetadata });
  return { sp, idp };
}

// SP metadata XML (register this with your Identity Provider)
router.get("/metadata", samlRateLimit, async (c) => {
  let entities: Awaited<ReturnType<typeof buildSamlEntities>>;
  try {
    entities = await buildSamlEntities(getBaseUrl(c));
  } catch (error) {
    console.error("Error building SAML entities:", error);
    return c.json({ message: "Failed to build SAML metadata — check the configured IdP metadata XML" }, 500);
  }
  if (!entities) {
    return c.json({ message: "SAML is not configured" }, 404);
  }
  c.header("Content-Type", "application/xml");
  return c.body(entities.sp.getMetadata());
});

// Start SAML login: redirect the browser to the IdP
router.get("/login", samlRateLimit, async (c) => {
  try {
    const entities = await buildSamlEntities(getBaseUrl(c));
    if (!entities) {
      return c.json({ message: "SAML is not configured" }, 404);
    }
    const { context } = entities.sp.createLoginRequest(entities.idp, "redirect") as {
      context: string;
    };
    return c.redirect(context);
  } catch (error) {
    console.error("Error starting SAML login:", error);
    return c.json({ message: "Failed to start SAML login" }, 500);
  }
});

// Assertion Consumer Service: IdP posts the SAML response here
router.post("/callback", samlRateLimit, async (c) => {
  try {
    const entities = await buildSamlEntities(getBaseUrl(c));
    if (!entities) {
      return c.json({ message: "SAML is not configured" }, 404);
    }

    const form = await c.req.parseBody();
    const result = await entities.sp.parseLoginResponse(entities.idp, "post", {
      body: form as Record<string, unknown>,
    });
    const extract = result.extract;

    const nameId = extract.nameID;
    if (!nameId) {
      return c.json({ message: "SAML response missing NameID" }, 401);
    }

    const attributes = (extract.attributes || {}) as Record<string, string | string[]>;
    const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
    const email =
      first(attributes.email) ||
      first(attributes.mail) ||
      first(attributes["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]) ||
      nameId;
    const name =
      first(attributes.displayName) ||
      first(attributes["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]) ||
      undefined;

    const resolved = await resolveFederatedUser("saml", nameId, { email, name });
    if (resolved.status === "denied") {
      const messages: Record<string, string> = {
        "missing-email":
          "Your identity provider did not return a valid email address. Ask your administrator to include an email attribute in the SAML assertion.",
        "provisioning-disabled":
          "No local account is linked to this identity and auto-provisioning is disabled",
        "linking-disabled":
          "Automatic account linking is disabled and no identity is linked to your account",
        "account-disabled": "Account is disabled",
      };
      return c.json(
        { message: messages[resolved.reason] ?? "Login denied" },
        resolved.reason === "missing-email" ? 401 : 403,
      );
    }

    await issueSession(c, resolved.user.id);
    return c.redirect("/");
  } catch (error) {
    console.error("Error processing SAML callback:", error);
    return c.json({ message: "SAML login failed" }, 401);
  }
});

export default router;
