import { NextResponse } from 'next/server';
import { getStoreNames, getAllStores } from '@/lib/cache/sqlite';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeIdsParam = searchParams.get('storeIds');

    let storeNamesMap: Map<string, string>;

    if (!storeIdsParam) {
      // If no storeIds provided, return all stores
      storeNamesMap = getAllStores();
    } else {
      // If storeIds provided, return only those stores
      const storeIds = storeIdsParam.split(',').filter(Boolean);
      storeNamesMap = getStoreNames(storeIds);
    }

    // Convert Map to array of {_id, name} objects
    const stores = Array.from(storeNamesMap.entries()).map(([id, name]) => ({
      _id: id,
      name,
    }));

    return NextResponse.json({
      success: true,
      stores,
    });
  } catch (error: any) {
    console.error('Store names fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
