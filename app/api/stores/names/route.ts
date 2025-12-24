import { NextResponse } from 'next/server';
import { getStoreNames } from '@/lib/cache/sqlite';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeIdsParam = searchParams.get('storeIds');

    if (!storeIdsParam) {
      return NextResponse.json(
        { success: false, error: 'storeIds parameter is required' },
        { status: 400 }
      );
    }

    const storeIds = storeIdsParam.split(',').filter(Boolean);
    const storeNamesMap = getStoreNames(storeIds);

    // Convert Map to object for JSON response
    const storeNames: Record<string, string> = {};
    for (const [id, name] of storeNamesMap) {
      storeNames[id] = name;
    }

    return NextResponse.json({
      success: true,
      storeNames,
    });
  } catch (error: any) {
    console.error('Store names fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
