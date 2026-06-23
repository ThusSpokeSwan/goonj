import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateDbUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    const userId = dbUser?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please login first.' }, { status: 401 });
    }

    const history = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('Fetch search history error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch search history';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
