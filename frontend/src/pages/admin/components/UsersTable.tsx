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
  ShieldCheckIcon,
  KeyIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { DataTable } from "../../../components/ui/DataTable";
import type { DataTableColumn } from "../../../components/ui/DataTable";
import type { User } from "../../../types/users";

type UserColumnKey = "name" | "username" | "email" | "status" | "roles" | "createdAt" | "actions";

interface UsersTableProps {
  users: User[];
  total: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onViewUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onManageRoles: (user: User) => void;
  onChangePassword: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onSort: (sortBy: "name" | "email" | "createdAt" | "updatedAt") => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  hasActiveFilters: boolean;
  isLoading?: boolean;
}

export const UsersTable = ({
  users,
  total,
  totalPages,
  currentPage,
  onPageChange,
  onViewUser,
  onEditUser,
  onManageRoles,
  onChangePassword,
  onDeleteUser,
  onSort,
  sortBy,
  sortOrder,
  hasActiveFilters,
  isLoading = false,
}: UsersTableProps) => {
  const columns: DataTableColumn<UserColumnKey>[] = [
    { key: "name", label: "User", sortable: true },
    { key: "username", label: "Username", sortable: true },
    { key: "email", label: "Contact", sortable: true },
    { key: "status", label: "Status", sortable: false },
    { key: "roles", label: "Roles", sortable: false },
    { key: "createdAt", label: "Member Since", sortable: true },
    { key: "actions", label: "Actions", sortable: false, align: "center" },
  ];

  // Status color mapping
  const statusColorMap: Record<string, { bg: string; text: string }> = {
    active: { bg: "rgba(var(--grud-success-rgb, 16, 185, 129), 0.1)", text: "var(--grud-success)" },
    inactive: { bg: "rgba(var(--grud-error-rgb, 239, 68, 68), 0.1)", text: "var(--grud-error)" },
  };

  const getUserRoleNames = (user: User): string[] => {
    return user.userRoles?.map((ur: any) => ur.role.name) || [];
  };

  const getRoleStyle = (roleName: string): { bg: string; text: string } => {
    switch (roleName.toLowerCase()) {
      case "superadmin":
        return { bg: "rgba(var(--grud-error-rgb, 239, 68, 68), 0.1)", text: "var(--grud-error)" };
      case "admin":
        return {
          bg: "rgba(var(--grud-warning-rgb, 245, 158, 11), 0.1)",
          text: "var(--grud-warning)",
        };
      case "moderator":
        return {
          bg: "rgba(var(--grud-primary-rgb, 102, 126, 234), 0.1)",
          text: "var(--grud-primary)",
        };
      default:
        return {
          bg: "rgba(var(--grud-text-secondary-rgb, 100, 116, 139), 0.1)",
          text: "var(--grud-text-secondary)",
        };
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getMemberDays = (dateString: string): string => {
    const days = Math.ceil((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  const renderCell = (user: User, columnKey: UserColumnKey) => {
    switch (columnKey) {
      case "name":
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(var(--grud-primary-rgb), 0.1)" }}
            >
              <span className="font-medium text-sm" style={{ color: "var(--grud-primary)" }}>
                {user.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <p className="font-medium">{user.name || "Unknown"}</p>
              <p className="text-xs" style={{ color: "var(--grud-text-secondary)" }}>
                ID: {user.id}
              </p>
            </div>
          </div>
        );
      case "username":
        return (
          <p className="text-sm font-medium" style={{ color: "var(--grud-primary)" }}>
            @{user.username || "no-username"}
          </p>
        );
      case "email":
        return (
          <div>
            <p className="text-sm">{user.email || "No email"}</p>
            <p className="text-xs" style={{ color: "var(--grud-text-secondary)" }}>
              {user.phone || "No phone"}
            </p>
          </div>
        );
      case "status":
        return (
          <Chip
            className="capitalize"
            style={{
              background: statusColorMap[user.status]?.bg || "var(--grud-surface-alt)",
              color: statusColorMap[user.status]?.text || "var(--grud-text-secondary)",
            }}
            size="sm"
            variant="flat"
          >
            {user.status}
          </Chip>
        );
      case "roles":
        return (
          <div className="flex gap-1">
            {getUserRoleNames(user).length > 0 ? (
              getUserRoleNames(user).map((roleName) => (
                <Chip
                  key={roleName}
                  size="sm"
                  style={{
                    background: getRoleStyle(roleName).bg,
                    color: getRoleStyle(roleName).text,
                  }}
                  variant="flat"
                >
                  {roleName}
                </Chip>
              ))
            ) : (
              <span className="text-xs opacity-40">No roles</span>
            )}
          </div>
        );
      case "createdAt":
        return (
          <div>
            <p className="text-sm">{formatDate(user.createdAt)}</p>
            <p className="text-xs" style={{ color: "var(--grud-text-secondary)" }}>
              Member for {getMemberDays(user.createdAt)}
            </p>
          </div>
        );
      case "actions":
        return (
          <Dropdown>
            <DropdownTrigger>
              <Button size="sm" variant="light" isIconOnly>
                <EllipsisVerticalIcon className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="User actions">
              <DropdownItem
                key="view"
                startContent={<EyeIcon className="w-4 h-4" />}
                onPress={() => onViewUser(user)}
              >
                View Details
              </DropdownItem>
              <DropdownItem
                key="edit"
                startContent={<PencilIcon className="w-4 h-4" />}
                onPress={() => onEditUser(user)}
              >
                Edit User
              </DropdownItem>
              <DropdownItem
                key="manage-roles"
                startContent={<ShieldCheckIcon className="w-4 h-4" />}
                onPress={() => onManageRoles(user)}
              >
                Manage Roles
              </DropdownItem>
              <DropdownItem
                key="change-password"
                startContent={<KeyIcon className="w-4 h-4" />}
                onPress={() => onChangePassword(user)}
              >
                Change Password
              </DropdownItem>
              <DropdownItem
                key="delete"
                startContent={<TrashIcon className="w-4 h-4 text-[var(--grud-error)]" />}
                className="text-[var(--grud-error)]"
                color="danger"
                onPress={() => onDeleteUser(user)}
              >
                Delete User
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        );
      default:
        return null;
    }
  };

  const emptyContent = (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border-2 border-dashed"
      style={{ background: "var(--grud-surface-alt)", borderColor: "var(--grud-border-color)" }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: "rgba(var(--grud-text-secondary-rgb, 100, 116, 139), 0.1)" }}
      >
        <ShieldCheckIcon className="w-8 h-8 opacity-40" />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--grud-text)" }}>
        No users found
      </h3>
      <p className="text-center mb-6 max-w-sm" style={{ color: "var(--grud-text-secondary)" }}>
        {hasActiveFilters
          ? "Try adjusting your filters or search terms to find users."
          : "Create your first user to get started with user management."}
      </p>
    </div>
  );

  return (
    <>
      <div className="mb-6">
        <DataTable
          columns={columns}
          data={users}
          getRowKey={(user) => user.id}
          renderCell={renderCell}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(key) => onSort(key as any)}
          isLoading={isLoading}
          emptyContent={emptyContent}
          ariaLabel="Users table"
        />
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm" style={{ color: "var(--grud-text-secondary)" }}>
            Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, total)} of {total}{" "}
            users
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
