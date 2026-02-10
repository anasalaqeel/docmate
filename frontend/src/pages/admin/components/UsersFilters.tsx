import { useEffect } from "react";
import { useDebouncedSearch } from "../../../hooks/useDebouncedSearch";
import {
  Input,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";
import type { Key } from "react";
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  TrashIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import type { Role, UserListOptions } from "../../../types/users";

interface UsersFiltersProps {
  filters: UserListOptions;
  roles: Role[];
  onFiltersChange: (filters: UserListOptions) => void;
}

const statusOptions = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

export const UsersFilters = ({ filters, roles, onFiltersChange }: UsersFiltersProps) => {
  // Local state for search query (with debounce)
  const [searchQuery, setSearchQuery] = useDebouncedSearch(filters.search || "", 350);

  // Update filters when debounced search changes
  useEffect(() => {
    onFiltersChange({ ...filters, search: searchQuery, page: 1 });
  }, [searchQuery]);

  // Calculate active filters count internally
  const activeFiltersCount = [searchQuery, filters.roleIds?.length, filters.status].filter(
    Boolean,
  ).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
  };

  const handleRoleFilter = (keys: "all" | Set<Key>) => {
    const roleIds = Array.from(keys === "all" ? [] : keys)
      .map((id) => parseInt(id.toString()))
      .filter((id) => !isNaN(id));
    onFiltersChange({ ...filters, roleIds, page: 1 });
  };

  const handleStatusFilter = (keys: "all" | Set<Key>) => {
    if (keys === "all") {
      onFiltersChange({ ...filters, status: undefined, page: 1 });
    } else {
      const statusArray = Array.from(keys);
      const status = statusArray[0] as "active" | "inactive" | undefined;
      onFiltersChange({ ...filters, status, page: 1 });
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    onFiltersChange({
      page: 1,
      limit: filters.limit || 10,
      search: "",
      sortBy: filters.sortBy || "createdAt",
      sortOrder: filters.sortOrder || "desc",
      roleIds: [],
      status: undefined,
    });
  };

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="mb-6">
      {/* Search Bar - Full Width */}
      <Input
        placeholder="Search users by name, username, email, or phone..."
        onChange={handleSearchChange}
        startContent={<MagnifyingGlassIcon className="w-4 h-4 opacity-40" />}
        isClearable
        onClear={handleSearchClear}
        size="lg"
        className="mb-4"
        classNames={{
          inputWrapper:
            "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
          input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50",
        }}
      />

      {/* Filters Section - Improved Design */}
      <div className="flex flex-wrap gap-3">
        {/* Status Filter */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ background: "var(--grud-surface-alt)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--grud-text-secondary)" }}>
            Status:
          </span>
          <Dropdown>
            <DropdownTrigger>
              <Button
                size="sm"
                style={{
                  background:
                    filters.status === "active"
                      ? "rgba(var(--grud-success-rgb), 0.1)"
                      : filters.status === "inactive"
                        ? "rgba(var(--grud-error-rgb), 0.1)"
                        : "var(--grud-surface)",
                  color:
                    filters.status === "active"
                      ? "var(--grud-success)"
                      : filters.status === "inactive"
                        ? "var(--grud-error)"
                        : "var(--grud-text-secondary)",
                  borderColor: filters.status ? "transparent" : "var(--grud-border-color)",
                }}
                endContent={<FunnelIcon className="w-3 h-3 opacity-40" />}
              >
                {filters.status
                  ? filters.status.charAt(0).toUpperCase() + filters.status.slice(1)
                  : "All"}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Status filter"
              selectedKeys={filters.status ? [filters.status] : []}
              selectionMode="single"
              onSelectionChange={handleStatusFilter}
              variant="flat"
            >
              {statusOptions.map((option) => (
                <DropdownItem key={option.key}>{option.label}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* Roles Filter */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ background: "var(--grud-surface-alt)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--grud-text-secondary)" }}>
            Roles:
          </span>
          <Dropdown>
            <DropdownTrigger>
              <Button
                size="sm"
                style={{
                  background:
                    filters.roleIds && filters.roleIds.length > 0
                      ? "rgba(var(--grud-primary-rgb), 0.1)"
                      : "var(--grud-surface)",
                  color:
                    filters.roleIds && filters.roleIds.length > 0
                      ? "var(--grud-primary)"
                      : "var(--grud-text-secondary)",
                  borderColor:
                    filters.roleIds && filters.roleIds.length > 0
                      ? "transparent"
                      : "var(--grud-border-color)",
                }}
                endContent={<FunnelIcon className="w-3 h-3 opacity-40" />}
              >
                {filters.roleIds?.length || 0} Selected
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Roles filter"
              selectedKeys={filters.roleIds?.map((id) => id.toString()) || []}
              selectionMode="multiple"
              onSelectionChange={handleRoleFilter}
              variant="flat"
            >
              {roles.map((role) => (
                <DropdownItem key={role.id.toString()}>{role.name}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div
          className="mt-4 flex items-center justify-between px-4 py-2 rounded-lg"
          style={{
            background: "rgba(var(--grud-primary-rgb), 0.05)",
            border: "1px solid rgba(var(--grud-primary-rgb), 0.1)",
          }}
        >
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheckIcon className="w-4 h-4 text-[var(--grud-primary)]" />
            <span className="font-medium text-[var(--grud-primary)]">
              {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active
            </span>
          </div>
          <Button
            size="sm"
            variant="light"
            style={{ color: "var(--grud-error)" }}
            onPress={resetFilters}
            startContent={<TrashIcon className="w-4 h-4" />}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};
