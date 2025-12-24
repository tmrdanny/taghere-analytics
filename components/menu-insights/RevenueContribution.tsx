'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { PieChart } from 'lucide-react';

interface RevenueContributionProps {
  startDate: Date;
  endDate: Date;
  storeIds?: string[];
  menuSearchTerm: string;
}

interface MenuContribution {
  menuName: string;
  revenue: number;
  revenuePercent: number;
  quantity: number;
  quantityPercent: number;
  cumulativePercent: number;
}

export function RevenueContribution({ startDate, endDate, storeIds, menuSearchTerm }: RevenueContributionProps) {
  const [data, setData] = useState<{ menuContributions: MenuContribution[]; totalRevenue: number; totalQuantity: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          type: 'contribution',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
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
          console.error('Revenue contribution error:', result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMsg);
        console.error('Failed to fetch revenue contribution:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  // Top 20 for chart
  const top20 = data.menuContributions.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Pareto Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Pareto 분석 (80/20 법칙)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={top20}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="menuName"
                angle={-45}
                textAnchor="end"
                height={120}
                interval={0}
                style={{ fontSize: '10px' }}
              />
              <YAxis yAxisId="left" label={{ value: '매출 (원)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: '누적 %', angle: 90, position: 'insideRight' }} />
              <Tooltip
                formatter={(value: any, name?: string) => {
                  if (name === 'revenue') return [formatCurrency(value), '매출'];
                  if (name === 'cumulativePercent') return [`${value.toFixed(1)}%`, '누적 %'];
                  return [value, name || ''];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="매출" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativePercent"
                stroke="#ff7300"
                strokeWidth={2}
                name="누적 %"
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">총 매출</div>
                <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">총 판매량</div>
                <div className="text-2xl font-bold">{data.totalQuantity.toLocaleString()}개</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Contributors Table */}
      <Card>
        <CardHeader>
          <CardTitle>메뉴별 기여도</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">순위</th>
                  <th className="text-left py-2 px-2">메뉴명</th>
                  <th className="text-right py-2 px-2">매출</th>
                  <th className="text-right py-2 px-2">매출 기여도</th>
                  <th className="text-right py-2 px-2">누적 %</th>
                </tr>
              </thead>
              <tbody>
                {data.menuContributions.slice(0, 20).map((item, index) => (
                  <tr key={index} className="border-b hover:bg-accent">
                    <td className="py-2 px-2">{index + 1}</td>
                    <td className="py-2 px-2 font-medium">{item.menuName}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(item.revenue)}</td>
                    <td className="text-right py-2 px-2">
                      <span className={`
                        px-2 py-1 rounded text-sm
                        ${item.revenuePercent >= 2 ? 'bg-green-100 text-green-800' :
                          item.revenuePercent >= 1 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        {item.revenuePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right py-2 px-2">
                      {item.cumulativePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
