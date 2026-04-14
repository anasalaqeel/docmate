import React, { useState } from "react";
import { TreeView } from "../../common/treeView/treeView";
import type { TreeNode, DragDropConfig } from "../../common/treeView/treeView";

// Sample data with different node types for testing D&D
const sampleData: TreeNode[] = [
  {
    id: "1",
    label: "Documents",
    icon: <span className="text-blue-500">📁</span>,
    metadata: { canAcceptChildren: true },
    children: [
      {
        id: "1-1",
        label: "Work",
        icon: <span className="text-blue-400">📁</span>,
        metadata: { canAcceptChildren: true },
        children: [
          {
            id: "1-1-1",
            label: "Report.pdf",
            icon: <span className="text-red-500">📄</span>,
            metadata: { isLeaf: true, canHaveChildren: false },
          },
          {
            id: "1-1-2",
            label: "Presentation.pptx",
            icon: <span className="text-orange-500">📄</span>,
            metadata: { isLeaf: true, canHaveChildren: false },
          },
        ],
      },
      {
        id: "1-2",
        label: "Personal",
        icon: <span className="text-green-500">📁</span>,
        metadata: { canAcceptChildren: true },
        children: [
          {
            id: "1-2-1",
            label: "Resume.docx",
            icon: <span className="text-blue-500">📄</span>,
            metadata: { isLeaf: true, canHaveChildren: false },
          },
        ],
      },
    ],
  },
  {
    id: "2",
    label: "Images",
    icon: <span className="text-green-500">📁</span>,
    metadata: { canAcceptChildren: true },
    children: [
      {
        id: "2-1",
        label: "Vacation.jpg",
        icon: <span className="text-purple-500">🖼️</span>,
        metadata: { isLeaf: true, canHaveChildren: false },
      },
      {
        id: "2-2",
        label: "Profile.png",
        icon: <span className="text-pink-500">🖼️</span>,
        metadata: { isLeaf: true, canHaveChildren: false },
      },
    ],
  },
  {
    id: "3",
    label: "readme.txt",
    icon: <span className="text-gray-500">📄</span>,
    metadata: { isLeaf: true, canHaveChildren: false },
  },
];

export const TreeViewDemo: React.FC = () => {
  const [data] = useState<TreeNode[]>(sampleData);
  const [selectedNodeId, setSelectedNodeId] = useState<string | number | null>("1");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Drag and drop configuration
  const dragDropConfig: DragDropConfig<TreeNode> = {
    // Only folders can accept children (files cannot)
    canAcceptChildren: (node: TreeNode) => {
      const canAccept = node.metadata?.isLeaf !== true && node.metadata?.canHaveChildren !== false;
      addLog(`${node.label} ${canAccept ? "CAN" : "CANNOT"} accept children`);
      return canAccept;
    },

    // All nodes can be dragged
    canBeDragged: (node: TreeNode) => {
      addLog(`${node.label} can be dragged`);
      return true;
    },

    // Log node moves
    onNodeMove: (draggedNode: TreeNode, targetNode: TreeNode, position: "top" | "middle" | "bottom") => {
      addLog(`Moved "${draggedNode.label}" ${position} "${targetNode.label}"`);
    },
  };

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNodeId(node.id);
    addLog(`Clicked: ${node.label}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          Tree View Drag & Drop Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Drag and drop nodes to reorganize the tree. Folders can accept children, files cannot.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree View */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
              File Explorer
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50">
              <TreeView
                data={data}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedNodeId}
                dragDropConfig={dragDropConfig}
                className="min-h-[400px]"
              />
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-semibold mb-2">Debug Info:</p>
              <p>• Drag any node - cursor should change to grab</p>
              <p>• Drag over folders - should show blue highlight</p>
              <p>• Try to drop on files - should show red highlight</p>
              <p>• Check console for drag events</p>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Instructions</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Drag any node to move it</li>
              <li>• Drop on folders to add as child</li>
              <li>• Drop between nodes to reorder</li>
              <li>• Files cannot accept children</li>
              <li>• Cannot drop a node on itself</li>
              <li>• Circular references are prevented</li>
            </ul>
          </div>

          {/* Activity Log */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Activity Log</h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-48 overflow-y-auto">
              {log.length === 0 ? (
                <p className="text-gray-500">No activity yet...</p>
              ) : (
                log.map((entry, index) => (
                  <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-1">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Current Data JSON */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Tree Data</h3>
            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto max-h-64 overflow-y-auto bg-white dark:bg-gray-800 p-2 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Global styles for drag and drop */}
      <style>{`
        .dragging {
          cursor: grabbing !important;
        }
        
        .dragging * {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default TreeViewDemo;
