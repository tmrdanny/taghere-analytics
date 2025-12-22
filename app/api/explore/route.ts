import { NextRequest, NextResponse } from 'next/server';
import {
  exploreDatabase,
  exploreCollection,
  formatCollectionInfo,
  listCollections,
} from '@/lib/schema-explorer';
import { getDb } from '@/lib/mongodb';

/**
 * GET /api/explore
 * Query params:
 *   - action: 'list' | 'explore-all' | 'explore-one'
 *   - collection: collection name (for explore-one)
 *   - sampleSize: number of documents to sample (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list';
    const collectionName = searchParams.get('collection');
    const sampleSize = parseInt(searchParams.get('sampleSize') || '20', 10);

    // Validate sample size to prevent abuse
    if (sampleSize > 100) {
      return NextResponse.json(
        { error: 'Sample size cannot exceed 100' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'list': {
        const db = await getDb();
        const collections = await listCollections(db);
        return NextResponse.json({
          success: true,
          collections,
          total: collections.length,
        });
      }

      case 'explore-one': {
        if (!collectionName) {
          return NextResponse.json(
            { error: 'Collection name is required for explore-one action' },
            { status: 400 }
          );
        }

        const db = await getDb();
        const info = await exploreCollection(db, collectionName, sampleSize);

        // Convert Map and Set to plain objects for JSON serialization
        const fieldsArray = Array.from(info.fields.values()).map((field) => ({
          name: field.name,
          types: Array.from(field.types),
          sampleValues: field.sampleValues,
          nullCount: field.nullCount,
        }));

        return NextResponse.json({
          success: true,
          collection: {
            name: info.name,
            documentCount: info.documentCount,
            sampleSize: info.sampleSize,
            fields: fieldsArray,
            indexes: info.indexes,
          },
          formatted: formatCollectionInfo(info),
        });
      }

      case 'explore-all': {
        const schemaMap = await exploreDatabase(sampleSize);

        // Convert to plain object
        const schema: Record<string, any> = {};
        schemaMap.forEach((info, name) => {
          const fieldsArray = Array.from(info.fields.values()).map(
            (field) => ({
              name: field.name,
              types: Array.from(field.types),
              sampleValues: field.sampleValues,
              nullCount: field.nullCount,
            })
          );

          schema[name] = {
            name: info.name,
            documentCount: info.documentCount,
            sampleSize: info.sampleSize,
            fields: fieldsArray,
            indexes: info.indexes,
          };
        });

        return NextResponse.json({
          success: true,
          schema,
          totalCollections: schemaMap.size,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: list, explore-one, or explore-all' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Schema exploration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to explore schema',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
