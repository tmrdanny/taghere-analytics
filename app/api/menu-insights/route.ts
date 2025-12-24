import { NextResponse } from 'next/server';
import {
  getMenuRankings,
  getRevenueContribution,
  getMenuTrends,
  getCrossSellingPairs,
} from '@/lib/queries/menu-insights';
import { MenuInsightType, MenuInsightFilter } from '@/lib/types/menu-insights';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') as MenuInsightType;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const storeIdsParam = searchParams.get('storeIds');
    const menuName = searchParams.get('menuName') || undefined;
    const limitParam = searchParams.get('limit');

    console.log('[menu-insights API]', {
      type,
      startDateParam,
      endDateParam,
      storeIdsParam,
      menuName,
    });

    // Validate required parameters
    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: type' },
        { status: 400 }
      );
    }

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: startDate, endDate' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    const storeIds = storeIdsParam ? storeIdsParam.split(',').filter(Boolean) : undefined;
    const limit = limitParam ? parseInt(limitParam) : 10;

    const filter: MenuInsightFilter = {
      startDate,
      endDate,
      storeIds,
      menuName,
      limit,
    };

    let data;

    switch (type) {
      case 'rankings':
        data = await getMenuRankings(filter);
        break;

      case 'contribution':
        data = await getRevenueContribution(filter);
        break;

      case 'trends':
        data = await getMenuTrends(filter);
        break;

      case 'cross-selling':
        data = await getCrossSellingPairs(filter);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Invalid type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Menu insights error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
