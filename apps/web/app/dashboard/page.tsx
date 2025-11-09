'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@alzheimer/ui';
import { Button } from '@alzheimer/ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Alzheimer&apos;s Assessment Platform
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName}!
            </h2>
            <p className="mt-2 text-gray-600">
              Role: <span className="font-semibold">{user?.role}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Assessment Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GDS</CardTitle>
                <CardDescription>Geriatric Depression Scale</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  15-question assessment for depression screening
                </p>
                <p className="text-xs text-green-600 font-medium mb-2">
                  ✓ Available
                </p>
                <p className="text-xs text-muted-foreground">
                  Select a patient from the Patients page to start a GDS assessment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">NPI</CardTitle>
                <CardDescription>Neuropsychiatric Inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">✓ Available</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    12-domain behavioral assessment with caregiver distress ratings
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Select a patient from the Patients page to start an NPI assessment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">FAQ</CardTitle>
                <CardDescription>Functional Activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">✓ Available</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    10-item functional impairment assessment
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Select a patient from the Patients page to start an FAQ assessment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CDR</CardTitle>
                <CardDescription>Clinical Dementia Rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">✓ Available</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    6-domain dementia staging assessment with M-Rule algorithm
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Select a patient from the Patients page to start a CDR assessment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patients</CardTitle>
                <CardDescription>Manage patient records</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/patients">
                  <Button className="w-full">View Patients</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Generate and view reports</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/reports">
                  <Button className="w-full">View Reports</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/profile">
                  <Button className="w-full">View Profile</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
