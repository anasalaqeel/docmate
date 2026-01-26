import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Input,
} from "@heroui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router";
import { getPublicDocs } from "../services/docsService";
import { type Documentation } from "../types/docs";
import { CardSkeleton } from "../components/ui/loadingSkeleton";
import { useLayout } from "../contexts/layoutContext";
import styles from "../styles/publicDocsPage.module.css";

const PublicDocsPage = () => {
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Documentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { setLayoutData, resetLayoutData } = useLayout();
  const navigate = useNavigate();

  const fetchPublicDocs = async () => {
    try {
      setIsLoading(true);
      const response = await getPublicDocs();

      if (response.success && response.data) {
        setDocs(response.data);
        setFilteredDocs(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch public documentations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicDocs();
    setLayoutData({
      headerTitle: "API Documentation",
      headerVersion: undefined,
      showAdminButton: true
    });

    return () => resetLayoutData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDocs(docs);
    } else {
      const filtered = docs.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocs(filtered);
    }
  }, [searchTerm, docs]);

  const handleDocClick = (docId: number) => {
    navigate(`/docs/${docId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Developer Documentation</h1>
          <p className={styles.heroSubtitle}>
            Explore our comprehensive API documentation and integration guides
          </p>
        </div>

        <div className={styles.searchSection}>
          <Input
            placeholder="Search documentation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            startContent={<MagnifyingGlassIcon className="w-5 h-5" style={{ color: 'var(--grud-text-secondary)', opacity: 0.5 }} />}
            size="lg"
            variant="bordered"
            classNames={{
              inputWrapper: "border-[var(--grud-border-color)] hover:border-[var(--grud-text-secondary)] focus-within:border-[var(--grud-primary)]! bg-[var(--grud-surface-alt)]",
              input: "text-[var(--grud-text)] placeholder:text-[var(--grud-text-secondary)]/50"
            }}
          />
        </div>

        {isLoading ? (
          <div className={styles.docsGrid}>
            <CardSkeleton count={6} />
          </div>
        ) : (
          <div className={styles.docsGrid}>
            {filteredDocs.length === 0 ? (
              <div className={styles.empty}>
                {searchTerm ? (
                  <>
                    <h3>No documentation found</h3>
                    <p>Try adjusting your search terms</p>
                    <Button variant="light" onPress={() => setSearchTerm("")}>
                      Clear Search
                    </Button>
                  </>
                ) : (
                  <>
                    <h3>No public documentation available</h3>
                    <p>Check back later for new documentation</p>
                    <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                      🚀 Documentation portal is live and ready for content.
                    </div>
                  </>
                )}
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <Card
                  key={doc.id}
                  className={styles.docCard}
                  isPressable
                  onPress={() => handleDocClick(doc.id!)}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardMeta}>
                      <Chip size="sm" variant="flat" color="primary">
                        v{doc.version}
                      </Chip>
                      <span className={styles.updateDate}>
                        Updated {doc.updatedAt ? formatDate(doc.updatedAt) : "N/A"}
                      </span>
                    </div>
                  </div>

                  <CardBody className={styles.cardBody}>
                    <h3 className={styles.docTitle}>{doc.title}</h3>
                    {doc.description && <p className={styles.docDescription}>{doc.description}</p>}

                    <div className={styles.cardFooter}>
                      <div className={styles.author}>
                        <span className={styles.authorLabel}>By:</span>
                        <span className={styles.authorName}>{doc.creator?.name || "Unknown"}</span>
                      </div>
                      <Button
                        color="primary"
                        variant="light"
                        size="sm"
                        onPress={() => handleDocClick(doc.id!)}
                        as="div"
                      >
                        View Documentation →
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    );
};

export default PublicDocsPage;
