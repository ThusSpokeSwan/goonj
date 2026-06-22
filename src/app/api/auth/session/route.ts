import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('goonj_session')?.value;

    if (!userId) {
      return NextResponse.json({ success: true, user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            savedSchemes: true,
            searchHistories: true,
          }
        }
      }
    });

    if (!user) {
      // Clear invalid session cookie
      cookieStore.delete('goonj_session');
      return NextResponse.json({ success: true, user: null });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Session error:', error);
    const message = error instanceof Error ? error.message : 'Session load failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
