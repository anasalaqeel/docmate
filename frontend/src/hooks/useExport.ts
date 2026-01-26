import { useState } from "react";
import { toast } from "sonner";

export type ExportFormat = "pdf" | "markdown" | "json";

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

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

  const handleExport = async (documentId: number, documentTitle: string, format: ExportFormat) => {
    setIsExporting(true);
    setExportFormat(format);

    try {
      const baseUrl = "http://localhost:8002/v1";
      const exportUrl = `${baseUrl}/docs/${documentId}/export/${format}`;

      const response = await fetch(exportUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": format === "json" ? "application/json" : "*/*"
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed with status: ${response.status}`);
      }

      const sanitizedTitle = documentTitle.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
      const filename = `${sanitizedTitle}-export.${format === "markdown" ? "zip" : format}`;

      if (format === "json") {
        const jsonData = await response.json();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
        downloadFile(blob, filename);
        toast.success("JSON data exported successfully!");
      } else {
        const blob = await response.blob();
        downloadFile(blob, filename);
        toast.success(`${format === "pdf" ? "PDF" : "Markdown"} exported successfully!`);
      }
    } catch (error) {
      console.error("Export error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  return {
    handleExport,
    isExporting,
    exportFormat
  };
};
