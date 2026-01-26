import { Chip } from "@heroui/react";

interface UsersSummaryProps {
  currentCount: number;
  total: number;
  currentPage: number;
  totalPages: number;
  hasActiveFilters: boolean;
}

export const UsersSummary = ({
  currentCount,
  total,
  currentPage,
  totalPages,
  hasActiveFilters,
}: UsersSummaryProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-4">
        <p className="text-sm" style={{ color: 'var(--grud-text-secondary)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--grud-text)' }}>{currentCount}</span> of{" "}
          <span className="font-semibold" style={{ color: 'var(--grud-text)' }}>{total}</span> users
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
          {hasActiveFilters ? "Filtered" : "All users"}
        </Chip>
      </div>
    </div>
  );
};