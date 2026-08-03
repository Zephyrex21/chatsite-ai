import { auth } from '@/auth';

/**
 * Deliberately simple: the admin dashboard is a Phase 8 "nice to have,"
 * not a real multi-role permission system. A single ADMIN_EMAIL env var
 * comparison is honest about what this is — if real role-based access
 * control is ever needed, this is the one place that changes.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;

  const session = await auth();
  return session?.user?.email === adminEmail;
}
