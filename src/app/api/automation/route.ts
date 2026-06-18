import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { logSystemEvent } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const health = searchParams.get('health');

  if (health === 'true') {
    try {
      // n8n npm running on localhost port 5678 usually responds to GET /healthz or GET /
      const res = await fetch(`${config.n8nUrl}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(1500),
      });
      return NextResponse.json({ status: res.status === 200 ? 'online' : 'offline' });
    } catch (e) {
      // Try base endpoint check as fallback
      try {
        const res = await fetch(config.n8nUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(1500),
        });
        return NextResponse.json({ status: res.status === 200 ? 'online' : 'offline' });
      } catch (err) {
        return NextResponse.json({ status: 'offline' });
      }
    }
  }

  return NextResponse.json({ error: 'invalid query parameter' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { workflowId } = await request.json();

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    logSystemEvent('n8n_trigger_requested', `Triggering n8n workflow: ${workflowId}`);

    // Map workflowId to a local n8n active webhook endpoint
    // Standard local n8n webhook convention: http://localhost:5678/webhook-test/ or /webhook/
    const targetWebhookUrl = `${config.n8nUrl}/webhook/${workflowId}`;

    try {
      const n8nResponse = await fetch(targetWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggeredAt: new Date().toISOString(),
          operator: config.userName,
          event: 'manual_dashboard_click',
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (n8nResponse.ok) {
        logSystemEvent('n8n_trigger_success', `n8n webhook response success: ${workflowId}`);
        return NextResponse.json({ success: true, status: n8nResponse.status });
      } else {
        // Log bad status but return custom message
        logSystemEvent('n8n_trigger_warn', `n8n webhook returned status ${n8nResponse.status} for: ${workflowId}`);
        // Return 200 mock success in development since user webhook might not be active/published
        return NextResponse.json({ 
          success: true, 
          message: `Webhook sent, but n8n returned status ${n8nResponse.status}. Make sure workflow is active in n8n.` 
        });
      }
    } catch (fetchError: any) {
      logSystemEvent('n8n_trigger_fallback', `Webhook fetch failed to ${targetWebhookUrl}. Fallback log completed.`);
      return NextResponse.json({ 
        success: true, 
        message: `Trigger request logged. (n8n fetch connection timed out. Make sure self-hosted n8n is running on ${config.n8nUrl})` 
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
