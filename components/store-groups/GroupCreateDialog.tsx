'use client';

import { useState } from 'react';
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

interface GroupCreateDialogProps {
  open: boolean;
  onClose: () => void;
  storeIds: string[];
  storeCount: number;
  onCreateGroup: (name: string) => void;
  existingGroupNames: string[];
}

export function GroupCreateDialog({
  open,
  onClose,
  storeIds,
  storeCount,
  onCreateGroup,
  existingGroupNames,
}: GroupCreateDialogProps) {
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      setError('그룹 이름을 입력해주세요.');
      return;
    }

    if (existingGroupNames.includes(trimmedName)) {
      setError('이미 존재하는 그룹 이름입니다.');
      return;
    }

    onCreateGroup(trimmedName);
    setGroupName('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setGroupName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 매장 그룹 만들기</DialogTitle>
          <DialogDescription>
            선택한 {storeCount}개의 매장을 그룹으로 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="group-name">그룹 이름</Label>
            <Input
              id="group-name"
              placeholder="예: 강남지역, 신규매장"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                }
              }}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleCreate} disabled={!groupName.trim()}>
            그룹 생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
