'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPatient } from '@/lib/patient-api';
import { getPatientGDSAssessments, getPatientGDSStats } from '@/lib/gds-api';
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

function GDSHistoryContent({ params }: { params: { id: string } }) {
  const router = useRouter();

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', params.id],
    queryFn: () => getPatient(params.id),
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['patient-gds-assessments', params.id],
    queryFn: () => getPatientGDSAssessments(params.id, { limit: 50 }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['patient-gds-stats', params.id],
    queryFn: () => getPatientGDSStats(params.id),
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'NORMAL':
        return 'bg-green-100 text-green-700';
      case 'MILD':
        return 'bg-yellow-100 text-yellow-700';
      case 'MODERATE':
        return 'bg-orange-100 text-orange-700';
      case 'SEVERE':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (patientLoading || assessmentsLoading || statsLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading...</p>
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

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">GDS Assessment History</h1>
          <p className="text-muted-foreground">
            {patient.firstName} {patient.lastName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/assessments/gds/new-assessment?patientId=${params.id}`}>
            <Button>New GDS Assessment</Button>
          </Link>
          <Link href={`/patients/${params.id}`}>
            <Button variant="outline">Back to Patient</Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.averageScore}</p>
              <p className="text-xs text-muted-foreground">out of 15</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Latest Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stats.latestScore !== null ? stats.latestScore : 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.latestSeverity || 'No assessments'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.scoreHistory.length >= 2 ? (
                <>
                  <p className="text-3xl font-bold">
                    {stats.scoreHistory[stats.scoreHistory.length - 1].score -
                      stats.scoreHistory[stats.scoreHistory.length - 2]
                        .score >
                    0
                      ? '↑'
                      : stats.scoreHistory[stats.scoreHistory.length - 1]
                            .score -
                          stats.scoreHistory[stats.scoreHistory.length - 2]
                            .score <
                        0
                      ? '↓'
                      : '→'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.abs(
                      stats.scoreHistory[stats.scoreHistory.length - 1].score -
                        stats.scoreHistory[stats.scoreHistory.length - 2].score
                    )}{' '}
                    points
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Insufficient data</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score History Chart (Simple Text Version) */}
      {stats && stats.scoreHistory.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Score History</CardTitle>
            <CardDescription>Track score changes over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.scoreHistory.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded"
                >
                  <span className="text-sm text-muted-foreground w-32">
                    {formatDate(entry.date)}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded h-6 relative">
                        <div
                          className="bg-blue-500 h-6 rounded flex items-center justify-end pr-2 text-white text-sm font-medium"
                          style={{ width: `${(entry.score / 15) * 100}%` }}
                        >
                          {entry.score}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(
                      entry.severity
                    )}`}
                  >
                    {entry.severity}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assessments</CardTitle>
          <CardDescription>
            Complete history of GDS assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessments && assessments.assessments && assessments.assessments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Assessed By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>{formatDate(assessment.createdAt)}</TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {assessment.gdsDetails?.score || 0}
                      </span>{' '}
                      / 15
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(
                          assessment.gdsDetails?.severity || 'NORMAL'
                        )}`}
                      >
                        {assessment.gdsDetails?.severity || 'NORMAL'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {assessment.createdBy
                        ? `${assessment.createdBy.firstName} ${assessment.createdBy.lastName}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/assessments/gds/${assessment.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No GDS assessments yet for this patient.
              </p>
              <Link href={`/assessments/gds/new-assessment?patientId=${params.id}`}>
                <Button>Create First Assessment</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function GDSHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <ProtectedRoute>
      <GDSHistoryContent params={params} />
    </ProtectedRoute>
  );
}
