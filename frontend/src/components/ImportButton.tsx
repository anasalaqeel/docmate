import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { DocumentArrowUpIcon, ArchiveBoxIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { EnhancedButton } from "./ui/enhancedButton";

interface ImportButtonProps {
  documentId?: number;
  onImportSuccess?: (document: Record<string, unknown> | any) => void;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";
  className?: string;
}

export type ImportFormat = "zip" | "json";

interface ImportOption {
  key: ImportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  accept: string;
}

export const ImportButton: React.FC<ImportButtonProps> = ({
  documentId,
  onImportSuccess,
  size = "md",
  variant = "solid",
  className = "",
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importFormat, setImportFormat] = useState<ImportFormat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importOptions: ImportOption[] = [
    {
      key: "zip",
      label: "Markdown Export",
      description: "Import from a previously exported Markdown ZIP file",
      icon: <ArchiveBoxIcon className="w-4 h-4" />,
      accept: ".zip,application/zip",
    },
    {
      key: "json",
      label: "JSON Data",
      description: "Import from a previously exported JSON file",
      icon: <CloudArrowUpIcon className="w-4 h-4" />,
      accept: ".json,application/json",
    },
  ];

  const handleFileSelect = (format: ImportFormat) => {
    setImportFormat(format);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !importFormat) return;

    setIsImporting(true);

    try {
      const baseUrl = "http://localhost:8002/v1";
      const importUrl = documentId
        ? `${baseUrl}/docs/${documentId}/import`
        : `${baseUrl}/docs/import`;

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(importUrl, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Import failed with status: ${response.status}`);
      }

      const result = await response.json();

      // Debug log to see what we got back
      console.log("ImportButton: Import result", { result, hasCallback: !!onImportSuccess });

      // Show success message with details
      if (result.createdItems) {
        toast.success(`Document imported successfully! ${result.createdItems} items created.`);
      } else {
        toast.success("Document imported successfully!");
      }

      // Call success callback if provided - just need successful import, not necessarily document data
      if (onImportSuccess) {
        console.log("ImportButton: Calling onImportSuccess", {
          document: result.document,
          callback: !!onImportSuccess,
        });
        onImportSuccess(result.document);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.includes("Authentication required")) {
        toast.error("Please log in to import documents");
      } else if (errorMessage.includes("Insufficient permissions")) {
        toast.error("You don't have permission to import documents");
      } else if (errorMessage.includes("Invalid export file")) {
        toast.error("Invalid export file format");
      } else if (errorMessage.includes("missing _index.md")) {
        toast.error("Invalid ZIP file: missing _index.md");
      } else if (errorMessage.includes("Invalid JSON format")) {
        toast.error("Invalid JSON file format");
      } else {
        toast.error(`Import failed: ${errorMessage}`);
      }
    } finally {
      setIsImporting(false);
      setImportFormat(null);
    }
  };

  const getImportButtonText = () => {
    if (isImporting && importFormat) {
      const formatNames = {
        zip: "Markdown",
        json: "JSON",
      };
      return `Importing ${formatNames[importFormat]}...`;
    }
    return "Import";
  };

  return (
    <>
      <Dropdown>
        <DropdownTrigger>
          <EnhancedButton
            size={size}
            variant={variant}
            color="secondary"
            icon={<DocumentArrowUpIcon className="w-4 h-4" />}
            className={className}
            isLoading={isImporting}
            loadingText={getImportButtonText()}
            animate
          >
            Import
          </EnhancedButton>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Import options"
          onAction={(key) => handleFileSelect(key as ImportFormat)}
        >
          {importOptions.map((option) => (
            <DropdownItem
              key={option.key}
              startContent={option.icon}
              description={option.description}
              className="py-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-default-500">({option.key.toUpperCase()})</span>
              </div>
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={importFormat ? importOptions.find((opt) => opt.key === importFormat)?.accept : ""}
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </>
  );
};

export default ImportButton;
