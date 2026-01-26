import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Chip,
} from "@heroui/react";
import { toast } from "sonner";
import {
  getTrash,
  restoreFromTrash,
  permanentDelete,
  type TrashItem,
} from "../services/docsService";
import styles from "../styles/trashManager.module.css";

interface TrashManagerProps {
  docId: number;
  onRestore?: () => void;
}

const TrashManager = ({ docId, onRestore }: TrashManagerProps) => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const fetchTrash = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getTrash(docId);
      if (response.success && response.data) {
        setTrashItems(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch trash:", error);
      toast.error("Failed to load trash items");
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchTrash();
  }, [docId, fetchTrash]);

  const handleRestore = async (item: TrashItem) => {
    try {
      const response = await restoreFromTrash(docId, item.id);
      if (response.success) {
        toast.success(
          `Restored "${item.title}" ${
            response.data?.restoredCount ? `and ${response.data.restoredCount - 1} child items` : ""
          }`
        );
        await fetchTrash();
        if (onRestore) {
          onRestore();
        }
      }
    } catch (error) {
      console.error("Failed to restore item:", error);
      toast.error("Failed to restore item");
    }
  };

  const handlePermanentDeleteClick = (item: TrashItem) => {
    setSelectedItem(item);
    setConfirmText("");
    onDeleteOpen();
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem || confirmText !== "DELETE") return;

    try {
      await permanentDelete(docId, selectedItem.id);
      toast.success(`Permanently deleted "${selectedItem.title}"`);
      await fetchTrash();
      onDeleteClose();
      setSelectedItem(null);
      setConfirmText("");
    } catch (error) {
      console.error("Failed to permanently delete item:", error);
      toast.error("Failed to permanently delete item");
    }
  };

  const formatDeletedDate = (deletedAt?: string) => {
    if (!deletedAt) return "Unknown";

    const date = new Date(deletedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "folder":
        return "📁";
      case "page":
        return "📄";
      case "divider":
        return "—";
      default:
        return "📄";
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Card className={styles.emptyCard}>
          <CardBody className={styles.loading}>
            <p style={{ color: 'var(--grud-text-secondary)' }}>Loading trash...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (trashItems.length === 0) {
    return (
      <div className={styles.container}>
        <Card className={styles.emptyCard}>
          <CardBody className={styles.empty}>
            <svg className={styles.emptyIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <h3>Trash is empty</h3>
            <p>Deleted items will appear here</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Build tree structure for trash items
  const buildTrashTree = () => {
    const itemMap = new Map<number, TrashItem & { children: TrashItem[] }>();
    const rootItems: (TrashItem & { children: TrashItem[] })[] = [];

    // Initialize map
    trashItems.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Build tree
    trashItems.forEach((item) => {
      const node = itemMap.get(item.id)!;
      if (!item.parentId || !itemMap.has(item.parentId)) {
        // Root or orphaned item
        rootItems.push(node);
      } else {
        // Child item
        const parent = itemMap.get(item.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return rootItems;
  };

  const trashTree = buildTrashTree();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 style={{ color: 'var(--grud-text)' }}>Trash</h2>
        <p className={styles.subtitle}>
          {trashItems.length} item{trashItems.length !== 1 ? "s" : ""} in trash
        </p>
      </div>

      <div className={styles.itemsList}>
        {trashTree.map((item) => {
          const hasChildren = item.children && item.children.length > 0;

          return (
            <Card key={item.id} className={styles.trashCard}>
              <CardBody className={styles.trashCardBody}>
                {/* Main Item */}
                <div className={styles.mainItemRow}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemIcon}>{getItemIcon(item.type)}</span>
                      <span className={styles.itemTitle} style={{ color: 'var(--grud-text)' }}>{item.title}</span>
                      <span className={styles.itemType}>{item.type}</span>
                      {hasChildren && (
                        <Chip size="sm" variant="bordered" style={{ color: 'var(--grud-warning)', borderColor: 'var(--grud-warning)' }}>
                          Contains {item.children.length} item{item.children.length > 1 ? "s" : ""}
                        </Chip>
                      )}
                    </div>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemDate} style={{ color: 'var(--grud-text-secondary)' }}>
                        Deleted {formatDeletedDate(item.deletedAt)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <Button
                      size="sm"
                      variant="solid"
                      onPress={() => handleRestore(item)}
                      style={{ background: 'var(--grud-gradient)', color: 'white' }}
                    >
                      {hasChildren ? "Restore All" : "Restore"}
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      onPress={() => handlePermanentDeleteClick(item)}
                    >
                      Delete Forever
                    </Button>
                  </div>
                </div>

                {/* Child Items */}
                {hasChildren && (
                  <div className={styles.childrenList}>
                    {item.children.map((child) => (
                      <div key={child.id} className={styles.childItem}>
                        <div className={styles.childItemContent}>
                          <span className={styles.childIcon}>{getItemIcon(child.type)}</span>
                          <span className={styles.childTitle} style={{ color: 'var(--grud-text)' }}>{child.title}</span>
                          <span className={styles.childType} style={{ color: 'var(--grud-text-secondary)' }}>{child.type}</span>
                        </div>
                        <div className={styles.childActions}>
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() => handleRestore(child)}
                            style={{ color: 'var(--grud-primary)' }}
                          >
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            onPress={() => handlePermanentDeleteClick(child)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} classNames={{
        base: "bg-[var(--grud-surface)] border border-[var(--grud-border-color)]",
        header: "border-b border-[var(--grud-border-color)] text-[var(--grud-text)]",
        footer: "border-t border-[var(--grud-border-color)]",
        closeButton: "hover:bg-[var(--grud-surface-alt)]"
      }}>
        <ModalContent>
          <ModalHeader>Permanently Delete Item</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="font-semibold" style={{ color: 'var(--grud-error)' }}>This action cannot be undone!</p>
              <p style={{ color: 'var(--grud-text)' }}>
                You are about to permanently delete "{selectedItem?.title}"
                {selectedItem?.descendantCount && selectedItem.descendantCount > 0 && (
                  <span className="font-semibold" style={{ color: 'var(--grud-warning)' }}>
                    {" "}
                    and {selectedItem.descendantCount} child item
                    {selectedItem.descendantCount > 1 ? "s" : ""}
                  </span>
                )}
                .
              </p>
              <p style={{ color: 'var(--grud-text)' }}>
                Type <strong>DELETE</strong> to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                variant="bordered"
                autoFocus
                classNames={{
                  inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
                  input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
                  label: "text-[var(--grud-text)]"
                }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handlePermanentDelete}
              isDisabled={confirmText !== "DELETE"}
            >
              Delete Forever
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TrashManager;
