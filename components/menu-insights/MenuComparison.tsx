'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, X, Plus } from 'lucide-react';

interface MenuComparisonProps {
  startDate: Date;
  endDate: Date;
  storeIds?: string[];
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
}: MenuComparisonProps) {
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuSearchResults, setMenuSearchResults] = useState<MenuData[]>([]);
  const [selectedMenus, setSelectedMenus] = useState<MenuData[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [showMenuSearch, setShowMenuSearch] = useState(false);

  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);

  // Check if store is selected
  const hasSelectedStores = storeIds && storeIds.length > 0;

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

  // Update comparison chart when selected menus change
  useEffect(() => {
    if (selectedMenus.length > 0) {
      const data = selectedMenus.map((menu) => ({
        name: menu.menuName,
        value: menu.quantity,
      }));
      setComparisonData(data);
    } else {
      setComparisonData([]);
    }
  }, [selectedMenus]);

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

  const totalQuantity = selectedMenus.reduce((sum, m) => sum + m.quantity, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>판매량 비교</CardTitle>
        <CardDescription>
          매장을 선택한 후 메뉴들을 비교하여 판매량 구성을 확인합니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!hasSelectedStores ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>대시보드 상단에서 매장을 선택하여 판매량을 비교해보세요.</p>
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

            {/* Pie Chart */}
            {selectedMenus.length > 0 && comparisonData.length > 0 && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-4">판매량 비교</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={comparisonData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => {
                          const percent = ((value / totalQuantity) * 100).toFixed(1);
                          return `${name} (${value.toLocaleString()}, ${percent}%)`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {comparisonData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => {
                          if (typeof value === 'number') {
                            const percent = ((value / totalQuantity) * 100).toFixed(1);
                            return [`${value.toLocaleString()} 개 (${percent}%)`, '판매량'];
                          }
                          return [value, '판매량'];
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Summary Table */}
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 font-medium">메뉴명</th>
                          <th className="text-right py-2 px-4 font-medium">판매량</th>
                          <th className="text-right py-2 px-4 font-medium">비율</th>
                          <th className="text-right py-2 px-4 font-medium">매출</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMenus
                          .sort((a, b) => b.quantity - a.quantity)
                          .map((menu) => {
                            const percent = (
                              (menu.quantity / totalQuantity) *
                              100
                            ).toFixed(1);
                            return (
                              <tr
                                key={menu.menuName}
                                className="border-b hover:bg-muted/50"
                              >
                                <td className="py-2 px-4">{menu.menuName}</td>
                                <td className="py-2 px-4 text-right font-medium">
                                  {menu.quantity.toLocaleString()}
                                </td>
                                <td className="py-2 px-4 text-right">
                                  {percent}%
                                </td>
                                <td className="py-2 px-4 text-right">
                                  ₩{menu.revenue.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium bg-muted/50">
                          <td className="py-2 px-4">합계</td>
                          <td className="py-2 px-4 text-right">
                            {totalQuantity.toLocaleString()}
                          </td>
                          <td className="py-2 px-4 text-right">100%</td>
                          <td className="py-2 px-4 text-right">
                            ₩
                            {selectedMenus
                              .reduce((sum, m) => sum + m.revenue, 0)
                              .toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedMenus.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                메뉴를 추가하여 판매량을 비교해보세요.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
