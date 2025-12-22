export type MenuInsightType = 'rankings' | 'contribution' | 'trends' | 'cross-selling';

export interface MenuInsightFilter {
  startDate: Date;
  endDate: Date;
  storeIds?: string[];
  menuName?: string;
  limit?: number;
}

export interface MenuRanking {
  menuName: string;
  quantity: number;
  revenue: number;
  orderCount: number;
  avgPrice: number;
}

export interface MenuContribution {
  menuName: string;
  revenue: number;
  revenuePercent: number;
  quantity: number;
  quantityPercent: number;
  cumulativePercent: number;
}

export interface MenuTrend {
  menuName: string;
  dailyData: Array<{
    date: string;
    quantity: number;
    revenue: number;
  }>;
  growthRate: number;
  averageDaily: number;
}

export interface CrossSellingPair {
  menu1: string;
  menu2: string;
  coOccurrences: number;
  confidence: number;
  lift: number;
}
