import { NextRequest, NextResponse } from 'next/server';
import { getReadOnlyDb } from '@/lib/mongodb';
import { withAuth } from '@/lib/auth/middleware';
import { ObjectId } from 'mongodb';

// Stores to exclude from search results
const EXCLUDED_STORE_NAMES = [
  '태그히어 데모 (테스트)',
  '호미',
];

export async function GET(request: NextRequest) {
  return withAuth(request, async (session) => {
    try {
      const { searchParams } = request.nextUrl;
      const query = searchParams.get('q') || '';

      const db = await getReadOnlyDb();
      const storesCollection = db.collection('stores');

      // Build query filter
      const filters: any[] = [
        { label: { $regex: query, $options: 'i' } },
        { label: { $nin: EXCLUDED_STORE_NAMES } }
      ];

      // Franchise accounts: only show assigned stores
      if (session.role === 'franchise' && session.assignedStoreIds) {
        filters.push({
          _id: { $in: session.assignedStoreIds.map(id => new ObjectId(id)) }
        });
      }

      const stores = await storesCollection
        .find({ $and: filters })
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
  });
}
