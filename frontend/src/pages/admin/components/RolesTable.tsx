import {
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
  Button,
} from "@heroui/react";
import {
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { DataTable } from "../../../components/ui/DataTable";
import type { DataTableColumn } from "../../../components/ui/DataTable";
import type { Role } from "../../../types/users";

type RoleColumnKey = "name" | "permissions" | "users" | "createdAt" | "actions";

interface RolesTableProps {
  roles: Role[];
  total: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onViewRole: (role: Role) => void;
  onEditRole: (role: Role) => void;
  onDeleteRole: (role: Role) => void;
  onSort: (sortBy: "name" | "createdAt") => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  isLoading?: boolean;
}

export const RolesTable = ({
  roles,
  total,
  totalPages,
  currentPage,
  onPageChange,
  onViewRole,
  onEditRole,
  onDeleteRole,
  onSort,
  sortBy,
  sortOrder,
  isLoading = false,
}: RolesTableProps) => {
  const columns: DataTableColumn<RoleColumnKey>[] = [
    { key: "name", label: "ROLE NAME", sortable: true },
    { key: "permissions", label: "PERMISSIONS", sortable: false },
    { key: "users", label: "USERS", sortable: false },
    { key: "createdAt", label: "CREATED", sortable: true },
    { key: "actions", label: "ACTIONS", sortable: false, align: "center" },
  ];

  const getRolePermissionNames = (role: Role): string => {
    if (!role.rolePermissions || role.rolePermissions.length === 0) {
      return "No permissions";
    }
    return role.rolePermissions.map((rp) => rp.permission.name).join(", ");
  };

  const getRoleUserCount = (): number => {
    // This would require an API call to get user count per role
    return Math.floor(Math.random() * 10); // Placeholder
  };

  const renderCell = (role: Role, columnKey: RoleColumnKey) => {
    switch (columnKey) {
      case "name":
        return (
          <div className="py-1">
            <div className="font-medium text-[var(--grud-text)]">{role.name}</div>
            <div className="text-xs" style={{ color: 'var(--grud-text-secondary)' }}>ID: {role.id}</div>
          </div>
        );
      case "permissions":
        return (
          <div className="max-w-xs py-1">
            <p className="text-sm truncate text-[var(--grud-text)]">{getRolePermissionNames(role)}</p>
            {role.rolePermissions && role.rolePermissions.length > 0 && (
              <Chip 
                size="sm" 
                variant="flat" 
                className="mt-1"
                style={{ background: 'rgba(var(--grud-primary-rgb), 0.1)', color: 'var(--grud-primary)' }}
              >
                {role.rolePermissions.length} permissions
              </Chip>
            )}
          </div>
        );
      case "users":
        return (
          <Chip 
            size="sm" 
            variant="flat"
            style={{ background: 'var(--grud-surface-alt)', color: 'var(--grud-text-secondary)' }}
          >
            {getRoleUserCount()} users
          </Chip>
        );
      case "createdAt":
        return (
          <span className="text-sm text-[var(--grud-text-secondary)]">
            {new Date(role.createdAt || "").toLocaleDateString()}
          </span>
        );
      case "actions":
        return (
          <div className="flex justify-center">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  startContent={<EllipsisVerticalIcon className="w-4 h-4" />}
                />
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem
                  key="view"
                  startContent={<EyeIcon className="w-4 h-4" />}
                  onPress={() => onViewRole(role)}
                >
                  View Details
                </DropdownItem>
                <DropdownItem
                  key="edit"
                  startContent={<PencilIcon className="w-4 h-4" />}
                  onPress={() => onEditRole(role)}
                >
                  Edit Role
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  startContent={<TrashIcon className="w-4 h-4 text-[var(--grud-error)]" />}
                  className="text-[var(--grud-error)]"
                  color="danger"
                  onPress={() => {
                    if (
                      window.confirm(
                        `Are you sure you want to delete role "${role.name}"?`
                      )
                    ) {
                      onDeleteRole(role);
                    }
                  }}
                >
                  Delete Role
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        );
      default:
        return null;
    }
  };

  const emptyContent = (
    <div 
      className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed"
      style={{ background: 'var(--grud-surface-alt)', borderColor: 'var(--grud-border-color)' }}
    >
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(var(--grud-text-secondary-rgb, 100, 116, 139), 0.1)' }}>
        <ShieldCheckIcon className="w-8 h-8 opacity-40" />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--grud-text)' }}>No roles found</h3>
      <p className="text-center mb-6 max-w-sm" style={{ color: 'var(--grud-text-secondary)' }}>
        Try adjusting your search terms or create your first role to get started with role management.
      </p>
    </div>
  );

  return (
    <>
      <div className="mb-6">
        <DataTable
          columns={columns}
          data={roles}
          getRowKey={(role) => role.id}
          renderCell={renderCell}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(key) => onSort(key as any)}
          isLoading={isLoading}
          emptyContent={emptyContent}
          ariaLabel="Roles table"
        />
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm" style={{ color: 'var(--grud-text-secondary)' }}>
            Showing {(currentPage - 1) * 10 + 1} to{" "}
            {Math.min(currentPage * 10, total)} of {total} roles
          </div>
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={onPageChange}
            showControls
            showShadow
          />
        </div>
      )}
    </>
  );
};
