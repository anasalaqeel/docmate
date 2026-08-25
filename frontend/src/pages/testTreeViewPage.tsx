import React, { useState } from "react";
import { TreeView } from "../common/treeView/treeView";
import type { TreeNode, DragDropConfig } from "../common/treeView/treeView";
import { Card, CardBody, CardHeader } from "@heroui/react";

// Enhanced test data with metadata for drag/drop validation
const testData: TreeNode[] = [
  {
    id: "1",
    label: "Documents",
    icon: "📁",
    metadata: { isLeaf: false },
    children: [
      {
        id: "1-1",
        label: "Work",
        icon: "📁",
        metadata: { isLeaf: false },
        children: [
          { id: "1-1-1", label: "Report.pdf", icon: "📄", metadata: { isLeaf: true } },
          { id: "1-1-2", label: "Expenses.csv", icon: "📊", metadata: { isLeaf: true } },
        ],
      },
      {
        id: "1-2",
        label: "Personal",
        icon: "📁",
        metadata: { isLeaf: false },
        children: [
          { id: "1-2-1", label: "Photos", icon: "📁", metadata: { isLeaf: false }, children: [] },
          { id: "1-2-2", label: "Resume.docx", icon: "📄", metadata: { isLeaf: true } },
        ],
      },
    ],
  },
  {
    id: "2",
    label: "Downloads",
    icon: "📁",
    metadata: { isLeaf: false },
    children: [
      { id: "2-1", label: "Installer.dmg", icon: "💾", metadata: { isLeaf: true } },
      { id: "2-2", label: "Image.png", icon: "🖼️", metadata: { isLeaf: true } },
    ],
  },
  {
    id: "3",
    label: "System",
    icon: "⚙️",
    metadata: { isLeaf: false },
    children: [{ id: "3-1", label: "Settings", icon: "🔧", metadata: { isLeaf: true } }],
  },
];

const TestTreeViewPage: React.FC = () => {
  const [data, setData] = useState<TreeNode[]>(testData);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const dragDropConfig = React.useMemo(
    (): DragDropConfig<TreeNode> => ({
      canAcceptChildren: (node) => {
        const canAccept = node.metadata?.isLeaf !== true;
        addLog(`${node.label} can accept children: ${canAccept}`);
        return canAccept;
      },
      canBeDragged: (node) => {
        addLog(`${node.label} can be dragged: true`);
        return true;
      },
      onNodeMove: (draggedNode, targetNode, position) => {
        addLog(`Moving "${draggedNode.label}" ${position} "${targetNode.label}"`);

        // Perform the actual move operation
        setData((prevData) => {
          const newData = [...prevData];

          // Helper function to remove node from anywhere in the tree
          const removeNode = (nodes: TreeNode[], nodeId: string | number): TreeNode[] => {
            return nodes
              .filter((node) => node.id !== nodeId)
              .map((node) => ({
                ...node,
                children: node.children ? removeNode(node.children, nodeId) : undefined,
              }));
          };

          // Helper function to add node to a target
          const addNode = (
            nodes: TreeNode[],
            targetId: string | number,
            nodeToAdd: TreeNode,
            position: "top" | "middle" | "bottom"
          ): TreeNode[] => {
            const result: TreeNode[] = [];

            for (const node of nodes) {
              if (node.id === targetId) {
                if (position === "top") {
                  // Insert before this node at the same level
                  result.push(nodeToAdd);
                  result.push(node);
                } else if (position === "bottom") {
                  // Insert after this node at the same level
                  result.push(node);
                  result.push(nodeToAdd);
                } else if (position === "middle") {
                  // Add as child
                  result.push({
                    ...node,
                    children: [...(node.children || []), nodeToAdd],
                  });
                }
              } else if (node.children) {
                // Check if target is in children
                const childIndex = node.children.findIndex((child) => child.id === targetId);
                if (childIndex !== -1) {
                  const newChildren = [...node.children];
                  if (position === "top") {
                    newChildren.splice(childIndex, 0, nodeToAdd);
                  } else if (position === "bottom") {
                    newChildren.splice(childIndex + 1, 0, nodeToAdd);
                  }
                  result.push({
                    ...node,
                    children: newChildren,
                  });
                } else {
                  // Recursively search in children
                  const updatedChildren = addNode(node.children, targetId, nodeToAdd, position);
                  result.push({
                    ...node,
                    children: updatedChildren,
                  });
                }
              } else {
                result.push(node);
              }
            }

            return result;
          };

          // First, remove the dragged node
          const dataWithoutDragged = removeNode(newData, draggedNode.id);

          // Then add it back at the new position
          const result = addNode(dataWithoutDragged, targetNode.id, draggedNode, position);

          return result;
        });

        addLog(`Successfully moved "${draggedNode.label}" ${position} "${targetNode.label}"`);
      },
    }),
    [addLog]
  );

  // Debug: Check if dragDropConfig is properly passed
  React.useEffect(() => {
    console.log("TestTreeViewPage - dragDropConfig:", dragDropConfig);
    console.log("TestTreeViewPage - data:", data);
  }, [dragDropConfig, data]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Tree View Drag & Drop Test</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tree View */}
        <div>
          <Card className="shadow-lg">
            <CardHeader className="bg-blue-600 text-white">
              <h2 className="text-xl font-bold">Drag & Drop Tree</h2>
            </CardHeader>
            <CardBody className="p-6">
              <div className="border-2 border-divider rounded-lg p-4 bg-content1 dark:bg-content1">
                <TreeView
                  data={data}
                  dragDropConfig={dragDropConfig}
                  className="min-h-[300px]"
                  classNames={{
                    node: "data-[selected=true]:bg-blue-500/10 data-[selected=true]:border-blue-500/20 border border-transparent hover:bg-default-100",
                    nodeLabel: "group-data-[selected=true]:font-semibold group-data-[selected=true]:text-blue-600 dark:group-data-[selected=true]:text-blue-400"
                  }}
                />
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-lg mt-6">
            <CardHeader className="bg-amber-500 text-white">
              <h3 className="text-lg font-semibold">Instructions</h3>
            </CardHeader>
            <CardBody className="p-4">
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Drag any item - hover over folders to drop inside</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Drag files (📄, 📊, 💾) to folders (📁)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Drag above/below items to reorder</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Use the JSON view to verify structure updates</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>

        {/* Logs */}
        <div>
          <Card className="shadow-lg">
            <CardHeader className="bg-emerald-600 text-white">
              <h2 className="text-xl font-bold">Event Logs</h2>
            </CardHeader>
            <CardBody className="p-4 h-96 overflow-y-auto">
              <div className="border-2 border-divider rounded-lg p-4 bg-content2 dark:bg-content2 min-h-[320px]">
                {logs.length === 0 ? (
                  <p className="text-default-500 text-center py-8">
                    No events yet. Try dragging items...
                  </p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className="text-xs font-mono py-2 px-3 bg-content1 dark:bg-content1 rounded border border-divider break-all"
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-lg mt-6">
            <CardHeader className="bg-purple-600 text-white">
              <h3 className="text-lg font-semibold">Current Data</h3>
            </CardHeader>
            <CardBody className="p-4">
              <div className="border-2 border-divider rounded-lg p-4 bg-content1 dark:bg-content1 max-h-64 overflow-auto">
                <pre className="text-xs font-mono text-foreground">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestTreeViewPage;
