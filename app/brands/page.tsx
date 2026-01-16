'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/components/auth/AuthContext';
import { Building2, Plus, Edit, Trash2, Store, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FranchiseAccount {
  id: string;
  username: string;
  role: 'franchise';
  displayName: string;
  assignedStoreIds: string[];
  createdAt: string;
  isActive: boolean;
}

interface StoreInfo {
  _id: string;
  name: string;
}

export default function BrandsPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [franchises, setFranchises] = useState<FranchiseAccount[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FranchiseAccount | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    assignedStoreIds: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Access control: Master only
  useEffect(() => {
    if (!authLoading && session?.role !== 'master') {
      router.push('/');
    }
  }, [session, authLoading, router]);

  // Load franchise accounts and stores
  useEffect(() => {
    if (session?.role === 'master') {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load franchise accounts
      const franchisesRes = await fetch('/api/brands/franchises');
      if (!franchisesRes.ok) throw new Error('Failed to load franchises');
      const franchisesData = await franchisesRes.json();

      // Load all stores
      const storesRes = await fetch('/api/stores/names');
      if (!storesRes.ok) throw new Error('Failed to load stores');
      const storesData = await storesRes.json();

      setFranchises(franchisesData.franchises || []);
      setStores(storesData.stores || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateClick = () => {
    const newPassword = generateRandomPassword();
    setFormData({
      username: '',
      password: newPassword,
      displayName: '',
      assignedStoreIds: [],
    });
    setGeneratedPassword(newPassword);
    setPasswordCopied(false);
    setIsCreateOpen(true);
  };

  const handleEditClick = (franchise: FranchiseAccount) => {
    setSelectedFranchise(franchise);
    setFormData({
      username: franchise.username,
      password: '',
      displayName: franchise.displayName,
      assignedStoreIds: franchise.assignedStoreIds,
    });
    setIsEditOpen(true);
  };

  const handleStoreToggle = (storeId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedStoreIds: prev.assignedStoreIds.includes(storeId)
        ? prev.assignedStoreIds.filter(id => id !== storeId)
        : [...prev.assignedStoreIds, storeId],
    }));
  };

  const handleCreate = async () => {
    if (!formData.username || !formData.displayName) {
      alert('아이디와 표시 이름은 필수입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/brands/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create franchise');
      }

      await loadData();
      setIsCreateOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedFranchise) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/brands/franchises/${selectedFranchise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName,
          assignedStoreIds: formData.assignedStoreIds,
          password: formData.password || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update franchise');
      }

      await loadData();
      setIsEditOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/brands/franchises/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete franchise');
      }

      await loadData();
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-500">오류 발생</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={loadData} className="mt-4">다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            브랜드 관리
          </h1>
          <p className="text-muted-foreground mt-2">
            프랜차이즈 본사 계정을 생성하고 매장 접근 권한을 관리합니다
          </p>
        </div>
        <Button onClick={handleCreateClick} className="gap-2">
          <Plus className="h-4 w-4" />
          새 브랜드 추가
        </Button>
      </div>

      {/* Franchise List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {franchises.map((franchise) => (
          <Card key={franchise.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {franchise.displayName}
                    {!franchise.isActive && (
                      <Badge variant="secondary" className="text-xs">비활성</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">@{franchise.username}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(franchise)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(franchise)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Store className="h-4 w-4" />
                  <span>{franchise.assignedStoreIds.length}개 매장 할당</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  생성일: {new Date(franchise.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {franchises.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">등록된 브랜드가 없습니다</p>
            <Button onClick={handleCreateClick} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              첫 브랜드 추가하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 브랜드 추가</DialogTitle>
            <DialogDescription>
              프랜차이즈 본사 계정을 생성하고 접근 가능한 매장을 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">아이디 *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="gangnam_hq"
              />
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">표시 이름 *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="강남지역 본사"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label>비밀번호</Label>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                >
                  {passwordCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                자동 생성된 비밀번호입니다. 반드시 복사하여 안전하게 보관하세요.
              </p>
            </div>

            {/* Store Selection */}
            <div className="space-y-2">
              <Label>접근 가능한 매장 ({formData.assignedStoreIds.length}개 선택)</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2">
                  {stores.map((store) => (
                    <div key={store._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-${store._id}`}
                        checked={formData.assignedStoreIds.includes(store._id)}
                        onCheckedChange={() => handleStoreToggle(store._id)}
                      />
                      <label
                        htmlFor={`create-${store._id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {store.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? '생성 중...' : '생성'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>브랜드 수정</DialogTitle>
            <DialogDescription>
              브랜드 정보와 매장 접근 권한을 수정합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Username (readonly) */}
            <div className="space-y-2">
              <Label>아이디</Label>
              <Input value={formData.username} disabled />
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">표시 이름 *</Label>
              <Input
                id="edit-displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>

            {/* Password (optional) */}
            <div className="space-y-2">
              <Label htmlFor="edit-password">새 비밀번호 (선택사항)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="변경하지 않으려면 비워두세요"
              />
            </div>

            {/* Store Selection */}
            <div className="space-y-2">
              <Label>접근 가능한 매장 ({formData.assignedStoreIds.length}개 선택)</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-2">
                  {stores.map((store) => (
                    <div key={store._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${store._id}`}
                        checked={formData.assignedStoreIds.includes(store._id)}
                        onCheckedChange={() => handleStoreToggle(store._id)}
                      />
                      <label
                        htmlFor={`edit-${store._id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {store.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? '수정 중...' : '수정'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>브랜드 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">{deleteTarget?.displayName}</span> 계정을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600"
            >
              {submitting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
