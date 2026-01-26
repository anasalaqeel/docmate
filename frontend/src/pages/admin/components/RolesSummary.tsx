import { Chip } from "@heroui/react";

interface RolesSummaryProps {
  currentCount: number;
  total: number;
  currentPage: number;
  totalPages: number;
  hasActiveFilters: boolean;
}

export const RolesSummary = ({
  currentCount,
  total,
  currentPage,
  totalPages,
  hasActiveFilters,
}: RolesSummaryProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-4">
        <p className="text-sm" style={{ color: 'var(--grud-text-secondary)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--grud-text)' }}>{currentCount}</span> of{" "}
          <span className="font-semibold" style={{ color: 'var(--grud-text)' }}>{total}</span> roles
        </p>
        {totalPages > 1 && (
          <p className="text-sm" style={{ color: 'var(--grud-text-secondary)', opacity: 0.6 }}>
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Chip 
          size="sm" 
          variant="flat" 
          style={{ 
            background: hasActiveFilters ? 'rgba(var(--grud-primary-rgb, 102, 126, 234), 0.1)' : 'var(--grud-surface-alt)',
            color: hasActiveFilters ? 'var(--grud-primary)' : 'var(--grud-text-secondary)'
          }}
        >
          {hasActiveFilters ? "Filtered" : "All roles"}
        </Chip>
      </div>
    </div>
  );
};