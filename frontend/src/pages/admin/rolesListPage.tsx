import { useState, useEffect, useCallback, useOptimistic } from "react";
import { useLoading } from "../../hooks/useLoading";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import {
  Card,
  CardBody,
  Button,
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/outline";
import { usersService } from "../../services/usersService";
import type {
  Role,
  Permission,
  RoleListOptions,
  CreateRoleData,
  UpdateRoleData,
} from "../../types/users";
import { toast } from "sonner";
import styles from "../../styles/rolesListPage.module.css";
import PageHeader from "../../components/PageHeader";
import { RolesTable } from "./components/RolesTable";

import { useLayout } from "../../contexts/layoutContext";
import { AdminSidebar } from "../../components/Sidebar/AdminSidebar";

const RolesListPage = () => {
  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [isViewMode, setIsViewMode] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { setLayoutData, resetLayoutData } = useLayout();

  useEffect(() => {
    setLayoutData({
      headerTitle: "Role Management",
      navbarType: "admin",
      sidebar: <AdminSidebar />,
      showAdminButton: false,
    });
    return () => resetLayoutData();
  }, [setLayoutData, resetLayoutData]);

  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Optimistic state for roles list
  const [optimisticRoles, addOptimisticRoles] = useOptimistic(
    roles,
    (_state, newRoles: Role[]) => newRoles
  );

  // Use custom hook for minimum loading time
  const { isLoading, setLoading } = useLoading(500);

  // Filters and pagination
  const [filters, setFilters] = useState<RoleListOptions>({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "name",
    sortOrder: "asc",
  });

  // Use debounced search hook
  const [searchQuery, setSearchQuery] = useDebouncedSearch(filters.search || "", 350);

  // Form state
  const [formData, setFormData] = useState<CreateRoleData>({
    name: "",
    permissionIds: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchQuery,
      page: 1, // Reset to first page when search changes
    }));
  }, [searchQuery]);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      const result = await usersService.getRoles(filters);
      setRoles(result.roles || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 0);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to load roles. Please check your permissions.";
      toast.error(errorMessage);
      setRoles([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [filters, setLoading]);

  // Load permissions for assignment
  const fetchPermissions = useCallback(async () => {
    try {
      const result = await usersService.getAllPermissions();
      setPermissions(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to load permissions. Please contact administrator if this persists.";
      toast.error(errorMessage);
      setPermissions([]);
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchPermissions();
    fetchRoles();
  }, [fetchPermissions, fetchRoles]);

  useEffect(() => {
    setLoading(true);
    fetchRoles();
  }, [filters, fetchRoles, setLoading]);

  // Event handlers
  const handleSort = (sortBy: "name" | "createdAt") => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy ? (prev.sortOrder === "asc" ? "desc" : "asc") : "asc",
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Role name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Role name must be at least 2 characters";
    }

    if (formData.permissionIds && formData.permissionIds.length === 0) {
      errors.permissionIds = "Please select at least one permission";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Action handlers
  const handleCreateRole = async () => {
    try {
      if (!validateForm()) return;

      setLoading(true);

      // Optimistic update
      const tempId = Date.now();
      const optimisticRole: Role = {
        id: tempId,
        name: formData.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Role;

      addOptimisticRoles([...roles, optimisticRole]);

      const newRole = await usersService.createRole(formData);

      // Replace with real data
      setRoles(prev => [...prev, newRole]);
      toast.success("Role created successfully");
      onClose();
      resetForm();
      setLoading(false);
    } catch (error: unknown) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to create role";
      toast.error(errorMessage);
      // useOptimistic automatically reverts on error
    }
  };

  const handleUpdateRole = async () => {
    try {
      if (!selectedRole || !validateForm()) return;

      setLoading(true);

      const updateData: UpdateRoleData = {
        name: formData.name,
        permissionIds: formData.permissionIds,
      };

      // Optimistic update
      const updatedRoles = roles.map(role =>
        role.id === selectedRole.id
          ? {
              ...role,
              name: formData.name,
              updatedAt: new Date().toISOString(),
            }
          : role
      );

      addOptimisticRoles(updatedRoles);

      const updatedRole = await usersService.updateRole(selectedRole.id, updateData);

      // Replace with real data
      setRoles(prev => prev.map(role =>
        role.id === selectedRole.id ? updatedRole : role
      ));
      toast.success("Role updated successfully");
      onClose();
      resetForm();
      setLoading(false);
    } catch (error: unknown) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to update role";
      toast.error(errorMessage);
      // useOptimistic automatically reverts on error
    }
  };

  const handleDeleteRole = async (role: Role) => {
    try {
      setLoading(true);

      // Optimistic removal
      const filteredRoles = roles.filter(r => r.id !== role.id);
      addOptimisticRoles(filteredRoles);

      await usersService.deleteRole(role.id);

      // Commit to source of truth
      setRoles(filteredRoles);
      toast.success("Role deleted successfully");
      setLoading(false);
    } catch (error: unknown) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete role";
      toast.error(errorMessage);
      // useOptimistic automatically reverts on error
    }
  };

  // Modal handlers
  const openModal = (mode: "create" | "edit" | "view", role?: Role) => {
    setModalMode(mode);
    setIsViewMode(mode === "view");
    setSelectedRole(role || null);
    if (mode === "create") {
      setFormData({ name: "", permissionIds: [] });
    } else if (role) {
      setFormData({
        name: role.name,
        permissionIds: role.rolePermissions?.map((rp) => rp.permission.id) || [],
      });
    }

    onOpen();
  };

  const resetForm = () => {
    setFormData({ name: "", permissionIds: [] });
    setFormErrors({});
    setSelectedRole(null);
  };

  const handleInputChange = (field: keyof CreateRoleData, value: string | number[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className={styles.card}>
        <PageHeader 
          title="Role Management"
          subtitle="Manage user roles and permissions"
          actions={
            <Button
              color="primary"
              startContent={<PlusIcon className="w-4 h-4" />}
              onPress={() => openModal("create")}
            >
              Create Role
            </Button>
          }
        />

        <CardBody>
          {/* Search Bar */}
          <div className="mb-6">
            <Input
              placeholder="Search roles by name..."
              defaultValue={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startContent={<MagnifyingGlassIcon className="w-4 h-4 opacity-40" />}
              isClearable
              onClear={() => setSearchQuery("")}
              size="lg"
              classNames={{
                inputWrapper: "border-[var(--docmate-border-color)] hover:border-[var(--docmate-text-secondary)] focus-within:border-[var(--docmate-primary)]! bg-[var(--docmate-surface-alt)]",
                input: "text-[var(--docmate-text)] placeholder:text-[var(--docmate-text-secondary)]/50"
              }}
            />
          </div>

          <RolesTable
            roles={optimisticRoles}
            total={total}
            totalPages={totalPages}
            currentPage={filters.page || 1}
            onPageChange={handlePageChange}
            onViewRole={(role) => openModal("view", role)}
            onEditRole={(role) => openModal("edit", role)}
            onDeleteRole={handleDeleteRole}
            onSort={handleSort}
            sortBy={filters.sortBy || "name"}
            sortOrder={filters.sortOrder || "asc"}
            isLoading={isLoading}
          />
        </CardBody>
      </Card>

      {/* Create/Edit/View Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          resetForm();
        }}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          header: "p-0",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <div className="px-6 py-4 border-b-1 border-[var(--docmate-border-color)] text-xl font-bold">
                {modalMode === "create" && "Create New Role"}
                {modalMode === "edit" && "Edit Role"}
                {modalMode === "view" && "Role Details"}
              </div>
              <ModalBody>
                {(modalMode === "create" || modalMode === "edit") && (
                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Role Name"
                        placeholder="Enter role name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        errorMessage={formErrors.name}
                        isInvalid={!!formErrors.name}
                        isRequired
                        isDisabled={isViewMode}
                      />
                    </div>
                    <div>
                      <Select
                        label="Permissions"
                        placeholder="Select permissions"
                        selectionMode="multiple"
                        selectedKeys={formData.permissionIds?.map((id) => id.toString()) || []}
                        onSelectionChange={(keys) =>
                          handleInputChange(
                            "permissionIds",
                            Array.from(keys).map((id) => parseInt(id.toString()))
                          )
                        }
                        isDisabled={isViewMode}
                        errorMessage={formErrors.permissionIds}
                      >
                        {permissions.map((permission) => (
                          <SelectItem key={permission.id.toString()}>
                            <div>
                               <div className="font-medium">{permission.name}</div>
                               <div className="text-sm" style={{ color: 'var(--docmate-text-secondary)' }}>
                                 {permission.description}
                               </div>
                            </div>
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}

                {modalMode === "view" && selectedRole && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Role Information</h4>
                      <div className="space-y-2">
                        <div>
                          <strong>Name:</strong> {selectedRole.name}
                        </div>
                        <div>
                          <strong>ID:</strong> {selectedRole.id}
                        </div>
                        <div>
                          <strong>Created:</strong>{" "}
                          {new Date(selectedRole.createdAt || "").toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Permissions</h4>
                      {selectedRole.rolePermissions && selectedRole.rolePermissions.length > 0 ? (
                        <div className="space-y-2">
                          {selectedRole.rolePermissions.map((rp) => (
                            <div
                              key={rp.permission.id}
                              className="p-3 border rounded-lg"
                              style={{ background: 'var(--docmate-surface-alt)', borderColor: 'var(--docmate-border-color)' }}
                            >
                               <div className="font-medium text-[var(--docmate-text)]">{rp.permission.name}</div>
                              <div className="text-sm" style={{ color: 'var(--docmate-text-secondary)' }}>
                                {rp.permission.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                         <p style={{ color: 'var(--docmate-text-secondary)' }}>No permissions assigned</p>
                      )}
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={() => {
                    onClose();
                    resetForm();
                  }}
                >
                  {modalMode === "view" ? "Close" : "Cancel"}
                </Button>
                {(modalMode === "create" || modalMode === "edit") && (
                  <Button
                    color="primary"
                    onPress={modalMode === "create" ? handleCreateRole : handleUpdateRole}
                  >
                    {modalMode === "create" && "Create Role"}
                    {modalMode === "edit" && "Update Role"}
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default RolesListPage;
