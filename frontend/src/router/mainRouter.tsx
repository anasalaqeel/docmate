import { Routes, Route } from "react-router";
import { Suspense, lazy } from "react";
import { Spinner } from "@heroui/react";
import LoginPage from "../pages/loginPage";
import PublicDocsPage from "../pages/publicDocsPage";
import PublicDocViewerPage from "../pages/publicDocViewerPage";
import ProtectedRoute from "../common/protectedRoute";
import { AppLayout } from "../components/AppLayout";

// Lazy load admin pages for better performance
const DashboardPage = lazy(() => import("../pages/admin/dashboardPage"));
const DocsListPage = lazy(() => import("../pages/admin/docsListPage"));
const DocsEditorPage = lazy(() => import("../pages/admin/docsEditorPage"));
const UsersListPage = lazy(() => import("../pages/admin/usersListPage"));
const RolesListPage = lazy(() => import("../pages/admin/rolesListPage"));
const AccountPage = lazy(() => import("../pages/admin/accountPage"));
const SettingsPage = lazy(() => import("../pages/admin/settingsPage"));

const RouterContent = () => {
    return (
        <AppLayout>
            <Suspense fallback={
                <div className="flex items-center justify-center p-8">
                    <Spinner size="lg" label="Loading..." />
                </div>
            }>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* Documentation Routes */}
                    <Route path="/" element={<PublicDocsPage />} />
                    <Route path="/docs" element={<PublicDocsPage />} />
                    <Route path="/docs/:id" element={<PublicDocViewerPage />} />
                    <Route path="/docs/:id/page/:pageId" element={<PublicDocViewerPage />} />

                    {/* Admin Routes */}
                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute requiredRoles={["admin", "superadmin", "moderator"]}>
                                <Routes>
                                    <Route index element={<DashboardPage />} />
                                    <Route path="docs" element={<DocsListPage />} />
                                    <Route path="docs/new" element={<DocsEditorPage />} />
                                    <Route path="docs/edit/:id" element={<DocsEditorPage />} />
                                    <Route path="users" element={<UsersListPage />} />
                                    <Route path="roles" element={<RolesListPage />} />
                                    <Route path="account" element={<AccountPage />} />
                                    <Route path="settings" element={<SettingsPage />} />
                                </Routes>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Suspense>
        </AppLayout>
    );
};

const MainRouter = () => {
  return (
    <RouterContent />
  );
};

export default MainRouter;
