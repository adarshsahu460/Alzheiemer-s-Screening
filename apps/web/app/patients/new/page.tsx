'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { createPatient } from '@/lib/patient-api';
import { PatientForm } from '@/components/patient-form';
import { ProtectedRoute, RequireRole } from '@/components/protected-route';
import type { CreatePatientInput } from '@repo/types';

function NewPatientContent() {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (response) => {
      // Redirect to patient detail page after creation
      router.push(`/patients/${response.data.id}`);
    },
  });

  const handleSubmit = async (data: CreatePatientInput) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Add New Patient</h1>
        <p className="text-muted-foreground">
          Create a new patient record in the system
        </p>
      </div>

      <PatientForm onSubmit={handleSubmit} />
    </div>
  );
}

export default function NewPatientPage() {
  return (
    <RequireRole roles={['CLINICIAN', 'ADMIN']}>
      <NewPatientContent />
    </RequireRole>
  );
}
