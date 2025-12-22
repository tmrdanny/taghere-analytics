'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StoreInfo } from '@/lib/types/store-groups';

interface StoreSearchInputProps {
  selectedStoreIds: string[];
  onSelectionChange: (storeIds: string[]) => void;
}

export function StoreSearchInput({ selectedStoreIds, onSelectionChange }: StoreSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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

  const toggleStore = useCallback((storeId: string) => {
    if (selectedStoreIds.includes(storeId)) {
      onSelectionChange(selectedStoreIds.filter(id => id !== storeId));
    } else {
      onSelectionChange([...selectedStoreIds, storeId]);
    }
  }, [selectedStoreIds, onSelectionChange]);

  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="매장 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => stores.length > 0 && setShowDropdown(true)}
            className="pl-9"
          />
        </div>
        {selectedStoreIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            선택 해제 ({selectedStoreIds.length})
          </Button>
        )}
      </div>

      {showDropdown && stores.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover p-2 shadow-md">
          <div className="max-h-[300px] overflow-y-auto">
            {stores.map((store) => (
              <div
                key={store.storeId}
                className="flex items-center space-x-2 rounded-sm px-2 py-2 hover:bg-accent cursor-pointer"
                onClick={() => toggleStore(store.storeId)}
              >
                <Checkbox
                  checked={selectedStoreIds.includes(store.storeId)}
                  onCheckedChange={() => toggleStore(store.storeId)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{store.storeName}</div>
                  {store.location && (
                    <div className="text-xs text-muted-foreground">{store.location}</div>
                  )}
                </div>
              </div>
            ))}
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
      )}

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
