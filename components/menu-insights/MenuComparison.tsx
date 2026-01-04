'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Plus, Download } from 'lucide-react';
import { StoreGroup } from '@/lib/types/store-groups';
import * as XLSX from 'xlsx';

interface MenuComparisonProps {
  startDate: Date;
  endDate: Date;
  storeIds?: string[];
  selectedGroup?: StoreGroup | null;
}

interface MenuData {
  menuName: string;
  quantity: number;
  revenue: number;
}

interface ComparisonData {
  name: string;
  value: number;
  [key: string]: any;
}

interface StoreMenuData {
  storeId: string;
  storeName: string;
  menus: MenuData[];
  comparisonData: ComparisonData[];
  totalGmv: number;
  totalPaidAmount: number;
  totalQuantity: number;
}

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
];

export function MenuComparison({
  startDate,
  endDate,
  storeIds,
  selectedGroup,
}: MenuComparisonProps) {
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuSearchResults, setMenuSearchResults] = useState<MenuData[]>([]);
  const [selectedMenus, setSelectedMenus] = useState<MenuData[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [showMenuSearch, setShowMenuSearch] = useState(false);
  const [storeMenuDataList, setStoreMenuDataList] = useState<StoreMenuData[]>([]);
  const [isLoadingStoreData, setIsLoadingStoreData] = useState(false);
  const [storeNamesMap, setStoreNamesMap] = useState<Record<string, string>>({});
  const [comparisonTab, setComparisonTab] = useState<'quantity' | 'revenue' | 'paidAmount'>('revenue');

  // Check if store is selected
  const hasSelectedStores = storeIds && storeIds.length > 0;

  // Fetch store names when storeIds change
  useEffect(() => {
    if (!hasSelectedStores) {
      setStoreNamesMap({});
      return;
    }

    const fetchStoreNames = async () => {
      try {
        const params = new URLSearchParams({
          storeIds: storeIds!.join(','),
        });
        const response = await fetch(`/api/stores/names?${params}`);
        const result = await response.json();

        if (result.success && result.storeNames) {
          setStoreNamesMap(result.storeNames);
        }
      } catch (error) {
        console.error('Failed to fetch store names:', error);
      }
    };

    fetchStoreNames();
  }, [storeIds, hasSelectedStores]);

  // Search menus
  useEffect(() => {
    if (!menuSearchTerm.trim() || !menuSearchTerm || !hasSelectedStores) {
      setMenuSearchResults([]);
      return;
    }

    const searchMenus = async () => {
      setMenuLoading(true);
      setMenuError(null);
      try {
        const params = new URLSearchParams({
          type: 'rankings',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          storeIds: storeIds!.join(','),
          menuName: menuSearchTerm,
          limit: '50',
        });

        const response = await fetch(`/api/menu-insights?${params}`);
        const result = await response.json();

        if (result.success && result.data) {
          const menuList = result.data.topByQuantity.map((menu: any) => ({
            menuName: menu.menuName,
            quantity: menu.quantity,
            revenue: menu.revenue,
          }));
          setMenuSearchResults(menuList);
        } else {
          setMenuError(result.error || 'Failed to fetch menus');
          console.error('Menu search error:', result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setMenuError(errorMsg);
        console.error('Failed to search menus:', error);
      } finally {
        setMenuLoading(false);
      }
    };

    searchMenus();
  }, [menuSearchTerm, hasSelectedStores, storeIds, startDate, endDate]);

  // Fetch per-store menu data for selected menus
  useEffect(() => {
    if (!hasSelectedStores || selectedMenus.length === 0) {
      setStoreMenuDataList([]);
      return;
    }

    const fetchPerStoreData = async () => {
      setIsLoadingStoreData(true);
      try {
        // Fetch menu rankings for each store separately
        const storeDataPromises = storeIds!.map(async (storeId) => {
          const params = new URLSearchParams({
            type: 'rankings',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            storeIds: storeId,
            limit: '100',
          });

          const response = await fetch(`/api/menu-insights?${params}`);
          const result = await response.json();

          if (result.success && result.data) {
            // Filter to selected menus only
            const filteredMenus = result.data.topByQuantity
              .filter((menu: any) =>
                selectedMenus.some((m) => m.menuName === menu.menuName)
              )
              .map((menu: any) => ({
                menuName: menu.menuName,
                quantity: menu.quantity,
                revenue: menu.revenue,
              }));

            // Create comparison data for this store
            const comparisonData = filteredMenus.map((menu: MenuData) => ({
              name: menu.menuName,
              value: menu.quantity,
            }));

            const totalGmv = filteredMenus.reduce((sum: number, m: MenuData) => sum + m.revenue, 0);
            const totalQuantity = filteredMenus.reduce((sum: number, m: MenuData) => sum + m.quantity, 0);
            // Paid amount approximated as 5% of GMV (this should come from actual API data)
            const totalPaidAmount = Math.round(totalGmv * 0.05);

            return {
              storeId,
              storeName: storeNamesMap[storeId] || storeId,
              menus: filteredMenus,
              comparisonData,
              totalGmv,
              totalPaidAmount,
              totalQuantity,
            };
          }
          return null;
        });

        const results = await Promise.all(storeDataPromises);
        const filteredResults = results.filter(
          (r): r is StoreMenuData => r !== null
        );
        setStoreMenuDataList(filteredResults);
      } catch (error) {
        console.error('Failed to fetch per-store data:', error);
      } finally {
        setIsLoadingStoreData(false);
      }
    };

    fetchPerStoreData();
  }, [selectedMenus, storeIds, startDate, endDate, hasSelectedStores, storeNamesMap]);

  const handleSelectMenu = (menu: MenuData) => {
    // Check if menu is already selected
    if (!selectedMenus.find((m) => m.menuName === menu.menuName)) {
      setSelectedMenus([...selectedMenus, menu]);
      setMenuSearchTerm('');
      setShowMenuSearch(false);
    }
  };

  const handleRemoveMenu = (menuName: string) => {
    setSelectedMenus(selectedMenus.filter((m) => m.menuName !== menuName));
  };

  const getComparisonValue = (menu: MenuData, type: 'quantity' | 'revenue' | 'paidAmount') => {
    switch (type) {
      case 'quantity':
        return menu.quantity;
      case 'revenue':
        return menu.revenue;
      case 'paidAmount':
        return Math.round(menu.revenue * 0.05);
      default:
        return menu.quantity;
    }
  };

  const getComparisonLabel = (type: 'quantity' | 'revenue' | 'paidAmount') => {
    switch (type) {
      case 'quantity':
        return '판매량';
      case 'revenue':
        return '거래액';
      case 'paidAmount':
        return '선결제액';
      default:
        return '판매량';
    }
  };

  const formatValue = (value: number, type: 'quantity' | 'revenue' | 'paidAmount') => {
    if (type === 'quantity') {
      return `${value.toLocaleString()}개`;
    }
    return `₩${value.toLocaleString()}`;
  };

  const exportToExcel = () => {
    if (storeMenuDataList.length === 0) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary by Store
    const summaryData = storeMenuDataList.map((store) => ({
      '매장명': store.storeName,
      '매장ID': store.storeId,
      '총 거래액': store.totalGmv,
      '총 선결제액': store.totalPaidAmount,
      '총 판매량': store.totalQuantity,
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, '매장별 요약');

    // Sheet 2: Detailed Menu Data
    const detailData: any[] = [];
    storeMenuDataList.forEach((store) => {
      store.menus.forEach((menu) => {
        detailData.push({
          '매장명': store.storeName,
          '매장ID': store.storeId,
          '메뉴명': menu.menuName,
          '거래액': menu.revenue,
          '선결제액': Math.round(menu.revenue * 0.05),
          '판매량': menu.quantity,
        });
      });
    });
    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, detailSheet, '메뉴별 상세');

    // Sheet 3: Menu Comparison Pivot
    const menuNames = selectedMenus.map((m) => m.menuName);
    const pivotData: any[] = [];

    menuNames.forEach((menuName) => {
      const row: any = { '메뉴명': menuName };
      storeMenuDataList.forEach((store) => {
        const menu = store.menus.find((m) => m.menuName === menuName);
        row[`${store.storeName} (거래액)`] = menu?.revenue || 0;
        row[`${store.storeName} (판매량)`] = menu?.quantity || 0;
      });
      pivotData.push(row);
    });

    const pivotSheet = XLSX.utils.json_to_sheet(pivotData);
    XLSX.utils.book_append_sheet(wb, pivotSheet, '메뉴 비교 피벗');

    // Generate filename with date range
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const filename = `메뉴비교_${startStr}_${endStr}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>거래액, 선결제액, 판매량 비교</CardTitle>
            <CardDescription>
              매장을 선택한 후 메뉴들을 비교하여 매출 및 판매량 구성을 확인합니다.
            </CardDescription>
          </div>
          {storeMenuDataList.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Excel 다운로드
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!hasSelectedStores ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>대시보드 상단에서 매장을 선택하여 비교해보세요.</p>
          </div>
        ) : (
          <>
            {/* Selected Stores Info */}
            <div className="space-y-2">
              <label className="text-sm font-medium">선택된 매장</label>
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="text-sm">
                  {storeIds && storeIds.length} 개 매장이 선택되었습니다.
                </div>
              </div>
            </div>

            {/* Menu Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">메뉴 선택</label>
              <div className="relative">
                <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="메뉴 검색... (예: 카스, 테라)"
                  value={menuSearchTerm}
                  onChange={(e) => {
                    setMenuSearchTerm(e.target.value);
                    setShowMenuSearch(true);
                  }}
                  onFocus={() => setShowMenuSearch(true)}
                  className="pl-9"
                />

                {showMenuSearch && menuSearchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-2 border rounded-lg bg-background shadow-lg z-50 max-h-48 overflow-y-auto">
                    {menuLoading ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        검색 중...
                      </div>
                    ) : menuSearchResults.length > 0 ? (
                      <div className="divide-y">
                        {menuSearchResults
                          .filter(
                            (menu) =>
                              !selectedMenus.find(
                                (m) => m.menuName === menu.menuName
                              )
                          )
                          .map((menu) => (
                            <button
                              key={menu.menuName}
                              onClick={() => handleSelectMenu(menu)}
                              className="w-full text-left px-4 py-2 hover:bg-muted transition-colors text-sm"
                            >
                              <div className="font-medium">{menu.menuName}</div>
                              <div className="text-xs text-muted-foreground">
                                판매량: {menu.quantity.toLocaleString()} | 매출: ₩
                                {menu.revenue.toLocaleString()}
                              </div>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        메뉴를 찾을 수 없습니다.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Menus */}
              {selectedMenus.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    선택된 메뉴 ({selectedMenus.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMenus.map((menu) => (
                      <Badge
                        key={menu.menuName}
                        variant="secondary"
                        className="flex items-center gap-1 pl-3 pr-1 py-1"
                      >
                        {menu.menuName}
                        <button
                          onClick={() => handleRemoveMenu(menu.menuName)}
                          className="ml-1 hover:bg-black/20 rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comparison Tabs */}
            {selectedMenus.length > 0 && storeMenuDataList.length > 0 && (
              <div className="space-y-6">
                <div className="border-t pt-4">
                  <Tabs value={comparisonTab} onValueChange={(v) => setComparisonTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="revenue">거래액</TabsTrigger>
                      <TabsTrigger value="paidAmount">선결제액</TabsTrigger>
                      <TabsTrigger value="quantity">판매량</TabsTrigger>
                    </TabsList>

                    <TabsContent value={comparisonTab} className="mt-6">
                      <h3 className="text-sm font-medium mb-6">
                        매장별 {getComparisonLabel(comparisonTab)} 비교
                      </h3>
                      <div className="grid gap-6 lg:grid-cols-2">
                        {storeMenuDataList.map((storeData) => {
                          const storeTotal = storeData.menus.reduce(
                            (sum, m) => sum + getComparisonValue(m, comparisonTab),
                            0
                          );

                          const chartData = storeData.menus.map((menu) => ({
                            name: menu.menuName,
                            value: getComparisonValue(menu, comparisonTab),
                          }));

                          return (
                            <Card key={storeData.storeId}>
                              <CardHeader>
                                <CardTitle className="text-base">
                                  {storeData.storeName}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {chartData.length > 0 ? (
                                  <>
                                    {/* Pie Chart */}
                                    <ResponsiveContainer width="100%" height={250}>
                                      <PieChart>
                                        <Pie
                                          data={chartData}
                                          cx="50%"
                                          cy="50%"
                                          labelLine={false}
                                          label={({ name, value }) => {
                                            const percent = (
                                              (value / storeTotal) *
                                              100
                                            ).toFixed(1);
                                            return `${name} (${percent}%)`;
                                          }}
                                          outerRadius={70}
                                          fill="#8884d8"
                                          dataKey="value"
                                        >
                                          {chartData.map(
                                            (entry, index) => (
                                              <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                              />
                                            )
                                          )}
                                        </Pie>
                                        <Tooltip
                                          formatter={(value: any) => {
                                            if (typeof value === 'number') {
                                              const percent = (
                                                (value / storeTotal) *
                                                100
                                              ).toFixed(1);
                                              return [
                                                `${formatValue(value, comparisonTab)} (${percent}%)`,
                                                getComparisonLabel(comparisonTab),
                                              ];
                                            }
                                            return [value, getComparisonLabel(comparisonTab)];
                                          }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                      </PieChart>
                                    </ResponsiveContainer>

                                    {/* Summary Table */}
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-2 px-2 font-medium">
                                              메뉴
                                            </th>
                                            <th className="text-right py-2 px-2 font-medium">
                                              {getComparisonLabel(comparisonTab)}
                                            </th>
                                            <th className="text-right py-2 px-2 font-medium">
                                              %
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {storeData.menus
                                            .sort((a, b) =>
                                              getComparisonValue(b, comparisonTab) -
                                              getComparisonValue(a, comparisonTab)
                                            )
                                            .map((menu) => {
                                              const value = getComparisonValue(menu, comparisonTab);
                                              const percent = (
                                                (value / storeTotal) *
                                                100
                                              ).toFixed(1);
                                              return (
                                                <tr
                                                  key={menu.menuName}
                                                  className="border-b hover:bg-muted/50"
                                                >
                                                  <td className="py-2 px-2 text-xs">
                                                    {menu.menuName}
                                                  </td>
                                                  <td className="py-2 px-2 text-right font-medium">
                                                    {formatValue(value, comparisonTab)}
                                                  </td>
                                                  <td className="py-2 px-2 text-right">
                                                    {percent}%
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </tbody>
                                        <tfoot>
                                          <tr className="font-medium bg-muted/50">
                                            <td className="py-2 px-2 text-xs">합계</td>
                                            <td className="py-2 px-2 text-right">
                                              {formatValue(storeTotal, comparisonTab)}
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                              100%
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center py-6 text-sm text-muted-foreground">
                                    선택된 메뉴의 데이터가 없습니다.
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}

            {selectedMenus.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                메뉴를 추가하여 비교해보세요.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
