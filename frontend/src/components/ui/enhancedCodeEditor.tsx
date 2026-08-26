import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from '@heroui/react';
import { ClipboardDocumentIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import DOMPurify from "dompurify";

interface EnhancedCodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  height?: number;
  readOnly?: boolean;
  language?: 'json' | 'javascript' | 'html' | 'xml' | 'css' | 'yaml' | 'sql' | 'plaintext';
  showLineNumbers?: boolean;
  allowCopy?: boolean;
  collapsible?: boolean;
  title?: string;
  className?: string;
}

interface HistoryEntry {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface SyntaxHighlighter {
  highlight: (code: string, language: string) => string;
}

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
      .replace(values, (_match, value) => `: <span style="color: #22c55e;">${escapeHtml(value)}</span>`);
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
        default:
          return escapedCode;
      }
    }
  };
};

export default function EnhancedCodeEditor({
  value,
  onChange,
  placeholder = "Enter your code...",
  height = 300,
  readOnly = false,
  language = "plaintext",
  showLineNumbers = true,
  allowCopy = true,
  collapsible = false,
  title,
  className = "",
}: EnhancedCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [syntaxHighlighter] = useState(() => createSyntaxHighlighter());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  // History management for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([{ value, selectionStart: 0, selectionEnd: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isUndoRedoing, setIsUndoRedoing] = useState(false);

  const addToHistory = useCallback((newValue: string, selStart: number, selEnd: number) => {
    if (isUndoRedoing) return;
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ value: newValue, selectionStart: selStart, selectionEnd: selEnd });
      return newHistory.slice(-50); // Limit history to 50 entries
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex, isUndoRedoing]);

  const undo = useCallback(() => {
    if (historyIndex > 0 && onChange) {
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
    if (historyIndex < history.length - 1 && onChange) {
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
    if (!onChange) return;

    try {
      let beautified = value;

      switch (language) {
        case 'json':
          try {
            let jsonObject;
            try {
              jsonObject = JSON.parse(value);
            } catch {
              // If parsing fails, attempt to fix common issues
              const fixedJson = value
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":'); // Add quotes around unquoted keys

              jsonObject = JSON.parse(fixedJson);
            }
            beautified = JSON.stringify(jsonObject, null, 2);
          } catch {
            // Fallback formatting
            beautified = value
              .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
              .replace(/,(\s*[}\]])/g, '$1');
          }
          break;

        case 'javascript':
          // Basic JavaScript beautification
          beautified = value
            .replace(/([^=!<>])=([^=])/g, '$1 = $2')
            .replace(/([^=!<>])==([^=])/g, '$1 == $2')
            .replace(/([^=!<>])===([^=])/g, '$1 === $2')
            .replace(/function\s*\(/g, 'function (')
            .replace(/}\s*else\s*{/g, '} else {')
            .replace(/if\s*\(/g, 'if (')
            .replace(/for\s*\(/g, 'for (')
            .replace(/while\s*\(/g, 'while (');
          break;

        case 'css':
          // CSS beautification
          beautified = value
            .replace(/\s*{\s*/g, ' {\n  ')
            .replace(/;\s*(?=\S)/g, ';\n  ')
            .replace(/;\s*}/g, ';\n}')
            .replace(/}\s*(?=\S)/g, '}\n\n')
            .replace(/:\s*/g, ': ')
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
          break;

        default:
          // Basic text formatting
          beautified = value
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
      }

      onChange(beautified);
      addToHistory(beautified, 0, 0);
    } catch (error) {
      console.error('Beautification error:', error);
    }
  }, [language, value, onChange, addToHistory]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!onChange) return;
    const newValue = e.target.value;
    onChange(newValue);
    
    const { selectionStart, selectionEnd } = e.target;
    addToHistory(newValue, selectionStart, selectionEnd);
  }, [onChange, addToHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;

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
        case 'b':
          if (e.altKey) {
            e.preventDefault();
            beautifyCode();
            return;
          }
          break;
      }
    }

    // Handle Backspace for auto-closed pairs
    if (e.key === 'Backspace') {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;
      
      if (selectionStart === selectionEnd && selectionStart > 0) {
        const before = value.substring(0, selectionStart);
        const after = value.substring(selectionEnd);
        const charBefore = before.charAt(before.length - 1);
        const charAfter = after.charAt(0);
        
        // Check if we're deleting an auto-closed pair
        const pairs: { [key: string]: string } = {
          '(': ')',
          '[': ']',
          '{': '}',
          '"': '"',
          "'": "'"
        };
        
        if (pairs[charBefore] === charAfter) {
          e.preventDefault();
          const newValue = before.slice(0, -1) + after.slice(1);
          if (onChange) {
            onChange(newValue);
            addToHistory(newValue, selectionStart - 1, selectionStart - 1);
            
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
            }, 0);
          }
          return;
        }
      }
    }

    // Handle closing brackets - move cursor instead of inserting if next char matches
    if ([')', ']', '}', '"', "'"].includes(e.key)) {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;
      
      if (selectionStart === selectionEnd) {
        const after = value.substring(selectionEnd);
        if (after.charAt(0) === e.key) {
          e.preventDefault();
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          }, 0);
          return;
        }
      }
    }

    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;
      const indent = '  ';
      
      if (!onChange) return;
      
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

    // Auto-closing brackets and quotes
    const autoClosePairs: { [key: string]: string } = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'"
    };

    if (autoClosePairs[e.key] && onChange) {
      const closingChar = autoClosePairs[e.key];
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;
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
      
      // For quotes, handle special cases
      if (e.key === '"' || e.key === "'") {
        // Check if we're inside a string
        const beforeQuoteCount = (before.match(new RegExp(e.key === '"' ? '"' : "'", 'g')) || []).length;
        if (beforeQuoteCount % 2 === 1) {
          // We're closing a string, don't auto-close
          return;
        }
      }
      
      // Normal auto-closing
      e.preventDefault();
      const newValue = before + e.key + closingChar + after;
      onChange(newValue);
      addToHistory(newValue, selectionStart + 1, selectionStart + 1);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }
  }, [value, onChange, readOnly, undo, redo, addToHistory, beautifyCode]);

  const syncScroll = useCallback(() => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      
      // Sync syntax highlighting
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
      }
      
      // Sync line numbers
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!navigator.clipboard) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [value]);

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

  if (collapsible && isCollapsed) {
    return (
      <div className={`border border-[var(--docmate-border-color)] dark:border-gray-600 rounded-lg ${className}`}>
        <div className="flex items-center justify-between p-3 bg-[var(--docmate-surface-alt)] dark:bg-[var(--docmate-code-bg)] border-b border-[var(--docmate-border-color)] dark:border-gray-600">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            {title && <span className="text-sm font-medium">{title}</span>}
            <span className="text-xs text-[var(--docmate-text-secondary)]">({language})</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative border border-[var(--docmate-border-color)] dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      {(title || collapsible || allowCopy) && (
        <div className="flex items-center justify-between p-2 bg-[var(--docmate-surface-alt)] dark:bg-[var(--docmate-code-bg)] border-b border-[var(--docmate-border-color)] dark:border-gray-600">
          <div className="flex items-center gap-2">
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <ChevronDownIcon className="w-4 h-4" />
              </button>
            )}
            {title && <span className="text-sm font-medium">{title}</span>}
            <span className="text-xs text-[var(--docmate-text-secondary)]">({language})</span>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && language !== 'plaintext' && (
              <Button
                size="sm"
                variant="light"
                onClick={beautifyCode}
                className="text-xs"
              >
                Beautify
              </Button>
            )}
            {allowCopy && (
              <Button
                size="sm"
                variant="light"
                onClick={copyToClipboard}
                startContent={<ClipboardDocumentIcon className="w-3 h-3" />}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="relative" style={{ height: height + 'px' }}>
        <div className="flex h-full">
          {/* Line numbers */}
          {showLineNumbers && (
            <div className="bg-[var(--docmate-surface-alt)] dark:bg-[var(--docmate-code-bg)] border-r border-[var(--docmate-border-color)] dark:border-gray-600 text-right text-[var(--docmate-text-secondary)] dark:text-[var(--docmate-text-secondary)] select-none min-w-[3rem] flex-shrink-0">
              <div
                ref={lineNumbersRef}
                className="px-2 h-full overflow-hidden"
                style={{
                  paddingTop: '12px',
                  paddingBottom: '12px',
                }}
              >
                <pre
                  className="whitespace-pre"
                  style={{
                    fontSize: '12px',
                    lineHeight: '20px',
                    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  }}
                >
                  {getLineNumbers(value || ' ')}
                </pre>
              </div>
            </div>
          )}
          
          {/* Editor area */}
          <div className="flex-1 relative bg-[var(--docmate-surface-alt)] dark:bg-[var(--docmate-code-bg)] border-r">
            {/* Syntax highlighting layer */}
            {language !== 'plaintext' && (
              <div
                ref={highlightRef}
                className="absolute inset-0 pointer-events-none"
                style={{
                  padding: '12px',
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  fontVariantLigatures: 'none',
                  fontFeatureSettings: '"liga" 0, "calt" 0',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  zIndex: 1,
                  overflow: 'hidden',
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
              className={`absolute inset-0 w-full h-full border-none outline-none resize-none ${
                language !== 'plaintext' ? 'bg-transparent text-transparent caret-gray-900 dark:caret-gray-100' : 'bg-white dark:bg-[var(--docmate-code-bg)] text-[var(--docmate-text)] dark:text-[var(--docmate-text)]'
              } ${readOnly ? 'cursor-default' : 'cursor-text'}`}
              style={{
                padding: '12px',
                fontSize: '14px',
                lineHeight: '20px',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                fontVariantLigatures: 'none',
                fontFeatureSettings: '"liga" 0, "calt" 0',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                zIndex: 2,
                // Keep text transparent even when selected
                ...(language !== 'plaintext' && {
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                })
              }}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            
            {/* Placeholder when empty and not readonly */}
            {!value && placeholder && !readOnly && (
              <div
                className="absolute inset-0 pointer-events-none text-[var(--docmate-text-secondary)] dark:text-[var(--docmate-text-secondary)]"
                style={{
                  padding: '12px',
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                }}
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