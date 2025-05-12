import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // your image-analysis logic
    return NextResponse.json({ ok: true });
}