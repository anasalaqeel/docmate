import React, { useState, useMemo } from "react";
import { Modal, ModalContent, ModalBody, Input } from "@heroui/react";
import { useNavigate } from "react-router";
import type { Documentation, SidebarItem } from "../types/docs";

interface ApiEndpointItem {
  id: string;
  method: string;
  path: string;
  title: string;
  tag?: string;
}

interface DocSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: Documentation;
  sidebarTree: SidebarItem[];
  apiEndpoints?: ApiEndpointItem[];
}

export const DocSearchModal: React.FC<DocSearchModalProps> = ({
  isOpen,
  onClose,
  doc,
  sidebarTree,
  apiEndpoints = [],
}) => {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Extract flat list of pages
  const allPages = useMemo(() => {
    const pages: Array<{ id: number; title: string; breadcrumb: string }> = [];

    const traverse = (items: SidebarItem[], breadcrumbs: string[] = []) => {
      for (const item of items) {
        if (item.type === "page" && item.page) {
          pages.push({
            id: item.page.id,
            title: item.title || item.page.slug,
            breadcrumb: breadcrumbs.join(" / "),
          });
        }
        if (item.children) {
          traverse(item.children, [...breadcrumbs, item.title]);
        }
      }
    };

    if (sidebarTree) traverse(sidebarTree);
    return pages;
  }, [sidebarTree]);

  // Filter matching results
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return [
        ...allPages.slice(0, 5).map((p) => ({ type: "page" as const, ...p })),
        ...apiEndpoints.slice(0, 3).map((e) => ({ type: "api" as const, ...e })),
      ];
    }

    const matchedPages = allPages
      .filter((p) => p.title.toLowerCase().includes(term) || p.breadcrumb.toLowerCase().includes(term))
      .map((p) => ({ type: "page" as const, ...p }));

    const matchedEndpoints = apiEndpoints
      .filter(
        (e) =>
          e.path.toLowerCase().includes(term) ||
          e.title.toLowerCase().includes(term) ||
          e.method.toLowerCase().includes(term) ||
          (e.tag && e.tag.toLowerCase().includes(term))
      )
      .map((e) => ({ type: "api" as const, ...e }));

    return [...matchedPages, ...matchedEndpoints];
  }, [search, allPages, apiEndpoints]);

  const handleSelect = (item: (typeof results)[0]) => {
    if (item.type === "page") {
      navigate(`/docs/${doc.id}/page/${item.id}`);
    } else {
      navigate(`/docs/${doc.id}?endpoint=${encodeURIComponent(item.id)}`);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      placement="top"
      classNames={{
        base: "bg-[var(--docmate-surface)] text-[var(--docmate-text)] border border-[var(--docmate-border-color)] shadow-2xl mt-16 max-h-[80vh]",
        backdrop: "bg-black/50 backdrop-blur-sm",
        closeButton: "hover:bg-[var(--docmate-surface-alt)] active:bg-[var(--docmate-surface-alt)]",
      }}
    >
      <ModalContent>
        {() => (
          <ModalBody className="p-4 gap-3">
            <Input
              autoFocus
              placeholder="Search documentation..."
              value={search}
              onValueChange={(val) => {
                setSearch(val);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              variant="bordered"
              startContent={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--docmate-text-secondary)]">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
              classNames={{
                inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-primary)] focus-within:!border-[var(--docmate-primary)] bg-[var(--docmate-surface-alt)]",
                input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]",
              }}
            />

            <div className="overflow-y-auto max-h-[55vh] space-y-1">
              {results.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--docmate-text-secondary)]">
                  No matching results found for &ldquo;{search}&rdquo;
                </div>
              ) : (
                results.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full text-left flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[var(--docmate-primary)]/10 text-[var(--docmate-primary)] border border-[var(--docmate-primary)]/30"
                          : "hover:bg-[var(--docmate-surface-alt)] text-[var(--docmate-text)] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.type === "page" ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--docmate-text-secondary)]">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        ) : (
                          <span className="shrink-0 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-[var(--docmate-surface-alt)] border border-[var(--docmate-border-color)]">
                            {item.method}
                          </span>
                        )}

                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {item.type === "page" ? item.title : item.path}
                          </div>
                          {item.type === "page" && item.breadcrumb && (
                            <div className="text-xs text-[var(--docmate-text-secondary)] truncate">
                              {item.breadcrumb}
                            </div>
                          )}
                          {item.type === "api" && item.title && (
                            <div className="text-xs text-[var(--docmate-text-secondary)] truncate">
                              {item.title}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-xs text-[var(--docmate-text-secondary)] shrink-0 pl-2">
                        {item.type === "page" ? "Page" : "API"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--docmate-border-color)] text-xs text-[var(--docmate-text-secondary)]">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--docmate-surface-alt)] border border-[var(--docmate-border-color)]">↑↓</kbd> navigate</span>
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--docmate-surface-alt)] border border-[var(--docmate-border-color)]">↵</kbd> select</span>
                <span><kbd className="px-1 py-0.5 rounded bg-[var(--docmate-surface-alt)] border border-[var(--docmate-border-color)]">esc</kbd> close</span>
              </div>
              <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default DocSearchModal;
