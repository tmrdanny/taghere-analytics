import { NextResponse } from 'next/server';
import { getReadOnlyDb } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const db = await getReadOnlyDb();
    const storesCollection = db.collection('stores');

    const stores = await storesCollection
      .find({
        label: { $regex: query, $options: 'i' }
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
