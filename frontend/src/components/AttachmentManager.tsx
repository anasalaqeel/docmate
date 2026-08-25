import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  Button,
  Input,
  Chip,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Skeleton,
} from "@heroui/react";
import {
  FileIcon,
  FileText,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  Trash2,
  Upload,
  Download,
  Paperclip,
  X,
} from "lucide-react";
import { toast } from "sonner";
import attachmentsService from "../services/attachmentsService";
import type { Attachment } from "../types/docs";

interface AttachmentManagerProps {
  entityId: number;
  entityType: "documentation" | "page";
  title?: string;
  description?: string;
}

const AttachmentManager = ({
  entityId,
  entityType,
  title = "Attachments",
  description = "Manage file attachments for this resource.",
}: AttachmentManagerProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileDescription, setFileDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadAttachments = useCallback(async () => {
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
    } catch (error: unknown) {
      console.error("Failed to load attachments:", error);
      toast.error("Failed to load attachments");
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      let successCount = 0;
      let failCount = 0;

      for (const file of selectedFiles) {
        const response = entityType === "documentation"
          ? await attachmentsService.uploadDocAttachment(entityId, file, fileDescription)
          : await attachmentsService.uploadPageAttachment(entityId, file, fileDescription);

        if (response.success) {
          successCount++;
        } else {
          failCount++;
          toast.error(`Failed to upload ${file.name}: ${response.message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} file(s)${failCount > 0 ? `, but ${failCount} failed` : ""}`);
        setSelectedFiles([]);
        setFileDescription("");
        loadAttachments();
        onClose(); // Close modal on success
      }
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload files. Check size limits (25MB).";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      const response = await attachmentsService.deleteAttachment(id);
      if (response.success) {
        toast.success("Attachment deleted");
        loadAttachments();
      } else {
        toast.error(response.message || "Delete failed");
      }
    } catch (error: unknown) {
      console.error("Delete error:", error);
      toast.error("Failed to delete attachment");
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-[var(--grud-error)]" />;
    if (mimeType.includes("zip") || mimeType.includes("archive")) return <FileArchive className="w-5 h-5 text-orange-500" />;
    if (mimeType.includes("image")) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes("word") || mimeType.includes("officedocument.wordprocessingml")) 
      return <FileText className="w-5 h-5 text-blue-600" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv") || mimeType.includes("sheet")) 
      return <FileSpreadsheet className="w-5 h-5 text-[var(--grud-success)]" />;
    return <FileIcon className="w-5 h-5 text-slate-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--grud-text)]">
            <Paperclip className="w-5 h-5 text-primary" />
            {title}
          </h3>
          <p className="text-sm text-[var(--grud-text-alt)]">{description}</p>
        </div>
        <Button 
          color="primary" 
          variant="flat" 
          startContent={<Upload className="w-4 h-4" />}
          onPress={onOpen}
          className="bg-[var(--grud-surface-alt)] hover:bg-[var(--grud-surface-alt-hover)] text-[var(--grud-text)] border border-[var(--grud-border-color)]"
        >
          Add Attachment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-[var(--grud-surface-alt)]" />
          ))
        ) : attachments.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-[var(--grud-border-color)] rounded-xl bg-[var(--grud-surface-alt)]">
            <Paperclip className="w-12 h-12 text-[var(--grud-text-alt)]/20 mx-auto mb-4" />
            <p className="text-[var(--grud-text-alt)]">No attachments found.</p>
          </div>
        ) : (
          attachments.map((attachment) => (
            <Card 
              key={attachment.id} 
              className="shadow-none bg-[var(--grud-surface)] border border-[var(--grud-border-color)] hover:border-primary/50 transition-colors"
            >
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--grud-surface-alt)]">
                    {getFileIcon(attachment.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate text-[var(--grud-text)]" title={attachment.originalName}>
                        {attachment.originalName}
                      </p>
                      <Chip size="sm" variant="flat" className="text-[10px] h-5 bg-[var(--grud-surface-alt)] text-[var(--grud-text-alt)]">
                        {formatSize(attachment.size)}
                      </Chip>
                    </div>
                    {attachment.description && (
                      <p className="text-xs text-[var(--grud-text-alt)] mt-1 line-clamp-1">{attachment.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Tooltip content="Download">
                      <Button 
                        isIconOnly 
                        size="sm" 
                        variant="light" 
                        as="a" 
                        href={attachment.path} 
                        download={attachment.originalName}
                        className="text-[var(--grud-text-alt)] hover:text-primary"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <Button 
                        isIconOnly 
                        size="sm" 
                        variant="light" 
                        color="danger"
                        onPress={() => handleDelete(attachment.id)}
                        isLoading={deletingId === attachment.id}
                        className="text-[var(--grud-text-alt)] hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        backdrop="blur"
        classNames={{
          base: "bg-[var(--grud-surface)] border border-[var(--grud-border-color)]",
          header: "border-b border-[var(--grud-border-color)] text-[var(--grud-text)]",
          footer: "border-t border-[var(--grud-border-color)]",
          closeButton: "hover:bg-[var(--grud-surface-alt)]"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Upload Attachments</ModalHeader>
              <ModalBody className="space-y-4 py-6">
                <div 
                  className="border-2 border-dashed border-[var(--grud-border-color)] rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer bg-[var(--grud-surface-alt)]/30"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    onChange={handleFileSelect}
                    multiple
                  />
                  <Upload className="w-10 h-10 text-[var(--grud-text-alt)]/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-[var(--grud-text)]">
                    Click to select or drag and drop files
                  </p>
                  <p className="text-xs text-[var(--grud-text-alt)] mt-1">
                    Max size: 25MB per file (PDF, ZIP, Images, Office)
                  </p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-[var(--grud-surface-alt)] border border-[var(--grud-border-color)]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {getFileIcon(file.type)}
                          <span className="text-xs font-medium truncate max-w-[200px] text-[var(--grud-text)]">{file.name}</span>
                          <span className="text-[10px] text-[var(--grud-text-alt)]">({formatSize(file.size)})</span>
                        </div>
                        <Button 
                          isIconOnly 
                          size="sm" 
                          variant="light" 
                          onPress={() => removeSelectedFile(index)}
                          className="text-[var(--grud-text-alt)] hover:text-danger"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Input
                  label="Common Description"
                  placeholder="What are these files for?"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  variant="bordered"
                  classNames={{
                    label: "text-[var(--grud-text-alt)]",
                    input: "text-[var(--grud-text)]",
                    inputWrapper: "border-[var(--grud-border-color)] focus-within:border-primary",
                  }}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} className="text-[var(--grud-text)]">Cancel</Button>
                <Button 
                  color="primary" 
                  onPress={handleUpload} 
                  isLoading={uploading}
                  isDisabled={selectedFiles.length === 0}
                  className="bg-primary text-white"
                >
                  {uploading ? "Uploading..." : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AttachmentManager;
