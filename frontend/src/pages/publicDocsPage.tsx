import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate, Link } from "react-router";
import { getPublicDocs } from "../services/docsService";
import { type Documentation } from "../types/docs";
import { CardSkeleton } from "../components/ui/loadingSkeleton";
import { useLayout } from "../hooks/useLayout";
import { useBranding } from "../hooks/useBranding";
import styles from "../styles/publicDocsPage.module.css";

const SearchIcon = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.75" />
    <line x1="11.5" y1="11.5" x2="16" y2="16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const DocTypeIcon = ({ type }: { type?: string }) => {
  if (type === "api") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="8" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.75" />
        <rect x="16" y="8" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.75" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 10v4" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }
  if (type === "mixed") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 3h10l6 6v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.75" />
        <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.75" />
        <path d="M7 13h7M7 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 2h9l5 5v15H5V2z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12h8M8 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
};

/* Highlight the matched search substring without breaking text flow */
const highlight = (text: string, term: string): ReactNode => {
  const t = term.trim();
  if (!t) return text;
  const idx = text.toLowerCase().indexOf(t.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.highlight}>{text.slice(idx, idx + t.length)}</mark>
      {text.slice(idx + t.length)}
    </>
  );
};

/** Navigate inside a View Transition when the browser supports it, so the
 *  card title morphs into the doc page title. Falls back to a plain push. */
const transitionTo = (navigate: (to: string) => void, to: string) => {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (doc.startViewTransition && !reduced) {
    doc.startViewTransition(() => navigate(to));
  } else {
    navigate(to);
  }
};

const PublicDocsPage = () => {
  const { organizationName, logo } = useBranding();
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Documentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "traditional" | "api" | "mixed">("all");
  const searchRef = useRef<HTMLInputElement>(null);
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
      showAdminButton: true
    });

    return () => resetLayoutData();
  }, [setLayoutData, resetLayoutData]);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = docs.filter((doc) => {
      const matchesType = typeFilter === "all" || doc.type === typeFilter;
      const matchesTerm =
        term === "" ||
        doc.title.toLowerCase().includes(term) ||
        doc.description?.toLowerCase().includes(term);
      return matchesType && matchesTerm;
    });
    setFilteredDocs(filtered);
  }, [searchTerm, typeFilter, docs]);

  // "/" focuses search from anywhere on the page
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchTerm("");
      searchRef.current?.blur();
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroBrand}>
          {logo && <img src={logo} alt={`${organizationName} logo`} className={styles.heroLogo} />}
          <span className={styles.heroOrgName}>{organizationName}</span>
        </div>
        <h1 className={styles.heroTitle}>Documentation</h1>
        <p className={styles.heroSubtitle}>
          API references, integration guides, and technical specifications —
          everything you need to build on the platform.
        </p>

        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <SearchIcon />
          </span>
          <input
            ref={searchRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search documentation"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search documentation"
          />
          {searchTerm ? (
            <span className={styles.searchMeta}>
              {filteredDocs.length} result{filteredDocs.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <kbd className={styles.searchKbd} aria-hidden="true">/</kbd>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className={styles.docsGrid}>
          <CardSkeleton count={6} />
        </div>
      ) : (
        <>
          {docs.length > 0 && (
            <div className={styles.filterRow} role="group" aria-label="Filter by documentation type">
              {([
                ["all", "All"],
                ["traditional", "Guides"],
                ["api", "API"],
                ["mixed", "Mixed"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  className={`${styles.filterChip} ${typeFilter === value ? styles.filterChipActive : ""}`}
                  aria-pressed={typeFilter === value}
                  onClick={() => setTypeFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className={styles.docsGrid}>
            {filteredDocs.length === 0 ? (
              <div className={styles.empty}>
                {searchTerm || typeFilter !== "all" ? (
                  <>
                    <h2>No documentation found</h2>
                    <p>
                      No results for the current search and filters. Try a
                      different term or clear them.
                    </p>
                    <button
                      className={styles.emptyAction}
                      onClick={() => {
                        setSearchTerm("");
                        setTypeFilter("all");
                      }}
                    >
                      Clear search and filters
                    </button>
                  </>
                ) : (
                  <>
                    <h2>No public documentation available</h2>
                    <p>Check back later for new documentation.</p>
                  </>
                )}
              </div>
            ) : (
              filteredDocs.map((doc, index) => (
                <article
                  key={doc.id}
                  className={styles.docCard}
                  style={{ transitionDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <Link
                    to={`/docs/${doc.id}`}
                    className={styles.cardLink}
                    onClick={(e) => {
                      // Only intercept plain left-clicks so middle-click,
                      // Cmd/Ctrl+Click (new tab) and Shift+Click keep working.
                      if (
                        e.button !== 0 ||
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.altKey
                      ) {
                        return;
                      }
                      e.preventDefault();
                      transitionTo(navigate, `/docs/${doc.id}`);
                    }}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.cardIcon}>
                        <DocTypeIcon type={doc.type} />
                      </span>
                      <span className={styles.versionTag}>v{doc.version}</span>
                    </div>

                    <h2
                      className={styles.docTitle}
                      style={{ viewTransitionName: `doc-title-${doc.id}` } as React.CSSProperties}
                    >
                      {highlight(doc.title, searchTerm)}
                    </h2>
                    {doc.description && (
                      <p className={styles.docDescription}>
                        {highlight(doc.description, searchTerm)}
                      </p>
                    )}

                    <div className={styles.cardFooter}>
                      {doc.creator?.name ? (
                        <span className={styles.authorName}>{doc.creator.name}</span>
                      ) : (
                        <span />
                      )}
                      <span className={styles.updateDate}>
                        {doc.updatedAt ? `Updated ${formatDate(doc.updatedAt)}` : ""}
                      </span>
                    </div>
                  </Link>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PublicDocsPage;
