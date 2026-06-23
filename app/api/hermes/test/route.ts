import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const headerList = await headers();
  const rawCookieHeader = headerList.get('cookie') || 'none';

  return NextResponse.json({
    cookieStoreCount: allCookies.length,
    cookies: allCookies.map(c => c.name),
    rawCookieHeader
  });
}
