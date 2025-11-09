'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getGDSAssessment } from '@/lib/gds-api';
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
import { ProtectedRoute } from '@/components/protected-route';

function GDSResultsContent({ params }: { params: { id: string } }) {
  const router = useRouter();

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['gds-assessment', params.id],
    queryFn: () => getGDSAssessment(params.id),
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'NORMAL':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'MILD':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'MODERATE':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'SEVERE':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityDescription = (severity: string) => {
    switch (severity) {
      case 'NORMAL':
        return 'No significant depressive symptoms detected';
      case 'MILD':
        return 'Mild depressive symptoms present';
      case 'MODERATE':
        return 'Moderate depressive symptoms present';
      case 'SEVERE':
        return 'Severe depressive symptoms present';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-red-500">Assessment not found</p>
      </div>
    );
  }

  const score = assessment.gdsAssessment?.score || 0;
  const severity = assessment.gdsAssessment?.severity || 'NORMAL';

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">GDS Assessment Results</h1>
          <p className="text-muted-foreground">
            {assessment.patient
              ? `${assessment.patient.firstName} ${assessment.patient.lastName}`
              : 'Patient'}
          </p>
        </div>
        <div className="flex gap-2">
          {assessment.patient && (
            <Link href={`/patients/${assessment.patient.id}`}>
              <Button variant="outline">View Patient</Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      {/* Score Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overall Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-6xl font-bold">{score}</div>
              <p className="text-muted-foreground">out of 15</p>
            </div>
            <div
              className={`px-6 py-3 rounded-lg border-2 ${getSeverityColor(
                severity
              )}`}
            >
              <p className="text-sm font-medium">Severity</p>
              <p className="text-2xl font-bold">{severity}</p>
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">
            {getSeverityDescription(severity)}
          </p>
        </CardContent>
      </Card>

      {/* Patient Info */}
      {assessment.patient && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Name
                </p>
                <p>
                  {assessment.patient.firstName} {assessment.patient.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Age</p>
                <p>{calculateAge(assessment.patient.dateOfBirth)} years</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Medical Record #
                </p>
                <p>{assessment.patient.medicalRecordNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assessment Date
                </p>
                <p>{formatDate(assessment.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Breakdown */}
      {assessment.questionBreakdown && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Question Breakdown</CardTitle>
            <CardDescription>
              Detailed responses for each question
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-24">Answer</TableHead>
                  <TableHead className="w-32">Contributes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessment.questionBreakdown.map((item) => (
                  <TableRow key={item.number}>
                    <TableCell>{item.number}</TableCell>
                    <TableCell>{item.question}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          item.answer === 'Yes'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.answer}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.contributesToScore ? (
                        <span className="text-green-600 font-medium">
                          Yes (+1)
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                      {item.reverseScored && (
                        <span className="ml-2 text-xs text-orange-600">
                          (Reverse)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {assessment.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assessment Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{assessment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Assessed By */}
      {assessment.assessedBy && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assessment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assessed By
                </p>
                <p>
                  {assessment.assessedBy.firstName}{' '}
                  {assessment.assessedBy.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {assessment.assessedBy.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Date & Time
                </p>
                <p>{formatDate(assessment.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Interpretation */}
      <Card>
        <CardHeader>
          <CardTitle>Score Interpretation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>0-4 points:</strong> Normal (no significant depressive
              symptoms)
            </p>
            <p>
              <strong>5-8 points:</strong> Mild depression
            </p>
            <p>
              <strong>9-11 points:</strong> Moderate depression
            </p>
            <p>
              <strong>12-15 points:</strong> Severe depression
            </p>
            <p className="mt-4 text-muted-foreground">
              <em>
                Note: This assessment is a screening tool. Clinical judgment and
                further evaluation are recommended for definitive diagnosis and
                treatment planning.
              </em>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        {assessment.patient && (
          <>
            <Link
              href={`/assessments/gds/new-assessment?patientId=${params.id}`}
            >
              <Button>New Assessment</Button>
            </Link>
            <Link href={`/patients/${assessment.patient.id}/assessments/gds`}>
              <Button variant="outline">View History</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function GDSResultsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ProtectedRoute>
      <GDSResultsContent params={params} />
    </ProtectedRoute>
  );
}
