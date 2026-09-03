import { useState } from "react";
import {
  Card,
  CardBody,
  Tabs,
  Tab,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
} from "@heroui/react";
import {
  BuildingOfficeIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  KeyIcon,
  CogIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { settingsService } from "../../services/settingsService";
import BrandingPanel from "../../components/BrandingPanel";
import ThemePanel from "../../components/ThemePanel";
import SecurityPanel from "../../components/SecurityPanel";
import AuthenticationPanel from "../../components/AuthenticationPanel";
import GeneralPanel from "../../components/GeneralPanel";
import AdvancedPanel from "../../components/AdvancedPanel";
import AiPanel from "../../components/AiPanel";

const TABS = [
  {
    id: "branding",
    label: "Branding",
    icon: <BuildingOfficeIcon className="w-4 h-4" />,
    content: <BrandingPanel />,
  },
  {
    id: "theme",
    label: "Theme",
    icon: <PaintBrushIcon className="w-4 h-4" />,
    content: <ThemePanel />,
  },
  {
    id: "security",
    label: "Security",
    icon: <ShieldCheckIcon className="w-4 h-4" />,
    content: <SecurityPanel />,
  },
  {
    id: "authentication",
    label: "Authentication",
    icon: <KeyIcon className="w-4 h-4" />,
    content: <AuthenticationPanel />,
  },
  {
    id: "ai",
    label: "AI Assistant",
    icon: <SparklesIcon className="w-4 h-4" />,
    content: <AiPanel />,
  },
  {
    id: "general",
    label: "General",
    icon: <CogIcon className="w-4 h-4" />,
    content: <GeneralPanel />,
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: <AdjustmentsHorizontalIcon className="w-4 h-4" />,
    content: <AdvancedPanel />,
  },
] as const;

import styles from "../../styles/settingsPage.module.css";
import PageHeader from "../../components/PageHeader";

import { useLayout } from "../../hooks/useLayout";
import { AdminSidebar } from "../../components/Sidebar/AdminSidebar";
import { useEffect } from "react";

function SettingsPageContent() {
  const [saving, setSaving] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [searchTerm, setSearchTerm] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const { setLayoutData, resetLayoutData } = useLayout();

  useEffect(() => {
    setLayoutData({
      navbarType: "admin",
      sidebar: <AdminSidebar />,
      showAdminButton: false,
    });
    return () => resetLayoutData();
  }, [setLayoutData, resetLayoutData]);

  const handleExport = async () => {
    try {
      const result = await settingsService.exportSettings();
      const dataStr = JSON.stringify(result.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `settings-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export settings:", error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      setSaving(true);
      const text = await importFile.text();
      const settings = JSON.parse(text);
      const result = await settingsService.importSettings(settings);

      if (result.success) {
        onOpenChange();
        setImportFile(null);
      }
    } catch (error) {
      console.error("Failed to import settings:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.container} container mx-auto px-4`}>
      {/* Header */}
      <Card className={styles.card} style={{ marginBottom: '24px' }}>
        <PageHeader 
          title="Settings"
          subtitle="Manage your application settings and preferences"
          actions={
            <>
              <Button
                className="bg-[var(--docmate-surface-alt)] text-[var(--docmate-text)] shadow-sm hover:shadow-md transition-shadow"
                variant="flat"
                startContent={<ArrowDownTrayIcon className="w-4 h-4" />}
                onClick={handleExport}
                isDisabled={saving}
              >
                Export
              </Button>
              <Button
                color="primary"
                className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                startContent={<ArrowUpTrayIcon className="w-4 h-4" />}
                onPress={onOpen}
                isDisabled={saving}
              >
                Import
              </Button>
            </>
          }
        />

        <CardBody className="p-6">
          <Input
            placeholder="Search settings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<CogIcon className="w-4 h-4 opacity-40" />}
            variant="bordered"
            classNames={{
              inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
              input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50"
            }}
          />
        </CardBody>
      </Card>

      {/* Settings Tabs */}
      <Card className={styles.card}>
        <CardBody className="p-0">
          <Tabs
            aria-label="Settings categories"
            variant="underlined"
            classNames={{
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-[var(--docmate-border-color)] px-6",
              cursor: "w-full bg-[var(--docmate-primary)]",
              tab: "max-w-fit px-0 h-14",
              tabContent: "group-data-[selected=true]:text-[var(--docmate-primary)] text-[var(--docmate-text-secondary)]",
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.id}
                title={
                  <div className="flex items-center gap-2">
                    {tab.icon}
                    <span className="font-medium">{tab.label}</span>
                  </div>
                }
              >
                <div className="p-6">{tab.content}</div>
              </Tab>
            ))}
          </Tabs>
        </CardBody>
      </Card>

      {/* Import Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-large font-semibold">Import Settings</h3>
                <p className="text-small" style={{ color: 'var(--docmate-text-secondary)' }}>
                  Upload a JSON file to import settings. This will override existing settings.
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select JSON file</label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                       className="block w-full text-sm
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-[rgba(var(--docmate-primary-rgb),0.1)] file:text-[var(--docmate-primary)]
                        hover:file:bg-[rgba(var(--docmate-primary-rgb),0.15)]"
                       style={{ color: 'var(--docmate-text-secondary)' }}
                    />
                  </div>

                  {importFile && (
                    <div className="space-y-2">
                      <p className="text-sm" style={{ color: 'var(--docmate-text-secondary)' }}>
                        <strong>File:</strong> {importFile.name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--docmate-text-secondary)' }}>
                        <strong>Size:</strong> {(importFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleImport} isDisabled={!importFile || saving}>
                  {saving ? <Spinner size="sm" /> : "Import"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
