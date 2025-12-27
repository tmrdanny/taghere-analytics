/**
 * Slack Notification Utilities for Health Check Alerts
 */

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
      emoji?: boolean;
    };
    url?: string;
    action_id?: string;
  }>;
}

interface SlackAttachment {
  color?: string;
  blocks?: SlackBlock[];
}

/**
 * Send a message to Slack webhook
 */
export async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[Slack] SLACK_WEBHOOK_URL not configured');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Slack] Failed to send message:', text);
      return false;
    }

    console.log('[Slack] Message sent successfully');
    return true;
  } catch (error) {
    console.error('[Slack] Error sending message:', error);
    return false;
  }
}

/**
 * Format currency in Korean Won
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Send daily health check summary
 */
export async function sendDailySummary(data: {
  summary: {
    active: number;
    warning: number;
    danger: number;
    churned: number;
    total: number;
  };
  newWarningStores: Array<{ storeName: string; healthScore: number; daysSinceLastOrder: number }>;
  newDangerStores: Array<{ storeName: string; healthScore: number; daysSinceLastOrder: number }>;
  dashboardUrl?: string;
}): Promise<boolean> {
  const { summary, newWarningStores, newDangerStores, dashboardUrl } = data;

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 TagHere Health Check 일일 리포트',
        emoji: true,
      },
    },
  ];

  // New warning stores
  if (newWarningStores.length > 0) {
    const storeList = newWarningStores
      .map((s) => `• ${s.storeName} (점수: ${s.healthScore}, ${s.daysSinceLastOrder}일 전 주문)`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🟡 신규 주의 매장 (${newWarningStores.length}개)*\n${storeList}`,
      },
    });
  }

  // New danger stores
  if (newDangerStores.length > 0) {
    const storeList = newDangerStores
      .map((s) => `• ${s.storeName} (점수: ${s.healthScore}, ${s.daysSinceLastOrder}일 전 주문)`)
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🟠 신규 위험 매장 (${newDangerStores.length}개)*\n${storeList}`,
      },
    });
  }

  // No new alerts
  if (newWarningStores.length === 0 && newDangerStores.length === 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '✅ 오늘 신규 주의/위험 매장이 없습니다.',
      },
    });
  }

  // Dashboard link
  if (dashboardUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📈 대시보드에서 자세히 보기',
            emoji: true,
          },
          url: dashboardUrl,
        },
      ],
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `발송 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
      },
    ],
  } as any);

  return sendSlackMessage({ blocks });
}

/**
 * Send high-value store danger alert (immediate notification)
 */
export async function sendHighValueStoreAlert(data: {
  store: {
    storeName: string;
    storeId: string;
    healthScore: number;
    previousStatus: string;
    currentStatus: string;
    daysSinceLastOrder: number;
    recentGmv: number;
    previousGmv: number;
    gmvChange: number;
  };
  isTop20Percent: boolean;
  dashboardUrl?: string;
}): Promise<boolean> {
  const { store, dashboardUrl } = data;

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 고가치 매장 위험 알림',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${store.storeName}*이(가) 위험 상태로 전환되었습니다.`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Health Score*\n${store.healthScore}점`,
        },
        {
          type: 'mrkdwn',
          text: `*마지막 주문*\n${store.daysSinceLastOrder}일 전`,
        },
        {
          type: 'mrkdwn',
          text: `*이전 GMV (7일)*\n${formatCurrency(store.previousGmv)}`,
        },
        {
          type: 'mrkdwn',
          text: `*GMV 변화*\n${store.gmvChange >= 0 ? '+' : ''}${store.gmvChange.toFixed(1)}%`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `💡 이 매장은 *월 GMV 상위 20%* 고가치 매장입니다. 즉시 연락을 권장합니다.`,
        },
      ],
    } as any,
  ];

  if (dashboardUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📈 대시보드에서 확인',
            emoji: true,
          },
          url: dashboardUrl,
        },
      ],
    });
  }

  return sendSlackMessage({
    blocks,
    attachments: [
      {
        color: '#ff6b6b',
        blocks: [],
      },
    ],
  });
}

/**
 * Send test message to verify Slack integration
 */
export async function sendTestMessage(): Promise<boolean> {
  return sendSlackMessage({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '✅ *TagHere Health Check* Slack 연동이 완료되었습니다!',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `테스트 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
          },
        ],
      } as any,
    ],
  });
}
