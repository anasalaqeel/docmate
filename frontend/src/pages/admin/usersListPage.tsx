import { useState, useEffect, useOptimistic } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { usersService } from "../../services/usersService";
import type { User, Role, UserListOptions } from "../../types/users";
import { toast } from "sonner";
import { useLoading } from "../../hooks/useLoading";
import styles from "../../styles/usersListPage.module.css";
import PageHeader from "../../components/PageHeader";
import { UsersFilters } from "./components/UsersFilters";
import { UsersTable } from "./components/UsersTable";
import { UsersSummary } from "./components/UsersSummary";
import { CreateUserModal } from "./components/CreateUserModal";
import { EditUserModal } from "./components/EditUserModal";
import { ManageRolesModal } from "./components/ManageRolesModal";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { DeleteUserModal } from "./components/DeleteUserModal";
import { useLayout } from "../../hooks/useLayout";
import { AdminSidebar } from "../../components/Sidebar/AdminSidebar";

const UsersListPage = () => {
  // State - only manage what's shared across components
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { setLayoutData, resetLayoutData } = useLayout();

  useEffect(() => {
    setLayoutData({
        headerTitle: "Users Management",
        navbarType: "admin",
        sidebar: <AdminSidebar />,
        showAdminButton: false,
    });
    return () => resetLayoutData();
  }, [setLayoutData, resetLayoutData]);

  const [filters, setFilters] = useState<UserListOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    roleIds: [],
    status: undefined,
  });

  // Optimistic state for users list
  const [optimisticUsers] = useOptimistic(
    users,
    (_state, newUsers: User[]) => newUsers
  );

  // Loading state
  const { isLoading, setLoading } = useLoading(500);

  // Modal state - simple booleans and selected user ID
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [manageRolesUserId, setManageRolesUserId] = useState<number | null>(null);
  const [changePasswordUserId, setChangePasswordUserId] = useState<number | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await usersService.getUsers(filters);

      if (result.success && result.data) {
        const usersData = result.data.users || [];
        const totalCount = result.data.total || 0;
        const totalPagesCount = result.data.totalPages || 1;

        setUsers(usersData);
        setTotal(totalCount);
        setTotalPages(totalPagesCount);
      } else {
        setUsers([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const rolesData = await usersService.getAllRoles();
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error: any) {
      setRoles([]);
      toast.error("Unable to load roles");
    }
  };

  // Initialize data
  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  // Callback handlers for modals
  const handleUserCreated = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
    fetchUsers(); // Refresh to get accurate counts
  };

  const handleUserUpdated = (updatedUser: User) => {
    // Update both users and optimistic state
    const updatedUsers = users.map((user) => (user.id === updatedUser.id ? updatedUser : user));
    setUsers(updatedUsers);
  };

  const handleRolesUpdated = (updatedUser: User) => {
    // Update both users and optimistic state
    const updatedUsers = users.map((user) => (user.id === updatedUser.id ? updatedUser : user));
    setUsers(updatedUsers);
  };

  const handleUserDeleted = (userId: number) => {
    const filteredUsers = users.filter((user) => user.id !== userId);
    setUsers(filteredUsers);
    fetchUsers(); // Refresh to get accurate counts
  };

  const handleSort = (sortBy: "name" | "email" | "createdAt" | "updatedAt") => {
    setFilters((prev) => {
      const isSameColumn = prev.sortBy === sortBy;
      const newSortOrder = isSameColumn ? (prev.sortOrder === "asc" ? "desc" : "asc") : "asc";
      return {
        ...prev,
        sortBy,
        sortOrder: newSortOrder,
        page: 1,
      };
    });
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Get user by ID helper
  const getUserById = (userId: number | null): User | null => {
    return userId ? users.find((u) => u.id === userId) || null : null;
  };

  return (
    <div className={`${styles.container} container mx-auto px-4`}>
      <Card style={{ background: 'var(--docmate-surface)', borderRadius: '16px', boxShadow: 'var(--docmate-card-shadow)' }}>
        <PageHeader
          title="Users Management"
          subtitle="Manage system users and their roles"
          actions={
            <Button
              color="primary"
              onPress={() => setIsCreateModalOpen(true)}
              className="shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              startContent={<PlusIcon className="w-4 h-4" />}
            >
              Create User
            </Button>
          }
        />

        <CardBody>
          <UsersSummary 
            currentCount={optimisticUsers.length} 
            total={total} 
            currentPage={filters.page || 1}
            totalPages={totalPages}
            hasActiveFilters={!!(filters.search || filters.roleIds?.length || filters.status)}
          />

          <UsersFilters
            filters={filters}
            roles={roles}
            onFiltersChange={setFilters}
          />

          <UsersTable
            users={optimisticUsers}
            total={total}
            totalPages={totalPages}
            currentPage={filters.page || 1}
            onPageChange={handlePageChange}
            onViewUser={setViewUser}
            onEditUser={(user) => setEditUserId(user.id)}
            onManageRoles={(user) => setManageRolesUserId(user.id)}
            onChangePassword={(user) => setChangePasswordUserId(user.id)}
            onDeleteUser={(user) => setDeleteUserId(user.id)}
            onSort={handleSort}
            sortBy={filters.sortBy || "name"}
            sortOrder={filters.sortOrder || "asc"}
            hasActiveFilters={
              (filters.search || filters.roleIds?.length || filters.status) ? true : false
            }
            isLoading={isLoading}
          />
        </CardBody>
      </Card>

      {/* Modals - each manages its own state */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
        roles={roles}
      />

      <EditUserModal
        isOpen={editUserId !== null}
        onClose={() => setEditUserId(null)}
        onUserUpdated={handleUserUpdated}
        user={getUserById(editUserId)}
      />

      <ManageRolesModal
        isOpen={manageRolesUserId !== null}
        onClose={() => setManageRolesUserId(null)}
        onRolesUpdated={handleRolesUpdated}
        user={getUserById(manageRolesUserId)}
        roles={roles}
      />

      <ChangePasswordModal
        isOpen={changePasswordUserId !== null}
        onClose={() => setChangePasswordUserId(null)}
        user={getUserById(changePasswordUserId)}
      />

      <DeleteUserModal
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onUserDeleted={handleUserDeleted}
        user={getUserById(deleteUserId)}
      />

      {/* View User Details Modal - simple, reuse existing if needed */}
      {viewUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setViewUser(null)}
        >
          <div
            className="p-6 rounded-lg max-w-md w-full mx-4 shadow-xl"
            style={{ background: 'var(--docmate-surface)', border: '1px solid var(--docmate-border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">User Details</h2>
            <div className="space-y-2">
              <p><strong>Name:</strong> {viewUser.name}</p>
              <p><strong>Email:</strong> {viewUser.email}</p>
              <p><strong>Phone:</strong> {viewUser.phone || "N/A"}</p>
              <p><strong>Status:</strong> {viewUser.status}</p>
              <p><strong>Roles:</strong> {viewUser.userRoles?.map(ur => ur.role.name).join(", ") || "None"}</p>
              <p><strong>Created:</strong> {new Date(viewUser.createdAt).toLocaleDateString()}</p>
            </div>
            <Button className="mt-4 w-full" onPress={() => setViewUser(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersListPage;
