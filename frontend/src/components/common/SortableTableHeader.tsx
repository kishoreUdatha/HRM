import React from 'react';
import { HiChevronUp, HiChevronDown, HiSelector } from 'react-icons/hi';

export type SortOrder = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  order: SortOrder;
}

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}

const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
}) => {
  const isActive = currentSort.key === sortKey;
  const order = isActive ? currentSort.order : null;

  const handleClick = () => {
    onSort(sortKey);
  };

  return (
    <th
      onClick={handleClick}
      className={`text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 select-none transition-colors ${className}`}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="inline-flex flex-col">
          {order === 'asc' ? (
            <HiChevronUp className="w-4 h-4 text-primary-600" />
          ) : order === 'desc' ? (
            <HiChevronDown className="w-4 h-4 text-primary-600" />
          ) : (
            <HiSelector className="w-4 h-4 text-secondary-400" />
          )}
        </span>
      </div>
    </th>
  );
};

export default SortableTableHeader;

// Hook for managing sort state
export const useSortConfig = (defaultKey: string = '', defaultOrder: SortOrder = 'desc') => {
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    key: defaultKey,
    order: defaultOrder,
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Toggle order: asc -> desc -> asc
        return {
          key,
          order: prev.order === 'asc' ? 'desc' : 'asc',
        };
      }
      // New column, default to desc
      return { key, order: 'desc' };
    });
  };

  return { sortConfig, handleSort };
};
