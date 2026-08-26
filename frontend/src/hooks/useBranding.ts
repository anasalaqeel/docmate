import { useEffect, useState } from "react";
import { settingsService } from "../services/settingsService";
import { useTheme } from "./useTheme";

export interface BrandingSettings {
  organizationName: string;
  websiteUrl: string;
  contactEmail: string;
  description: string;
  logoLight: string;
  logoDark: string;
  favicon: string;
}

export const BRANDING_DEFAULTS: BrandingSettings = {
  organizationName: "Docmate",
  websiteUrl: "",
  contactEmail: "",
  description: "",
  logoLight: "/logo.svg",
  logoDark: "/logo.svg",
  favicon: "/logo.svg",
};

let cache: BrandingSettings | null = null;
let inflight: Promise<BrandingSettings> | null = null;

interface PublicSetting {
  key: string;
  value: unknown;
}

function readBranding(settings: PublicSetting[]): BrandingSettings {
  const getVal = (key: string, fallback: string) => {
    const s = settings.find((item) => item.key === key);
    return s && s.value ? String(s.value) : fallback;
  };
  return {
    organizationName: getVal("branding.organizationName", BRANDING_DEFAULTS.organizationName),
    websiteUrl: getVal("branding.websiteUrl", ""),
    contactEmail: getVal("branding.contactEmail", ""),
    description: getVal("branding.description", ""),
    logoLight: getVal("branding.logoLight", BRANDING_DEFAULTS.logoLight),
    logoDark: getVal("branding.logoDark", BRANDING_DEFAULTS.logoDark),
    favicon: getVal("branding.favicon", BRANDING_DEFAULTS.favicon),
  };
}

export function loadBranding(): Promise<BrandingSettings> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = settingsService
      .getPublicSettings()
      .then(readBranding)
      .then((branding) => {
        cache = branding;
        return branding;
      })
      .catch(() => BRANDING_DEFAULTS)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

function applyFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (link.href !== new URL(href, window.location.href).href) {
    link.type = href.endsWith(".svg") ? "image/svg+xml" : "image/png";
    link.href = href;
  }
}

export function useBranding() {
  const [branding, setBranding] = useState<BrandingSettings>(cache ?? BRANDING_DEFAULTS);
  const { actualTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    loadBranding().then((b) => {
      if (!cancelled) setBranding(b);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyFavicon(branding.favicon || BRANDING_DEFAULTS.favicon);
    document.title = branding.organizationName || "Docmate";
  }, [branding]);

  const logo = actualTheme === "dark" ? branding.logoDark || branding.logoLight : branding.logoLight;

  return { ...branding, logo };
}
