import { useState, useEffect } from "react";
import { Card, CardBody, Button, Chip } from "@heroui/react";
import { useNavigate } from "react-router";
import { useLayout } from "../../hooks/useLayout";
import { AdminSidebar } from "../../components/Sidebar/AdminSidebar";
import { PlusIcon, DocumentTextIcon, EyeIcon,  EyeSlashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { getAllDocs } from "../../services/docsService";
import { useAuth } from "../../hooks/useAuth";
import { StatsSkeleton, ListSkeleton } from "../../components/ui/loadingSkeleton";
import { EnhancedButton } from "../../components/ui/enhancedButton";
import styles from "../../styles/dashboardPage.module.css";
import PageHeader from "../../components/PageHeader";

interface DashboardStats {
  totalDocs: number;
  publicDocs: number;
  privateDocs: number;
  recentDocs: Array<{
    id: number;
    title: string;
    version: string;
    isPublic: boolean;
    updatedAt: string;
  }>;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocs: 0,
    publicDocs: 0,
    privateDocs: 0,
    recentDocs: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setLayoutData, resetLayoutData } = useLayout();

  useEffect(() => {
    setLayoutData({
      headerTitle: "Docmate Admin",
      navbarType: "admin",
      sidebar: <AdminSidebar />,
      showAdminButton: false,
    });
    return () => resetLayoutData();
  }, [setLayoutData, resetLayoutData]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAllDocs();

      if (response.success && response.data) {
        const docs = response.data;
        const publicDocs = docs.filter((doc) => doc.isPublic).length;
        const recentDocs = docs
          .sort(
            (a, b) => new Date(b.updatedAt || "").getTime() - new Date(a.updatedAt || "").getTime()
          )
          .slice(0, 5)
          .map((doc) => ({
            id: doc.id!,
            title: doc.title || "",
            version: doc.version || "1.0.0",
            isPublic: doc.isPublic ?? false,
            updatedAt: doc.updatedAt || new Date().toISOString(),
          }));

        setStats({
          totalDocs: docs.length,
          publicDocs,
          privateDocs: docs.length - publicDocs,
          recentDocs,
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      const errorMessage = "Failed to load dashboard data";
      setError(errorMessage);
      toast.error("Loading Error", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className={`${styles.container} container mx-auto px-4`}>
      <PageHeader
        title={`Welcome back, ${user?.name}! 👋`}
        subtitle="Here's what's happening with your documentation today"
        variant="standalone"
        actions={
          <>
            <EnhancedButton
              color="success"
              variant="flat"
              startContent={<PlusIcon className="w-4 h-4" />}
              onPress={() => navigate("/admin/docs?action=create")}
              animate
            >
              Create New
            </EnhancedButton>
            <EnhancedButton
              color="primary"
              startContent={<DocumentTextIcon className="w-4 h-4" />}
              onPress={() => navigate("/admin/docs")}
              animate
            >
              Manage Docs
            </EnhancedButton>
          </>
        }
      />

      {/* Stats Section */}
      {isLoading ? (
        <StatsSkeleton />
      ) : error ? (
        <Card style={{ background: 'rgba(var(--docmate-error-rgb), 0.05)', border: '1px solid rgba(var(--docmate-error-rgb), 0.2)', borderRadius: '16px' }}>
          <CardBody className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--docmate-error)' }}>
              Unable to load dashboard
            </h3>
            <p className="mb-4" style={{ color: 'var(--docmate-error)', opacity: 0.8 }}>{error}</p>
            <Button color="danger" variant="solid" onPress={fetchStats}>
              Try Again
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <div className={styles.statNumber}>{stats.totalDocs}</div>
                  <div className={styles.statLabel}>Total Projects</div>
                </div>
                <div className="p-3 rounded-full" style={{ background: 'rgba(var(--docmate-primary-rgb, 102, 126, 234), 0.15)' }}>
                  <DocumentTextIcon className="w-8 h-8" style={{ color: 'var(--docmate-primary)' }} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className={styles.statCard}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <div className={styles.statNumber}>{stats.publicDocs}</div>
                  <div className={styles.statLabel}>Public Docs</div>
                </div>
                <div className="p-3 rounded-full" style={{ background: 'rgba(var(--docmate-success-rgb), 0.15)' }}>
                  <EyeIcon className="w-8 h-8" style={{ color: 'var(--docmate-success)' }} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className={styles.statCard}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <div className={styles.statNumber}>{stats.privateDocs}</div>
                  <div className={styles.statLabel}>Private Docs</div>
                </div>
                <div className="p-3 rounded-full" style={{ background: 'rgba(var(--docmate-warning-rgb), 0.15)' }}>
                  <EyeSlashIcon className="w-8 h-8" style={{ color: 'var(--docmate-warning)' }} />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Recent Documentation */}
      <div className={styles.recentSection}>
        <Card style={{ background: 'var(--docmate-surface)', borderRadius: '16px', boxShadow: 'var(--docmate-card-shadow)' }}>
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between w-full">
              <h3 className={styles.sectionTitle}>Recent Documentation</h3>
              {stats.recentDocs.length > 0 && (
                <Button
                  size="sm"
                  variant="light"
                  color="primary"
                  onPress={() => navigate("/admin/docs")}
                >
                  View All
                </Button>
              )}
            </div>
          </div>
          <CardBody>
            {isLoading ? (
              <ListSkeleton count={3} />
            ) : stats.recentDocs.length === 0 ? (
              <div className={styles.emptyState}>
                <DocumentTextIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--docmate-text-secondary)', opacity: 0.3 }} />
                <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--docmate-text)' }}>
                  No documentation yet
                </h4>
                <p className="mb-4" style={{ color: 'var(--docmate-text-secondary)' }}>
                  Get started by creating your first documentation project
                </p>
                <EnhancedButton
                  color="primary"
                  startContent={<PlusIcon className="w-4 h-4" />}
                  onPress={() => navigate("/admin/docs")}
                  animate
                >
                  Create Documentation
                </EnhancedButton>
              </div>
            ) : (
              <div className={styles.recentList}>
                {stats.recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className={styles.recentItem}
                    onClick={() => navigate(`/admin/docs/edit/${doc.id}`)}
                  >
                    <div className={styles.recentItemIcon}>
                      <DocumentTextIcon className="w-5 h-5" />
                    </div>
                    
                    <div className={styles.recentItemMain}>
                      <h4 className={styles.recentItemTitle}>{doc.title}</h4>
                      <div className={styles.recentItemMeta}>
                        <Chip size="sm" variant="flat" color="primary" className="h-5 text-xs">
                          v{doc.version}
                        </Chip>
                        <Chip
                          size="sm"
                          color={doc.isPublic ? "success" : "default"}
                          variant="flat"
                          className="h-5 text-xs"
                        >
                          {doc.isPublic ? "Public" : "Private"}
                        </Chip>
                        <span className={styles.recentItemDate}>
                          • {formatDate(doc.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.recentItemActions}>
                      <EnhancedButton
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={() => navigate(`/admin/docs/edit/${doc.id}`)}
                        animate
                        isIconOnly
                        className="w-8 h-8 min-w-8"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </EnhancedButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

    </div>
  );
};

export default DashboardPage;
