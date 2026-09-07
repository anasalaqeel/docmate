import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { ChevronDownIcon, CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { css } from "@emotion/css";
import type { DocVersionSummary } from "../../types/docs";

interface VersionSelectorProps {
  /** Available versions (newest first, backups already excluded) */
  versions: DocVersionSummary[];
  /**
   * What the reader is currently viewing: a version label, "next" for the
   * live draft, or null for the plain URL (stable default / live).
   */
  current: string | null;
  /** Fired with a version label, "next", or null for the plain doc URL */
  onSelect: (target: string | null) => void;
}

interface MenuEntry {
  key: string;
  label: string;
  description?: string;
  isDefault?: boolean;
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({ versions, current, onSelect }) => {
  const defaultVersion = versions.find((v) => v.isDefault) ?? null;
  const hasDefault = defaultVersion !== null;

  // With no stable default the plain URL already serves live content, so a
  // separate "Next" entry would be a duplicate of where the reader already is.
  const showNext = hasDefault && current !== null;

  const currentLabel =
    current === "next"
      ? "Next (latest)"
      : current ?? (hasDefault ? defaultVersion.version : "Next");

  const selectedKey =
    current === "next"
      ? "next"
      : current !== null
        ? current
        : hasDefault
          ? defaultVersion.version
          : "next";

  // Newest first overall: the unreleased draft leads, then released versions
  const items: MenuEntry[] = [
    ...(showNext
      ? [{ key: "next", label: "Next (latest)", description: "Editable draft — latest content" }]
      : []),
    ...versions.map((v) => ({
      key: v.version,
      label: `v${v.version}${v.isDefault ? " (stable)" : ""}`,
      description: v.isDefault ? "Served by default" : undefined,
      isDefault: v.isDefault,
    })),
  ];

  return (
    <Dropdown placement="bottom-start">
      <DropdownTrigger>
        <Button
          variant="flat"
          size="sm"
          radius="full"
          startContent={<DocumentDuplicateIcon className={styles.icon} />}
          endContent={<ChevronDownIcon className={styles.chevron} />}
          className={styles.trigger}
          aria-label="Select documentation version"
        >
          <span className={styles.label}>v{currentLabel}</span>
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Documentation versions"
        items={items}
        onAction={(key) => {
          const target = String(key);
          onSelect(target === "next" ? "next" : target);
        }}
        itemClasses={{
          base: "gap-3 px-3 py-2 rounded-lg transition-colors data-[hover=true]:bg-[var(--docmate-surface-alt)] data-[selectable=true]:focus:bg-[var(--docmate-surface-alt)]",
          title: "text-sm font-medium",
          description: "text-xs text-[var(--docmate-text-secondary)]",
        }}
      >
        {(item: MenuEntry) => (
          <DropdownItem
            key={item.key}
            description={item.description}
            endContent={
              item.key === selectedKey ? <CheckIcon className="w-4 h-4 text-primary" /> : undefined
            }
            className={
              item.key === selectedKey ? "bg-[var(--docmate-surface-alt)]" : undefined
            }
            classNames={{
              title: item.key === selectedKey ? "text-primary font-semibold" : undefined,
            }}
          >
            {item.label}
          </DropdownItem>
        )}
      </DropdownMenu>
    </Dropdown>
  );
};

const styles = {
  trigger: css`
    min-width: fit-content;
    max-width: 100%;
    background-color: var(--docmate-surface-alt, transparent);
    border: 1px solid var(--docmate-border-color, transparent);
    transition: all 0.2s ease-in-out;

    &:hover {
      transform: scale(1.03);
    }
    &:active {
      transform: scale(0.98);
    }
  `,
  label: css`
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
  `,
  icon: css`
    width: 0.9375rem;
    height: 0.9375rem;
  `,
  chevron: css`
    width: 0.75rem;
    height: 0.75rem;
    opacity: 0.6;
  `,
};

export default VersionSelector;
