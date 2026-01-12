'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Rocket, TrendingUp, TrendingDown, Store, BarChart3 } from 'lucide-react';

interface EmergingStoresSectionProps {
  storeIds?: string[];
}

interface EmergingStoreData {
  storeId: string;
  storeName: string;
  growthScore: number;
  rank: number;
  gmvGrowth: number;
  orderCountGrowth: number;
  paidAmountGrowth: number;
  recentGmv: number;
  recentOrders: number;
  recentPaidAmount: number;
  previousGmv: number;
  previousOrders: number;
  previousPaidAmount: number;
  recentActiveDays: number;
  previousActiveDays: number;
}

interface EmergingStoresData {
  summary: {
    totalAnalyzed: number;
    emergingCount: number;
    decliningCount: number;
    averageGrowthScore: number;
  };
  stores: EmergingStoreData[];
}

const PERIOD_OPTIONS = [
  { value: '7', label: '7일 vs 7일' },
  { value: '14', label: '14일 vs 14일' },
  { value: '30', label: '30일 vs 30일' },
];

function getGrowthBadgeStyle(score: number) {
  if (score >= 80) return { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: '급성장' };
  if (score >= 50) return { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', label: '성장' };
  if (score >= 20) return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: '안정' };
  if (score >= 0) return { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', label: '정체' };
  return { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', label: '하락' };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatGrowth(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function EmergingStoresSection({
  storeIds,
}: EmergingStoresSectionProps) {
  const [data, setData] = useState<EmergingStoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState('7');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          recentDays: periodDays,
          compareDays: periodDays,
          limit: '10',
        });

        if (storeIds && storeIds.length > 0) {
          params.append('storeIds', storeIds.join(','));
        }

        const response = await fetch(`/api/emerging-stores?${params}`);
        const result = await response.json();

        if (result.success) {
          setData({
            summary: result.summary,
            stores: result.stores,
          });
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [periodDays, storeIds]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            급성장 매장
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            급성장 매장
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            급성장 매장
          </CardTitle>
          <CardDescription>
            복합 지표 기반 성장률 분석 (GMV 40% + 주문수 35% + 선결제 25%)
          </CardDescription>
        </div>
        <Select value={periodDays} onValueChange={setPeriodDays}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-4 p-4 rounded-lg border">
            <div className="p-2.5 rounded-lg bg-muted">
              <TrendingUp className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">급성장 매장</p>
              <p className="text-2xl font-semibold">{data.summary.emergingCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg border">
            <div className="p-2.5 rounded-lg bg-muted">
              <BarChart3 className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">평균 성장 점수</p>
              <p className="text-2xl font-semibold">{data.summary.averageGrowthScore}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg border">
            <div className="p-2.5 rounded-lg bg-muted">
              <Store className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">분석 매장</p>
              <p className="text-2xl font-semibold">{data.summary.totalAnalyzed}</p>
            </div>
          </div>
        </div>

        {/* Stores Table */}
        {data.stores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">순위</th>
                  <th className="text-left py-3 px-4 font-medium">매장명</th>
                  <th className="text-center py-3 px-4 font-medium">성장 점수</th>
                  <th className="text-right py-3 px-4 font-medium">GMV 성장률</th>
                  <th className="text-right py-3 px-4 font-medium">주문수 성장률</th>
                  <th className="text-right py-3 px-4 font-medium">선결제 성장률</th>
                  <th className="text-right py-3 px-4 font-medium">최근 GMV</th>
                </tr>
              </thead>
              <tbody>
                {data.stores.map((store) => {
                  const badgeStyle = getGrowthBadgeStyle(store.growthScore);
                  return (
                    <tr key={store.storeId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-lg">{store.rank}</span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {store.storeName || store.storeId}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={`${badgeStyle.bg} ${badgeStyle.text}`}>
                          {store.growthScore} ({badgeStyle.label})
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={store.gmvGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {store.gmvGrowth >= 0 ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />}
                          {formatGrowth(store.gmvGrowth)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={store.orderCountGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatGrowth(store.orderCountGrowth)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={store.paidAmountGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatGrowth(store.paidAmountGrowth)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(store.recentGmv)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            분석 가능한 매장이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
