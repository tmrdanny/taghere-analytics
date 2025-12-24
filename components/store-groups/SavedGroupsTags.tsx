'use client';

import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [deleteConfirm, setDeleteConfirm] = useState<StoreGroup | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, group: StoreGroup) => {
    e.stopPropagation();
    setDeleteConfirm(group);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onGroupDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

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
              onClick={(e) => handleDeleteClick(e, group)}
              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
              title="그룹 삭제"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>그룹을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{deleteConfirm?.name}&apos; 그룹이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
