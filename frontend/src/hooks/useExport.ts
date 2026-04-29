import { useState } from "react";
import { toast } from "sonner";
import httpService from "../services/httpService";

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
