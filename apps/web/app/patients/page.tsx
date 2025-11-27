'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getPatients,
  type Patient,
} from '@/lib/patient-api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui';
import { ProtectedRoute } from '@/components/protected-route';

function PatientListContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: () =>
      getPatients({
        page,
        limit: 10,
        search: search || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page on search
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Patients</h1>
          <p className="text-muted-foreground">
            Manage patient records and assessments
          </p>
        </div>
        <Link href="/patients/new">
          <Button>Add Patient</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
          <CardDescription>
            Search and view all patient records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by name, email, or MRN..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Search</Button>
              {search && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading patients...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">
                Error loading patients. Please try again.
              </p>
            </div>
          )}

          {/* Table */}
          {data && data.data.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Assessments</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((patient: Patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </TableCell>
                      <TableCell>
                        {calculateAge(patient.dateOfBirth)} years
                      </TableCell>
                      <TableCell>
                        {patient.gender.charAt(0) +
                          patient.gender.slice(1).toLowerCase()}
                      </TableCell>
                      <TableCell>
                        {patient.medicalRecordNo || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {patient._count?.assessments || 0}
                      </TableCell>
                      <TableCell>{formatDate(patient.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/patients/${patient.id}`)
                          }
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 10 + 1} to{' '}
                  {Math.min(page * 10, data.pagination.total)} of{' '}
                  {data.pagination.total} patients
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {data && data.data.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {search
                  ? 'No patients found matching your search.'
                  : 'No patients yet. Add your first patient to get started.'}
              </p>
              {!search && (
                <Link href="/patients/new">
                  <Button>Add Patient</Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PatientListPage() {
  return (
    <ProtectedRoute>
      <PatientListContent />
    </ProtectedRoute>
  );
}
