import { NextResponse } from 'next/server';
import { getReadOnlyDb } from '@/lib/mongodb';

// Stores to exclude from search results
const EXCLUDED_STORE_NAMES = [
  '태그히어 데모 (테스트)',
  '호미',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const db = await getReadOnlyDb();
    const storesCollection = db.collection('stores');

    const stores = await storesCollection
      .find({
        $and: [
          { label: { $regex: query, $options: 'i' } },
          { label: { $nin: EXCLUDED_STORE_NAMES } }
        ]
      })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      stores: stores.map(s => ({
        storeId: s._id.toString(),
        storeName: s.label,
        location: s.location || '',
      }))
    });
  } catch (error: any) {
    console.error('Store search error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
