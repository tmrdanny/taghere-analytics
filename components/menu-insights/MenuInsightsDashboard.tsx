'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { MenuRankings } from './MenuRankings';
import { RevenueContribution } from './RevenueContribution';
import { MenuTrendAnalysis } from './MenuTrendAnalysis';
import { CrossSellingMatrix } from './CrossSellingMatrix';
import { MenuComparison } from './MenuComparison';

interface MenuInsightsDashboardProps {
  startDate: Date;
  endDate: Date;
  storeIds?: string[];
}

export function MenuInsightsDashboard({
  startDate,
  endDate,
  storeIds,
}: MenuInsightsDashboardProps) {
  const [activeTab, setActiveTab] = useState('rankings');
  const [menuSearchTerm, setMenuSearchTerm] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>메뉴 분석</CardTitle>
        <CardDescription>
          메뉴별 판매 성과 및 트렌드 인사이트
        </CardDescription>

        {/* Menu Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="메뉴 검색... (예: 참이슬)"
            value={menuSearchTerm}
            onChange={(e) => setMenuSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="rankings">순위</TabsTrigger>
            <TabsTrigger value="contribution">기여도</TabsTrigger>
            <TabsTrigger value="trends">트렌드</TabsTrigger>
            <TabsTrigger value="cross-selling">교차판매</TabsTrigger>
            <TabsTrigger value="comparison">판매량 비교</TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="mt-4">
            <MenuRankings
              startDate={startDate}
              endDate={endDate}
              storeIds={storeIds}
              menuSearchTerm={menuSearchTerm}
            />
          </TabsContent>

          <TabsContent value="contribution" className="mt-4">
            <RevenueContribution
              startDate={startDate}
              endDate={endDate}
              storeIds={storeIds}
              menuSearchTerm={menuSearchTerm}
            />
          </TabsContent>

          <TabsContent value="trends" className="mt-4">
            <MenuTrendAnalysis
              startDate={startDate}
              endDate={endDate}
              storeIds={storeIds}
              menuSearchTerm={menuSearchTerm}
            />
          </TabsContent>

          <TabsContent value="cross-selling" className="mt-4">
            <CrossSellingMatrix
              startDate={startDate}
              endDate={endDate}
              storeIds={storeIds}
            />
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            <MenuComparison
              startDate={startDate}
              endDate={endDate}
              storeIds={storeIds}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
