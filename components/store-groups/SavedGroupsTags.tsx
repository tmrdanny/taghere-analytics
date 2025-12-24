'use client';

import { X, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StoreGroup } from '@/lib/types/store-groups';

interface SavedGroupsTagsProps {
  groups: StoreGroup[];
  selectedGroupId?: string;
  onGroupClick: (group: StoreGroup) => void;
  onGroupDelete: (groupId: string) => void;
  onGroupEdit?: (group: StoreGroup) => void;
}

export function SavedGroupsTags({
  groups,
  selectedGroupId,
  onGroupClick,
  onGroupDelete,
  onGroupEdit,
}: SavedGroupsTagsProps) {
  if (groups.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        저장된 그룹이 없습니다. 매장을 검색하고 그룹을 만들어보세요.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => {
        const isSelected = group.id === selectedGroupId;

        return (
          <div
            key={group.id}
            className={`
              group relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm
              transition-colors cursor-pointer
              ${isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }
            `}
            onClick={() => onGroupClick(group)}
          >
            <span className="font-medium">{group.name}</span>
            <span className="text-xs opacity-70">
              ({group.storeIds.length})
            </span>
            {onGroupEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGroupEdit(group);
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                title="그룹 수정"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGroupDelete(group.id);
              }}
              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
              title="그룹 삭제"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
