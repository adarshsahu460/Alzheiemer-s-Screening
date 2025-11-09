'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/components/table';
import { Badge } from '@repo/ui/components/badge';
import { getPatientCDRAssessments, getPatientCDRStats, getCDRStageLabel, getGlobalCDRColor } from '@/lib/cdr-api';
import { getPatient } from '@/lib/patient-api';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

export default function CDRHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId),
  });

  const { data: assessmentsData, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['cdr-assessments', patientId],
    queryFn: () => getPatientCDRAssessments(patientId, { limit: 50 }),
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['cdr-stats', patientId],
    queryFn: () => getPatientCDRStats(patientId),
  });

  const isLoading = isLoadingPatient || isLoadingAssessments || isLoadingStats;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading CDR history...</div>
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

  const getCDRBadge = (globalCDR: number) => {
    const label = getCDRStageLabel(globalCDR);
    const colorClass = getGlobalCDRColor(globalCDR);
    return <Badge className={colorClass}>{globalCDR} - {label}</Badge>;
  };

  const getTrendIndicator = () => {
    if (!stats || stats.total < 2) return null;

    const history = stats.scoreHistory;
    if (history.length < 2) return null;

    const latest = history[0].globalCDR;
    const previous = history[1].globalCDR;
    const difference = latest - previous;

    if (difference < 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">Improving</span>
        </div>
      );
    } else if (difference > 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Worsening</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-gray-600">
          <Minus className="h-4 w-4" />
          <span className="text-sm font-medium">Stable</span>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">CDR Assessment History</h1>
          <p className="text-gray-600">
            {patient.firstName} {patient.lastName} (MRN: {patient.medicalRecordNumber})
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/assessments/cdr/${patientId}/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New CDR Assessment
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
                Average Global CDR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.averageGlobalCDR.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Avg Sum of Boxes: {stats.averageSumOfBoxes.toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Latest Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.latestGlobalCDR ?? 'N/A'}</div>
              {stats.latestStage && (
                <div className="mt-2">
                  {stats.latestGlobalCDR !== null && getCDRBadge(stats.latestGlobalCDR)}
                </div>
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

      {/* Score History Visualization */}
      {stats && stats.scoreHistory.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Global CDR Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.scoreHistory.slice(0, 10).map((entry, index) => {
                const percentage = (entry.globalCDR / 3) * 100;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{formatDate(entry.date)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          Global CDR: <span className="font-bold text-blue-600">{entry.globalCDR}</span>
                        </span>
                        <span className="text-gray-600">
                          Sum of Boxes: <span className="font-bold text-purple-600">{entry.sumOfBoxes}</span>
                        </span>
                        {getCDRBadge(entry.globalCDR)}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      >
                        <span className="text-xs font-medium text-white">
                          {entry.globalCDR}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  <TableHead className="text-center">Avg Score</TableHead>
                  <TableHead className="text-center">Impairment Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.domainStats.map((domainStat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{domainStat.domain}</TableCell>
                    <TableCell className="text-center">
                      {domainStat.averageScore > 0 ? (
                        <span className="font-medium">{domainStat.averageScore.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">0.00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {domainStat.impairmentRate > 0 ? (
                        <span className={`font-medium ${domainStat.impairmentRate > 50 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {domainStat.impairmentRate.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">0%</span>
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
                No CDR assessments yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by creating the first CDR assessment for this patient.
              </p>
              <Button onClick={() => router.push(`/assessments/cdr/${patientId}/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Assessment
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Global CDR</TableHead>
                  <TableHead className="text-center">Sum of Boxes</TableHead>
                  <TableHead className="text-center">Stage</TableHead>
                  <TableHead>Assessed By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>{formatDate(assessment.createdAt)}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-blue-600 text-lg">
                        {assessment.cdrAssessment.globalCDR}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium text-purple-600">
                        {assessment.cdrAssessment.sumOfBoxes}
                      </span>
                      <span className="text-gray-500 text-sm"> / 18</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getCDRBadge(assessment.cdrAssessment.globalCDR)}
                    </TableCell>
                    <TableCell>
                      {assessment.assessedBy.firstName} {assessment.assessedBy.lastName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/assessments/cdr/${assessment.id}`)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
