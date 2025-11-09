'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@alzheimer/ui';
import { Button } from '@alzheimer/ui';
import { Label } from '@alzheimer/ui';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleLogoutAll = async () => {
    if (confirm('This will log you out from all devices. Continue?')) {
      await logout();
      router.push('/login');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              User Profile
            </h1>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your account details and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    First Name
                  </Label>
                  <p className="mt-1 text-lg">{user?.firstName}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Last Name
                  </Label>
                  <p className="mt-1 text-lg">{user?.lastName}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Email
                  </Label>
                  <p className="mt-1 text-lg">{user?.email}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    Role
                  </Label>
                  <p className="mt-1 text-lg">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                      {user?.role}
                    </span>
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">
                    User ID
                  </Label>
                  <p className="mt-1 text-sm font-mono text-gray-600">
                    {user?.id}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t space-y-3">
                <h3 className="text-lg font-semibold">Account Actions</h3>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto">
                    Logout
                  </Button>
                  
                  <Button
                    onClick={handleLogoutAll}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    Logout All Devices
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
