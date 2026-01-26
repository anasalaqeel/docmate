"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import DOMPurify from "dompurify";

interface CustomCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  readOnly?: boolean;
  contentType?: string;
}

interface HistoryEntry {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface SyntaxHighlighter {
  highlight: (code: string, language: string) => string;
}

const getLanguageFromContentType = (contentType: string): string => {
  if (contentType.includes("json")) return "json";
  if (contentType.includes("xml")) return "xml";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("javascript")) return "javascript";
  if (contentType.includes("css")) return "css";
  if (contentType.includes("yaml") || contentType.includes("yml")) return "yaml";
  if (contentType.includes("sql")) return "sql";
  return "plaintext";
};

const createSyntaxHighlighter = (): SyntaxHighlighter => {
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const highlightJson = (code: string): string => {
    return code.replace(
      /"([^"\\]*(\\.[^"\\]*)*)"|(\b(true|false|null)\b)|(\b-?\d+(\.\d+)?([eE][+-]?\d+)?\b)|([{}[\]:,])/g,
      (match, string, _, keyword, __, number, ___, ____, punctuation) => {
        if (string !== undefined) return `<span style="color: #22c55e;">"${escapeHtml(string)}"</span>`;
        if (keyword) return `<span style="color: #3b82f6;">${keyword}</span>`;
        if (number !== undefined) return `<span style="color: #f59e0b;">${number}</span>`;
        if (punctuation) return `<span style="color: #6b7280;">${punctuation}</span>`;
        return match;
      }
    );
  };

  const highlightJavaScript = (code: string): string => {
    const keywords = /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|try|catch|throw|new|this|super|extends|implements|interface|type|enum|namespace|public|private|protected|static|readonly|abstract)\b/g;
    const strings = /"([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)'/g;
    const numbers = /\b\d+(\.\d+)?\b/g;
    const comments = /\/\/.*$|\/\*[\s\S]*?\*\//gm;

    return code
      .replace(comments, match => `<span style="color: #6b7280; font-style: italic;">${escapeHtml(match)}</span>`)
      .replace(strings, match => `<span style="color: #22c55e;">${escapeHtml(match)}</span>`)
      .replace(keywords, match => `<span style="color: #3b82f6; font-weight: 600;">${match}</span>`)
      .replace(numbers, match => `<span style="color: #f59e0b;">${match}</span>`);
  };

  const highlightXml = (code: string): string => {
    return code.replace(
      /(&lt;\/?)([^&\s&gt;]+)((?:\s+[^&gt;]*)?)(&gt;?)/g,
      (_match, open, tagName, attributes, close) => {
        const highlightedTag = `<span style="color: #3b82f6; font-weight: 600;">${tagName}</span>`;
        const highlightedAttrs = attributes.replace(
          /(\w+)(=)("([^"]*)"|'([^']*)')/g,
          '<span style="color: #f59e0b;">$1</span><span style="color: #6b7280;">$2</span><span style="color: #22c55e;">$3</span>'
        );
        return `<span style="color: #6b7280;">${open}</span>${highlightedTag}${highlightedAttrs}<span style="color: #6b7280;">${close}</span>`;
      }
    );
  };

  const highlightCss = (code: string): string => {
    const selectors = /([.#]?[\w-]+)(?=\s*{)/g;
    const properties = /([\w-]+)(?=\s*:)/g;
    const values = /:\s*([^;{}]+)/g;
    const comments = /\/\*[\s\S]*?\*\//g;

    return code
      .replace(comments, match => `<span style="color: #6b7280; font-style: italic;">${escapeHtml(match)}</span>`)
      .replace(selectors, match => `<span style="color: #3b82f6; font-weight: 600;">${match}</span>`)
      .replace(properties, match => `<span style="color: #f59e0b;">${match}</span>`)
      .replace(values, (_, value) => `: <span style="color: #22c55e;">${escapeHtml(value)}</span>`);
  };

  const highlightYaml = (code: string): string => {
    return code
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        // Comments
        if (trimmed.startsWith('#')) {
          return `<span style="color: #6b7280; font-style: italic;">${escapeHtml(line)}</span>`;
        }
        // Key-value pairs
        if (trimmed.includes(':')) {
          return line.replace(
            /^(\s*)([a-zA-Z0-9_-]+)(\s*:\s*)(.*)$/,
            (_match, indent, key, colon, value) => {
              const escapedIndent = escapeHtml(indent);
              const highlightedKey = `<span style="color: #3b82f6; font-weight: 600;">${escapeHtml(key)}</span>`;
              const highlightedColon = `<span style="color: #6b7280;">${escapeHtml(colon)}</span>`;
              const highlightedValue = value.trim() ? `<span style="color: #22c55e;">${escapeHtml(value)}</span>` : '';
              return escapedIndent + highlightedKey + highlightedColon + highlightedValue;
            }
          );
        }
        // List items
        if (trimmed.startsWith('-')) {
          return line.replace(
            /^(\s*)(-)(\s*)(.*)$/,
            (_match, indent, dash, space, value) => {
              const escapedIndent = escapeHtml(indent);
              const highlightedDash = `<span style="color: #f59e0b;">${dash}</span>`;
              const highlightedValue = `<span style="color: #22c55e;">${escapeHtml(space + value)}</span>`;
              return escapedIndent + highlightedDash + highlightedValue;
            }
          );
        }
        return escapeHtml(line);
      })
      .join('\n');
  };

  return {
    highlight: (code: string, language: string): string => {
      const escapedCode = escapeHtml(code);

      switch (language) {
        case 'json':
          return highlightJson(escapedCode);
        case 'javascript':
          return highlightJavaScript(escapedCode);
        case 'xml':
        case 'html':
          return highlightXml(escapedCode);
        case 'css':
          return highlightCss(escapedCode);
        case 'yaml':
          return highlightYaml(code); // Pass original code for YAML
        default:
          return escapedCode;
      }
    }
  };
};

export default function CustomCodeEditor({
  value,
  onChange,
  placeholder = "Enter your code...",
  height = 160,
  readOnly = false,
  contentType = "text/plain",
}: CustomCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [syntaxHighlighter] = useState(() => createSyntaxHighlighter());

  // Content storage for different content types
  const [contentStorage, setContentStorage] = useState<{ [key: string]: string }>({});
  const [currentContentType, setCurrentContentType] = useState(contentType);

  // History management for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([{ value, selectionStart: 0, selectionEnd: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isUndoRedoing, setIsUndoRedoing] = useState(false);

  // Find/Replace state

  const language = getLanguageFromContentType(contentType);

  // Handle content type changes
  useEffect(() => {
    if (currentContentType !== contentType) {
      // Save current content for the previous content type
      setContentStorage(prev => ({
        ...prev,
        [currentContentType]: value
      }));

      // Load content for the new content type
      const storedContent = contentStorage[contentType];
      if (storedContent !== undefined) {
        onChange(storedContent);
      } else {
        // If no content stored for this type, don't clear - keep current value
        // onChange("");
      }

      setCurrentContentType(contentType);

      // Reset history for new content type
      const newContent = contentStorage[contentType] !== undefined ? contentStorage[contentType] : value;
      setHistory([{ value: newContent, selectionStart: 0, selectionEnd: 0 }]);
      setHistoryIndex(0);
    }
  }, [contentType, currentContentType, value, onChange, contentStorage]);

  // Store content when it changes
  useEffect(() => {
    setContentStorage(prev => ({
      ...prev,
      [contentType]: value
    }));
  }, [value, contentType]);

  const addToHistory = useCallback((newValue: string, selStart: number, selEnd: number) => {
    if (isUndoRedoing) return;

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ value: newValue, selectionStart: selStart, selectionEnd: selEnd });
      // Limit history to 50 entries
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex, isUndoRedoing]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setIsUndoRedoing(true);
      const prevEntry = history[historyIndex - 1];
      onChange(prevEntry.value);
      setHistoryIndex(prev => prev - 1);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = prevEntry.selectionStart;
          textareaRef.current.selectionEnd = prevEntry.selectionEnd;
        }
        setIsUndoRedoing(false);
      }, 0);
    }
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedoing(true);
      const nextEntry = history[historyIndex + 1];
      onChange(nextEntry.value);
      setHistoryIndex(prev => prev + 1);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = nextEntry.selectionStart;
          textareaRef.current.selectionEnd = nextEntry.selectionEnd;
        }
        setIsUndoRedoing(false);
      }, 0);
    }
  }, [history, historyIndex, onChange]);

  const getLineNumbers = useCallback((text: string): string => {
    const lines = text.split('\n');
    return lines.map((_, index) => index + 1).join('\n');
  }, []);

  const beautifyCode = useCallback(() => {
    try {
      let beautified = value;

      switch (language) {
        case 'json':
          // JSON beautification
          try {
            let jsonObject;
            try {
              jsonObject = JSON.parse(value);
            } catch {
              // If parsing fails, attempt to fix common issues
              const fixedJson = value
                // Remove trailing commas
                .replace(/,(\s*[}\]])/g, '$1')
                // Add quotes around unquoted keys
                .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
                // Add quotes around unquoted string values (comprehensive pattern)
                .replace(/:(\s*)([^"\s{[\]},][^,}\]]*)\s*([,}\]])/g, (match, space, value, ending) => {
                  const trimmedValue = value.trim();
                  // Skip if it's already quoted, a number, boolean, null, or object/array
                  if (trimmedValue.startsWith('"') ||
                      trimmedValue.startsWith("'") ||
                      /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmedValue) ||
                      ['true', 'false', 'null'].includes(trimmedValue) ||
                      trimmedValue.startsWith('{') ||
                      trimmedValue.startsWith('[')) {
                    return match;
                  }
                  return `:${space}"${trimmedValue}"${ending}`;
                });

              jsonObject = JSON.parse(fixedJson);
            }
            beautified = JSON.stringify(jsonObject, null, 2);
          } catch {
            // Fallback formatting
            beautified = value
              // Add quotes around unquoted keys
              .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
              // Add quotes around unquoted string values
              .replace(/:(\s*)([^"\s{[\]},][^,}\]]*)\s*([,}\]])/g, (match, space, value, ending) => {
                const trimmedValue = value.trim();
                if (trimmedValue.startsWith('"') ||
                    trimmedValue.startsWith("'") ||
                    /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmedValue) ||
                    ['true', 'false', 'null'].includes(trimmedValue) ||
                    trimmedValue.startsWith('{') ||
                    trimmedValue.startsWith('[')) {
                  return match;
                }
                return `:${space}"${trimmedValue}"${ending}`;
              })
              // Remove trailing commas
              .replace(/,(\s*[}\]])/g, '$1');
          }
          break;

        case 'yaml':
          // YAML beautification
          beautified = value
            .split('\n')
            .map(line => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) return line;

              // Fix key-value spacing
              if (trimmed.includes(':')) {
                const leadingSpaces = line.match(/^\s*/)?.[0] || '';
                return leadingSpaces + trimmed.replace(/\s*:\s*/g, ': ');
              }

              return line;
            })
            .join('\n')
            // Fix list item spacing
            .replace(/^(\s*)-\s+/gm, '$1- ')
            // Remove extra blank lines
            .replace(/\n\s*\n\s*\n/g, '\n\n');
          break;

        case 'plaintext':
          if (contentType.includes('form-urlencoded')) {
            // URL-encoded form data beautification
            beautified = value
              .split('&')
              .map(pair => {
                const [key, val] = pair.split('=');
                return `${decodeURIComponent(key || '')} = ${decodeURIComponent(val || '')}`;
              })
              .join('\n');
          } else {
            // Basic text formatting
            beautified = value
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .join('\n');
          }
          break;

        default:
          // Default formatting - just clean up whitespace
          beautified = value
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            .replace(/\n\s*\n\s*\n/g, '\n\n');
      }

      onChange(beautified);
      addToHistory(beautified, 0, 0);
    } catch {
      // If beautification fails, just clean up basic whitespace
      const cleaned = value
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n\s*\n\s*\n/g, '\n\n');

      onChange(cleaned);
      addToHistory(cleaned, 0, 0);
    }
  }, [language, value, onChange, addToHistory, contentType]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const { selectionStart, selectionEnd } = e.target;
    addToHistory(newValue, selectionStart, selectionEnd);
  }, [onChange, addToHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;

    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd } = textarea;

    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        case 'y':
          e.preventDefault();
          redo();
          return;
          //         case 'f':
          //           e.preventDefault();
          //           setShowFindReplace(true);
          //           return;
          //         case 'h':
          //           e.preventDefault();
          //           setShowFindReplace(true);
          //           return;
          //         case 'g':
          //           e.preventDefault();
          //           setShowGoToLine(true);
          //           return;
        case 'b':
          if (e.altKey) {
            e.preventDefault();
            beautifyCode();
            return;
          }
          break;
      }
    }

    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = '  ';

      if (selectionStart !== selectionEnd) {
        // Handle multiple lines
        const beforeSelection = value.substring(0, selectionStart);
        const selection = value.substring(selectionStart, selectionEnd);
        const afterSelection = value.substring(selectionEnd);

        const lines = selection.split('\n');
        const indentedLines = e.shiftKey
          ? lines.map(line => line.startsWith(indent) ? line.substring(indent.length) : line)
          : lines.map(line => indent + line);

        const newSelection = indentedLines.join('\n');
        const newValue = beforeSelection + newSelection + afterSelection;
        onChange(newValue);
        addToHistory(newValue, selectionStart, selectionStart + newSelection.length);

        setTimeout(() => {
          textarea.selectionStart = selectionStart;
          textarea.selectionEnd = selectionStart + newSelection.length;
        }, 0);
      } else {
        // Single line indent
        if (e.shiftKey) {
          // Unindent
          const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          const lineContent = value.substring(lineStart, selectionStart);
          if (lineContent.endsWith(indent)) {
            const newValue = value.substring(0, lineStart + lineContent.length - indent.length) + value.substring(selectionStart);
            onChange(newValue);
            addToHistory(newValue, selectionStart - indent.length, selectionStart - indent.length);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = selectionStart - indent.length;
            }, 0);
          }
        } else {
          // Indent
          const newValue = value.substring(0, selectionStart) + indent + value.substring(selectionEnd);
          onChange(newValue);
          addToHistory(newValue, selectionStart + indent.length, selectionStart + indent.length);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + indent.length;
          }, 0);
        }
      }
      return;
    }

    // Handle Enter key with auto-indentation
    if (e.key === 'Enter') {
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const lines = before.split('\n');
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.match(/^\s*/)?.[0] || '';

      // Check if cursor is between matching brackets/braces
      const charBefore = before.charAt(before.length - 1);
      const charAfter = after.charAt(0);
      const isMatchingPair = (
        (charBefore === '{' && charAfter === '}') ||
        (charBefore === '[' && charAfter === ']') ||
        (charBefore === '(' && charAfter === ')')
      );

      if (isMatchingPair) {
        // Insert new line with extra indentation for cursor, and closing bracket on next line
        const extraIndent = '  ';
        const newValue = before + '\n' + indent + extraIndent + '\n' + indent + after;
        onChange(newValue);
        addToHistory(newValue, selectionStart + 1 + indent.length + extraIndent.length, selectionStart + 1 + indent.length + extraIndent.length);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + indent.length + extraIndent.length;
        }, 0);
      } else {
        // Normal auto-indentation
        let extraIndent = '';
        if (currentLine.trim().endsWith('{') || currentLine.trim().endsWith('[')) {
          extraIndent = '  ';
        }

        const newValue = before + '\n' + indent + extraIndent + after;
        onChange(newValue);
        addToHistory(newValue, selectionStart + 1 + indent.length + extraIndent.length, selectionStart + 1 + indent.length + extraIndent.length);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + indent.length + extraIndent.length;
        }, 0);
      }

      e.preventDefault();
      return;
    }

    // Auto-closing brackets and quotes with selection wrapping
    const autoClosePairs: { [key: string]: string } = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'"
    };

    if (autoClosePairs[e.key]) {
      const closingChar = autoClosePairs[e.key];
      const before = value.substring(0, selectionStart);
      const selected = value.substring(selectionStart, selectionEnd);
      const after = value.substring(selectionEnd);

      // If text is selected, wrap it with the pair
      if (selectionStart !== selectionEnd) {
        e.preventDefault();
        const newValue = before + e.key + selected + closingChar + after;
        onChange(newValue);
        addToHistory(newValue, selectionStart + 1, selectionEnd + 1);

        setTimeout(() => {
          textarea.selectionStart = selectionStart + 1;
          textarea.selectionEnd = selectionEnd + 1;
        }, 0);
        return;
      }

      // Special handling for quotes to prevent double insertion
      if (e.key === '"' || e.key === "'") {
        // Case 1: Next character is the same quote - just move cursor
        if (after.charAt(0) === e.key) {
          e.preventDefault();
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          return;
        }
      }

      // If we get here, do normal auto-closing
      const newValue = before + e.key + closingChar + after;
      onChange(newValue);
      addToHistory(newValue, selectionStart + 1, selectionStart + 1);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);

      e.preventDefault();
    }
  }, [value, onChange, readOnly, undo, redo, addToHistory, beautifyCode]);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    if (highlightRef.current && language !== 'plaintext') {
      const highlightedCode = syntaxHighlighter.highlight(value, language);
      // Sanitize HTML to prevent XSS attacks
      const sanitizedHTML = DOMPurify.sanitize(highlightedCode, {
        ALLOWED_TAGS: ['span'],
        ALLOWED_ATTR: ['style'],
        ALLOW_DATA_ATTR: false
      });
      highlightRef.current.innerHTML = sanitizedHTML;
    }
  }, [value, language, syntaxHighlighter]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', syncScroll);
      return () => textarea.removeEventListener('scroll', syncScroll);
    }
  }, [syncScroll]);

  return (
    <div className="relative">
      <div className="border rounded overflow-hidden relative" style={{ height: height + 'px', borderColor: 'var(--grud-border-color)', background: 'var(--grud-surface)' }}>
        {/* Beautify Button */}
        {!readOnly && language !== 'plaintext' && (
          <div className="absolute top-2 right-2 z-30">
            <button
              onClick={beautifyCode}
              className="px-3 py-1 text-xs text-white rounded hover:opacity-90 shadow-md"
              style={{ background: 'var(--grud-primary)' }}
              title={`Beautify ${language.toUpperCase()} (Ctrl+Alt+B)`}
            >
              Beautify
            </button>
          </div>
        )}

        {/* Beautify Button for Form Data */}
        {!readOnly && language === 'plaintext' && contentType.includes('form-urlencoded') && (
          <div className="absolute top-2 right-2 z-30">
            <button
              onClick={beautifyCode}
              className="px-3 py-1 text-xs text-white rounded hover:opacity-90 shadow-md"
              style={{ background: 'var(--grud-primary)' }}
              title="Beautify Form Data (Ctrl+Alt+B)"
            >
              Beautify
            </button>
          </div>
        )}

        <div className="flex h-full">
          {/* Line numbers */}
          <div 
            className="border-r px-2 py-3 text-right text-xs font-mono leading-5 select-none"
            style={{ background: 'var(--grud-surface-alt)', borderColor: 'var(--grud-border-color)', color: 'var(--grud-text-secondary)' }}
          >
            <pre className="whitespace-pre">{getLineNumbers(value || ' ')}</pre>
          </div>

          {/* Editor area */}
          <div className="flex-1 relative overflow-hidden" ref={containerRef}>
            {/* Syntax highlighting layer */}
            {language !== 'plaintext' && (
              <div
                ref={highlightRef}
                className="absolute inset-0 p-3 font-mono text-sm leading-5 pointer-events-none overflow-hidden whitespace-pre"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  zIndex: 1,
                }}
              />
            )}

            {/* Textarea for input */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              placeholder={placeholder}
              className={`absolute inset-0 w-full h-full p-3 font-mono text-sm leading-5 border-none outline-none resize-none ${
                language !== 'plaintext' ? 'bg-transparent text-transparent caret-[var(--grud-text)]' : 'bg-[var(--grud-surface)] text-[var(--grud-text)]'
              } ${readOnly ? 'cursor-default' : 'cursor-text'}`}
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                zIndex: 2,
                caretColor: 'var(--grud-text)',
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />

            {/* Placeholder when empty and not readonly */}
            {!value && placeholder && !readOnly && (
              <div 
                className="absolute inset-0 p-3 pointer-events-none text-sm font-mono leading-5"
                style={{ color: 'rgba(var(--grud-text-secondary-rgb, 100, 116, 139), 0.4)' }}
              >
                {placeholder}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
