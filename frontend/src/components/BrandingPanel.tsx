import { Card, CardBody, Input, Button, Textarea, Image } from "@heroui/react";
import { BuildingOfficeIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useSetting } from "../hooks/useSettings";
import { settingsService } from "../services/settingsService";

export default function BrandingPanel() {
  // Individual setting hooks for reactive updates
  const { value: orgName, update: updateOrgName } = useSetting({
    key: "branding.organizationName",
    fallbackValue: "",
  });
  const { value: websiteUrl, update: updateWebsiteUrl } = useSetting({
    key: "branding.websiteUrl",
    fallbackValue: "",
  });
  const { value: contactEmail, update: updateContactEmail } = useSetting({
    key: "branding.contactEmail",
    fallbackValue: "",
  });
  const { value: description, update: updateDescription } = useSetting({
    key: "branding.description",
    fallbackValue: "",
  });
  const { value: logoLight, update: updateLogoLight } = useSetting({
    key: "branding.logoLight",
    fallbackValue: "",
  });
  const { value: logoDark, update: updateLogoDark } = useSetting({
    key: "branding.logoDark",
    fallbackValue: "",
  });
  const { value: favicon, update: updateFavicon } = useSetting({
    key: "branding.favicon",
    fallbackValue: "",
  });

  const handleSave = async () => {
    const settings: Record<string, unknown> = {};

    if (orgName !== undefined) settings["branding.organizationName"] = orgName;
    if (websiteUrl !== undefined) settings["branding.websiteUrl"] = websiteUrl;
    if (contactEmail !== undefined) settings["branding.contactEmail"] = contactEmail;
    if (description !== undefined) settings["branding.description"] = description;
    if (logoLight !== undefined) settings["branding.logoLight"] = logoLight;
    if (logoDark !== undefined) settings["branding.logoDark"] = logoDark;
    if (favicon !== undefined) settings["branding.favicon"] = favicon;

    const result = await settingsService.updateSettings(settings);
    return result.success;
  };

  const handleImageUpload = (type: "logoLight" | "logoDark" | "favicon") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const result = await settingsService.uploadFile(file, type === "favicon" ? "favicon" : "logo");

      if (result.success && result.data) {
        const updateFn =
          type === "logoLight"
            ? updateLogoLight
            : type === "logoDark"
            ? updateLogoDark
            : updateFavicon;
        updateFn(result.data.path);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BuildingOfficeIcon className="w-5 h-5" style={{ color: 'var(--docmate-primary)' }} />
            <h2 className="text-xl font-semibold">Organization Branding</h2>
          </div>

          {/* Organization Name */}
          <Input
            label="Organization Name"
            placeholder="Enter your organization name"
            value={orgName ?? ""}
            onChange={(e) => updateOrgName(e.target.value)}
            description="The name of your organization that will be displayed throughout the platform"
            variant="bordered"
            classNames={{
              inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
              input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
              label: "text-[var(--docmate-text)]",
              description: "text-[var(--docmate-text-secondary)]"
            }}
          />

          {/* Website URL */}
          <Input
            label="Website URL"
            placeholder="https://your-website.com"
            value={websiteUrl ?? ""}
            onChange={(e) => updateWebsiteUrl(e.target.value)}
            description="Your organization's main website"
            type="url"
            variant="bordered"
            classNames={{
              inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
              input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
              label: "text-[var(--docmate-text)]",
              description: "text-[var(--docmate-text-secondary)]"
            }}
          />

          {/* Contact Email */}
          <Input
            label="Contact Email"
            placeholder="contact@your-organization.com"
            value={contactEmail ?? ""}
            onChange={(e) => updateContactEmail(e.target.value)}
            description="Contact email for support and inquiries"
            type="email"
            variant="bordered"
            classNames={{
              inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
              input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
              label: "text-[var(--docmate-text)]",
              description: "text-[var(--docmate-text-secondary)]"
            }}
          />

          {/* Description */}
          <Textarea
            label="Description"
            placeholder="A short description of your organization"
            value={description ?? ""}
            onChange={(e) => updateDescription(e.target.value)}
            description="A brief description of your organization"
            variant="bordered"
            minRows={3}
            classNames={{
              inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
              input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
              label: "text-[var(--docmate-text)]",
              description: "text-[var(--docmate-text-secondary)]"
            }}
          />
        </CardBody>
      </Card>

      {/* Logos and Favicon */}
      <Card className="bg-[var(--docmate-surface)] border-[var(--docmate-border-color)] border shadow-sm">
        <CardBody className="space-y-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PhotoIcon className="w-5 h-5" style={{ color: 'var(--docmate-primary)' }} />
            <h2 className="text-xl font-semibold">Visual Assets</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Light Logo */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Light Theme Logo</label>
              {logoLight ? (
                <div className="relative group">
                  <Image
                    src={logoLight}
                    alt="Light logo"
                    width="100%"
                    height={120}
                    className="object-contain border rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => handleImageUpload("logoLight")}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--docmate-border-color)' }}
                  onClick={() => handleImageUpload("logoLight")}
                >
                  <PhotoIcon className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="text-sm" style={{ color: 'var(--docmate-text-secondary)' }}>Upload Light Logo</p>
                </div>
              )}
            </div>

            {/* Dark Logo */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Dark Theme Logo</label>
              {logoDark ? (
                <div className="relative group">
                  <Image
                    src={logoDark}
                    alt="Dark logo"
                    width="100%"
                    height={120}
                    className="object-contain border rounded-lg bg-[var(--docmate-surface-alt)]"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button size="sm" variant="light" onPress={() => handleImageUpload("logoDark")}>
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--docmate-border-color)' }}
                  onClick={() => handleImageUpload("logoDark")}
                >
                  <PhotoIcon className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="text-sm" style={{ color: 'var(--docmate-text-secondary)' }}>Upload Dark Logo</p>
                </div>
              )}
            </div>
          </div>

          {/* Favicon */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Favicon</label>
            {favicon ? (
              <div className="relative group inline-block">
                <Image
                  src={favicon}
                  alt="Favicon"
                  width={64}
                  height={64}
                  className="object-contain border rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button size="sm" variant="light" onPress={() => handleImageUpload("favicon")}>
                    Change
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors inline-block"
                style={{ borderColor: 'var(--docmate-border-color)', width: "64px", height: "64px" }}
                onClick={() => handleImageUpload("favicon")}
              >
                <PhotoIcon className="w-4 h-4 opacity-40 mb-1" />
                <p className="text-xs" style={{ color: 'var(--docmate-text-secondary)' }}>Favicon</p>
              </div>
            )}
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
          Save Branding Settings
        </Button>
      </div>
    </div>
  );
}
