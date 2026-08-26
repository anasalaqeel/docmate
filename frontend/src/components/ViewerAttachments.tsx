import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Skeleton,
} from "@heroui/react";
import {
  FileIcon,
  FileText,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  Download,
  Paperclip,
} from "lucide-react";
import attachmentsService from "../services/attachmentsService";
import type { Attachment } from "../types/docs";

interface ViewerAttachmentsProps {
  entityId: number;
  entityType: "documentation" | "page";
}

const ViewerAttachments = ({ entityId, entityType }: ViewerAttachmentsProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttachments = async () => {
      try {
        setLoading(true);
        const response = entityType === "documentation"
          ? await attachmentsService.getDocAttachments(entityId)
          : await attachmentsService.getPageAttachments(entityId);
        
        if (response.success && response.data) {
          setAttachments(response.data);
        } else {
          setAttachments([]);
        }
      } catch (error) {
        console.error("Failed to load attachments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAttachments();
  }, [entityId, entityType]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-[var(--docmate-error)]" />;
    if (mimeType.includes("zip") || mimeType.includes("archive")) return <FileArchive className="w-5 h-5 text-orange-500" />;
    if (mimeType.includes("image")) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes("word") || mimeType.includes("officedocument.wordprocessingml")) 
      return <FileText className="w-5 h-5 text-blue-600" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv") || mimeType.includes("sheet")) 
      return <FileSpreadsheet className="w-5 h-5 text-[var(--docmate-success)]" />;
    return <FileIcon className="w-5 h-5 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!loading && attachments.length === 0) return null;

  return (
    <Card className="shadow-none border border-[var(--docmate-border-color)] mt-8 bg-[var(--docmate-surface)]">
      <CardBody className="p-6">
        <h4 className="text-lg font-bold flex items-center gap-2 mb-4 text-[var(--docmate-text)]">
          <Paperclip className="w-5 h-5 text-primary" />
          Attachments
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading ? (
            Array(2).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-[var(--docmate-surface-alt)]" />
            ))
          ) : (
            attachments.map((attachment) => (
              <div 
                key={attachment.id} 
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--docmate-border-color)] bg-[var(--docmate-surface-alt)]/30 hover:bg-[var(--docmate-surface-alt)] transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 rounded-lg bg-[var(--docmate-surface)] shadow-sm border border-[var(--docmate-border-color)] flex-shrink-0">
                    {getFileIcon(attachment.mimeType)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate text-[var(--docmate-text)]" title={attachment.originalName}>
                      {attachment.originalName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[var(--docmate-text-alt)] font-medium">
                        {formatSize(attachment.size)}
                      </span>
                      {attachment.description && (
                        <span className="text-[10px] text-[var(--docmate-text-alt)]/30">•</span>
                      )}
                      {attachment.description && (
                        <span className="text-[10px] text-[var(--docmate-text-alt)] truncate max-w-[100px]">
                          {attachment.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  isIconOnly 
                  size="sm" 
                  variant="flat" 
                  color="primary"
                  as="a"
                  href={attachment.path}
                  download={attachment.originalName}
                  className="flex-shrink-0 ml-2 bg-primary text-white"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default ViewerAttachments;
