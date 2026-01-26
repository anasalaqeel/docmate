import { Card, CardBody, CardHeader } from '@heroui/react';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  height = 'h-4', 
  width = 'w-full' 
}) => (
  <div 
    className={`${height} ${width} bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
  />
);

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} className="w-full">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between w-full">
            <Skeleton height="h-6" width="w-1/3" />
            <Skeleton height="h-5" width="w-16" />
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="space-y-3">
            <Skeleton height="h-4" width="w-full" />
            <Skeleton height="h-4" width="w-5/6" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton height="h-4" width="w-24" />
              <Skeleton height="h-8" width="w-20" />
            </div>
          </div>
        </CardBody>
      </Card>
    ))}
  </>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} height="h-4" width="w-1/4" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`row-${rowIndex}-col-${colIndex}`} height="h-4" width="w-1/4" />
        ))}
      </div>
    ))}
  </div>
);

export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {Array.from({ length: 3 }).map((_, index) => (
      <Card key={index}>
        <CardBody className="p-6 text-center">
          <Skeleton height="h-8" width="w-16" className="mx-auto mb-2" />
          <Skeleton height="h-4" width="w-24" className="mx-auto" />
        </CardBody>
      </Card>
    ))}
  </div>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton height="h-12" width="w-12" className="rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton height="h-4" width="w-1/3" />
          <Skeleton height="h-3" width="w-1/2" />
        </div>
        <Skeleton height="h-8" width="w-20" />
      </div>
    ))}
  </div>
);

export const DocViewerSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto">
    {/* Header */}
    <div className="mb-8">
      <Skeleton height="h-10" width="w-1/2" className="mb-4" />
      <Skeleton height="h-4" width="w-3/4" className="mb-2" />
      <Skeleton height="h-4" width="w-1/2" />
    </div>

    {/* Content blocks */}
    <div className="space-y-8">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-4">
          <Skeleton height="h-6" width="w-1/3" />
          <div className="space-y-2">
            <Skeleton height="h-4" width="w-full" />
            <Skeleton height="h-4" width="w-5/6" />
            <Skeleton height="h-4" width="w-4/5" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export { Skeleton };