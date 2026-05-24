import AdminLayout from '@/components/layout/AdminLayout';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';

const ALLOWED_ROLES = new Set(['admin', 'reviewer', 'superadmin']);
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login?next=/');

  try {
    const payload = await verifySessionToken(token);
    const role = payload.role ?? '';
    if (!ALLOWED_ROLES.has(role)) {
      redirect('/login?next=/');
    }
  } catch {
    redirect('/login?next=/');
  }

  return <AdminLayout>{children}</AdminLayout>;
}
