'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StoreGroup, StoreInfo } from '@/lib/types/store-groups';

interface GroupEditDialogProps {
  open: boolean;
  onClose: () => void;
  group: StoreGroup | null;
  onUpdateGroup: (id: string, name: string, storeIds: string[]) => void;
  existingGroupNames: string[];
}

export function GroupEditDialog({
  open,
  onClose,
  group,
  onUpdateGroup,
  existingGroupNames,
}: GroupEditDialogProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [selectedStoreNames, setSelectedStoreNames] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');

  // Load group data when dialog opens
  useEffect(() => {
    if (open && group) {
      setGroupName(group.name);
      setSelectedStoreIds([...group.storeIds]);
      setSearchTerm('');
      setStores([]);
      setError('');

      // Fetch store names for existing stores
      if (group.storeIds.length > 0) {
        fetchStoreNames(group.storeIds);
      }
    }
  }, [open, group]);

  const fetchStoreNames = async (storeIds: string[]) => {
    try {
      const params = new URLSearchParams({ storeIds: storeIds.join(',') });
      const response = await fetch(`/api/stores/names?${params}`);
      const result = await response.json();

      if (result.success && result.storeNames) {
        setSelectedStoreNames(result.storeNames);
      }
    } catch (error) {
      console.error('Failed to fetch store names:', error);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setStores([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/stores/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();

        if (data.success) {
          setStores(data.stores);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Store search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleStore = useCallback((storeId: string, storeName?: string) => {
    if (selectedStoreIds.includes(storeId)) {
      setSelectedStoreIds(prev => prev.filter(id => id !== storeId));
    } else {
      setSelectedStoreIds(prev => [...prev, storeId]);
      if (storeName) {
        setSelectedStoreNames(prev => ({ ...prev, [storeId]: storeName }));
      }
    }
  }, [selectedStoreIds]);

  const removeStore = (storeId: string) => {
    setSelectedStoreIds(prev => prev.filter(id => id !== storeId));
  };

  const handleSave = () => {
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      setError('그룹 이름을 입력해주세요.');
      return;
    }

    // Check for duplicate names (excluding current group)
    if (group && existingGroupNames.filter(n => n !== group.name).includes(trimmedName)) {
      setError('이미 존재하는 그룹 이름입니다.');
      return;
    }

    if (selectedStoreIds.length === 0) {
      setError('최소 1개의 매장을 선택해주세요.');
      return;
    }

    if (group) {
      onUpdateGroup(group.id, trimmedName, selectedStoreIds);
    }
    handleClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedStoreIds([]);
    setSelectedStoreNames({});
    setSearchTerm('');
    setStores([]);
    setError('');
    setShowDropdown(false);
    onClose();
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>매장 그룹 수정</DialogTitle>
          <DialogDescription>
            그룹 이름을 변경하거나 매장을 추가/제거할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Group Name */}
          <div className="grid gap-2">
            <Label htmlFor="edit-group-name">그룹 이름</Label>
            <Input
              id="edit-group-name"
              placeholder="예: 강남지역, 신규매장"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setError('');
              }}
            />
          </div>

          {/* Selected Stores */}
          <div className="grid gap-2">
            <Label>선택된 매장 ({selectedStoreIds.length}개)</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px] max-h-[120px] overflow-y-auto bg-muted/30">
              {selectedStoreIds.length === 0 ? (
                <span className="text-sm text-muted-foreground">선택된 매장이 없습니다</span>
              ) : (
                selectedStoreIds.map(storeId => (
                  <Badge
                    key={storeId}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span className="max-w-[150px] truncate">
                      {selectedStoreNames[storeId] || storeId.slice(-6)}
                    </span>
                    <button
                      onClick={() => removeStore(storeId)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Store Search */}
          <div className="grid gap-2">
            <Label>매장 추가</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="매장 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => stores.length > 0 && setShowDropdown(true)}
                className="pl-9"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>

            {showDropdown && stores.length > 0 && (
              <div className="relative">
                <div className="absolute z-50 w-full rounded-md border bg-popover p-2 shadow-md">
                  <div className="max-h-[200px] overflow-y-auto">
                    {stores.map((store) => {
                      const isSelected = selectedStoreIds.includes(store.storeId);
                      return (
                        <div
                          key={store.storeId}
                          className={`flex items-center space-x-2 rounded-sm px-2 py-2 cursor-pointer ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                          }`}
                          onClick={() => toggleStore(store.storeId, store.storeName)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleStore(store.storeId, store.storeName)}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{store.storeName}</div>
                            {store.location && (
                              <div className="text-xs text-muted-foreground">{store.location}</div>
                            )}
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowDropdown(false)}
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
