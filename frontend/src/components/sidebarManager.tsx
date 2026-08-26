import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import styles from "../styles/sidebarManager.module.css";
import type { SidebarItem } from "../types/docs";
import httpService from "../services/httpService";
import { useBranding } from "../hooks/useBranding";
import { TreeView, type TreeNode, type DragDropConfig, EmojiPickerInput } from "./ui";
import { reorderSidebarItems, type ReorderItem } from "../services/docsService";

interface SidebarManagerProps {
  items: SidebarItem[];
  selectedItem: SidebarItem | null;
  onSelectItem: (item: SidebarItem | null) => void;
  onCreateItem: (parentId?: number) => void;
  onRefresh: () => void;
  onDeleteItem?: (deletedItemId: number) => void;
  onUpdateItem?: (itemId: number, updates: Partial<SidebarItem>) => void;
  docId: number;
}

interface ModalState {
  editingItem: SidebarItem | null;
  itemToDelete: SidebarItem | null;
  formData: {
    title: string;
    type: "folder" | "page" | "divider";
    icon: string;
  };
}

const SidebarManager = ({
  items,
  selectedItem,
  onSelectItem,
  onCreateItem,
  onRefresh,
  onDeleteItem,
  onUpdateItem,
  docId,
}: SidebarManagerProps) => {
  const { logo } = useBranding();
  const [modalState, setModalState] = useState<ModalState>({
    editingItem: null,
    itemToDelete: null,
    formData: {
      title: "",
      type: "page",
      icon: "",
    },
  });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // Memoized helper function to get item icon
  const getItemIcon = useCallback((item: SidebarItem): string => {
    if (item.icon) return item.icon;

    const iconMap = {
      folder: "📁",
      page: "📄",
      divider: "—",
    };

    return iconMap[item.type] || "📄";
  }, []);

  // Memoized helper function to convert SidebarItem to TreeNode
  const convertToTreeNode = useCallback((item: SidebarItem): TreeNode => ({
    id: item.id,
    label: item.title,
    children: item.children?.map(convertToTreeNode),
    icon: <span className="transition-transform duration-200 hover:scale-110">{getItemIcon(item)}</span>,
    metadata: {
      type: item.type,
      page: item.page,
      originalItem: item,
    },
  }), [getItemIcon]);

  // Memoized tree data from props
  const treeDataFromProps = useMemo(() => items.map(convertToTreeNode), [items, convertToTreeNode]);

  // Local state for the tree data to handle immediate UI updates
  const [localTreeData, setLocalTreeData] = useState<TreeNode[]>(treeDataFromProps);

  // Sync local state when props change (server update)
  useEffect(() => {
    setLocalTreeData(treeDataFromProps);
  }, [treeDataFromProps]);

  // Helper function to move a node in the tree (Immutable version)
  const moveNode = useCallback((
    nodes: TreeNode[],
    draggedId: string | number,
    targetId: string | number,
    position: 'top' | 'middle' | 'bottom'
  ): TreeNode[] => {
    
    // 1. Find the node to move (we need its data)
    const findNode = (list: TreeNode[], id: string | number): TreeNode | null => {
      for (const node of list) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const draggedNode = findNode(nodes, draggedId);
    if (!draggedNode) return nodes;

    // 2. Remove the node from the tree (Immutable)
    const removeNode = (list: TreeNode[], id: string | number): TreeNode[] => {
      return list
        .filter(node => node.id !== id)
        .map(node => ({
          ...node,
          children: node.children ? removeNode(node.children, id) : undefined
        }));
    };

    const treeWithoutDragged = removeNode(nodes, draggedId);

    // 3. Insert the node at the new position (Immutable)
    const insertNode = (
      list: TreeNode[], 
      tId: string | number, 
      nodeToInsert: TreeNode, 
      pos: 'top' | 'middle' | 'bottom'
    ): TreeNode[] => {
      const result: TreeNode[] = [];

      for (const node of list) {
        if (node.id === tId) {
          if (pos === 'top') {
            result.push(nodeToInsert);
            result.push(node);
          } else if (pos === 'bottom') {
            result.push(node);
            result.push(nodeToInsert);
          } else if (pos === 'middle') {
            result.push({
              ...node,
              children: [...(node.children || []), nodeToInsert]
            });
          }
        } else if (node.children) {
           const newChildren = insertNode(node.children, tId, nodeToInsert, pos);
           result.push({
             ...node,
             children: newChildren
           });
        } else {
          result.push(node);
        }
      }
      return result;
    };

    return insertNode(treeWithoutDragged, targetId, draggedNode, position);
  }, []);

  // Helper function to flatten tree and calculate order
  const flattenTreeWithOrder = useCallback((nodes: TreeNode[], parentId: number | null = null, order: number = 0): ReorderItem[] => {
    const result: ReorderItem[] = [];

    for (const node of nodes) {
      result.push({
        id: Number(node.id),
        parentId,
        order
      });

      if (node.children && node.children.length > 0) {
        const childItems = flattenTreeWithOrder(node.children, Number(node.id), 0);
        result.push(...childItems);
      }

      order++;
    }

    return result;
  }, []);

  // Handle node move from drag and drop
  const handleNodeMove = useCallback(async (
    draggedNode: TreeNode,
    targetNode: TreeNode,
    position: 'top' | 'middle' | 'bottom'
  ) => {
    // 1. Calculate the new state
    const newTreeData = moveNode(localTreeData, draggedNode.id, targetNode.id, position);

    // 2. Optimistically update local state immediately
    const previousTreeData = localTreeData;
    setLocalTreeData(newTreeData);

    // 3. Flatten the new tree to get all items with their new parents and order
    const reorderItems = flattenTreeWithOrder(newTreeData);

    try {
      // 4. Call API to persist changes
      await reorderSidebarItems(docId, reorderItems);
      // Success! We don't need to do anything else because the query invalidation (if any)
      // or the fact that our local state is already correct is enough.
      
      // If the parent component refreshes the props from the server, 
      // the useEffect above will sync it, which should match our local state anyway.
      onRefresh(); // Trigger a refresh to ensure everything is in sync with server
    } catch (error) {
      console.error('Failed to reorder sidebar items:', error);
      // 5. Revert on error
      setLocalTreeData(previousTreeData);
    }
  }, [localTreeData, moveNode, flattenTreeWithOrder, docId, reorderSidebarItems, onRefresh]);

  // Drag and drop configuration
  const dragDropConfig: DragDropConfig<TreeNode> = useMemo(() => ({
    // Only folders can accept children
    canAcceptChildren: (node: TreeNode) => {
      const item = node.metadata?.originalItem as SidebarItem;
      return item?.type === 'folder';
    },
    // All nodes can be dragged
    canBeDragged: () => true,
    // Handle node move
    onNodeMove: handleNodeMove,
  }), [handleNodeMove]);

  // Action handlers
  const handleEditItem = useCallback((item: SidebarItem) => {
    setModalState(prev => ({
      ...prev,
      editingItem: item,
      formData: {
        title: item.title,
        type: item.type,
        icon: item.icon ?? "",
      },
    }));
    onOpen();
  }, [onOpen]);

  const handleDeleteItem = useCallback((item: SidebarItem) => {
    setModalState(prev => ({ ...prev, itemToDelete: item }));
    onDeleteOpen();
  }, [onDeleteOpen]);

  const confirmDelete = useCallback(async () => {
    const { itemToDelete } = modalState;
    if (!itemToDelete) return;

    try {
      // Update local state immediately
      if (onDeleteItem) {
        onDeleteItem(itemToDelete.id);
      }

      // API call
      await httpService.delete(`/docs/${docId}/sidebar-items/${itemToDelete.id}`);

      onDeleteClose();
      setModalState(prev => ({ ...prev, itemToDelete: null }));
      onRefresh(); // Sync persistent base state with optimistic update
    } catch (error) {
      console.error("Failed to delete sidebar item:", error);
      // Revert on error
      onRefresh();
    }
  }, [modalState, docId, onDeleteItem, onDeleteClose, onRefresh]);

  const handleSaveEdit = useCallback(async () => {
    const { editingItem, formData } = modalState;
    if (!editingItem || !formData.title.trim()) return;

    const updates = {
      title: formData.title.trim(),
      type: formData.type,
      icon: formData.icon || undefined,
    };

    try {
      // Update local state immediately
      if (onUpdateItem) {
        onUpdateItem(editingItem.id, updates);
      }

      // API call
      await httpService.put(`/docs/${docId}/sidebar-items/${editingItem.id}`, updates);

      onClose();
      setModalState(prev => ({ ...prev, editingItem: null }));
      onRefresh(); // Sync persistent base state with optimistic update
    } catch (error) {
      console.error("Failed to update sidebar item:", error);
      // Revert on error
      onRefresh();
    }
  }, [modalState, docId, onUpdateItem, onClose, onRefresh]);

  
  const handleNodeClick = useCallback((node: TreeNode) => {
    const item = node.metadata?.originalItem as SidebarItem;
    if (item) {
      onSelectItem(item);
      // Note: Page creation is now handled in the backend when sidebar item is created
      // No need to create page on click anymore
    }
  }, [onSelectItem]);

  const updateFormData = useCallback((updates: Partial<ModalState['formData']>) => {
    setModalState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates }
    }));
  }, []);

  const renderActions = useCallback((node: TreeNode) => {
    const item = node.metadata?.originalItem as SidebarItem;
    if (!item) return null;

    const actionItems = [
      {
        key: "edit",
        label: "Edit",
        description: "Modify item",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        ),
        color: "primary" as const,
        onPress: () => handleEditItem(item),
      },
    ];

    if (item.type === "folder") {
      actionItems.splice(1, 0, {
        key: "add-child",
        label: "Add Item",
        description: "Add inside folder",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
        color: "primary" as const,
        onPress: () => onCreateItem(item.id),
      });
    }

    actionItems.push({
      key: "delete",
      label: "Delete",
      description: "Remove permanently",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      ),
      color: "primary" as const,
      onPress: () => handleDeleteItem(item),
    });

    return (
      <Dropdown
        classNames={{
          content: "min-w-[180px] p-2 shadow-xl border border-[var(--docmate-border-color)] bg-[var(--docmate-surface)]",
        }}
      >
        <DropdownTrigger>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="opacity-40 hover:opacity-100 transition-all duration-200 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Item actions"
          itemClasses={{
            base: "rounded-lg transition-colors duration-200 min-h-[40px] gap-3 data-[hover=true]:bg-[var(--docmate-surface-alt)]",
            title: "font-medium text-sm flex-1 text-[var(--docmate-text)]",
            description: "text-xs text-[var(--docmate-text-secondary)] flex-1",
          }}
          classNames={{
            base: "p-1"
          }}
        >
          {actionItems.map((actionItem) => {
            const colorClasses = {
              danger: "text-[var(--docmate-error)]",
              primary: "text-[var(--docmate-primary)]",
              success: "text-[var(--docmate-success)]"
            };

            const iconColorClasses = {
              danger: "bg-[var(--docmate-error)]/10 text-[var(--docmate-error)]",
              primary: "bg-[var(--docmate-primary)]/10 text-[var(--docmate-primary)]",
              success: "bg-[var(--docmate-success)]/10 text-[var(--docmate-success)]"
            };

            return (
              <DropdownItem
                key={actionItem.key}
                onPress={actionItem.onPress}
                description={actionItem.description}
                startContent={
                  <div className={`p-1.5 rounded-md flex-shrink-0 ${iconColorClasses[actionItem.color]}`}>
                    {actionItem.icon}
                  </div>
                }
                className={colorClasses[actionItem.color]}
                textValue={actionItem.label}
              >
                {actionItem.label}
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }, [handleEditItem, handleDeleteItem, onCreateItem]);

  return (
    <div className={styles.container}>
      <div className={styles.itemsList}>
        {items.length === 0 ? (
          <div className={styles.empty}>
            <div className="relative mb-8">
              <div className="absolute inset-0 blur-3xl opacity-30 bg-[var(--docmate-gradient)] rounded-full scale-150"></div>
              <div className="relative">
                <img src={logo} alt="" className="w-16 h-16 mb-4 animate-pulse mx-auto" />
                <div className="text-2xl font-light" style={{ color: 'var(--docmate-text-secondary)', opacity: 0.4 }}>Start building</div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--docmate-text)' }}>Create your first page</h3>
              <p className="text-sm leading-relaxed max-w-[240px] mx-auto" style={{ color: 'var(--docmate-text-secondary)' }}>
                Organize your documentation with pages, folders, and dividers
              </p>
              <div className="flex flex-col gap-2 mt-6">
                <div 
                  className="flex items-center gap-3 text-xs rounded-lg p-3"
                  style={{ color: 'var(--docmate-text-secondary)', background: 'var(--docmate-surface-alt)', opacity: 0.8 }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--docmate-primary), transparent 90%)' }}>
                    <svg className="w-4 h-4" style={{ color: 'var(--docmate-primary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <span className="font-medium">Click "+" to create items</span>
                </div>
                <div 
                  className="flex items-center gap-3 text-xs rounded-lg p-3"
                  style={{ color: 'var(--docmate-text-secondary)', background: 'var(--docmate-surface-alt)', opacity: 0.8 }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--docmate-secondary), transparent 90%)' }}>
                    <svg className="w-4 h-4" style={{ color: 'var(--docmate-secondary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </div>
                  <span className="font-medium">Drag to reorder</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-1 py-2">
            <TreeView
              data={localTreeData}
              onNodeClick={handleNodeClick}
              renderActions={renderActions}
              selectedNodeId={selectedItem?.id ?? null}
              dragDropConfig={dragDropConfig}
              classNames={{
                node: "data-[selected=false]:hover:bg-[var(--docmate-surface-alt)] data-[selected=true]:bg-[var(--docmate-surface-alt)] data-[selected=true]:border-[var(--docmate-primary)]/30 border border-transparent transition-all duration-200",
                nodeLabel: "group-data-[selected=true]:font-bold group-data-[selected=true]:text-[var(--docmate-primary)] text-[var(--docmate-text)]",
                nodeIcon: "group-data-[selected=true]:text-[var(--docmate-primary)]"
              }}
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        placement="center"
        backdrop="blur"
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
              <ModalHeader className="flex flex-col gap-1 pb-4 border-b border-divider">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getItemIcon(modalState.editingItem!)}</span>
                  <h3 className="text-lg font-semibold">Edit Item</h3>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input
                      placeholder="Enter item title"
                      value={modalState.formData.title}
                      onChange={(e) => updateFormData({ title: e.target.value })}
                      variant="bordered"
                      classNames={{
                        input: "text-sm font-medium",
                        inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus:border-[var(--docmate-primary)] transition-colors"
                      }}
                      startContent={
                        <span className="text-lg">{modalState.formData.icon || (modalState.editingItem && getItemIcon(modalState.editingItem))}</span>
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Type</label>
                    <Select
                      placeholder="Select item type"
                      selectedKeys={[modalState.formData.type]}
                      onSelectionChange={(keys) => {
                        const type = Array.from(keys)[0] as "folder" | "page" | "divider";
                        updateFormData({ type });
                      }}
                      variant="bordered"
                      classNames={{
                        trigger: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus:border-[var(--docmate-primary)] transition-colors"
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
                      <SelectItem key="page" startContent={<span className="text-lg">📄</span>}>
                        Page - Create content
                      </SelectItem>
                      <SelectItem key="folder" startContent={<span className="text-lg">📁</span>}>
                        Folder - Organize items
                      </SelectItem>
                      <SelectItem key="divider" startContent={<span className="text-lg">—</span>}>
                        Divider - Visual separator
                      </SelectItem>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <EmojiPickerInput
                      label="Custom Icon"
                      value={modalState.formData.icon}
                      onChange={(value) => updateFormData({ icon: value })}
                      placeholder="e.g., 📝, 🎨, 🚀, 💡"
                      description="Add an emoji icon to personalize your item"
                      classNames={{
                        inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus:border-[var(--docmate-primary)] transition-colors"
                      }}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-divider pt-6">
                <Button
                  variant="flat"
                  onPress={onClose}
                  className="font-medium px-6"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleSaveEdit}
                  isDisabled={!modalState.formData.title.trim()}
                  className={styles.buttonPrimary + " px-6"}
                  startContent={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  }
                >
                  Save Changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        size="sm"
        placement="center"
        backdrop="blur"
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
              <ModalHeader className="flex flex-col gap-1 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full" style={{ background: 'color-mix(in srgb, var(--docmate-warning), transparent 90%)' }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      style={{ color: 'var(--docmate-warning)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--docmate-text)' }}>Move to Trash</h3>
                </div>
              </ModalHeader>
              <ModalBody className="py-4">
                <div className="flex flex-col gap-4">
                  <div 
                    className="flex flex-col gap-3 p-4 rounded-xl border"
                    style={{ background: 'color-mix(in srgb, var(--docmate-warning), transparent 95%)', borderColor: 'color-mix(in srgb, var(--docmate-warning), transparent 80%)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{modalState.itemToDelete && getItemIcon(modalState.itemToDelete)}</span>
                      <div>
                        <p className="text-base font-semibold" style={{ color: 'var(--docmate-warning)' }}>
                          "{modalState.itemToDelete?.title}"
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--docmate-warning)' }}>
                          Type: {modalState.itemToDelete?.type}
                        </p>
                      </div>
                    </div>
                    {modalState.itemToDelete?.children && modalState.itemToDelete.children.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 pl-10">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--docmate-warning), transparent 80%)' }}>
                          <svg className="w-3 h-3" style={{ color: 'var(--docmate-warning)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--docmate-warning)' }}>
                          {modalState.itemToDelete.children.length} child item{modalState.itemToDelete.children.length > 1 ? "s" : ""} will also be moved to trash
                        </p>
                      </div>
                    )}
                  </div>
                  <div 
                    className="flex items-start gap-3 p-4 rounded-xl border"
                    style={{ background: 'var(--docmate-surface-alt)', borderColor: 'var(--docmate-border-color)' }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'color-mix(in srgb, var(--docmate-primary), transparent 90%)' }}>
                      <svg className="w-3 h-3" style={{ color: 'var(--docmate-primary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--docmate-text)' }}>Item will be moved to trash</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--docmate-text-secondary)' }}>
                        This item will no longer be visible in your documentation or folder structure. You can restore it later from the Trash tab if needed.
                      </p>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-divider pt-4">
                <Button
                  variant="flat"
                  onPress={onClose}
                  className="font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onPress={confirmDelete}
                  className={styles.buttonWarning + " font-semibold px-6"}
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
                        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.125c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.125c0 .621.504 1.125 1.125 1.125z"
                      />
                    </svg>
                  }
                >
                  Move to Trash
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SidebarManager;
