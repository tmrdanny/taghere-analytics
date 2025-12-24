'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStoreGroups } from '@/lib/hooks/useStoreGroups';
import { StoreSearchInput } from './StoreSearchInput';
import { GroupCreateDialog } from './GroupCreateDialog';
import { GroupEditDialog } from './GroupEditDialog';
import { SavedGroupsTags } from './SavedGroupsTags';
import { StoreGroup } from '@/lib/types/store-groups';

interface StoreGroupsManagerProps {
  selectedGroupId?: string;
  onGroupSelected: (group: StoreGroup | null) => void;
}

export function StoreGroupsManager({ selectedGroupId, onGroupSelected }: StoreGroupsManagerProps) {
  const { groups, createGroup, updateGroup, deleteGroup, isLoaded } = useStoreGroups();
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StoreGroup | null>(null);

  const handleCreateGroup = (name: string) => {
    const newGroup = createGroup(name, selectedStoreIds);
    setSelectedStoreIds([]);
    onGroupSelected(newGroup);
  };

  const handleGroupClick = (group: StoreGroup) => {
    if (selectedGroupId === group.id) {
      // Deselect if clicking the same group
      onGroupSelected(null);
    } else {
      onGroupSelected(group);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (selectedGroupId === groupId) {
      onGroupSelected(null);
    }
    deleteGroup(groupId);
  };

  const handleEditGroup = (group: StoreGroup) => {
    setEditingGroup(group);
    setShowEditDialog(true);
  };

  const handleUpdateGroup = (id: string, name: string, storeIds: string[]) => {
    updateGroup(id, { name, storeIds });
    // If this is the selected group, update the selection with new data
    if (selectedGroupId === id) {
      const updatedGroup = { ...editingGroup!, name, storeIds, updatedAt: new Date().toISOString() };
      onGroupSelected(updatedGroup);
    }
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          매장 그룹
        </CardTitle>
        <CardDescription>
          매장을 검색하여 그룹으로 저장하고, 빠르게 필터링하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <StoreSearchInput
            selectedStoreIds={selectedStoreIds}
            onSelectionChange={setSelectedStoreIds}
          />
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={selectedStoreIds.length === 0}
          >
            그룹 생성
          </Button>
        </div>

        {groups.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">저장된 그룹</div>
            <SavedGroupsTags
              groups={groups}
              selectedGroupId={selectedGroupId}
              onGroupClick={handleGroupClick}
              onGroupDelete={handleDeleteGroup}
              onGroupEdit={handleEditGroup}
            />
          </div>
        )}

        <GroupCreateDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          storeIds={selectedStoreIds}
          storeCount={selectedStoreIds.length}
          onCreateGroup={handleCreateGroup}
          existingGroupNames={groups.map(g => g.name)}
        />

        <GroupEditDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingGroup(null);
          }}
          group={editingGroup}
          onUpdateGroup={handleUpdateGroup}
          existingGroupNames={groups.map(g => g.name)}
        />
      </CardContent>
    </Card>
  );
}
