import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/admin';
import { getUsageStats } from '@/lib/repositories/admin-stats.repository';
import { logger } from '@/lib/logger';

export async function GET() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  try {
    const stats = await getUsageStats();
    return NextResponse.json(stats);
  } catch (err) {
    logger.error('admin_stats.unexpected_error', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
