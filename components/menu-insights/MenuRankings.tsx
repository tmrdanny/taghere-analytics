'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, DollarSign } from 'lucide-react';

interface MenuRankingsProps {
  startDate: Date;
  endDate: Date;
  storeIds?: string[];
  menuSearchTerm: string;
}

interface MenuRanking {
  menuName: string;
  quantity: number;
  revenue: number;
  orderCount: number;
  avgPrice: number;
}

export function MenuRankings({ startDate, endDate, storeIds, menuSearchTerm }: MenuRankingsProps) {
  const [data, setData] = useState<{ topByQuantity: MenuRanking[]; topByRevenue: MenuRanking[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[MenuRankings] Fetching with dates:', {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        });

        if (!startDate || !endDate) {
          setError('날짜 범위를 선택해주세요');
          setLoading(false);
          return;
        }

        const params = new URLSearchParams({
          type: 'rankings',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: '10',
        });

        if (storeIds && storeIds.length > 0) {
          params.append('storeIds', storeIds.join(','));
        }

        if (menuSearchTerm) {
          params.append('menuName', menuSearchTerm);
        }

        const response = await fetch(`/api/menu-insights?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch data');
          console.error('Menu rankings error:', result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMsg);
        console.error('Failed to fetch menu rankings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, storeIds, menuSearchTerm]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 font-medium mb-2">데이터를 불러올 수 없습니다.</div>
        <div className="text-sm text-muted-foreground">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        데이터가 없습니다.
      </div>
    );
  }

  const hasData = data.topByQuantity.length > 0 || data.topByRevenue.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="mb-2">선택한 기간에 메뉴 데이터가 없습니다.</p>
        <p className="text-sm">캐시를 새로고침하거나 다른 기간을 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Top by Quantity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            판매량 Top 10
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.topByQuantity.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold
                    ${index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-muted text-muted-foreground'}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{item.menuName}</div>
                    <div className="text-sm text-muted-foreground">
                      평균 {formatCurrency(item.avgPrice)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{formatNumber(item.quantity)}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top by Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-green-500" />
            매출 Top 10
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.topByRevenue.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold
                    ${index === 0 ? 'bg-green-500 text-white' :
                      index === 1 ? 'bg-green-400 text-white' :
                      index === 2 ? 'bg-green-300 text-white' :
                      'bg-muted text-muted-foreground'}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{item.menuName}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(item.quantity)}개 판매
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{formatCurrency(item.revenue)}</div>
                  <div className="text-sm text-muted-foreground">
                    평균 {formatCurrency(item.avgPrice)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
