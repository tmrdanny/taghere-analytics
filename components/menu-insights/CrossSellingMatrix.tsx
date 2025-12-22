'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';

interface CrossSellingMatrixProps {
  startDate: Date;
  endDate: Date;
  storeIds?: string[];
}

interface CrossSellingPair {
  menu1: string;
  menu2: string;
  coOccurrences: number;
  confidence: number;
  lift: number;
}

export function CrossSellingMatrix({ startDate, endDate, storeIds }: CrossSellingMatrixProps) {
  const [data, setData] = useState<{ pairs: CrossSellingPair[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'cross-selling',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: '20',
        });

        if (storeIds && storeIds.length > 0) {
          params.append('storeIds', storeIds.join(','));
        }

        const response = await fetch(`/api/menu-insights?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch cross-selling data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, storeIds]);

  const getLiftColor = (lift: number) => {
    if (lift >= 2) return 'bg-green-100 text-green-800 border-green-300';
    if (lift >= 1.5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getLiftLabel = (lift: number) => {
    if (lift >= 2) return '강한 연관';
    if (lift >= 1.5) return '중간 연관';
    return '약한 연관';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data || data.pairs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            교차 판매 데이터가 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-blue-900 dark:text-blue-100">교차 판매 분석</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                함께 자주 구매되는 메뉴 조합을 분석합니다.
                <strong className="ml-1">Lift</strong> 값이 높을수록 강한 연관성을 의미합니다.
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                • Lift ≥ 2.0: 우연보다 2배 이상 자주 함께 구매
                <br />
                • Confidence: 메뉴1 구매 시 메뉴2도 구매할 확률
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pairs Table */}
      <Card>
        <CardHeader>
          <CardTitle>함께 구매되는 메뉴 Top 20</CardTitle>
          <CardDescription>
            강한 연관성을 가진 메뉴 조합을 활용하여 세트 메뉴나 프로모션을 기획할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">순위</th>
                  <th className="text-left py-3 px-2">메뉴 1</th>
                  <th className="text-center py-3 px-2">↔</th>
                  <th className="text-left py-3 px-2">메뉴 2</th>
                  <th className="text-right py-3 px-2">함께 구매</th>
                  <th className="text-right py-3 px-2">확률</th>
                  <th className="text-right py-3 px-2">Lift</th>
                  <th className="text-right py-3 px-2">연관성</th>
                </tr>
              </thead>
              <tbody>
                {data.pairs.map((pair, index) => (
                  <tr key={index} className="border-b hover:bg-accent">
                    <td className="py-3 px-2 font-medium text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="py-3 px-2 font-medium">{pair.menu1}</td>
                    <td className="text-center py-3 px-2 text-muted-foreground">↔</td>
                    <td className="py-3 px-2 font-medium">{pair.menu2}</td>
                    <td className="text-right py-3 px-2">
                      {pair.coOccurrences}회
                    </td>
                    <td className="text-right py-3 px-2">
                      {(pair.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-2 font-bold">
                      {pair.lift.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-2">
                      <Badge className={getLiftColor(pair.lift)}>
                        {getLiftLabel(pair.lift)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-900 dark:text-green-100">활용 제안</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-green-800 dark:text-green-300">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>
                <strong>세트 메뉴 구성:</strong> Lift가 높은 조합을 세트로 묶어 할인 판매
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>
                <strong>추천 시스템:</strong> 메뉴1 주문 시 메뉴2 자동 추천
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>
                <strong>재고 관리:</strong> 함께 판매되는 메뉴의 재고를 동시에 관리
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
