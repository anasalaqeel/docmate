import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./treeView.module.css";

// --- Types ---

export interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
  icon?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

export interface DragDropConfig<T extends TreeNode> {
  canAcceptChildren?: (node: T) => boolean;
  canBeDragged?: (node: T) => boolean;
  onNodeMove?: (
    draggedNode: T,
    targetNode: T,
    zone: "top" | "middle" | "bottom"
  ) => void;
}

export interface TreeItemRenderProps<T extends TreeNode> {
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  paddingLeft: number;
  isDragging: boolean;
  node: T; 
}

export interface TreeViewClassNames {
  container?: string;
  list?: string;
  node?: string;
  nodeContent?: string;
  nodeLabel?: string;
  nodeIcon?: string;
  dragGhost?: string;
  dropIndicator?: string;
  rootNode?: string; 
}

export interface TreeViewProps<T extends TreeNode = TreeNode> {
  data: T[];
  onNodeClick?: (node: T) => void;
  defaultExpandedIds?: (string | number)[];
  className?: string; // Root container class
  selectedNodeId?: string | number | null;
  /** Visual variation: "default" (tinted hover/selection) or "quiet" (typography-forward reading nav) */
  variant?: "default" | "quiet";

  // Customization - Styling
  classNames?: TreeViewClassNames;
  
  // Customization - Content
  renderItem?: (props: TreeItemRenderProps<T>) => React.ReactNode;
  renderActions?: (node: T) => React.ReactNode;
  expandIcon?: React.ReactNode; 
  leafIcon?: React.ReactNode; 
  
  // D&D
  dragDropConfig?: DragDropConfig<T>;
}

// --- Utils ---

function findNode<T extends TreeNode>(nodes: T[], id: string | number): T | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children as T[], id);
      if (found) return found;
    }
  }
  return null;
}

const isDescendant = <T extends TreeNode>(
  nodes: T[],
  ancestorId: string | number,
  descendantId: string | number
): boolean => {
  if (ancestorId === descendantId) return true;
  const ancestor = findNode(nodes, ancestorId);
  if (!ancestor || !ancestor.children) return false;
  return !!findNode(ancestor.children, descendantId);
};

// Default Icons
const DefaultExpandIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const DefaultLeafIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><circle cx="12" cy="12" r="10" /></svg>
);


// --- Components ---

// 1. The Floating Ghost (follows mouse)
const DragGhost = <T extends TreeNode>({ 
    draggedNode, 
    x, 
    y,
    dropTargetName,
    classNames
}: { 
    draggedNode: T | null, 
    x: number, 
    y: number,
    dropTargetName?: string,
    dropZone?: 'top' | 'middle' | 'bottom' | null,
    classNames?: TreeViewClassNames
}) => {
    if (!draggedNode) return null;
    return createPortal(
        <div 
            style={{ 
                transform: `translate(${x}px, ${y}px)`,
            }}
            className={`${styles.dragGhost} ${classNames?.dragGhost || ''}`}
        >
            <div className={styles.dragGhostContent}>
                <span className={styles.dragGhostIcon}>{draggedNode.icon || "📄"}</span>
                <span className={styles.dragGhostLabel}>{draggedNode.label}</span>
            </div>
            
            {dropTargetName && (
                 <div className={styles.dragGhostTarget}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="15 10 20 15 15 20" /><path d="M4 4v7a4 4 0 0 0 4 4h12" /></svg>
                    <span className={styles.truncate}>{dropTargetName}</span>
                 </div>
            )}
        </div>,
        document.body
    );
};

// 2. The Drop Indicator
const DropIndicator = ({ 
    targetRect, 
    zone, 
    isValid,
    depth = 0,
    classNames
}: { 
    targetRect: DOMRect | null, 
    zone: 'top' | 'middle' | 'bottom' | null,
    isValid: boolean,
    targetLabel?: string,
    depth?: number,
    classNames?: TreeViewClassNames
}) => {
    // We render even if invalid to allow transitions to fade out
    const isVisible = !!(targetRect && zone && isValid);
    
    const indent = depth * 20 + 8;
    const style: React.CSSProperties = {
        opacity: isVisible ? 1 : 0
    };
    
    if (targetRect && zone) {
        if (zone === 'middle') {
             style.left = targetRect.left;
             style.width = targetRect.width;
             style.top = targetRect.top;
             style.height = targetRect.height;
        } else {
            const top = zone === 'top' ? targetRect.top : targetRect.bottom;
            style.left = targetRect.left + indent;
            style.width = targetRect.width - indent;
            style.top = top - 2;
        }
    }

    return createPortal(
        <div 
            style={style} 
            className={`${styles.dropIndicator} ${classNames?.dropIndicator || ''}`}
            data-zone={zone || "middle"}
        >
            {zone !== 'middle' && (
                <div className={styles.dropIndicatorCircle} />
            )}
        </div>,
        document.body
    );
};


// 3. Tree Item
function TreeNodeItem<T extends TreeNode>({
  node,
  level,
  expandedNodes,
  selectedNodeId,
  toggleNode,
  onNodeClick,
  registerRow,
  onPointerDown,
  isDragging,
  renderItem,
  renderActions,
  expandIcon,
  leafIcon,
  classNames
}: {
  node: T;
  level: number;
  expandedNodes: Set<string | number>;
  selectedNodeId?: string | number | null;
  toggleNode: (id: string | number) => void;
  onNodeClick?: (node: T) => void;
  registerRow: (id: string | number, el: HTMLDivElement | null) => void;
  onPointerDown: (e: React.PointerEvent, node: T) => void;
  isDragging: boolean;
  renderItem?: (props: TreeItemRenderProps<T>) => React.ReactNode;
  renderActions?: (node: T) => React.ReactNode;
  expandIcon?: React.ReactNode;
  leafIcon?: React.ReactNode;
  classNames?: TreeViewClassNames;
}) {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = !!node.children?.length;

    const renderProps: TreeItemRenderProps<T> = {
        level,
        isExpanded,
        isSelected,
        hasChildren,
        onToggle: (e) => { e.stopPropagation(); toggleNode(node.id); },
        onClick: (e) => { e.stopPropagation(); onNodeClick?.(node); },
        paddingLeft: level * 20 + 8,
        isDragging,
        node
    };

    return (
        <div style={{ userSelect: 'none' }}>
            <div 
                ref={(el) => registerRow(node.id, el)}
                onPointerDown={(e) => onPointerDown(e, node)}
                data-level={level}
                data-selected={isSelected ? "true" : "false"}
                data-expanded={isExpanded ? "true" : "false"}
                data-dragging={isDragging ? "true" : "false"}
                className={`${styles.node} ${classNames?.node || ''}`}
                style={{ paddingLeft: `${level * 20 + 8}px`, touchAction: 'none' }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) toggleNode(node.id);
                    onNodeClick?.(node);
                }}
            >
                 {renderItem ? renderItem(renderProps) : (
                     <div className={`${styles.nodeContent} ${classNames?.nodeContent || ''}`}>
                        {/* Expand/Collapse Toggle */}
                        <div 
                            onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
                            className={styles.expandButton}
                            style={{ 
                                cursor: hasChildren ? 'pointer' : 'default',
                                opacity: hasChildren ? undefined : 0,
                                pointerEvents: hasChildren ? undefined : 'none'
                             }}
                        >
                            <div style={{ 
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                                transition: 'transform 200ms ease',
                                display: 'flex'
                            }}>
                                {expandIcon || <DefaultExpandIcon />}
                            </div>
                        </div>

                        {/* Icon */}
                        <span 
                            className={classNames?.nodeIcon || ''} 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', marginRight: '0.625rem' }}
                        >
                            {node.icon || (hasChildren ? "📁" : leafIcon || <DefaultLeafIcon />)}
                        </span>

                        {/* Label */}
                        <span className={`${styles.label} ${classNames?.nodeLabel || ''}`}>
                            {node.label}
                        </span>

                        {/* Hover Actions */}
                        <div 
                            className={styles.actions} 
                            onClick={e => e.stopPropagation()}
                            onPointerDown={e => e.stopPropagation()}
                        >
                            {renderActions && renderActions(node)}
                        </div>
                     </div>
                 )}
            </div>

            {/* Recursion - CSS Grid Accordion */}
            {hasChildren && (
                <div 
                    className={styles.accordionWrapper} 
                    data-expanded={isExpanded ? "true" : "false"}
                    aria-hidden={!isExpanded}
                >
                    <div className={styles.accordionInner}>
                         {(node.children as T[]).map(child => (
                            <TreeNodeItem 
                                key={child.id} 
                                node={child} 
                                level={level + 1}
                                expandedNodes={expandedNodes} 
                                selectedNodeId={selectedNodeId}
                                toggleNode={toggleNode} 
                                onNodeClick={onNodeClick}
                                registerRow={registerRow} 
                                onPointerDown={onPointerDown} 
                                isDragging={isDragging}
                                renderItem={renderItem} 
                                renderActions={renderActions}
                                expandIcon={expandIcon} 
                                leafIcon={leafIcon}
                                classNames={classNames}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Main TreeView ---

export function TreeView<T extends TreeNode>({
  data,
  onNodeClick,
  defaultExpandedIds = [],
  className = "",
  classNames,
  selectedNodeId,
  variant = "default",
  renderItem,
  renderActions,
  expandIcon,
  leafIcon,
  dragDropConfig
}: TreeViewProps<T>) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string | number>>(new Set(defaultExpandedIds));
  
  // -- Logic State --
  const rowRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());
  const [draggedNode, setDraggedNode] = useState<T | null>(null);
  
  // -- Visual State --
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [dropIndicator, setDropIndicator] = useState<{ targetRect: DOMRect, zone: 'top'|'middle'|'bottom', isValid: boolean, targetLabel?: string, depth?: number } | null>(null);
  
  // Internal mutable state for the drag engine
  const dragRef = useRef({
      active: false,
      startPos: { x: 0, y: 0 },
      node: null as T | null,
      targetId: null as string | number | null,
      zone: null as 'top'|'middle'|'bottom' | null
  });

  const toggleNode = useCallback((id: string | number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const registerRow = useCallback((id: string | number, el: HTMLDivElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
  }, []);

  const parentMap = React.useMemo(() => {
      const map = new Map<string | number, T>();
      const traverse = (nodes: T[], parent: T | null) => {
          for (const node of nodes) {
              if (parent) map.set(node.id, parent);
              if (node.children) {
                   // @ts-expect-error: safe cast for recursive generic traversal
                   traverse(node.children, node);
              }
          }
      };
      traverse(data, null);
      return map;
  }, [data]);

  const handlePointerDown = (e: React.PointerEvent, node: T) => {
      if (e.button !== 0) return;
      if (!dragDropConfig) return;
      if (dragDropConfig.canBeDragged && !dragDropConfig.canBeDragged(node)) return;

      dragRef.current = {
          active: false,
          startPos: { x: e.clientX, y: e.clientY },
          node: node,
          targetId: null,
          zone: null
      };
      
      (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
      if (!dragRef.current.node) return;

      const { x, y } = { x: e.clientX, y: e.clientY };
      
      if (!dragRef.current.active) {
          const dx = x - dragRef.current.startPos.x;
          const dy = y - dragRef.current.startPos.y;
          if (Math.sqrt(dx*dx + dy*dy) > 5) {
              dragRef.current.active = true;
              setDraggedNode(dragRef.current.node);
          } else {
              return;
          }
      }

      setGhostPos({ x: x + 15, y: y + 5 });

      let bestTarget: { id: string|number, element: HTMLDivElement, dist: number } | null = null;
      let minDist = Infinity;

      for (const [id, el] of rowRefs.current.entries()) {
          const rect = el.getBoundingClientRect();
          if (y >= rect.top && y <= rect.bottom) {
              bestTarget = { id, element: el, dist: 0 };
              break; 
          }
          const dist = Math.min(Math.abs(y - rect.top), Math.abs(y - rect.bottom));
          if (dist < minDist && dist < 50) {
              minDist = dist;
              bestTarget = { id, element: el, dist };
          }
      }

      if (bestTarget) {
          const targetNode = findNode(data, bestTarget.id);
          const rect = bestTarget.element.getBoundingClientRect();
          const relativeY = y - rect.top;
          const height = rect.height;
          
          let zone: 'top'|'middle'|'bottom' = 'middle';
          if (relativeY < height * 0.25) zone = 'top';
          else if (relativeY > height * 0.75) zone = 'bottom';
          else {
               if (dragDropConfig?.canAcceptChildren && targetNode && !dragDropConfig.canAcceptChildren(targetNode)) {
                   zone = relativeY < height * 0.5 ? 'top' : 'bottom';
               }
          }

          let finalTargetId = bestTarget.id;
          let contextLabel = "Root";
          let visualDepth = 0;
          
          const currentLevel = parseInt(bestTarget.element.getAttribute('data-level') || '0', 10);
          
          const relativeX = x - rect.left;
          let calculatedLevel = Math.max(0, Math.floor((relativeX - 8) / 20)); 
          if (calculatedLevel > currentLevel) calculatedLevel = currentLevel;

          if (zone === 'middle') {
              finalTargetId = bestTarget.id;
              visualDepth = currentLevel + 1;
              if (targetNode) contextLabel = `Move inside "${targetNode.label}"`;
          } 
          else {
              if (calculatedLevel < currentLevel) {
                  visualDepth = calculatedLevel;
                  let currId = bestTarget.id;
                  let steps = currentLevel - calculatedLevel;
                  while (steps > 0) {
                      const parent = parentMap.get(currId);
                      if (parent) {
                          currId = parent.id;
                          steps--;
                      } else {
                          break;
                      }
                  }
                  finalTargetId = currId;
                  const ancestor = findNode(data, currId);
                  if (ancestor) {
                      const relation = zone === 'top' ? 'before' : 'after';
                      contextLabel = `Place ${relation} "${ancestor.label}"`;
                  }
              } else {
                  visualDepth = currentLevel;
                  finalTargetId = bestTarget.id; 
                  if (targetNode) {
                      const parent = parentMap.get(targetNode.id);
                      if (parent) contextLabel = `Move inside "${parent.label}"`;
                  }
              }
              
              if (zone === 'bottom' && targetNode && expandedNodes.has(targetNode.id) && calculatedLevel >= currentLevel) {
                  zone = 'middle';
                  finalTargetId = targetNode.id;
                  visualDepth = currentLevel + 1;
                  contextLabel = `Move inside "${targetNode.label}"`;
              }
          }

          const logicalTarget = findNode(data, finalTargetId);
          const isValid = logicalTarget && dragRef.current.node ? 
              !isDescendant(data, dragRef.current.node.id, logicalTarget.id) && 
              dragRef.current.node.id !== logicalTarget.id 
              : false;

          dragRef.current.targetId = finalTargetId;
          dragRef.current.zone = zone;
          
          setDropIndicator({
              targetRect: rect,
              zone,
              isValid: !!isValid,
              targetLabel: contextLabel,
              depth: visualDepth
          });

      } else {
          setDropIndicator(null);
          dragRef.current.targetId = null;
      }

  }, [data, dragDropConfig, parentMap, expandedNodes]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
      if (dragRef.current.active && dragRef.current.targetId && dragRef.current.node && dragRef.current.zone) {
          const targetNode = findNode(data, dragRef.current.targetId);
          if (targetNode) {
              if (!isDescendant(data, dragRef.current.node.id, targetNode.id) && dragRef.current.node.id !== targetNode.id) {
                  dragDropConfig?.onNodeMove?.(dragRef.current.node, targetNode, dragRef.current.zone);
              }
          }
      }

      if (e.target && (e.target as Element).hasPointerCapture?.(e.pointerId)) {
        (e.target as Element).releasePointerCapture(e.pointerId);
      }

      dragRef.current = { active: false, startPos: { x:0, y:0 }, node: null, targetId: null, zone: null };
      setDraggedNode(null);
      setDropIndicator(null);
  }, [data, dragDropConfig]);

  useEffect(() => {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      const handleScrollEndDrag = () => { 
        if(dragRef.current.active) {
          handlePointerUp({} as PointerEvent); 
        }
      };
      window.addEventListener('scroll', handleScrollEndDrag, { capture: true, passive: true });
      return () => {
          window.removeEventListener('pointermove', handlePointerMove);
          window.removeEventListener('pointerup', handlePointerUp);
          window.removeEventListener('scroll', handleScrollEndDrag, { capture: true });
      };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div
      className={`${styles.container} ${variant === "quiet" ? styles.quiet : ""} ${className} ${classNames?.container || ''}`}
      data-variant={variant}
    >
      {data.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          level={0}
          expandedNodes={expandedNodes}
          selectedNodeId={selectedNodeId}
          toggleNode={toggleNode}
          onNodeClick={onNodeClick}
          registerRow={registerRow}
          onPointerDown={handlePointerDown}
          isDragging={draggedNode?.id === node.id}
          renderItem={renderItem} 
          renderActions={renderActions}
          expandIcon={expandIcon} 
          leafIcon={leafIcon}
          classNames={classNames}
        />
      ))}
      
      <DragGhost 
        draggedNode={draggedNode} 
        x={ghostPos.x} 
        y={ghostPos.y} 
        dropTargetName={dropIndicator?.targetLabel}
        dropZone={dropIndicator?.zone}
        classNames={classNames}
      />
      <DropIndicator 
          targetRect={dropIndicator?.targetRect || null} 
          zone={dropIndicator?.zone || null} 
          isValid={dropIndicator?.isValid || false}
          targetLabel={dropIndicator?.targetLabel}
          depth={dropIndicator?.depth}
          classNames={classNames}
      />
    </div>
  );
};
