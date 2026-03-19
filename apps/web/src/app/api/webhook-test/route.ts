import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const payload = {
    event:     'test',
    message:   'PNOT webhook test — bağlantı başarılı! 🎉',
    sentAt:    new Date().toISOString(),
  };

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-PNOT-Event': 'test' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(5000),
    });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}
