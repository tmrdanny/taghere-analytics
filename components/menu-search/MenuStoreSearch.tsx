'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Store, Package, ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface StoreResult {
  storeId: string;
  storeName: string;
  totalQuantity: number;
  totalRevenue: number;
  totalOrders: number;
  activeDays: number;
  matchedMenus?: string[];
}

interface MatchingMenu {
  menuName: string;
  storeCount: number;
  searchTerm?: string;
}

interface SearchResult {
  query: string;
  searchTerms: string[];
  isMultiSearch: boolean;
  dateRange: { startDate: string; endDate: string };
  matchingMenus: MatchingMenu[];
  menusByTerm?: Record<string, Array<{ menuName: string; storeCount: number }>>;
  storesByMenu: Record<string, StoreResult[]>;
  intersectionStores?: StoreResult[];
  totalStores: number;
}

const PAGE_SIZE = 50;

export function MenuStoreSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const response = await fetch(
        `/api/menus/search-stores?q=${encodeURIComponent(searchQuery)}&limit=500`
      );
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        // Auto-select based on search type
        if (data.data.isMultiSearch) {
          setSelectedMenu('__intersection__');
        } else {
          setSelectedMenu('__all__');
        }
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // "모든 매장" 선택시 모든 메뉴의 매장을 통합 (단일 검색용)
  const getAllStores = useCallback((): StoreResult[] => {
    if (!result || result.isMultiSearch) return [];

    const storeMap = new Map<string, StoreResult>();

    Object.values(result.storesByMenu).forEach(stores => {
      stores.forEach(store => {
        const existing = storeMap.get(store.storeId);
        if (existing) {
          storeMap.set(store.storeId, {
            ...existing,
            totalQuantity: existing.totalQuantity + store.totalQuantity,
            totalRevenue: existing.totalRevenue + store.totalRevenue,
            totalOrders: existing.totalOrders + store.totalOrders,
            activeDays: Math.max(existing.activeDays, store.activeDays),
          });
        } else {
          storeMap.set(store.storeId, { ...store });
        }
      });
    });

    return Array.from(storeMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [result]);

  const selectedStores = useMemo(() => {
    if (!result) return [];

    if (result.isMultiSearch) {
      // Multi-search: always show intersection
      return result.intersectionStores || [];
    }

    // Single search
    if (selectedMenu === '__all__') {
      return getAllStores();
    }
    return (selectedMenu && result.storesByMenu[selectedMenu]) || [];
  }, [selectedMenu, result, getAllStores]);

  // Pagination
  const totalPages = Math.ceil(selectedStores.length / PAGE_SIZE);
  const paginatedStores = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return selectedStores.slice(startIndex, startIndex + PAGE_SIZE);
  }, [selectedStores, currentPage]);

  const handleMenuSelect = (menu: string) => {
    setSelectedMenu(menu);
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  // Display name for current selection
  const displayMenuName = useMemo(() => {
    if (!result) return '';

    if (result.isMultiSearch) {
      return `"${result.searchTerms.join('" + "')}" 모두 보유`;
    }

    if (selectedMenu === '__all__') {
      return `"${result.query}" 관련 전체`;
    }

    return `"${selectedMenu}"`;
  }, [result, selectedMenu]);

  // CSV 다운로드 함수
  const handleDownloadCSV = useCallback(() => {
    if (!result || selectedStores.length === 0) return;

    // CSV 헤더
    const headers = result.isMultiSearch
      ? ['순위', '매장명', '매장ID', '보유메뉴', '판매량', '매출', '주문수', '활성일수']
      : ['순위', '매장명', '매장ID', '판매량', '매출', '주문수', '활성일수'];

    // CSV 데이터 행
    const rows = selectedStores.map((store, idx) => {
      const baseData = [
        idx + 1,
        store.storeName || 'Unknown Store',
        store.storeId,
      ];

      if (result.isMultiSearch) {
        baseData.push(store.matchedMenus?.join(' | ') || '');
      }

      baseData.push(
        store.totalQuantity,
        store.totalRevenue,
        store.totalOrders,
        store.activeDays
      );

      return baseData;
    });

    // CSV 문자열 생성
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // 쉼표나 따옴표가 포함된 셀은 따옴표로 감싸기
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    // 다운로드
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = result.isMultiSearch
      ? `메뉴검색_${result.searchTerms.join('_')}_${result.dateRange.startDate}_${result.dateRange.endDate}.csv`
      : `메뉴검색_${result.query}_${result.dateRange.startDate}_${result.dateRange.endDate}.csv`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [result, selectedStores]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          메뉴로 매장 검색
        </CardTitle>
        <CardDescription>
          특정 메뉴를 판매하는 매장들을 검색합니다. 쉼표(,)로 구분하여 여러 메뉴를 동시에 검색하면 모든 메뉴를 보유한 매장만 표시됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="메뉴명 입력 (예: 테라, 켈리, 카스)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
            {isLoading ? '검색중...' : '검색'}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-950 rounded">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              {result.isMultiSearch ? (
                <span>
                  <strong>{result.searchTerms.length}개 메뉴</strong> 동시 검색: {result.totalStores}개 매장이 모든 메뉴 보유
                </span>
              ) : (
                <span>
                  "{result.query}" 검색 결과: {result.matchingMenus.length}개 메뉴, {result.totalStores}개 매장
                </span>
              )}
              <span className="text-xs">
                ({result.dateRange.startDate} ~ {result.dateRange.endDate})
              </span>
            </div>

            {/* Multi-search: Show search terms */}
            {result.isMultiSearch && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  검색 조건 (AND)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.searchTerms.map((term) => (
                    <Badge key={term} variant="secondary">
                      {term}
                      {result.menusByTerm && result.menusByTerm[term] && (
                        <span className="ml-1 text-xs opacity-70">
                          ({result.menusByTerm[term].length}개 메뉴 매칭)
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>

                {/* Show matched menus per term */}
                {result.menusByTerm && (
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    {Object.entries(result.menusByTerm).map(([term, menus]) => (
                      <div key={term}>
                        <span className="font-medium">{term}:</span>{' '}
                        {menus.slice(0, 5).map(m => m.menuName).join(', ')}
                        {menus.length > 5 && ` 외 ${menus.length - 5}개`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Single search: Menu badges */}
            {!result.isMultiSearch && result.matchingMenus.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">일치하는 메뉴</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedMenu === '__all__' ? 'default' : 'secondary'}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleMenuSelect('__all__')}
                  >
                    <Store className="h-3 w-3 mr-1" />
                    모든 매장 ({getAllStores().length}개)
                  </Badge>
                  {result.matchingMenus.map((menu) => (
                    <Badge
                      key={menu.menuName}
                      variant={selectedMenu === menu.menuName ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => handleMenuSelect(menu.menuName)}
                    >
                      {menu.menuName} ({menu.storeCount}개 매장)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Store List */}
            {selectedStores.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    {displayMenuName} 판매 매장 ({selectedStores.length}개)
                  </h4>
                  <div className="flex items-center gap-2">
                    {totalPages > 1 && (
                      <span className="text-xs text-muted-foreground">
                        {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, selectedStores.length)} / {selectedStores.length}
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCSV}
                      className="gap-1"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-center p-3 font-medium w-12">#</th>
                        <th className="text-left p-3 font-medium">매장명</th>
                        {result.isMultiSearch && (
                          <th className="text-left p-3 font-medium">보유 메뉴</th>
                        )}
                        <th className="text-right p-3 font-medium">판매량</th>
                        <th className="text-right p-3 font-medium">매출</th>
                        <th className="text-right p-3 font-medium">주문수</th>
                        <th className="text-right p-3 font-medium">활성일수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStores.map((store, idx) => {
                        const globalIndex = startIndex + idx;
                        return (
                          <tr
                            key={store.storeId}
                            className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                          >
                            <td className="p-3 text-center text-muted-foreground font-mono text-xs">
                              {globalIndex + 1}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {globalIndex < 3 && (
                                  <span className={`text-xs font-bold ${
                                    globalIndex === 0 ? 'text-yellow-500' :
                                    globalIndex === 1 ? 'text-gray-400' :
                                    'text-orange-400'
                                  }`}>
                                    {globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : '🥉'}
                                  </span>
                                )}
                                {store.storeName || 'Unknown Store'}
                              </div>
                            </td>
                            {result.isMultiSearch && (
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {store.matchedMenus?.slice(0, 3).map(menu => (
                                    <Badge key={menu} variant="outline" className="text-xs py-0">
                                      {menu}
                                    </Badge>
                                  ))}
                                  {store.matchedMenus && store.matchedMenus.length > 3 && (
                                    <Badge variant="outline" className="text-xs py-0">
                                      +{store.matchedMenus.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="p-3 text-right font-mono">
                              {formatNumber(store.totalQuantity)}개
                            </td>
                            <td className="p-3 text-right font-mono">
                              {formatCurrency(store.totalRevenue)}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {formatNumber(store.totalOrders)}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {store.activeDays}일
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      이전
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'ghost'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      다음
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {result.isMultiSearch && result.totalStores === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                "{result.searchTerms.join('", "')}" 메뉴를 모두 보유한 매장이 없습니다
              </div>
            )}

            {!result.isMultiSearch && result.matchingMenus.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                "{result.query}"에 해당하는 메뉴를 찾을 수 없습니다
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
