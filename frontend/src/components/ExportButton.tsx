import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { toast } from "sonner";
import { EnhancedButton } from "./ui/enhancedButton";
import httpService from "../services/httpService";

interface ExportButtonProps {
  documentId: number;
  documentTitle: string;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost";
  className?: string;
}

export type ExportFormat = "pdf" | "markdown" | "json";

interface ExportOption {
  key: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  fileExtension: string;
  mimeType: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  documentId,
  documentTitle,
  size = "md",
  variant = "solid",
  className = ""
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const exportOptions: ExportOption[] = [
    {
      key: "pdf",
      label: "PDF Document",
      description: "Export as a formatted PDF document with all pages and API specs",
      icon: <DocumentTextIcon className="w-4 h-4" />,
      fileExtension: "pdf",
      mimeType: "application/pdf"
    },
    {
      key: "markdown",
      label: "Markdown Collection",
      description: "Export as a ZIP file containing all pages as Markdown files",
      icon: <CodeBracketIcon className="w-4 h-4" />,
      fileExtension: "zip",
      mimeType: "application/zip"
    },
    {
      key: "json",
      label: "JSON Data",
      description: "Export complete document data as structured JSON",
      icon: <ArchiveBoxIcon className="w-4 h-4" />,
      fileExtension: "json",
      mimeType: "application/json"
    }
  ];

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportFormat(format);

    try {
      const exportUrl = `/docs/${documentId}/export/${format}`;

      const sanitizedTitle = documentTitle.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
      const filename = `${sanitizedTitle}-export.${format === "markdown" ? "zip" : format}`;

      if (format === "json") {
        const jsonData = await httpService.get<any>(exportUrl);
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
        downloadFile(blob, filename);
        toast.success("JSON data exported successfully!");
      } else {
        // Use axios directly from httpService to get blob response
        const axiosInstance = httpService.getInstance();
        const response = await axiosInstance.get(exportUrl, {
          responseType: "blob",
        });
        
        downloadFile(response.data, filename);
        toast.success(`${format === "pdf" ? "PDF" : "Markdown"} exported successfully!`);
      }

    } catch (error) {
      console.error("Export error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.includes("Authentication required")) {
        toast.error("Please log in to export documents");
      } else if (errorMessage.includes("Insufficient permissions")) {
        toast.error("You don't have permission to export this document");
      } else if (errorMessage.includes("not found")) {
        toast.error("Document not found");
      } else {
        toast.error(`Export failed: ${errorMessage}`);
      }
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getExportButtonText = () => {
    if (isExporting && exportFormat) {
      const formatNames = {
        pdf: "PDF",
        markdown: "Markdown",
        json: "JSON"
      };
      return `Exporting ${formatNames[exportFormat]}...`;
    }
    return "Export";
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <EnhancedButton
          size={size}
          variant={variant}
          color="primary"
          icon={<DocumentArrowDownIcon className="w-4 h-4" />}
          className={className}
          isLoading={isExporting}
          loadingText={getExportButtonText()}
          animate
        >
          Export
        </EnhancedButton>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Export options"
        onAction={(key) => handleExport(key as ExportFormat)}
      >
        {exportOptions.map((option) => (
          <DropdownItem
            key={option.key}
            startContent={option.icon}
            description={option.description}
            className="py-3"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-default-500">(.{option.fileExtension})</span>
            </div>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

export default ExportButton;