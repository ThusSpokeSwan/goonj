import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { schemeId, helpful } = await request.json();

    if (!schemeId || typeof helpful !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Scheme ID and helpful (boolean) are required' }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        schemeId,
        helpful
      }
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Feedback error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
