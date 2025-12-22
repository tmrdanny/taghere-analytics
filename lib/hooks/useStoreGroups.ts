'use client';

import { useState, useEffect } from 'react';
import { StoreGroup } from '@/lib/types/store-groups';

const STORAGE_KEY = 'taghere-store-groups';

export function useStoreGroups() {
  const [groups, setGroups] = useState<StoreGroup[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setGroups(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error('Failed to load store groups from localStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isLoaded) return; // Don't save on initial load

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch (e) {
      console.error('Failed to save store groups to localStorage:', e);
    }
  }, [groups, isLoaded]);

  const createGroup = (name: string, storeIds: string[], color?: string) => {
    const newGroup: StoreGroup = {
      id: crypto.randomUUID(),
      name,
      storeIds,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setGroups([...groups, newGroup]);
    return newGroup;
  };

  const updateGroup = (id: string, updates: Partial<Omit<StoreGroup, 'id' | 'createdAt'>>) => {
    setGroups(groups.map(g =>
      g.id === id
        ? { ...g, ...updates, updatedAt: new Date().toISOString() }
        : g
    ));
  };

  const deleteGroup = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
  };

  const getGroupById = (id: string) => {
    return groups.find(g => g.id === id);
  };

  return {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupById,
    isLoaded
  };
}
