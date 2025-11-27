'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from './protected-route';
import { useAuth } from '@/hooks/use-auth';

interface RequireRoleProps {
  allowedRoles: Array<'CLINICIAN' | 'ADMIN' | 'CAREGIVER' | 'PATIENT'>;
  children: ReactNode;
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized');
      }
    }
  }, [user, isLoading, router, allowedRoles]);

  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
