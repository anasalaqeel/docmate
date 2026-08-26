import { useState, useEffect, useCallback, useOptimistic } from "react";
import React from "react";
import type { Documentation, SidebarItem } from "../../types/docs";
import { useParams, useNavigate } from "react-router";
import {
  Card,
  CardBody,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Breadcrumbs,
  BreadcrumbItem,
  Tabs,
  Tab,
} from "@heroui/react";
import Switch from "../../components/ui/Switch";
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  TrashIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import { getDocById, createSidebarItem, updateDoc } from "../../services/docsService";
import SidebarManager from "../../components/sidebarManager";
import PageEditor from "../../components/pageEditor";
import DocumentationTypeSelector from "../../components/documentationTypeSelector";
import OpenApiViewer from "../../components/openApiViewer";
import TrashManager from "../../components/trashManager";
import AttachmentManager from "../../components/AttachmentManager";
import { EmojiPickerInput } from "../../components/ui";
import { useSidebarTree } from "../../hooks/useSidebarTree";
import ExportButton from "../../components/ExportButton";
import ImportButton from "../../components/ImportButton";
import styles from "../../styles/docsEditorPage.module.css";

import { useLayout } from "../../contexts/layoutContext";
import { AdminSidebar } from "../../components/Sidebar/AdminSidebar";

const DocsEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Documentation | null>(null);
  const [selectedItem, setSelectedItem] = useState<SidebarItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("content");
  const [isTokenCopied, setIsTokenCopied] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { setLayoutData, resetLayoutData } = useLayout();

  useEffect(() => {
    if (doc) {
      setLayoutData({
        headerTitle: `Editor: ${doc.title}`,
        navbarType: "admin",
        sidebar: <AdminSidebar />,
        showAdminButton: false,
      });
    } else {
        setLayoutData({
            headerTitle: "Editor",
            navbarType: "admin",
            sidebar: <AdminSidebar />,
            showAdminButton: false,
        });
    }
    return () => resetLayoutData();
  }, [doc, setLayoutData, resetLayoutData]);

  // Optimistic state for sidebar items
  const [optimisticDoc, addOptimisticDoc] = useOptimistic(
    doc,
    (state, newDoc: Documentation | null) => newDoc || state
  );

  const [newItemData, setNewItemData] = useState({
    title: "",
    type: "page" as "folder" | "page" | "divider",
    parentId: null as number | null,
    parentName: null as string | null,
    icon: "",
  });
  
  const fetchDocumentation = useCallback(async (silent = false) => {
    if (!id) return;

    try {
      if (!silent) setIsLoading(true);
      const response = await getDocById(parseInt(id));

      if (response.success && response.data) {
        setDoc(response.data);
      } else {
        navigate("/admin/docs");
      }
    } catch (error) {
      console.error("Failed to fetch documentation:", error);
      navigate("/admin/docs");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDocumentation();
  }, [fetchDocumentation]);

  const handleCreateSidebarItem = async () => {
    if (!id || !newItemData.title.trim()) return;

    // Optimistic update - add item immediately to UI
    const tempId = Date.now(); // Temporary ID
    const optimisticItem: SidebarItem = {
      id: tempId,
      title: newItemData.title.trim(),
      type: newItemData.type,
      parentId: newItemData.parentId ?? undefined,
      icon: newItemData.icon || "",
      children: [],
      documentationId: parseInt(id),
      order: doc?.sidebarItems?.length || 0,
      isExpanded: false,
      createdAt: new Date().toISOString(),
    };

    const newDocWithItem = (currentDoc: Documentation | null): Documentation | null => {
      if (!currentDoc || !currentDoc.sidebarItems) return currentDoc;

      if (optimisticItem.parentId) {
        // Add to parent folder
        const addToParent = (items: SidebarItem[]): SidebarItem[] => {
          return items.map((item) => {
            if (item.id === optimisticItem.parentId) {
              return {
                ...item,
                children: [...(item.children || []), optimisticItem],
              };
            }
            if (item.children) {
              return { ...item, children: addToParent(item.children) };
            }
            return item;
          });
        };
        return { ...currentDoc, sidebarItems: addToParent(currentDoc.sidebarItems) };
      } else {
        // Add to root
        return {
          ...currentDoc,
          sidebarItems: [...currentDoc.sidebarItems, optimisticItem],
        };
      }
    };

    React.startTransition(() => {
      addOptimisticDoc(newDocWithItem(doc));
    });

    try {
      const response = await createSidebarItem(parseInt(id), {
        ...newItemData,
        parentId: newItemData.parentId ?? undefined,
        title: newItemData.title.trim(),
        order: doc?.sidebarItems?.length || 0,
      });

      if (response.success && response.data) {
        // Silently refresh from the server to ensure tree structural integrity
        await fetchDocumentation(true);

        onClose();
        setNewItemData({
          title: "",
          type: "page",
          parentId: null,
          parentName: null,
          icon: "",
        });
      }
    } catch (error) {
      console.error("Failed to create sidebar item:", error);
    }
  };

  const handleSelectItem = (item: SidebarItem | null) => {
    setSelectedItem(item);
  };

  const handlePageSave = (updatedPage?: SidebarItem["page"]) => {
    if (updatedPage && selectedItem) {
      // Optimistic update - update the page in the doc state without refetching
      setDoc((prevDoc) => {
        if (!prevDoc || !prevDoc.sidebarItems) return prevDoc;

        const updatedSidebarItems = prevDoc.sidebarItems.map((item) => {
          if (item.id === selectedItem.id && item.page) {
            return {
              ...item,
              page: updatedPage,
            };
          }
          return item;
        });

        return {
          ...prevDoc,
          sidebarItems: updatedSidebarItems,
        };
      });

      // Update the selectedItem as well
      setSelectedItem((prev) => (prev ? { ...prev, page: updatedPage } : prev));
    } else {
      // No updated page data provided, means there was an error - refetch
      fetchDocumentation();
    }
  };

  const updateDocumentation = async (updates: Partial<Documentation>): Promise<void> => {
    if (!id || !doc) return;

    try {
      console.log("Updating documentation with:", updates);
      const result = await updateDoc(parseInt(id), updates as Parameters<typeof updateDoc>[1]);
      console.log("Update result:", result);

      if (result.success && result.data) {
        setDoc((prev) => (prev ? { ...prev, ...result.data } : null));
        console.log("Documentation updated successfully");
      } else {
        console.error("Update failed:", result.message);
        throw new Error(result.message || "Update failed");
      }
    } catch (error) {
      console.error("Failed to update documentation:", error);
      throw error;
    }
  };

  const openCreateModal = (parentId?: number, parentName?: string) => {
    setNewItemData({
      title: "",
      type: "page",
      parentId: parentId || null,
      icon: "",
      parentName: parentName || null,
    });
    onOpen();
  };

  // Event handlers for sidebar operations
  const handleDeleteItem = useCallback((deletedItemId: number) => {
    const deleteItemRecursive = (items: SidebarItem[]): SidebarItem[] => {
      return items
        .filter((item) => item.id !== deletedItemId)
        .map((item) => ({
          ...item,
          children: item.children ? deleteItemRecursive(item.children) : undefined,
        }));
    };

    const newDoc = doc ? {
      ...doc,
      sidebarItems: deleteItemRecursive(doc.sidebarItems || []),
    } : null;

    React.startTransition(() => {
      addOptimisticDoc(newDoc);
    });

    // Clear selected item if it was deleted
    setSelectedItem((prev) => (prev?.id === deletedItemId ? null : prev));
  }, [doc, addOptimisticDoc]);

  const handleUpdateItem = useCallback((itemId: number, updates: Partial<SidebarItem>) => {
    const updateItemRecursive = (items: SidebarItem[]): SidebarItem[] => {
      return items.map((item) => {
        if (item.id === itemId) {
          return { ...item, ...updates };
        }
        if (item.children) {
          return { ...item, children: updateItemRecursive(item.children) };
        }
        return item;
      });
    };

    const newDoc = doc ? {
      ...doc,
      sidebarItems: updateItemRecursive(doc.sidebarItems || []),
    } : null;

    React.startTransition(() => {
      addOptimisticDoc(newDoc);
    });

    // Update selected item if it was edited
    setSelectedItem((prev) => (prev?.id === itemId ? { ...prev, ...updates } : prev));
  }, [doc, addOptimisticDoc]);

  // Use memoized tree hook - O(n) complexity instead of O(n²)
  const sidebarTree = useSidebarTree(optimisticDoc?.sidebarItems);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Loading documentation..." />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className={styles.error}>
        <h2>Documentation not found</h2>
        <Button onPress={() => navigate("/admin/docs")}>Back to Documentation List</Button>
      </div>
    );
  }

  // Helper function to render folder options for parent selection
  const renderFolderOptions = (items: SidebarItem[], level = 0) => {
    const options: React.ReactElement[] = [];

    items.forEach((item) => {
      if (item.type === "folder") {
        options.push(
          <SelectItem 
            key={item.id} 
            startContent={<span>📁</span>}
            textValue={item.title}
          >
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 12}px`, color: 'var(--docmate-text)' }}>
              <span>{item.title}</span>
            </div>
          </SelectItem>
        );

        if (item.children && item.children.length > 0) {
          options.push(...renderFolderOptions(item.children, level + 1));
        }
      }
    });

    return options;
  };

  return (
    <div className={`${styles.container} container mx-auto px-4`}>
     <div className={styles.header}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <Breadcrumbs
              className="text-sm font-medium"
              itemClasses={{
                separator: "opacity-40",
              }}
            >
              <BreadcrumbItem
                onPress={() => navigate("/admin/docs")}
                className="transition-colors hover:text-primary"
              >
                Documentation
              </BreadcrumbItem>
              <BreadcrumbItem className="text-foreground font-semibold">{doc.title}</BreadcrumbItem>
            </Breadcrumbs>
            <div className="flex items-center gap-2">
              <div className={`${styles.statusDot} ${doc.isPublic ? styles.live : styles.draft}`}></div>
              <span className={styles.statusText}>
                {doc.isPublic ? "Live" : "Draft"}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Chip
            color={doc.isPublic ? "success" : "default"}
            variant="flat"
            size="sm"
            className="font-medium shadow-sm"
          >
            {doc.isPublic ? "Public" : "Private"}
          </Chip>
          <Chip variant="flat" size="sm" className="font-medium shadow-sm">
            {doc.type || "mixed"}
          </Chip>
          <Chip variant="flat" size="sm" className="font-medium shadow-sm">
            v{doc.version}
          </Chip>
          <ExportButton 
            documentId={doc.id!} 
            documentTitle={doc.title} 
            size="sm" 
            variant="flat" 
            className="bg-[var(--docmate-surface-alt)] border-1 border-[var(--docmate-border-color)] text-[var(--docmate-text)] hover:bg-[var(--docmate-border-color)] transition-all" 
          />
          <ImportButton
            documentId={doc.id}
            onImportSuccess={() => fetchDocumentation()}
            size="sm"
            variant="flat"
            className="bg-[var(--docmate-surface-alt)] border-1 border-[var(--docmate-border-color)] text-[var(--docmate-text)] hover:bg-[var(--docmate-border-color)] transition-all"
          />
          <Button
            onPress={() => openCreateModal()}
            className={`${styles.buttonPrimary} font-medium px-4`}
            startContent={
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
          >
            Add Item
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>Structure</h3>
            <Button
              size="sm"
              isIconOnly
              onPress={() => openCreateModal()}
              className={`${styles.buttonPrimary} rounded-xl`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Button>
          </div>

          <SidebarManager
            items={sidebarTree}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            onCreateItem={openCreateModal}
            onRefresh={() => fetchDocumentation(true)}
            onDeleteItem={handleDeleteItem}
            onUpdateItem={handleUpdateItem}
            docId={parseInt(id!)}
          />
        </div>

        <div className={styles.editor}>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            fullWidth
            className={styles.tabs}
            classNames={{
              tabContent:"group-data-[selected=true]:text-white"
            }}
          >
            <Tab
              key="content"
              title={
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4" />
                  Content
                </div>
              }
            >
              {selectedItem ? (
                selectedItem.type === "page" && selectedItem.page ? (
                  <PageEditor
                    key={`page-${selectedItem.page.id}`}
                    page={selectedItem.page}
                    onSave={handlePageSave}
                    documentationType={doc.type as "traditional" | "api" | "mixed"}
                    docId={parseInt(id!)}
                  />
                ) : selectedItem.type === "folder" ? (
                  <Card className={styles.card}>
                    <CardBody className={styles.folderView}>
                      <div className={styles.iconHighlight}>📁</div>
                      <h2>{selectedItem.title}</h2>
                      <p>
                        This is a folder item. Select a page from the sidebar to edit its content,
                        or create a new page within this folder.
                      </p>
                      <Button
                        onPress={() => openCreateModal(selectedItem.id, selectedItem.title)}
                        className={`${styles.buttonPrimary} font-medium px-6`}
                        startContent={
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                        }
                      >
                        Add Page to This Folder
                      </Button>
                    </CardBody>
                  </Card>
                ) : (
                  <Card>
                    <CardBody className={styles.dividerView}>
                      <h2>Divider</h2>
                      <p>This is a divider element used for visual separation.</p>
                    </CardBody>
                  </Card>
                )
              ) : (
                <Card className={styles.card}>
                  <CardBody className={styles.emptyEditor}>
                    <div className={styles.iconHighlight}>🚀</div>
                    <h2>Welcome to {doc.title}</h2>
                    <p>
                      Select an item from the sidebar to start editing, or create your first page to
                      begin building your documentation.
                    </p>
                    <Button
                      onPress={() => openCreateModal()}
                      className={`${styles.buttonPrimary} font-medium px-8 py-3 text-base`}
                      startContent={
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                          />
                        </svg>
                      }
                    >
                      Create Your First Page
                    </Button>
                  </CardBody>
                </Card>
              )}
            </Tab>

            {(doc.type === "api" || doc.type === "mixed") && (
              <Tab
                key="api"
                title={
                  <div className="flex items-center gap-2">
                    <CodeBracketIcon className="w-4 h-4" />
                    API Docs
                  </div>
                }
              >
                <OpenApiViewer documentation={doc} onSpecUpdate={fetchDocumentation} />
              </Tab>
            )}

            <Tab
              key="settings"
              title={
                <div className="flex items-center gap-2">
                  <Cog6ToothIcon className="w-4 h-4" />
                  Settings
                </div>
              }
            >
              <DocumentationTypeSelector
                documentation={doc}
                onUpdate={updateDocumentation}
                isEditing={true}
              />

              <Card className={`mt-6 ${styles.cardSmall}`}>
                <CardBody className="space-y-4 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheckIcon className={`w-5 h-5 ${styles.iconPrimary}`} />
                    <h3 className="text-lg font-semibold">External API Ingestion</h3>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm max-w-xl ${styles.textSecondary}`}>
                      Use this token to authenticate requests from external services when ingesting API documentation. 
                      This token is unique to this documentation.
                    </p>
                    <Switch 
                      isSelected={doc.ingestionEnabled || false} 
                      onValueChange={(isSelected) => updateDocumentation({ ingestionEnabled: isSelected })}
                      size="sm"
                      color="primary"
                    >
                      Enable Ingestion
                    </Switch>
                  </div>

                  <div className={`flex flex-col gap-2 w-full transition-opacity duration-200 ${!doc.ingestionEnabled ? "opacity-50 pointer-events-none select-none" : ""}`}>
                    <div className="flex items-center gap-2">
                       <div className="relative flex-1">
                        <div className={styles.tokenDisplay}>
                           {doc.ingestionToken ? doc.ingestionToken : <span className={styles.tokenPlaceholder}>No token generated</span>}
                        </div>
                        {doc.ingestionToken && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                             <Button 
                               isIconOnly 
                               size="sm" 
                               variant="light" 
                               onPress={() => {
                                 navigator.clipboard.writeText(doc.ingestionToken || "");
                                 setIsTokenCopied(true);
                                 setTimeout(() => setIsTokenCopied(false), 2000);
                               }} 
                               className={`hover:opacity-80 transition-opacity ${isTokenCopied ? styles.iconSuccess : styles.iconSecondary}`}
                             >
                                {isTokenCopied ? (
                                  <ClipboardDocumentCheckIcon className="w-4 h-4" />
                                ) : (
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                )}
                             </Button>
                          </div>
                        )}
                      </div>
                      <Button 
                        color="primary" 
                        variant="flat" 
                        onPress={() => {
                          // Generate random 32-char hex token
                          const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                            .map((b) => b.toString(16).padStart(2, "0"))
                            .join("");
                          updateDocumentation({ ingestionToken: newToken });
                        }}
                        startContent={<ArrowPathIcon className="w-4 h-4" />}
                        className="h-[48px]"
                      >
                        Generate
                      </Button>
                    </div>
                    {doc.ingestionToken && (
                       <p className={`text-xs px-1 ${styles.tokenHint}`}>
                         Header: <code className={styles.tokenCode}>Authorization: Bearer {doc.ingestionToken}</code>
                       </p>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Tab>

            <Tab
              key="trash"
              title={
                <div className="flex items-center gap-2">
                  <TrashIcon className="w-4 h-4" />
                  Trash
                </div>
              }
            >
              <TrashManager docId={parseInt(id!)} onRestore={fetchDocumentation} />
            </Tab>

            <Tab
              key="attachments"
              title={
                <div className="flex items-center gap-2">
                  <PaperClipIcon className="w-4 h-4" />
                  Attachments
                </div>
              }
            >
              <Card className={styles.card}>
                <CardBody className="p-6">
                  <AttachmentManager
                    entityId={(selectedItem && selectedItem.page) ? selectedItem.page.id : parseInt(id!)}
                    entityType={(selectedItem && selectedItem.page) ? "page" : "documentation"}
                    title={(selectedItem && selectedItem.page) ? `Page Attachments: ${selectedItem.title}` : `Project Attachments: ${doc?.title || ""}`}
                    description={(selectedItem && selectedItem.page) 
                      ? "Files specifically attached to this page." 
                      : "Global files available to the entire documentation project."
                    }
                  />
                </CardBody>
              </Card>
            </Tab>
          </Tabs>
        </div>
      </div>

      {/* Create Item Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="lg" 
        backdrop="blur"
        placement="center"
        classNames={{
          base: "bg-[var(--docmate-surface)] border border-[var(--docmate-border-color)]",
          header: "border-b border-[var(--docmate-border-color)] text-[var(--docmate-text)]",
          footer: "border-t border-[var(--docmate-border-color)]",
          closeButton: "hover:bg-[var(--docmate-surface-alt)]"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pb-4">
                <h3 className="text-lg font-semibold">Create New Item</h3>
                {newItemData.parentName && (
                  <p className={`text-sm ${styles.textSecondary}`}>
                    Adding to: <span className={`font-medium ${styles.textPrimary}`}>{newItemData.parentName}</span>
                  </p>
                )}
              </ModalHeader>
              <ModalBody className="py-6">
                <div className="flex flex-col gap-6">
                  <Input
                    label="Title"
                    labelPlacement="outside"
                    placeholder="Enter item title"
                    value={newItemData.title}
                    onChange={(e) => setNewItemData((prev) => ({ ...prev, title: e.target.value }))}
                    variant="bordered"
                    classNames={{
                      inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                      input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50",
                      label: "text-[var(--docmate-text)]"
                    }}
                  />

                  <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Type"
                        labelPlacement="outside"
                        placeholder="Select type"
                        selectedKeys={[newItemData.type]}
                        onSelectionChange={(keys) => {
                          const type = Array.from(keys)[0] as "folder" | "page" | "divider";
                          setNewItemData((prev) => ({ ...prev, type }));
                        }}
                        variant="bordered"
                        classNames={{
                          trigger: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] bg-[var(--docmate-surface-alt)]",
                          value: "text-[var(--docmate-text)]",
                          label: "text-[var(--docmate-text)]"
                        }}
                        popoverProps={{
                          classNames: {
                            content: "bg-[var(--docmate-surface)] border border-[var(--docmate-border-color)] shadow-xl p-0",
                          }
                        }}
                        listboxProps={{
                          itemClasses: {
                            base: "rounded-lg transition-colors duration-200 min-h-[40px] gap-3 data-[hover=true]:bg-[var(--docmate-surface-alt)] data-[selectable=true]:focus:bg-[var(--docmate-surface-alt)]",
                            title: "font-medium text-sm flex-1 text-[var(--docmate-text)]",
                          }
                        }}
                      >
                      <SelectItem key="page" startContent={<span>📄</span>}>
                        Page
                      </SelectItem>
                      <SelectItem key="folder" startContent={<span>📁</span>}>
                        Folder
                      </SelectItem>
                      <SelectItem key="divider" startContent={<span>—</span>}>
                        Divider
                      </SelectItem>
                    </Select>

                      <Select
                        label="Parent Folder"
                        labelPlacement="outside"
                        placeholder="Root level"
                        selectedKeys={newItemData.parentId ? [newItemData.parentId.toString()] : []}
                        onSelectionChange={(keys) => {
                          const selectedKey = Array.from(keys)[0];
                          const parentId = selectedKey ? parseInt(selectedKey as string) : null;

                          // Find parent name from tree
                          const findItemName = (items: SidebarItem[], id: number): string | null => {
                            for (const item of items) {
                              if (item.id === id) return item.title;
                              if (item.children) {
                                const found = findItemName(item.children, id);
                                if (found) return found;
                              }
                            }
                            return null;
                          };

                          const parentName = parentId ? findItemName(sidebarTree, parentId) : null;

                          setNewItemData((prev) => ({
                            ...prev,
                            parentId,
                            parentName,
                          }));
                        }}
                        variant="bordered"
                        classNames={{
                          trigger: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] bg-[var(--docmate-surface-alt)]",
                          value: "text-[var(--docmate-text)]",
                          label: "text-[var(--docmate-text)]"
                        }}
                        popoverProps={{
                          classNames: {
                            content: "bg-[var(--docmate-surface)] border border-[var(--docmate-border-color)] shadow-xl p-0",
                          }
                        }}
                        listboxProps={{
                          itemClasses: {
                            base: "rounded-lg transition-colors duration-200 min-h-[40px] gap-3 data-[hover=true]:bg-[var(--docmate-surface-alt)] data-[selectable=true]:focus:bg-[var(--docmate-surface-alt)]",
                            title: "font-medium text-sm flex-1 text-[var(--docmate-text)]",
                          }
                        }}
                      >
                      <SelectItem key="">Root Level</SelectItem>
                      <>{sidebarTree.length > 0 && renderFolderOptions(sidebarTree)}</>
                    </Select>
                  </div>

                  <EmojiPickerInput
                    label="Icon (optional)"
                    value={newItemData.icon}
                    onChange={(value) => setNewItemData((prev) => ({ ...prev, icon: value }))}
                    placeholder="📝, 🎨, 🚀, 💡"
                    description="Add an emoji icon to personalize your item"
                  />
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-divider pt-4">
                <Button variant="flat" onPress={onClose} className="font-medium">
                  Cancel
                </Button>
                <Button
                  onPress={handleCreateSidebarItem}
                  isDisabled={!newItemData.title.trim()}
                  className={styles.buttonPrimary}
                  startContent={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  }
                >
                  Create Item
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default DocsEditorPage;
