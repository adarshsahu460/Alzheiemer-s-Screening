'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getPatients } from '@/lib/patient-api';
import { ProtectedRoute } from '@/components/protected-route';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui';

function ReportsContent() {
  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatients(),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Assessment Reports</h1>
        <p className="text-muted-foreground">
          Generate comprehensive PDF reports for patient assessments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {patients?.data?.map((patient) => (
          <Card key={patient.id}>
            <CardHeader>
              <CardTitle>
                {patient.firstName} {patient.lastName}
              </CardTitle>
              <CardDescription>
                Medical Record: {patient.medicalRecordNo || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/patients/${patient.id}/analytics`}>
                <Button variant="outline" className="w-full">
                  View Analytics
                </Button>
              </Link>
              <Button className="w-full" disabled>
                Generate PDF Report (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {patients?.data?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No patients found. Add patients to generate reports.
            </p>
            <Link href="/patients/new">
              <Button className="mt-4">Add Patient</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}
