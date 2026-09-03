import type { SidebarItem } from "../db/schema";

/**
 * Interface for tree nodes with children
 */
export interface TreeNode extends SidebarItem {
  children?: TreeNode[];
}

/**
 * Builds a hierarchical tree from a flat array of sidebar items
 * Time Complexity: O(n) - single pass with HashMap
 * Space Complexity: O(n) for the map + tree structure
 *
 * @param flatItems - Flat array of sidebar items from database
 * @param maxDepth - Maximum nesting depth allowed (default: 10)
 * @param excludeDeleted - Filter out soft-deleted items (default: true)
 * @returns Array of root-level tree nodes with nested children
 */
export function buildHierarchicalTree(
  flatItems: SidebarItem[],
  maxDepth: number = 10,
  excludeDeleted: boolean = true
): TreeNode[] {
  // Filter out deleted items if requested
  const items = excludeDeleted
    ? flatItems.filter(item => item.deletedAt === null || item.deletedAt === undefined)
    : flatItems;

  if (items.length === 0) return [];

  // Create lookup map for O(1) access by ID
  const itemMap = new Map<number, TreeNode>();
  const rootItems: TreeNode[] = [];

  // First pass: Initialize all items with empty children arrays
  for (const item of items) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  // Second pass: Build tree structure by linking parents and children
  for (const item of items) {
    const node = itemMap.get(item.id)!;

    if (!item.parentId) {
      // Root-level item (no parent)
      rootItems.push(node);
    } else {
      // Child item - add to parent's children array
      const parent = itemMap.get(item.parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        // Orphaned item (parent doesn't exist or is deleted) - treat as root
        rootItems.push(node);
      }
    }
  }

  // Sort children at each level by the 'order' field
  const sortChildren = (nodes: TreeNode[], currentDepth: number = 0) => {
    if (currentDepth > maxDepth) {
      console.warn(`Max depth (${maxDepth}) exceeded in tree structure`);
      return;
    }

    // Sort siblings by order field
    nodes.sort((a, b) => a.order - b.order);

    // Recursively sort children of each node
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children, currentDepth + 1);
      }
    });
  };

  sortChildren(rootItems);

  return rootItems;
}

/**
 * Detects circular references in the tree structure
 * Uses depth-first search with visited tracking
 *
 * @param items - Flat array of sidebar items
 * @returns true if circular reference detected, false otherwise
 */
export function detectCircularReferences(items: SidebarItem[]): boolean {
  const itemMap = new Map<number, SidebarItem>();

  // Build lookup map
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  // Track visited nodes during current path traversal
  const visited = new Set<number>();
  const recursionStack = new Set<number>();

  const hasCycle = (itemId: number): boolean => {
    // If we've seen this item in the current path, we have a cycle
    if (recursionStack.has(itemId)) return true;

    // If we've already fully explored this node, no cycle from here
    if (visited.has(itemId)) return false;

    // Mark as visited and add to current path
    visited.add(itemId);
    recursionStack.add(itemId);

    // Check parent
    const item = itemMap.get(itemId);
    if (item?.parentId) {
      if (hasCycle(item.parentId)) return true;
    }

    // Remove from current path (backtrack)
    recursionStack.delete(itemId);
    return false;
  };

  // Check all items for cycles
  for (const item of items) {
    if (hasCycle(item.id)) return true;
  }

  return false;
}

/**
 * Calculates the depth of a specific item in the tree
 *
 * @param itemId - ID of the item to check
 * @param items - Flat array of sidebar items
 * @returns Depth of the item (0 = root level) or null if circular reference
 */
export function calculateItemDepth(itemId: number, items: SidebarItem[]): number | null {
  const itemMap = new Map<number, SidebarItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  let depth = 0;
  let currentId: number | undefined = itemId;
  const visitedIds = new Set<number>();

  while (currentId !== undefined) {
    // Circular reference detection
    if (visitedIds.has(currentId)) {
      console.error(`Circular reference detected at item ${currentId}`);
      return null;
    }
    visitedIds.add(currentId);

    const item = itemMap.get(currentId);
    if (!item) break;

    if (item.parentId === null || item.parentId === undefined) {
      // Reached root
      break;
    }

    currentId = item.parentId;
    depth++;

    // Safety limit
    if (depth > 50) {
      console.error(`Depth limit exceeded for item ${itemId}`);
      return null;
    }
  }

  return depth;
}

/**
 * Validates if an item can be moved to a new parent
 * Checks for circular references and depth limits
 *
 * @param itemId - ID of item being moved
 * @param newParentId - ID of proposed new parent (null for root)
 * @param items - Flat array of all sidebar items
 * @param maxDepth - Maximum allowed depth
 * @returns Object with validation result and error message
 */
export function validateMove(
  itemId: number,
  newParentId: number | null,
  items: SidebarItem[],
  maxDepth: number = 10
): { valid: boolean; error?: string } {
  // Cannot move to self
  if (itemId === newParentId) {
    return { valid: false, error: "Cannot move item to itself" };
  }

  // Moving to root is always valid (unless item itself is invalid)
  if (newParentId === null) {
    return { valid: true };
  }

  // Check if new parent exists
  const parent = items.find(item => item.id === newParentId);
  if (!parent) {
    return { valid: false, error: "Parent item not found" };
  }

  // Check if new parent is deleted
  if (parent.deletedAt) {
    return { valid: false, error: "Cannot move to deleted parent" };
  }

  // Prevent moving folder into its own descendant
  const isDescendant = (ancestorId: number, descendantId: number): boolean => {
    const itemMap = new Map(items.map(item => [item.id, item]));
    let currentId: number | null | undefined = descendantId;
    const visited = new Set<number>();

    // parentId is null at root items — that ends the walk
    while (currentId != null) {
      if (currentId === ancestorId) return true;
      if (visited.has(currentId)) break; // Circular ref
      visited.add(currentId);

      const item = itemMap.get(currentId);
      currentId = item?.parentId;
    }

    return false;
  };

  if (isDescendant(itemId, newParentId)) {
    return { valid: false, error: "Cannot move folder into its own descendant" };
  }

  // Calculate depth of new parent
  const parentDepth = calculateItemDepth(newParentId, items);
  if (parentDepth === null) {
    return { valid: false, error: "Invalid parent structure (circular reference)" };
  }

  // Check if moving would exceed max depth
  // Need to consider the maximum depth of the subtree being moved
  const item = items.find(i => i.id === itemId);
  const calculateSubtreeDepth = (id: number): number => {
    const children = items.filter(i => i.parentId === id);
    if (children.length === 0) return 0;
    return 1 + Math.max(...children.map(child => calculateSubtreeDepth(child.id)));
  };

  const subtreeDepth = item ? calculateSubtreeDepth(itemId) : 0;
  const newTotalDepth = parentDepth + 1 + subtreeDepth;

  if (newTotalDepth > maxDepth) {
    return {
      valid: false,
      error: `Move would exceed maximum depth of ${maxDepth} (would be ${newTotalDepth})`
    };
  }

  return { valid: true };
}

/**
 * Counts the total number of descendants for an item (including the item itself)
 * Useful for showing "Delete X items" confirmations
 *
 * @param itemId - ID of the item
 * @param items - Flat array of all sidebar items
 * @returns Count of item + all descendants
 */
export function countDescendants(itemId: number, items: SidebarItem[]): number {
  let count = 1; // Count the item itself

  const children = items.filter(item => item.parentId === itemId);
  for (const child of children) {
    count += countDescendants(child.id, items);
  }

  return count;
}

/**
 * Gets all descendant IDs for an item (including the item itself)
 * Useful for batch operations on subtrees
 *
 * @param itemId - ID of the item
 * @param items - Flat array of all sidebar items
 * @returns Array of item ID + all descendant IDs
 */
export function getDescendantIds(itemId: number, items: SidebarItem[]): number[] {
  const descendants: number[] = [itemId]; // Include the item itself

  const collectDescendants = (id: number) => {
    const children = items.filter(item => item.parentId === id);
    for (const child of children) {
      descendants.push(child.id);
      collectDescendants(child.id);
    }
  };

  collectDescendants(itemId);
  return descendants;
}
