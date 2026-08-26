import {
  Input,
  Button,
} from "@heroui/react";
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { RoleListOptions } from "../../../types/users";

interface RolesFiltersProps {
  filters: RoleListOptions;
  onFiltersChange: (filters: RoleListOptions) => void;
  activeFiltersCount: number;
  onResetFilters: () => void;
}

export const RolesFilters = ({
  filters,
  onFiltersChange,
  activeFiltersCount,
  onResetFilters,
}: RolesFiltersProps) => {
  const handleSearch = (search: string) => {
    onFiltersChange({ ...filters, search, page: 1 });
  };

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="space-y-4 mb-6">
      <Input
        placeholder="Search roles..."
        value={filters.search || ""}
        onChange={(e) => handleSearch(e.target.value)}
        startContent={<MagnifyingGlassIcon className="w-4 h-4 opacity-40" />}
        isClearable
        onClear={() => handleSearch("")}
        size="md"
        classNames={{
          inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
          input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50"
        }}
      />

      {hasActiveFilters && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div 
            className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
            style={{ background: 'rgba(var(--docmate-primary-rgb), 0.05)', color: 'var(--docmate-primary)', border: '1px solid rgba(var(--docmate-primary-rgb), 0.1)' }}
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span className="font-medium">{activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active</span>
          </div>
          <Button
            size="sm"
            variant="light"
            style={{ color: 'var(--docmate-error)' }}
            onPress={onResetFilters}
            startContent={<TrashIcon className="w-4 h-4" />}
            className="shrink-0"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};