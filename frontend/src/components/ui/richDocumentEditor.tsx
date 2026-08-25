import { useState, useCallback, useRef, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Tabs,
  Tab,
  Textarea,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
} from "@heroui/react";
import Switch from "./Switch";
import {
  EyeIcon,
  CodeBracketIcon,
  PhotoIcon,
  LinkIcon,
  ListBulletIcon,
  NumberedListIcon,
  BoldIcon,
  ItalicIcon,
  CommandLineIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from "@heroicons/react/24/outline";
import MarkdownRenderer from "./markdownRenderer";
import httpService from "../../services/httpService";

interface RichDocumentEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  placeholder?: string;
  title?: string;
  embedded?: boolean; // When true, shows simplified interface without external card wrapper
  pageId?: number; // Required for creating inline operations
  docId?: number; // Required for fetching operations from OpenAPI spec
}

interface Operation {
  id: string;
  method: string;
  path: string;
  summary?: string;
  tags?: string[];
}

const RichDocumentEditor = ({
  value,
  onChange,
  onSave,
  placeholder = "Start writing your documentation...",
  title = "Documentation Content",
  embedded = false,
  pageId,
  docId,
}: RichDocumentEditorProps) => {
  const [activeTab, setActiveTab] = useState("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [insertType, setInsertType] = useState<"code" | "image" | "link" | "table" | "operation">(
    "code"
  );
  const [insertData, setInsertData] = useState({
    language: "javascript",
    code: "",
    imageUrl: "",
    imageAlt: "",
    linkText: "",
    linkUrl: "",
    tableRows: 3,
    tableCols: 3,
    operationType: "new", // 'new' or 'existing'
    operationId: "",
    operationMethod: "GET",
    operationEndpoint: "",
    operationTitle: "",
    operationSummary: "",
    operationDescription: "",
    operationTags: "",
    operationOpenApiId: "",
    operationMode: "simple", // 'simple' or 'openapi'
    operationDeprecated: false,
  });

  const [operations, setOperations] = useState<Operation[]>([]);

  // Undo/Redo - Clean implementation
  const [history, setHistory] = useState<Array<{ text: string; cursor: number }>>([
    { text: value, cursor: 0 }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const saveTimeoutRef = useRef<number | null>(null);
  const isUndoingRef = useRef(false);
  const lastSavedTextRef = useRef(value);

  // Undo
  const handleUndo = useCallback(() => {
    // Save current state first if there's unsaved typing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;

      const currentText = textareaRef.current?.value || value;
      if (currentText !== lastSavedTextRef.current) {
        const cursor = textareaRef.current?.selectionStart || 0;
        setHistory((prev) => {
          const newHistory = [...prev.slice(0, historyIndex + 1), { text: currentText, cursor }];
          setHistoryIndex(newHistory.length - 1);
          lastSavedTextRef.current = currentText;
          return newHistory;
        });
        // Wait for state to update before undoing
        setTimeout(() => handleUndo(), 0);
        return;
      }
    }

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const entry = history[newIndex];

      isUndoingRef.current = true;
      setHistoryIndex(newIndex);
      onChange(entry.text);
      lastSavedTextRef.current = entry.text;

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(entry.cursor, entry.cursor);
          isUndoingRef.current = false;
        }
      });
    }
  }, [historyIndex, history, onChange, value]);

  // Redo
  const handleRedo = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const entry = history[newIndex];

      isUndoingRef.current = true;
      setHistoryIndex(newIndex);
      onChange(entry.text);
      lastSavedTextRef.current = entry.text;

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(entry.cursor, entry.cursor);
          isUndoingRef.current = false;
        }
      });
    }
  }, [historyIndex, history, onChange]);

  // Handle cursor position on click/focus
  const handleCursorPosition = useCallback(() => {
    // When at initial state (historyIndex === 0), allow updating cursor position
    // This works both for initial load and after undoing everything
    if (historyIndex === 0) {
      // Wait for cursor position to update after click
      setTimeout(() => {
        if (textareaRef.current) {
          const currentCursor = textareaRef.current.selectionStart;
          setHistory((prev) => {
            const updated = [...prev];
            updated[0] = { text: updated[0].text, cursor: currentCursor };
            return updated;
          });
        }
      }, 0);
    }
  }, [historyIndex]);

  // Handle text changes
  const handleChange = useCallback(
    (newValue: string) => {
      if (isUndoingRef.current) {
        onChange(newValue);
        return;
      }

      onChange(newValue);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save to history
      saveTimeoutRef.current = setTimeout(() => {
        if (newValue === lastSavedTextRef.current) return;

        const cursor = textareaRef.current?.selectionStart || newValue.length;

        setHistory((prev) => {
          // Trim future if typing after undo
          const trimmed = prev.slice(0, historyIndex + 1);
          const newHistory = [...trimmed, { text: newValue, cursor }];

          // Limit to 100 entries
          if (newHistory.length > 100) {
            newHistory.shift();
            setHistoryIndex(99);
          } else {
            setHistoryIndex(newHistory.length - 1);
          }

          lastSavedTextRef.current = newValue;
          return newHistory;
        });
      }, 300);
    },
    [onChange, historyIndex, history.length]
  );

  // Handle paste
  const handlePaste = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setTimeout(() => {
      if (textareaRef.current) {
        const newValue = textareaRef.current.value;
        const cursor = textareaRef.current.selectionStart;

        setHistory((prev) => {
          const trimmed = prev.slice(0, historyIndex + 1);
          const newHistory = [...trimmed, { text: newValue, cursor }];
          setHistoryIndex(newHistory.length - 1);
          lastSavedTextRef.current = newValue;
          return newHistory;
        });
      }
    }, 0);
  }, [historyIndex]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Fetch all operations for referencing from OpenAPI spec
  useEffect(() => {
    const fetchOperations = async () => {
      if (!docId) {
        setOperations([]);
        return;
      }

      try {
        const response = await httpService.get<{
          data: {
            paths?: Record<
              string,
              Record<string, { operationId?: string; summary?: string; description?: string }>
            >;
          };
        }>(`/docs/${docId}/openapi`);
        // Extract operations from OpenAPI spec
        const spec = response.data;
        const operations: Operation[] = [];

        if (spec?.paths) {
          Object.entries(spec.paths).forEach(([path, pathObj]) => {
            Object.entries(pathObj).forEach(([method, operation]) => {
              if (["get", "post", "put", "patch", "delete"].includes(method.toLowerCase())) {
                const cleanPath = path.replace(/^\//, "").replace(/\//g, "_") || "root";
                const operationId = operation.operationId || `${method.toUpperCase()}_${cleanPath}`;
                operations.push({
                  id: operationId,
                  method: method.toUpperCase(),
                  path,
                  summary:
                    operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`,
                  tags: [],
                });
              }
            });
          });
        }
        setOperations(operations);
      } catch (error) {
        console.error("Failed to fetch OpenAPI spec:", error);
        setOperations([]);
      }
    };

    fetchOperations();
  }, [docId]);

  // Insert text at cursor position
  const insertAtCursor = useCallback(
    (text: string) => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);
        const newValue = beforeText + text + afterText;
        const newCursorPos = start + text.length;

        onChange(newValue);

        // Set cursor and save to history immediately
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;

          // Save to history immediately (don't wait for debounce)
          setHistory((prev) => {
            const trimmed = prev.slice(0, historyIndex + 1);
            const newHistory = [...trimmed, { text: newValue, cursor: newCursorPos }];
            setHistoryIndex(newHistory.length - 1);
            lastSavedTextRef.current = newValue;
            return newHistory;
          });
        }, 0);
      }
    },
    [value, onChange, historyIndex]
  );

  // Format text with markdown
  const formatText = useCallback(
    (format: string) => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        let start = textarea.selectionStart;
        let end = textarea.selectionEnd;
        let selectedText = value.substring(start, end);
        let formattedText = "";

        // For line-based formats (headers, quotes, lists), work with the entire line
        const isLineBasedFormat = [
          "header1",
          "header2",
          "header3",
          "quote",
          "list",
          "numbered",
        ].includes(format);

        let lineStart = start;
        let lineEnd = end;
        let lineText = selectedText;

        if (isLineBasedFormat) {
          // Find the start of the line
          lineStart = value.lastIndexOf("\n", start - 1) + 1;
          // Find the end of the line
          lineEnd = value.indexOf("\n", end);
          if (lineEnd === -1) lineEnd = value.length;

          lineText = value.substring(lineStart, lineEnd);
        } else {
          // For inline formats (bold, italic, code), check if we're inside a line-based format
          // If the selection includes line-based markers, extract only the text content
          const currentLineStart = value.lastIndexOf("\n", start - 1) + 1;
          const currentLineEnd = value.indexOf("\n", end);
          const currentLine = value.substring(
            currentLineStart,
            currentLineEnd === -1 ? value.length : currentLineEnd
          );

          // Check if line starts with markdown markers
          const lineBasedMarkerMatch = currentLine.match(
            /^(#{1,6}\s+|>\s*|[-*+]\s+(?:\[[ x]\]\s+)?|\d+\.\s+)/
          );

          if (
            lineBasedMarkerMatch &&
            start === currentLineStart &&
            end === (currentLineEnd === -1 ? value.length : currentLineEnd)
          ) {
            // User has the entire line selected (including markers)
            // Adjust selection to only include the text content after the marker
            const markerLength = lineBasedMarkerMatch[0].length;
            const adjustedStart = currentLineStart + markerLength;
            const adjustedEnd = currentLineEnd === -1 ? value.length : currentLineEnd;

            // Update selection boundaries to exclude the marker
            start = adjustedStart;
            end = adjustedEnd;
            selectedText = value.substring(start, end);
          }
        }

        // Helper function to strip existing markdown formatting
        const stripExistingFormat = (
          text: string,
          formatType: "header" | "quote" | "list"
        ): string => {
          if (formatType === "header") {
            // Remove existing header markers (# ## ###, etc.)
            return text.replace(/^#{1,6}\s+/, "");
          } else if (formatType === "quote") {
            // Remove existing quote markers (can be nested like '> >' or combined with lists '> -')
            return text
              .replace(/^>\s*/, "")
              .replace(/^[-*+]\s+/, "")
              .replace(/^\d+\.\s+/, "");
          } else if (formatType === "list") {
            // Remove existing list markers:
            // - Unordered: -, *, +
            // - Ordered: 1., 2., etc.
            // - Task lists: - [ ] or - [x]
            // - Nested/quoted lists: > -
            return text
              .replace(/^>\s*/, "") // Remove quote markers first
              .replace(/^[-*+]\s+(?:\[[ x]\]\s+)?/, "") // Remove list markers and optional checkboxes
              .replace(/^\d+\.\s+/, ""); // Remove numbered list markers
          }
          return text;
        };

        switch (format) {
          case "bold":
            // Toggle bold: if already bold, remove formatting; otherwise add it
            if (
              selectedText.startsWith("**") &&
              selectedText.endsWith("**") &&
              selectedText.length > 4
            ) {
              formattedText = selectedText.slice(2, -2);
            } else {
              formattedText = `**${selectedText || "bold text"}**`;
            }
            break;
          case "italic":
            // Toggle italic: if already italic, remove formatting; otherwise add it
            if (
              selectedText.startsWith("*") &&
              selectedText.endsWith("*") &&
              selectedText.length > 2 &&
              !selectedText.startsWith("**")
            ) {
              formattedText = selectedText.slice(1, -1);
            } else if (
              selectedText.startsWith("_") &&
              selectedText.endsWith("_") &&
              selectedText.length > 2
            ) {
              formattedText = selectedText.slice(1, -1);
            } else {
              formattedText = `*${selectedText || "italic text"}*`;
            }
            break;
          case "code":
            // Toggle code: if already code, remove formatting; otherwise add it
            if (
              selectedText.startsWith("`") &&
              selectedText.endsWith("`") &&
              selectedText.length > 2
            ) {
              formattedText = selectedText.slice(1, -1);
            } else {
              formattedText = `\`${selectedText || "code"}\``;
            }
            break;
          case "header1":
            // Toggle H1: if already H1, remove formatting; otherwise convert to H1
            if (lineText.startsWith("# ") && !lineText.startsWith("## ")) {
              formattedText = stripExistingFormat(lineText, "header") || "Header 1";
            } else {
              formattedText = `# ${stripExistingFormat(lineText, "header") || "Header 1"}`;
            }
            break;
          case "header2":
            // Toggle H2: if already H2, remove formatting; otherwise convert to H2
            if (lineText.startsWith("## ") && !lineText.startsWith("### ")) {
              formattedText = stripExistingFormat(lineText, "header") || "Header 2";
            } else {
              formattedText = `## ${stripExistingFormat(lineText, "header") || "Header 2"}`;
            }
            break;
          case "header3":
            // Toggle H3: if already H3, remove formatting; otherwise convert to H3
            if (lineText.startsWith("### ") && !lineText.startsWith("#### ")) {
              formattedText = stripExistingFormat(lineText, "header") || "Header 3";
            } else {
              formattedText = `### ${stripExistingFormat(lineText, "header") || "Header 3"}`;
            }
            break;
          case "quote":
            formattedText = `> ${stripExistingFormat(lineText, "quote") || "Quote text"}`;
            break;
          case "list":
            formattedText = `- ${stripExistingFormat(lineText, "list") || "List item"}`;
            break;
          case "numbered":
            formattedText = `1. ${stripExistingFormat(lineText, "list") || "Numbered item"}`;
            break;
          default:
            return;
        }

        let newValue;
        let newCursorPos;

        if (isLineBasedFormat) {
          // Replace the entire line
          const beforeText = value.substring(0, lineStart);
          const afterText = value.substring(lineEnd);
          newValue = beforeText + formattedText + afterText;
          newCursorPos = lineStart + formattedText.length;
        } else {
          // Replace only the selected text (for inline formats)
          const beforeText = value.substring(0, start);
          const afterText = value.substring(end);
          newValue = beforeText + formattedText + afterText;
          newCursorPos = start + formattedText.length;
        }

        // Update value and save to history immediately for formatting operations
        onChange(newValue);

        // Set cursor position after the formatted text and save to history
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);

            // Save to history immediately (don't wait for debounce)
            setHistory((prev) => {
              const trimmed = prev.slice(0, historyIndex + 1);
              const newHistory = [...trimmed, { text: newValue, cursor: newCursorPos }];
              setHistoryIndex(newHistory.length - 1);
              lastSavedTextRef.current = newValue;
              return newHistory;
            });
          }
        }, 0);
      }
    },
    [value, onChange, historyIndex]
  );

  // Handle insert modal
  const handleInsert = useCallback(() => {
    let insertText = "";

    switch (insertType) {
      case "code":
        insertText = `\`\`\`${insertData.language}\n${insertData.code}\n\`\`\``;
        break;
      case "image":
        insertText = `![${insertData.imageAlt}](${insertData.imageUrl})`;
        break;
      case "link":
        insertText = `[${insertData.linkText}](${insertData.linkUrl})`;
        break;
      case "table": {
        const headers = Array(insertData.tableCols)
          .fill("Header")
          .map((h, i) => `${h} ${i + 1}`)
          .join(" | ");
        const separator = Array(insertData.tableCols).fill("---").join(" | ");
        const rows = Array(insertData.tableRows - 1)
          .fill(0)
          .map(() => Array(insertData.tableCols).fill("Cell").join(" | "));
        insertText = `${headers}\n${separator}\n${rows.join("\n")}`;
        break;
      }
      case "operation":
        if (insertData.operationType === "new") {
          if (insertData.operationMode === "openapi") {
            insertText = `:::openapi-operation
method: ${insertData.operationMethod}
endpoint: ${insertData.operationEndpoint}
title: ${insertData.operationTitle}
operationId: ${insertData.operationOpenApiId}
summary: ${insertData.operationSummary}
description: ${insertData.operationDescription}
tags: ${insertData.operationTags}
deprecated: ${insertData.operationDeprecated}
parameters: []
responses: {}
security: []
:::`;
          } else {
            insertText = `:::operation
method: ${insertData.operationMethod}
endpoint: ${insertData.operationEndpoint}
title: ${insertData.operationTitle}
:::`;
          }
        } else {
          insertText = `:::operation-ref
id: ${insertData.operationId}
:::`;
        }
        break;
    }

    insertAtCursor("\n" + insertText + "\n");
    onClose();

    // Reset insert data
    setInsertData({
      language: "javascript",
      code: "",
      imageUrl: "",
      imageAlt: "",
      linkText: "",
      linkUrl: "",
      tableRows: 3,
      tableCols: 3,
      operationType: "new",
      operationId: "",
      operationMethod: "GET",
      operationEndpoint: "",
      operationTitle: "",
      operationSummary: "",
      operationDescription: "",
      operationTags: "",
      operationOpenApiId: "",
      operationMode: "simple",
      operationDeprecated: false,
    });
  }, [insertType, insertData, insertAtCursor, onClose]);

  const openInsertModal = (type: "code" | "image" | "link" | "table" | "operation") => {
    setInsertType(type);
    onOpen();
  };

  const toolbarButtons = [
    { icon: BoldIcon, label: "Bold", action: () => formatText("bold") },
    { icon: ItalicIcon, label: "Italic", action: () => formatText("italic") },
    { icon: CodeBracketIcon, label: "Inline Code", action: () => formatText("code") },
    { icon: PhotoIcon, label: "Insert Image", action: () => openInsertModal("image") },
    { icon: LinkIcon, label: "Insert Link", action: () => openInsertModal("link") },
    { icon: ListBulletIcon, label: "Bullet List", action: () => formatText("list") },
    { icon: NumberedListIcon, label: "Numbered List", action: () => formatText("numbered") },
  ];

  const headerButtons = [
    { label: "H1", action: () => formatText("header1") },
    { label: "H2", action: () => formatText("header2") },
    { label: "H3", action: () => formatText("header3") },
  ];

  if (embedded) {
    return (
      <div className="w-full space-y-4">
        {/* Tabs for Write/Preview */}
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="w-full"
          classNames={{
            cursor: "group-data-[selected=true]:bg-primary",
            tabContent: "group-data-[selected=true]:text-white font-medium"
          }}
        >
          <Tab key="write" title="Write">
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                {/* Undo/Redo buttons */}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="light"
                    className="min-w-[2rem] h-8"
                    onPress={handleUndo}
                    isDisabled={historyIndex === 0}
                    isIconOnly
                    title="Undo (Ctrl+Z)"
                  >
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    className="min-w-[2rem] h-8"
                    onPress={handleRedo}
                    isDisabled={historyIndex === history.length - 1}
                    isIconOnly
                    title="Redo (Ctrl+Y)"
                  >
                    <ArrowUturnRightIcon className="w-4 h-4" />
                  </Button>
                </div>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                <div className="flex gap-1">
                  {headerButtons.map((btn, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="light"
                      className="min-w-[2rem] h-8 text-xs"
                      onPress={btn.action}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                <div className="flex gap-1">
                  {toolbarButtons.map((btn, idx) => {
                    const Icon = btn.icon;
                    return (
                      <Button
                        key={idx}
                        size="sm"
                        variant="light"
                        className="min-w-[2rem] h-8"
                        onPress={btn.action}
                        isIconOnly
                      >
                        <Icon className="w-4 h-4" />
                      </Button>
                    );
                  })}
                </div>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                <Button
                  size="sm"
                  variant="light"
                  className="h-8"
                  onPress={() => formatText("quote")}
                >
                  Quote
                </Button>

                <div className="flex-1" />

                <div className="flex gap-2">
                  <Button
                    color="primary"
                    variant="light"
                    size="sm"
                    onPress={() => openInsertModal("code")}
                    startContent={<CodeBracketIcon className="w-4 h-4" />}
                  >
                    Code Block
                  </Button>
                  <Button
                    color="primary"
                    variant="light"
                    size="sm"
                    onPress={() => openInsertModal("table")}
                  >
                    Table
                  </Button>
                  {pageId && (
                    <Button
                      color="secondary"
                      variant="light"
                      size="sm"
                      onPress={() => openInsertModal("operation")}
                      startContent={<CommandLineIcon className="w-4 h-4" />}
                    >
                      API Operation
                    </Button>
                  )}
                  <Button color="primary" size="sm" onPress={onSave}>
                    Save
                  </Button>
                </div>
              </div>
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onPaste={handlePaste}
                onClick={handleCursorPosition}
                onFocus={handleCursorPosition}
                placeholder={placeholder}
                minRows={20}
                className="font-mono"
                variant="bordered"
              />

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="mb-1">
                  <strong>Tips:</strong>
                </p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Use **text** for bold, *text* for italic</li>
                  <li>Use `code` for inline code, ```language for code blocks</li>
                  <li>Use # Header1, ## Header2, ### Header3 for headers</li>
                  <li>Use &gt; for quotes, - for bullet lists, 1. for numbered lists</li>
                  <li>Use [text](url) for links, ![alt](url) for images</li>
                </ul>
              </div>
            </div>
          </Tab>

          <Tab
            key="preview"
            title={
              <div className="flex items-center gap-2">
                <EyeIcon className="w-4 h-4" />
                Preview
              </div>
            }
          >
            <div className="min-h-[500px] p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              {value ? (
                <MarkdownRenderer content={value} pageId={pageId} docId={docId} />
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  Nothing to preview yet. Start writing in the Write tab.
                </p>
              )}
            </div>
          </Tab>
        </Tabs>

        {/* Insert Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="2xl">
          <ModalContent>
            <ModalHeader>
              Insert {insertType.charAt(0).toUpperCase() + insertType.slice(1)}
            </ModalHeader>
            <ModalBody>
              {insertType === "code" && (
                <div className="space-y-4">
                  <Select
                    label="Language"
                    selectedKeys={[insertData.language]}
                    onSelectionChange={(keys) => {
                      const language = Array.from(keys)[0] as string;
                      setInsertData((prev) => ({ ...prev, language }));
                    }}
                  >
                    <SelectItem key="javascript">JavaScript</SelectItem>
                    <SelectItem key="typescript">TypeScript</SelectItem>
                    <SelectItem key="python">Python</SelectItem>
                    <SelectItem key="java">Java</SelectItem>
                    <SelectItem key="csharp">C#</SelectItem>
                    <SelectItem key="cpp">C++</SelectItem>
                    <SelectItem key="json">JSON</SelectItem>
                    <SelectItem key="xml">XML</SelectItem>
                    <SelectItem key="html">HTML</SelectItem>
                    <SelectItem key="css">CSS</SelectItem>
                    <SelectItem key="sql">SQL</SelectItem>
                    <SelectItem key="bash">Bash</SelectItem>
                    <SelectItem key="yaml">YAML</SelectItem>
                    <SelectItem key="plaintext">Plain Text</SelectItem>
                  </Select>
                  <Textarea
                    label="Code"
                    placeholder="Enter your code here..."
                    value={insertData.code}
                    onChange={(e) => setInsertData((prev) => ({ ...prev, code: e.target.value }))}
                    minRows={8}
                    className="font-mono"
                  />
                </div>
              )}

              {insertType === "image" && (
                <div className="space-y-4">
                  <Input
                    label="Image URL"
                    placeholder="https://example.com/image.jpg"
                    value={insertData.imageUrl}
                    onChange={(e) =>
                      setInsertData((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                  />
                  <Input
                    label="Alt Text"
                    placeholder="Description of the image"
                    value={insertData.imageAlt}
                    onChange={(e) =>
                      setInsertData((prev) => ({ ...prev, imageAlt: e.target.value }))
                    }
                  />
                </div>
              )}

              {insertType === "link" && (
                <div className="space-y-4">
                  <Input
                    label="Link Text"
                    placeholder="Click here"
                    value={insertData.linkText}
                    onChange={(e) =>
                      setInsertData((prev) => ({ ...prev, linkText: e.target.value }))
                    }
                  />
                  <Input
                    label="URL"
                    placeholder="https://example.com"
                    value={insertData.linkUrl}
                    onChange={(e) =>
                      setInsertData((prev) => ({ ...prev, linkUrl: e.target.value }))
                    }
                  />
                </div>
              )}

              {insertType === "table" && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      label="Rows"
                      value={insertData.tableRows.toString()}
                      onChange={(e) =>
                        setInsertData((prev) => ({
                          ...prev,
                          tableRows: parseInt(e.target.value) || 3,
                        }))
                      }
                      min={2}
                      max={10}
                    />
                    <Input
                      type="number"
                      label="Columns"
                      value={insertData.tableCols.toString()}
                      onChange={(e) =>
                        setInsertData((prev) => ({
                          ...prev,
                          tableCols: parseInt(e.target.value) || 3,
                        }))
                      }
                      min={2}
                      max={8}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will create a {insertData.tableRows}x{insertData.tableCols} table template
                    that you can edit after insertion.
                  </p>
                </div>
              )}

              {insertType === "operation" && (
                <div className="space-y-4">
                  <Select
                    label="Operation Type"
                    selectedKeys={[insertData.operationType]}
                    onSelectionChange={(keys) => {
                      const operationType = Array.from(keys)[0] as string;
                      setInsertData((prev) => ({ ...prev, operationType }));
                    }}
                  >
                    <SelectItem key="new">Create New Operation</SelectItem>
                    <SelectItem key="existing">Reference Existing Operation</SelectItem>
                  </Select>

                  {insertData.operationType === "new" ? (
                    <div className="space-y-4">
                      <Select
                        label="Operation Mode"
                        selectedKeys={[insertData.operationMode]}
                        onSelectionChange={(keys) => {
                          const mode = Array.from(keys)[0] as string;
                          setInsertData((prev) => ({ ...prev, operationMode: mode }));
                        }}
                      >
                        <SelectItem key="simple">Simple Operation</SelectItem>
                        <SelectItem key="openapi">Full OpenAPI Operation</SelectItem>
                      </Select>

                      <div className="flex gap-4">
                        <Select
                          label="Method"
                          selectedKeys={[insertData.operationMethod]}
                          onSelectionChange={(keys) => {
                            const method = Array.from(keys)[0] as string;
                            setInsertData((prev) => ({ ...prev, operationMethod: method }));
                          }}
                          className="w-32"
                        >
                          <SelectItem key="GET">GET</SelectItem>
                          <SelectItem key="POST">POST</SelectItem>
                          <SelectItem key="PUT">PUT</SelectItem>
                          <SelectItem key="PATCH">PATCH</SelectItem>
                          <SelectItem key="DELETE">DELETE</SelectItem>
                          <SelectItem key="HEAD">HEAD</SelectItem>
                          <SelectItem key="OPTIONS">OPTIONS</SelectItem>
                        </Select>

                        <Input
                          label="Endpoint"
                          placeholder="/api/users/{id}"
                          value={insertData.operationEndpoint}
                          onChange={(e) =>
                            setInsertData((prev) => ({
                              ...prev,
                              operationEndpoint: e.target.value,
                            }))
                          }
                          className="flex-1"
                        />
                      </div>

                      <Input
                        label="Title"
                        placeholder="Get user by ID"
                        value={insertData.operationTitle}
                        onChange={(e) =>
                          setInsertData((prev) => ({ ...prev, operationTitle: e.target.value }))
                        }
                      />

                      {insertData.operationMode === "openapi" && (
                        <>
                          <Input
                            label="Operation ID (OpenAPI)"
                            placeholder="getUserById"
                            value={insertData.operationOpenApiId}
                            onChange={(e) =>
                              setInsertData((prev) => ({
                                ...prev,
                                operationOpenApiId: e.target.value,
                              }))
                            }
                          />

                          <Input
                            label="Summary"
                            placeholder="Retrieve a specific user by ID"
                            value={insertData.operationSummary}
                            onChange={(e) =>
                              setInsertData((prev) => ({
                                ...prev,
                                operationSummary: e.target.value,
                              }))
                            }
                          />

                          <Textarea
                            label="Description"
                            placeholder="Detailed description of what this operation does..."
                            value={insertData.operationDescription}
                            onChange={(e) =>
                              setInsertData((prev) => ({
                                ...prev,
                                operationDescription: e.target.value,
                              }))
                            }
                            minRows={2}
                          />

                          <Input
                            label="Tags (comma-separated)"
                            placeholder="users, authentication"
                            value={insertData.operationTags}
                            onChange={(e) =>
                              setInsertData((prev) => ({ ...prev, operationTags: e.target.value }))
                            }
                          />

                          <Switch
                            isSelected={insertData.operationDeprecated}
                            onValueChange={(checked) =>
                              setInsertData((prev) => ({ ...prev, operationDeprecated: checked }))
                            }
                          >
                            Deprecated
                          </Switch>
                        </>
                      )}
                    </div>
                  ) : (
                    <Select
                      label="Existing Operation"
                      selectedKeys={[insertData.operationId]}
                      onSelectionChange={(keys) => {
                        const operationId = Array.from(keys)[0] as string;
                        setInsertData((prev) => ({ ...prev, operationId }));
                      }}
                    >
                      {operations.map((op) => (
                        <SelectItem key={op.id.toString()}>
                          {op.method} {op.path} - {op.summary || "No summary"}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleInsert}
                isDisabled={
                  (insertType === "code" && !insertData.code) ||
                  (insertType === "image" && (!insertData.imageUrl || !insertData.imageAlt)) ||
                  (insertType === "link" && (!insertData.linkText || !insertData.linkUrl)) ||
                  (insertType === "operation" &&
                    insertData.operationType === "new" &&
                    (!insertData.operationTitle || !insertData.operationEndpoint)) ||
                  (insertType === "operation" &&
                    insertData.operationType === "existing" &&
                    !insertData.operationId)
                }
              >
                Insert
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex gap-2">
            <Button
              color="primary"
              variant="light"
              size="sm"
              onPress={() => openInsertModal("code")}
              startContent={<CodeBracketIcon className="w-4 h-4" />}
            >
              Code Block
            </Button>
            <Button
              color="primary"
              variant="light"
              size="sm"
              onPress={() => openInsertModal("table")}
            >
              Table
            </Button>
            {pageId && (
              <Button
                color="secondary"
                variant="light"
                size="sm"
                onPress={() => openInsertModal("operation")}
                startContent={<CommandLineIcon className="w-4 h-4" />}
              >
                API Operation
              </Button>
            )}
            <Button color="primary" size="sm" onPress={onSave}>
              Save
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            className="w-full"
            classNames={{
              cursor: "bg-[var(--grud-primary,#667eea)]",
              tabContent: "group-data-[selected=true]:text-[var(--grud-primary,#667eea)] font-medium"
            }}
          >
            <Tab key="write" title="Write">
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  {/* Undo/Redo buttons */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="light"
                      className="min-w-[2rem] h-8"
                      onPress={handleUndo}
                      isDisabled={historyIndex === 0}
                      isIconOnly
                      title="Undo (Ctrl+Z)"
                    >
                      <ArrowUturnLeftIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      className="min-w-[2rem] h-8"
                      onPress={handleRedo}
                      isDisabled={historyIndex === history.length - 1}
                      isIconOnly
                      title="Redo (Ctrl+Y)"
                    >
                      <ArrowUturnRightIcon className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  <div className="flex gap-1">
                    {headerButtons.map((btn, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="light"
                        className="min-w-[2rem] h-8 text-xs"
                        onPress={btn.action}
                      >
                        {btn.label}
                      </Button>
                    ))}
                  </div>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  <div className="flex gap-1">
                    {toolbarButtons.map((btn, idx) => {
                      const Icon = btn.icon;
                      return (
                        <Button
                          key={idx}
                          size="sm"
                          variant="light"
                          className="min-w-[2rem] h-8"
                          onPress={btn.action}
                          isIconOnly
                        >
                          <Icon className="w-4 h-4" />
                        </Button>
                      );
                    })}
                  </div>

                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                  <Button
                    size="sm"
                    variant="light"
                    className="h-8"
                    onPress={() => formatText("quote")}
                  >
                    Quote
                  </Button>
                </div>

                {/* Editor */}
                <Textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  onPaste={handlePaste}
                  onClick={handleCursorPosition}
                  onFocus={handleCursorPosition}
                  placeholder={placeholder}
                  minRows={20}
                  className="font-mono"
                  variant="bordered"
                />

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p className="mb-1">
                    <strong>Tips:</strong>
                  </p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Use **text** for bold, *text* for italic</li>
                    <li>Use `code` for inline code, ```language for code blocks</li>
                    <li>Use # Header1, ## Header2, ### Header3 for headers</li>
                    <li>Use &gt; for quotes, - for bullet lists, 1. for numbered lists</li>
                    <li>Use [text](url) for links, ![alt](url) for images</li>
                  </ul>
                </div>
              </div>
            </Tab>

            <Tab
              key="preview"
              title={
                <div className="flex items-center gap-2">
                  <EyeIcon className="w-4 h-4" />
                  Preview
                </div>
              }
            >
              <div className="min-h-[500px] p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                {value ? (
                  <MarkdownRenderer content={value} pageId={pageId} docId={docId} />
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    Nothing to preview yet. Start writing in the Write tab.
                  </p>
                )}
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>

      {/* Insert Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            Insert {insertType.charAt(0).toUpperCase() + insertType.slice(1)}
          </ModalHeader>
          <ModalBody>
            {insertType === "code" && (
              <div className="space-y-4">
                <Select
                  label="Language"
                  selectedKeys={[insertData.language]}
                  onSelectionChange={(keys) => {
                    const language = Array.from(keys)[0] as string;
                    setInsertData((prev) => ({ ...prev, language }));
                  }}
                >
                  <SelectItem key="javascript">JavaScript</SelectItem>
                  <SelectItem key="typescript">TypeScript</SelectItem>
                  <SelectItem key="python">Python</SelectItem>
                  <SelectItem key="java">Java</SelectItem>
                  <SelectItem key="csharp">C#</SelectItem>
                  <SelectItem key="cpp">C++</SelectItem>
                  <SelectItem key="json">JSON</SelectItem>
                  <SelectItem key="xml">XML</SelectItem>
                  <SelectItem key="html">HTML</SelectItem>
                  <SelectItem key="css">CSS</SelectItem>
                  <SelectItem key="sql">SQL</SelectItem>
                  <SelectItem key="bash">Bash</SelectItem>
                  <SelectItem key="yaml">YAML</SelectItem>
                  <SelectItem key="plaintext">Plain Text</SelectItem>
                </Select>
                <Textarea
                  label="Code"
                  placeholder="Enter your code here..."
                  value={insertData.code}
                  onChange={(e) => setInsertData((prev) => ({ ...prev, code: e.target.value }))}
                  minRows={8}
                  className="font-mono"
                />
              </div>
            )}

            {insertType === "image" && (
              <div className="space-y-4">
                <Input
                  label="Image URL"
                  placeholder="https://example.com/image.jpg"
                  value={insertData.imageUrl}
                  onChange={(e) => setInsertData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
                <Input
                  label="Alt Text"
                  placeholder="Description of the image"
                  value={insertData.imageAlt}
                  onChange={(e) => setInsertData((prev) => ({ ...prev, imageAlt: e.target.value }))}
                />
              </div>
            )}

            {insertType === "link" && (
              <div className="space-y-4">
                <Input
                  label="Link Text"
                  placeholder="Click here"
                  value={insertData.linkText}
                  onChange={(e) => setInsertData((prev) => ({ ...prev, linkText: e.target.value }))}
                />
                <Input
                  label="URL"
                  placeholder="https://example.com"
                  value={insertData.linkUrl}
                  onChange={(e) => setInsertData((prev) => ({ ...prev, linkUrl: e.target.value }))}
                />
              </div>
            )}

            {insertType === "table" && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    type="number"
                    label="Rows"
                    value={insertData.tableRows.toString()}
                    onChange={(e) =>
                      setInsertData((prev) => ({
                        ...prev,
                        tableRows: parseInt(e.target.value) || 3,
                      }))
                    }
                    min={2}
                    max={10}
                  />
                  <Input
                    type="number"
                    label="Columns"
                    value={insertData.tableCols.toString()}
                    onChange={(e) =>
                      setInsertData((prev) => ({
                        ...prev,
                        tableCols: parseInt(e.target.value) || 3,
                      }))
                    }
                    min={2}
                    max={8}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This will create a {insertData.tableRows}x{insertData.tableCols} table template
                  that you can edit after insertion.
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleInsert}
              isDisabled={
                (insertType === "code" && !insertData.code) ||
                (insertType === "image" && (!insertData.imageUrl || !insertData.imageAlt)) ||
                (insertType === "link" && (!insertData.linkText || !insertData.linkUrl))
              }
            >
              Insert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default RichDocumentEditor;
