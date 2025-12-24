'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MenuTrendAnalysisProps {
  startDate: Date;
  endDate: Date;
  storeIds?: string[];
  menuSearchTerm: string;
}

interface MenuTrend {
  menuName: string;
  dailyData: Array<{
    date: string;
    quantity: number;
    revenue: number;
  }>;
  growthRate: number;
  averageDaily: number;
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#a4de6c', '#d0ed57', '#83a6ed', '#8e44ad', '#e74c3c'
];

export function MenuTrendAnalysis({ startDate, endDate, storeIds, menuSearchTerm }: MenuTrendAnalysisProps) {
  const [data, setData] = useState<{ menuTrends: MenuTrend[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          type: 'trends',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: '5',
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
          console.error('Menu trends error:', result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMsg);
        console.error('Failed to fetch menu trends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, storeIds, menuSearchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data || data.menuTrends.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        트렌드 데이터가 없습니다.
      </div>
    );
  }

  // Combine all daily data for the chart
  const allDates = Array.from(
    new Set(
      data.menuTrends.flatMap(trend =>
        trend.dailyData.map(d => d.date)
      )
    )
  ).sort();

  const chartData = allDates.map(date => {
    const dataPoint: any = { date };
    data.menuTrends.forEach(trend => {
      const dayData = trend.dailyData.find(d => d.date === date);
      dataPoint[trend.menuName] = dayData?.quantity || 0;
    });
    return dataPoint;
  });

  return (
    <div className="space-y-6">
      {/* Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>메뉴별 판매 트렌드 (Top 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: '판매량', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {data.menuTrends.map((trend, index) => (
                <Line
                  key={trend.menuName}
                  type="monotone"
                  dataKey={trend.menuName}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Growth Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.menuTrends.map((trend, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium truncate" title={trend.menuName}>
                {trend.menuName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">일평균</span>
                  <span className="font-bold">{Math.round(trend.averageDaily)}개</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">성장률</span>
                  <div className={`flex items-center gap-1 font-bold ${
                    trend.growthRate > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend.growthRate > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {trend.growthRate.toFixed(1)}%
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    첫날: {trend.dailyData[0]?.quantity || 0}개 →{' '}
                    마지막날: {trend.dailyData[trend.dailyData.length - 1]?.quantity || 0}개
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
