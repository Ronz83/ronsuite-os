import { NextRequest, NextResponse } from 'next/server';
import { syncGithub } from '../../../../lib/brain/github-sync';

async function handleSync(req: Request) {
  try {
    // Basic auth check using service role key (via header or query param)
    const url = new URL(req.url);
    const providedKey = url.searchParams.get('key') || req.headers.get('Authorization')?.replace('Bearer ', '').trim();
    const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!expectedKey || providedKey !== expectedKey) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('[API-GitHub-Sync] Triggering sync...');
    const result = await syncGithub();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[API-GitHub-Sync] Error during execution:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}
