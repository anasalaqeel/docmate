import { useMemo } from 'react';
import type { SidebarItem } from '../types/docs';

/**
 * Custom hook to build and memoize hierarchical tree structure from sidebar items
 * Optimized with O(n) complexity using HashMap approach
 *
 * @param flatItems - Flat array of sidebar items (can be undefined during loading)
 * @returns Hierarchical tree structure with children property populated
 */
export const useSidebarTree = (flatItems: SidebarItem[] | undefined) => {
  return useMemo(() => {
    // Return empty array if no items
    if (!flatItems || flatItems.length === 0) return [];

    // If items already have children property and first item has it defined,
    // assume backend already built the tree
    if (flatItems[0]?.children !== undefined) {
      return flatItems;
    }

    // Build tree using optimized HashMap approach - O(n) complexity
    const itemMap = new Map<number, SidebarItem & { children?: SidebarItem[] }>();
    const rootItems: SidebarItem[] = [];

    // Detect circular references before building (safety check)
    const hasCircularRef = detectCircularReference(flatItems);
    if (hasCircularRef) {
      console.error('Circular reference detected in sidebar items. Returning empty tree.');
      return [];
    }

    // First pass: Create map of all items with empty children arrays
    for (const item of flatItems) {
      itemMap.set(item.id, { ...item, children: [] });
    }

    // Second pass: Build tree structure by linking parents and children
    for (const item of flatItems) {
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
          // Orphaned item (parent doesn't exist) - treat as root
          console.warn(`Orphaned item detected: ${item.title} (id: ${item.id}, parentId: ${item.parentId})`);
          rootItems.push(node);
        }
      }
    }

    // Sort children at each level by the 'order' field
    const sortChildren = (nodes: SidebarItem[], depth: number = 0) => {
      // Safety limit for max depth
      if (depth > 50) {
        console.error(`Maximum depth (50) exceeded in tree structure`);
        return;
      }

      // Sort siblings by order field
      nodes.sort((a, b) => a.order - b.order);

      // Recursively sort children of each node
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children, depth + 1);
        }
      });
    };

    sortChildren(rootItems);

    return rootItems;
  }, [flatItems]); // Only recompute when flatItems reference changes
};

/**
 * Helper function to detect circular references in sidebar items
 * Uses path tracking to identify cycles
 *
 * @param items - Flat array of sidebar items
 * @returns true if circular reference detected, false otherwise
 */
function detectCircularReference(items: SidebarItem[]): boolean {
  const itemMap = new Map<number, SidebarItem>();

  // Build lookup map
  for (const item of items) {
    itemMap.set(item.id, item);
  }

  // Track visited nodes during current path traversal
  const visited = new Set<number>();

  const hasCycle = (itemId: number, path: Set<number>): boolean => {
    // If we've seen this item in the current path, we have a cycle
    if (path.has(itemId)) return true;

    // If we've already fully explored this node, no cycle from here
    if (visited.has(itemId)) return false;

    // Mark as visited and add to current path
    visited.add(itemId);
    path.add(itemId);

    // Check parent
    const item = itemMap.get(itemId);
    if (item?.parentId) {
      if (hasCycle(item.parentId, path)) return true;
    }

    // Remove from current path (backtrack)
    path.delete(itemId);
    return false;
  };

  // Check all items for cycles
  for (const item of items) {
    if (hasCycle(item.id, new Set())) return true;
  }

  return false;
}

/**
 * Helper function to count descendants of an item (including the item itself)
 * Useful for "Delete X items" confirmations
 *
 * @param itemId - ID of the item
 * @param items - Flat array of all sidebar items
 * @returns Count of item + all descendants
 */
export function countItemDescendants(itemId: number, items: SidebarItem[]): number {
  let count = 1; // Count the item itself

  const children = items.filter(item => item.parentId === itemId);
  for (const child of children) {
    count += countItemDescendants(child.id, items);
  }

  return count;
}
