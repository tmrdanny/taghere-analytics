'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Activity, AlertTriangle, XCircle, CheckCircle, Search, ArrowUpDown, HelpCircle } from 'lucide-react';
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

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `₩${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `₩${(value / 1000).toFixed(0)}K`;
    }
    return `₩${value}`;
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={loadHealthCheck} className="mt-4 w-full">
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

  // Mobile store card component
  const MobileStoreCard = ({ store, idx }: { store: StoreHealth; idx: number }) => {
    const config = statusConfig[store.status];
    const StatusIcon = config.icon;

    return (
      <Card className="overflow-hidden">
        <div className="p-4">
          {/* Header row: Score + Name + Status */}
          <div className="flex items-start gap-3">
            {/* Health Score Circle */}
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
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

            {/* Store info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{store.storeName}</div>
              <div className="text-xs text-muted-foreground truncate">{store.storeId}</div>
            </div>

            {/* Status badge */}
            <Badge variant="outline" className={`flex-shrink-0 ${config.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">마지막 주문</div>
              <div className="font-medium">{store.daysSinceLastOrder}일 전</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">최근 GMV</div>
              <div className="font-medium">{formatCurrencyShort(store.recentGmv)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">GMV 변화</div>
              <div className={`font-medium ${getPercentColor(store.gmvChange)}`}>
                {formatPercent(store.gmvChange)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">메뉴/영업일</div>
              <div className="font-medium">
                <span className={getPercentColor(store.menuDiversityChange)}>
                  {formatPercent(store.menuDiversityChange)}
                </span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className={getPercentColor(store.activeDaysChange)}>
                  {formatPercent(store.activeDaysChange)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background p-3 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" />
              <span className="truncate">Health Check</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              매장 이탈 위험 모니터링
            </p>
          </div>
          <Button onClick={loadHealthCheck} variant="outline" size="sm" className="flex-shrink-0">
            새로고침
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 md:pt-6 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:gap-4">
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

              {/* Status Filter + Sort in a row on mobile */}
              <div className="flex gap-2 md:gap-4">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="flex-1 md:w-[140px]">
                    <SelectValue placeholder="상태" />
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
                  <SelectTrigger className="flex-1 md:w-[180px]">
                    <SelectValue placeholder="정렬" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthScore-asc">점수 낮은순</SelectItem>
                    <SelectItem value="healthScore-desc">점수 높은순</SelectItem>
                    <SelectItem value="daysSinceLastOrder-desc">오래된순</SelectItem>
                    <SelectItem value="daysSinceLastOrder-asc">최근순</SelectItem>
                    <SelectItem value="gmvChange-asc">GMV↓</SelectItem>
                    <SelectItem value="gmvChange-desc">GMV↑</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store List - Mobile Cards */}
        <div className="md:hidden space-y-3">
          <div className="text-sm text-muted-foreground px-1">
            {filteredStores.length}개 매장
          </div>
          {filteredStores.map((store, idx) => (
            <MobileStoreCard key={store.storeId} store={store} idx={idx} />
          ))}
          {filteredStores.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          )}
        </div>

        {/* Store Table - Desktop only */}
        <Card className="hidden md:block">
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
