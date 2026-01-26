import { useState, useEffect } from "react";
import type { PageContent, CrudOperation, DocumentMetadata } from "../types/docs";
import { Card, CardBody, CardHeader, Button, Textarea } from "@heroui/react";
import { toast } from "sonner";
import httpService from "../services/httpService";
import RichDocumentEditor from "./ui/richDocumentEditor";
import styles from "../styles/pageEditor.module.css";

interface Page {
  id: number;
  slug: string;
  content: PageContent;
  crudOperations: CrudOperation[];
  metadata?: DocumentMetadata;
  createdAt?: string;
  updatedAt?: string;
}

interface PageEditorProps {
  page: Page;
  onSave?: (updatedPage?: Page) => void;
  documentationType?: "traditional" | "api" | "mixed";
  docId?: number;
}

const PageEditor = ({ page, onSave, documentationType = "mixed", docId }: PageEditorProps) => {
  const [content, setContent] = useState(page.content?.description || "");
  const [isEditing, setIsEditing] = useState(false);

  // Modal state removed - operations managed in API Docs tab

  useEffect(() => {
    setContent(page.content?.description || "");
  }, [page]);

  const handleSavePageContent = async () => {
    try {
      await httpService.put(`/docs/pages/${page.id}`, {
        content: {
          ...page.content,
          description: content,
        },
      });

      // Optimistic update - update local state immediately
      const updatedPage: Page = {
        ...page,
        content: {
          ...page.content,
          description: content,
        },
      };

      setIsEditing(false);

      // Show success toast
      toast.success("Content saved successfully");

      // Notify parent with the updated page data (optimistic)
      if (onSave) {
        onSave(updatedPage);
      }
    } catch (error) {
      console.error("Failed to save page content:", error);
      toast.error("Failed to save content");

      // On error, revert the optimistic update by refetching
      if (onSave) {
        onSave(); // Call without data to signal refetch needed
      }
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.pageCard}>
        <CardHeader className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Page: {page.slug}</h2>
            <p className={styles.pageSubtitle}>Edit page content</p>
          </div>
          {documentationType === "api" && (
            <Button size="sm" onPress={() => setIsEditing(!isEditing)} className={isEditing ? "" : styles.buttonGradient}>
              {isEditing ? "Cancel" : "Edit Content"}
            </Button>
          )}
        </CardHeader>

        <CardBody className="p-0">
          <div className="space-y-6">
            {/* Content Section */}
            <div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${styles.contentHeading}`}>Content</h3>
                  {documentationType === "api" && !isEditing && (
                    <Button size="sm" onPress={() => setIsEditing(true)} className={styles.buttonGradient}>
                      Edit Content
                    </Button>
                  )}
                </div>

                {/* Legacy CRUD operations banner removed */}

                {documentationType === "traditional" || documentationType === "mixed" ? (
                  <RichDocumentEditor
                    value={content}
                    onChange={setContent}
                    onSave={handleSavePageContent}
                    title={`Edit ${page.slug}`}
                    placeholder="Start writing your documentation content here..."
                    embedded={true}
                    pageId={page.id}
                    docId={docId}
                  />
                ) : documentationType === "api" ? (
                  isEditing ? (
                    <div className="space-y-6">
                      <Textarea
                        label="Page Description"
                        labelPlacement="outside"
                        placeholder="Enter page description..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        minRows={8}
                        variant="bordered"
                        classNames={{
                          inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                          input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
                          label: "text-[var(--grud-text)] font-semibold"
                        }}
                      />
                      <div className="flex gap-3 justify-end items-center">
                        <Button 
                          variant="light" 
                          onPress={() => setIsEditing(false)}
                          className="hover:bg-[var(--grud-surface-alt)] text-[var(--grud-text-secondary)]"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onPress={handleSavePageContent} 
                          className={styles.buttonGradient + " px-8"}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.contentBox}>
                      {content ? (
                        <div className={styles.contentText}>
                          {content.split("\n").map((line, index) => (
                            <p key={index} className="mb-2 last:mb-0">
                              {line || "\u00A0"}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.contentEmpty}>No content yet. Click "Edit Content" to add a description.</p>
                      )}
                    </div>
                  )
                ) : null}
              </div>
            </div>

            {/* API Operations management moved to dedicated API Docs tab for better organization */}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default PageEditor;
