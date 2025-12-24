'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Store, CreditCard, BarChart3 } from 'lucide-react';
import { StoreGroupsManager } from '@/components/store-groups/StoreGroupsManager';
import { StoreGroup } from '@/lib/types/store-groups';
import { MenuInsightsDashboard } from '@/components/menu-insights/MenuInsightsDashboard';
import { DataSyncButton } from '@/components/DataSyncButton';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, subYears } from 'date-fns';

interface DashboardData {
  totalGMV: number;
  totalPaidAmount: number;
  totalOrders: number;
  avgOrderValue: number;
  activeStores: number;
  paymentSuccessRate: number;
  dailyMetrics: Array<{
    date: string;
    gmv: number;
    paidAmount: number;
    orders: number;
  }>;
  topStoresByGMV: Array<{
    storeId: string;
    storeName: string;
    gmv: number;
    orders: number;
  }>;
  topMenusByQuantity: Array<{
    menuId: string;
    menuName: string;
    quantity: number;
    revenue: number;
  }>;
  topMenusByRevenue: Array<{
    menuId: string;
    menuName: string;
    revenue: number;
    quantity: number;
  }>;
}

type DatePreset = 'today' | 'last7days' | 'last30days' | 'last90days' | 'last180days' | 'lastYear' | 'thisMonth' | 'lastMonth' | 'allData' | 'custom';

function getDateRangeFromPreset(preset: DatePreset): { startDate: Date; endDate: Date } {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case 'last7days':
      return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) };
    case 'last30days':
      return { startDate: startOfDay(subDays(now, 29)), endDate: endOfDay(now) };
    case 'last90days':
      return { startDate: startOfDay(subDays(now, 89)), endDate: endOfDay(now) };
    case 'last180days':
      return { startDate: startOfDay(subDays(now, 179)), endDate: endOfDay(now) };
    case 'lastYear':
      return { startDate: startOfDay(subYears(now, 1)), endDate: endOfDay(now) };
    case 'thisMonth':
      return { startDate: startOfMonth(now), endDate: endOfDay(now) };
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    }
    case 'allData':
      return { startDate: startOfDay(subYears(now, 10)), endDate: endOfDay(now) };
    default:
      return { startDate: startOfDay(subDays(now, 6)), endDate: endOfDay(now) };
  }
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('last7days');
  const [cached, setCached] = useState(false);
  const [dateMode, setDateMode] = useState<'preset' | 'custom'>('preset');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<StoreGroup | null>(null);
  const [trendGranularity, setTrendGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/dashboard?';

      if (dateMode === 'custom' && customStartDate && customEndDate) {
        url += `startDate=${customStartDate.toISOString()}&endDate=${customEndDate.toISOString()}`;
      } else {
        url += `preset=${datePreset}`;
      }

      // Add store filtering
      if (selectedGroup && selectedGroup.storeIds.length > 0) {
        url += `&storeIds=${selectedGroup.storeIds.join(',')}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText || 'Unknown error'}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }

      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      if (result.success) {
        setData(result.data);
        setCached(result.cached || false);
      } else {
        setError(result.error || result.hint || 'Failed to load dashboard');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Aggregate daily metrics to weekly or monthly
  const getAggregatedMetrics = (
    dailyMetrics: DashboardData['dailyMetrics'],
    granularity: 'daily' | 'weekly' | 'monthly'
  ) => {
    if (granularity === 'daily') {
      return dailyMetrics;
    }

    const aggregated: typeof dailyMetrics = [];
    const grouped: { [key: string]: typeof dailyMetrics } = {};

    dailyMetrics.forEach((metric) => {
      const date = new Date(metric.date);
      let key: string;

      if (granularity === 'weekly') {
        // Get week starting date (Monday)
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        key = weekStart.toISOString().split('T')[0];
      } else {
        // Monthly
        key = metric.date.substring(0, 7); // YYYY-MM
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(metric);
    });

    Object.entries(grouped).forEach(([key, metrics]) => {
      const totalGmv = metrics.reduce((sum, m) => sum + m.gmv, 0);
      const totalPaidAmount = metrics.reduce((sum, m) => sum + m.paidAmount, 0);
      const totalOrders = metrics.reduce((sum, m) => sum + m.orders, 0);

      aggregated.push({
        date: key,
        gmv: totalGmv,
        paidAmount: totalPaidAmount,
        orders: totalOrders,
      });
    });

    return aggregated;
  };

  useEffect(() => {
    loadDashboard();
  }, [datePreset, customStartDate, customEndDate, dateMode, selectedGroup]);

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

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
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
            <p className="text-sm text-muted-foreground mt-2">
              Please check your MongoDB connection and ensure metrics are aggregated.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {/* <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Taghere Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              태그히어 이용 매장 지표/통계
            </p> */}
          </div>

          <div className="flex items-center gap-2">
            {cached && (
              <Badge variant="outline" className="text-xs">
                Cached
              </Badge>
            )}

            {/* Mode Toggle Buttons */}
            <div className="flex rounded-md border border-input">
              <Button
                variant={dateMode === 'preset' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateMode('preset')}
              >
                Presets
              </Button>
              <Button
                variant={dateMode === 'custom' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateMode('custom')}
              >
                Custom Range
              </Button>
            </div>

            {/* Conditional Rendering */}
            {dateMode === 'preset' ? (
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last90days">Last 90 Days</SelectItem>
                  <SelectItem value="last180days">Last 6 Months</SelectItem>
                  <SelectItem value="lastYear">Last Year</SelectItem>
                  <SelectItem value="allData">All Data</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <DateRangePicker
                startDate={customStartDate}
                endDate={customEndDate}
                onChange={(start, end) => {
                  setCustomStartDate(start);
                  setCustomEndDate(end);
                }}
              />
            )}
          </div>
        </div>

        {/* Store Groups Manager */}
        <StoreGroupsManager
          selectedGroupId={selectedGroup?.id}
          onGroupSelected={setSelectedGroup}
        />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total GMV (거래액)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.totalGMV)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Gross Merchandise Value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount (선결제)</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.totalPaidAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                orderStd 매장만 집계
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(data.totalOrders)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Order count
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.avgOrderValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per order
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(data.activeStores)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                With orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Payment Success</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercent(data.paymentSuccessRate)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Success rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Series Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Daily GMV and paid amount over time</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={trendGranularity === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrendGranularity('daily')}
              >
                Daily
              </Button>
              <Button
                variant={trendGranularity === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrendGranularity('weekly')}
              >
                Weekly
              </Button>
              <Button
                variant={trendGranularity === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrendGranularity('monthly')}
              >
                Monthly
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getAggregatedMetrics(data.dailyMetrics, trendGranularity)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="gmv"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="GMV"
                  />
                  <Line
                    type="monotone"
                    dataKey="paidAmount"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Paid Amount (선결제)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Tables */}
        <Tabs defaultValue="stores" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stores">Top Stores</TabsTrigger>
            <TabsTrigger value="menus-qty">Top Menus (Qty)</TabsTrigger>
            <TabsTrigger value="menus-rev">Top Menus (Revenue)</TabsTrigger>
          </TabsList>

          <TabsContent value="stores">
            <Card>
              <CardHeader>
                <CardTitle>Top Stores by GMV</CardTitle>
                <CardDescription>Highest performing stores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">Rank</th>
                        <th className="text-left py-2 px-4 font-medium">Store</th>
                        <th className="text-right py-2 px-4 font-medium">GMV</th>
                        <th className="text-right py-2 px-4 font-medium">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topStoresByGMV.map((store, idx) => (
                        <tr key={store.storeId} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{idx + 1}</td>
                          <td className="py-2 px-4 font-medium">
                            {store.storeName || store.storeId}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {formatCurrency(store.gmv)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {formatNumber(store.orders)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menus-qty">
            <Card>
              <CardHeader>
                <CardTitle>Top Menus by Quantity Sold</CardTitle>
                <CardDescription>Most popular menu items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">Rank</th>
                        <th className="text-left py-2 px-4 font-medium">Menu</th>
                        <th className="text-right py-2 px-4 font-medium">Quantity</th>
                        <th className="text-right py-2 px-4 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topMenusByQuantity.map((menu, idx) => (
                        <tr key={menu.menuId} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{idx + 1}</td>
                          <td className="py-2 px-4 font-medium">{menu.menuName}</td>
                          <td className="py-2 px-4 text-right">
                            {formatNumber(menu.quantity)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {formatCurrency(menu.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menus-rev">
            <Card>
              <CardHeader>
                <CardTitle>Top Menus by Revenue</CardTitle>
                <CardDescription>Highest revenue generating menu items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">Rank</th>
                        <th className="text-left py-2 px-4 font-medium">Menu</th>
                        <th className="text-right py-2 px-4 font-medium">Revenue</th>
                        <th className="text-right py-2 px-4 font-medium">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topMenusByRevenue.map((menu, idx) => (
                        <tr key={menu.menuId} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{idx + 1}</td>
                          <td className="py-2 px-4 font-medium">{menu.menuName}</td>
                          <td className="py-2 px-4 text-right">
                            {formatCurrency(menu.revenue)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {formatNumber(menu.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Menu Insights Dashboard */}
        <MenuInsightsDashboard
          startDate={
            dateMode === 'custom' && customStartDate
              ? customStartDate
              : getDateRangeFromPreset(datePreset).startDate
          }
          endDate={
            dateMode === 'custom' && customEndDate
              ? customEndDate
              : getDateRangeFromPreset(datePreset).endDate
          }
          storeIds={selectedGroup?.storeIds}
        />

        {/* Data Sync Button */}
        <div className="flex justify-center py-8 border-t">
          <DataSyncButton />
        </div>
      </div>
    </div>
  );
}
