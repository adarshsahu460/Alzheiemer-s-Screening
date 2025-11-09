'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/components/table';
import { Badge } from '@repo/ui/components/badge';
import { getPatientNPIAssessments, getPatientNPIStats } from '@/lib/npi-api';
import { getPatient } from '@/lib/patient-api';
import { NPI_DOMAINS } from '@repo/types';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

export default function NPIHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId),
  });

  const { data: assessmentsData, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['npi-assessments', patientId],
    queryFn: () => getPatientNPIAssessments(patientId, { limit: 50 }),
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['npi-stats', patientId],
    queryFn: () => getPatientNPIStats(patientId),
  });

  const isLoading = isLoadingPatient || isLoadingAssessments || isLoadingStats;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading NPI history...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">Patient not found</div>
      </div>
    );
  }

  const assessments = assessmentsData?.assessments || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSeverityBadge = (score: number) => {
    if (score === 0) {
      return <Badge className="bg-gray-100 text-gray-800">No Symptoms</Badge>;
    } else if (score <= 12) {
      return <Badge className="bg-green-100 text-green-800">Mild</Badge>;
    } else if (score <= 24) {
      return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
    } else if (score <= 36) {
      return <Badge className="bg-orange-100 text-orange-800">Mod. Severe</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Severe</Badge>;
    }
  };

  const getDistressBadge = (distress: number) => {
    if (distress === 0) {
      return <Badge className="bg-gray-100 text-gray-800">None</Badge>;
    } else if (distress <= 15) {
      return <Badge className="bg-green-100 text-green-800">Mild</Badge>;
    } else if (distress <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
    } else if (distress <= 45) {
      return <Badge className="bg-orange-100 text-orange-800">Severe</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Very Severe</Badge>;
    }
  };

  const getTrendIndicator = () => {
    if (!stats || stats.total < 2) return null;

    const history = stats.scoreHistory;
    if (history.length < 2) return null;

    const latest = history[0].totalScore;
    const previous = history[1].totalScore;
    const difference = latest - previous;

    if (difference < 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">{Math.abs(difference)} pts (Improving)</span>
        </div>
      );
    } else if (difference > 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">+{difference} pts (Worsening)</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-gray-600">
          <Minus className="h-4 w-4" />
          <span className="text-sm font-medium">No change</span>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">NPI Assessment History</h1>
          <p className="text-gray-600">
            {patient.firstName} {patient.lastName} (MRN: {patient.medicalRecordNumber})
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/assessments/npi/new-assessment?patientId=${patientId}`)}>
            <Plus className="h-4 w-4 mr-2" />
            New NPI Assessment
          </Button>
          <Button variant="outline" onClick={() => router.push(`/patients/${patientId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.averageScore.toFixed(1)}</div>
              <p className="text-xs text-gray-500 mt-1">out of 144</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Latest Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.latestScore ?? 'N/A'}</div>
              {stats.latestScore !== null && (
                <div className="mt-2">{getSeverityBadge(stats.latestScore)}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="pt-2">{getTrendIndicator()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score History Chart */}
      {stats && stats.scoreHistory.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Score Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.scoreHistory.slice(0, 10).map((entry, index) => {
                const percentage = (entry.totalScore / 144) * 100;
                const distressPercentage = (entry.totalDistress / 60) * 100;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{formatDate(entry.date)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          Score: <span className="font-bold text-blue-600">{entry.totalScore}</span>
                        </span>
                        <span className="text-gray-600">
                          Distress: <span className="font-bold text-orange-600">{entry.totalDistress}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="text-xs font-medium text-white">
                              {entry.totalScore}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-orange-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                            style={{ width: `${distressPercentage}%` }}
                          >
                            <span className="text-xs font-medium text-white">
                              {entry.totalDistress}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>NPI Score (0-144)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-600 rounded"></div>
                <span>Caregiver Distress (0-60)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Statistics */}
      {stats && stats.domainStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Domain Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead className="text-center">Presence Rate</TableHead>
                  <TableHead className="text-center">Avg Score</TableHead>
                  <TableHead className="text-center">Avg Distress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.domainStats.map((domainStat) => (
                  <TableRow key={domainStat.domainId}>
                    <TableCell className="font-medium">{domainStat.domain}</TableCell>
                    <TableCell className="text-center">
                      {domainStat.presenceRate > 0 ? (
                        <span className="font-medium text-red-600">
                          {domainStat.presenceRate.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">0%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {domainStat.averageScore > 0 ? (
                        <span className="font-medium">{domainStat.averageScore.toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {domainStat.averageDistress > 0 ? (
                        <span className="font-medium">{domainStat.averageDistress.toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assessments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No NPI assessments yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by creating the first NPI assessment for this patient.
              </p>
              <Button onClick={() => router.push(`/assessments/npi/${patientId}/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Assessment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Total Score</TableHead>
                  <TableHead className="text-center">Severity</TableHead>
                  <TableHead className="text-center">Distress</TableHead>
                  <TableHead>Assessed By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => {
                  // Calculate totalDistress from domainScores
                  const totalDistress = assessment.npiDetails?.domainScores?.reduce(
                    (sum: number, domain: any) => sum + (domain.distress || 0), 
                    0
                  ) || 0;
                  
                  return (
                    <TableRow key={assessment.id}>
                      <TableCell>{formatDate(assessment.createdAt)}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-blue-600">
                          {assessment.npiDetails?.totalScore || 0}
                        </span>
                        <span className="text-gray-500 text-sm"> / 144</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getSeverityBadge(assessment.npiDetails?.totalScore || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-orange-600">
                          {totalDistress}
                        </span>
                        <span className="text-gray-500 text-sm"> / 60</span>
                      </TableCell>
                      <TableCell>
                        {assessment.createdBy.firstName} {assessment.createdBy.lastName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/assessments/npi/${assessment.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
