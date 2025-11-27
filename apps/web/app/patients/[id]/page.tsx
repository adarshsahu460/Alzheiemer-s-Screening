'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  getPatient,
  updatePatient,
  deletePatient,
  type Patient,
} from '@/lib/patient-api';
import { PatientForm } from '@/components/patient-form';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/hooks/use-auth';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui';
import type { UpdatePatientInput } from '@repo/types';

function PatientDetailContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', params.id],
    queryFn: () => getPatient(params.id),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePatientInput) => updatePatient(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', params.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePatient(params.id),
    onSuccess: () => {
      router.push('/patients');
    },
  });

  const handleUpdate = async (data: UpdatePatientInput) => {
    await updateMutation.mutateAsync(data);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
  };

  const calculateAge = (dateOfBirth: Date | string) => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading patient...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-red-500">Patient not found</p>
      </div>
    );
  }

  const canEdit = user?.role === 'CLINICIAN' || user?.role === 'ADMIN';
  const canDelete = user?.role === 'ADMIN';

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-muted-foreground">
            {calculateAge(patient.dateOfBirth)} years old •{' '}
            {patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/patients">
            <Button variant="outline">Back to List</Button>
          </Link>
          <Link href={`/patients/${params.id}/analytics`}>
            <Button variant="outline">View Analytics Report</Button>
          </Link>
          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit Patient</Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <>
          <PatientForm
            initialData={patient as any}
            onSubmit={handleUpdate}
            isEdit={true}
          />
          <div className="mt-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel Editing
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Patient Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Personal Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Date of Birth
                    </p>
                    <p>{formatDate(patient.dateOfBirth)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Age
                    </p>
                    <p>{calculateAge(patient.dateOfBirth)} years</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Email
                    </p>
                    <p>{patient.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Phone
                    </p>
                    <p>{patient.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Medical Record #
                    </p>
                    <p>{patient.medicalRecordNo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Gender
                    </p>
                    <p>
                      {patient.gender.charAt(0) +
                        patient.gender.slice(1).toLowerCase()}
                    </p>
                  </div>
                  {patient.address && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Address
                      </p>
                      <p>{patient.address}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Caregiver Info */}
            <Card>
              <CardHeader>
                <CardTitle>Family Caregiver Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Name
                    </p>
                    <p>{patient.caregiverName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Relationship
                    </p>
                    <p>{patient.caregiverRelationship || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Phone
                    </p>
                    <p>{patient.caregiverPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Email
                    </p>
                    <p>{patient.caregiverEmail || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {patient.notes && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{patient.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Assessment History */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Assessments</CardTitle>
                  <CardDescription>
                    Manage patient assessments
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Link href={`/patients/${params.id}/assessments/gds`}>
                    <Button variant="outline" size="sm">
                      View GDS History
                    </Button>
                  </Link>
                  <Link href={`/patients/${params.id}/assessments/npi`}>
                    <Button variant="outline" size="sm">
                      View NPI History
                    </Button>
                  </Link>
                  <Link href={`/patients/${params.id}/assessments/faq`}>
                    <Button variant="outline" size="sm">
                      View FAQ History
                    </Button>
                  </Link>
                  <Link href={`/patients/${params.id}/assessments/cdr`}>
                    <Button variant="outline" size="sm">
                      View CDR History
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">GDS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Geriatric Depression Scale
                    </p>
                    <Link href={`/assessments/gds/new-assessment?patientId=${params.id}`}>
                      <Button size="sm" className="w-full">
                        New GDS
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">NPI</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Neuropsychiatric Inventory
                    </p>
                    <Link href={`/assessments/npi/new-assessment?patientId=${params.id}`}>
                      <Button size="sm" className="w-full">
                        New NPI
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">FAQ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Functional Activities
                    </p>
                    <Link href={`/assessments/faq/new-assessment?patientId=${params.id}`}>
                      <Button size="sm" className="w-full">
                        New FAQ
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">CDR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      Clinical Dementia Rating
                    </p>
                    <Link href={`/assessments/cdr/new-assessment?patientId=${params.id}`}>
                      <Button size="sm" className="w-full">
                        New CDR
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Record Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Created By
                  </p>
                  <p>
                    {patient.caregiver
                      ? `${patient.caregiver.firstName} ${patient.caregiver.lastName}`
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Created At
                  </p>
                  <p>{formatDate(patient.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {canDelete && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions for this patient record
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Patient
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm">
                      Are you sure you want to delete this patient? This will
                      also delete all associated assessments. This action cannot
                      be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending
                          ? 'Deleting...'
                          : 'Yes, Delete Patient'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleteMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ProtectedRoute>
      <PatientDetailContent params={params} />
    </ProtectedRoute>
  );
}
