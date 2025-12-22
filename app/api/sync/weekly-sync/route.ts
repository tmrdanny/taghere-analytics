/**
 * API Route for Weekly Data Sync
 * 
 * GET /api/sync/weekly-sync - Get sync status
 * POST /api/sync/weekly-sync - Manually trigger weekly sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeWeeklySync, getSyncStatus } from '@/lib/sync/weekly-data-sync';

export async function GET(request: NextRequest) {
  try {
    const status = await getSyncStatus();
    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get sync status',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Manual weekly sync triggered via API');
    const result = await executeWeeklySync();
    
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error executing weekly sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute weekly sync',
      },
      { status: 500 }
    );
  }
}
