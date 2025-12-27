'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Activity, Store, AlertTriangle, XCircle, CheckCircle, Search, ArrowUpDown, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StoreHealth {
  storeId: string;
  storeName: string;
  healthScore: number;
  status: 'active' | 'warning' | 'danger' | 'churned';
  lastOrderDate: string;
  daysSinceLastOrder: number;
  gmvChange: number;
  menuDiversityChange: number;
  activeDaysChange: number;
  recentGmv: number;
  previousGmv: number;
}

interface HealthCheckData {
  summary: {
    active: number;
    warning: number;
    danger: number;
    churned: number;
    total: number;
  };
  stores: StoreHealth[];
}

type SortField = 'healthScore' | 'daysSinceLastOrder' | 'gmvChange' | 'storeName';
type StatusFilter = 'all' | 'active' | 'warning' | 'danger' | 'churned';

const statusConfig = {
  active: {
    label: '활성',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    icon: CheckCircle,
  },
  warning: {
    label: '주의',
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    icon: AlertTriangle,
  },
  danger: {
    label: '위험',
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    icon: AlertTriangle,
  },
  churned: {
    label: '이탈',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    icon: XCircle,
  },
};

export default function HealthCheckPage() {
  const [data, setData] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('healthScore');
  const [sortAsc, setSortAsc] = useState(true);

  const loadHealthCheck = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/health-check?limit=2000');

      if (!response.ok) {
        throw new Error(`Server error (${response.status})`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to load health check data');
      }
    } catch (err: any) {
      console.error('Health check fetch error:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthCheck();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getPercentColor = (value: number) => {
    if (value >= 0) return 'text-green-500';
    if (value >= -20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'healthScore'); // Default ascending for score, descending for others
    }
  };

  // Filter and sort stores
  const getFilteredStores = () => {
    if (!data) return [];

    let stores = [...data.stores];

    // Apply status filter
    if (statusFilter !== 'all') {
      stores = stores.filter((s) => s.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      stores = stores.filter(
        (s) =>
          s.storeName.toLowerCase().includes(query) ||
          s.storeId.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    stores.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'healthScore':
          comparison = a.healthScore - b.healthScore;
          break;
        case 'daysSinceLastOrder':
          comparison = a.daysSinceLastOrder - b.daysSinceLastOrder;
          break;
        case 'gmvChange':
          comparison = a.gmvChange - b.gmvChange;
          break;
        case 'storeName':
          comparison = a.storeName.localeCompare(b.storeName);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return stores;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={loadHealthCheck} className="mt-4">
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const filteredStores = getFilteredStores();

  // Tooltip component for column headers
  const ColumnTooltip = ({ text }: { text: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Health Check
            </h1>
            <p className="text-muted-foreground mt-1">
              매장 이탈 위험 모니터링
            </p>
          </div>
          <Button onClick={loadHealthCheck} variant="outline" size="sm">
            새로고침
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">전체 매장</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.total}</div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-500">활성</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{data.summary.active}</div>
              <p className="text-xs text-muted-foreground">7일 이내 주문</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-yellow-500">주의</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{data.summary.warning}</div>
              <p className="text-xs text-muted-foreground">8-30일 미주문</p>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-500">위험</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{data.summary.danger}</div>
              <p className="text-xs text-muted-foreground">31-90일 미주문</p>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-500">이탈</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{data.summary.churned}</div>
              <p className="text-xs text-muted-foreground">90일+ 미주문</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="매장명 또는 ID로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="상태 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="warning">주의</SelectItem>
                  <SelectItem value="danger">위험</SelectItem>
                  <SelectItem value="churned">이탈</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={`${sortField}-${sortAsc ? 'asc' : 'desc'}`}
                onValueChange={(v) => {
                  const [field, dir] = v.split('-');
                  setSortField(field as SortField);
                  setSortAsc(dir === 'asc');
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthScore-asc">Health Score (낮은순)</SelectItem>
                  <SelectItem value="healthScore-desc">Health Score (높은순)</SelectItem>
                  <SelectItem value="daysSinceLastOrder-desc">마지막 주문일 (오래된순)</SelectItem>
                  <SelectItem value="daysSinceLastOrder-asc">마지막 주문일 (최근순)</SelectItem>
                  <SelectItem value="gmvChange-asc">GMV 변화 (낮은순)</SelectItem>
                  <SelectItem value="gmvChange-desc">GMV 변화 (높은순)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Store Table */}
        <Card>
          <CardHeader>
            <CardTitle>매장 상세</CardTitle>
            <CardDescription>
              {filteredStores.length}개 매장 표시
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">순위</th>
                    <th className="text-left py-3 px-4 font-medium">
                      <button
                        onClick={() => handleSort('storeName')}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        매장명
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-center py-3 px-4 font-medium whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleSort('healthScore')}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          Health Score
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                        <ColumnTooltip text="0~100점. 70+ 양호, 50~69 주의 필요, 25~49 위험, 25 미만 이탈 가능성 높음. GMV·메뉴·영업일 변화와 마지막 주문일 기준으로 산출됩니다." />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium">상태</th>
                    <th className="text-center py-3 px-4 font-medium">
                      <button
                        onClick={() => handleSort('daysSinceLastOrder')}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        마지막 주문
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-medium whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSort('gmvChange')}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          GMV 변화
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                        <ColumnTooltip text="최근 7일 GMV와 이전 7일 GMV의 변화율. 마이너스는 매출 감소를 의미합니다." />
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 font-medium whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <span>메뉴 변화</span>
                        <ColumnTooltip text="최근 7일간 판매된 메뉴 종류와 이전 7일 대비 변화율. 메뉴 다양성 감소는 이탈 신호입니다." />
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 font-medium whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <span>영업일 변화</span>
                        <ColumnTooltip text="최근 7일 중 주문이 있던 날 수와 이전 7일 대비 변화율. 영업일 감소는 이탈 신호입니다." />
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 font-medium">최근 GMV</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map((store, idx) => {
                    const config = statusConfig[store.status];
                    const StatusIcon = config.icon;

                    return (
                      <tr
                        key={store.storeId}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{store.storeName}</div>
                          <div className="text-xs text-muted-foreground">{store.storeId}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div
                            className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${
                              store.healthScore >= 70
                                ? 'bg-green-500/10 text-green-500'
                                : store.healthScore >= 50
                                ? 'bg-yellow-500/10 text-yellow-500'
                                : store.healthScore >= 25
                                ? 'bg-orange-500/10 text-orange-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {store.healthScore}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={config.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div>{store.lastOrderDate}</div>
                          <div className="text-xs text-muted-foreground">
                            {store.daysSinceLastOrder}일 전
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-right ${getPercentColor(store.gmvChange)}`}>
                          {formatPercent(store.gmvChange)}
                        </td>
                        <td className={`py-3 px-4 text-right ${getPercentColor(store.menuDiversityChange)}`}>
                          {formatPercent(store.menuDiversityChange)}
                        </td>
                        <td className={`py-3 px-4 text-right ${getPercentColor(store.activeDaysChange)}`}>
                          {formatPercent(store.activeDaysChange)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(store.recentGmv)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredStores.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </TooltipProvider>
  );
}
