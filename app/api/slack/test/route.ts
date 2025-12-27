import { NextRequest, NextResponse } from 'next/server';
import { sendTestMessage } from '@/lib/slack/notifications';

/**
 * GET /api/slack/test
 *
 * Sends a test message to verify Slack integration
 */
export async function GET(request: NextRequest) {
  try {
    const success = await sendTestMessage();

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent to Slack',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send test message. Check SLACK_WEBHOOK_URL.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Slack test API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
