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
        <p className="text-sm" style={{ color: 'var(--docmate-text-secondary)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--docmate-text)' }}>{currentCount}</span> of{" "}
          <span className="font-semibold" style={{ color: 'var(--docmate-text)' }}>{total}</span> users
        </p>
        {totalPages > 1 && (
          <p className="text-sm" style={{ color: 'var(--docmate-text-secondary)', opacity: 0.6 }}>
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Chip 
          size="sm" 
          variant="flat" 
          style={{ 
            background: hasActiveFilters ? 'rgba(var(--docmate-primary-rgb, 102, 126, 234), 0.1)' : 'var(--docmate-surface-alt)',
            color: hasActiveFilters ? 'var(--docmate-primary)' : 'var(--docmate-text-secondary)'
          }}
        >
          {hasActiveFilters ? "Filtered" : "All users"}
        </Chip>
      </div>
    </div>
  );
};