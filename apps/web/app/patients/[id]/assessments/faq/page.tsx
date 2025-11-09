'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/components/table';
import { Badge } from '@repo/ui/components/badge';
import { getPatientFAQAssessments, getPatientFAQStats } from '@/lib/faq-api';
import { getPatient } from '@/lib/patient-api';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

export default function FAQHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId),
  });

  const { data: assessmentsData, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['faq-assessments', patientId],
    queryFn: () => getPatientFAQAssessments(patientId, { limit: 50 }),
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['faq-stats', patientId],
    queryFn: () => getPatientFAQStats(patientId),
  });

  const isLoading = isLoadingPatient || isLoadingAssessments || isLoadingStats;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading FAQ history...</div>
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

  const getImpairmentBadge = (score: number) => {
    if (score === 0) {
      return <Badge className="bg-gray-100 text-gray-800">No Impairment</Badge>;
    } else if (score <= 5) {
      return <Badge className="bg-green-100 text-green-800">Mild</Badge>;
    } else if (score <= 15) {
      return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
    } else if (score <= 25) {
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
          <h1 className="text-3xl font-bold mb-2">FAQ Assessment History</h1>
          <p className="text-gray-600">
            {patient.firstName} {patient.lastName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/assessments/faq/new-assessment?patientId=${patientId}`)}>
            <Plus className="h-4 w-4 mr-2" />
            New FAQ Assessment
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
              <p className="text-xs text-gray-500 mt-1">out of 30</p>
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
              {stats.latestImpairment && (
                <div className="mt-2">
                  {stats.latestScore !== null && getImpairmentBadge(stats.latestScore)}
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

      {/* Score History Chart */}
      {stats && stats.scoreHistory.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Score Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.scoreHistory.slice(0, 10).map((entry, index) => {
                const percentage = (entry.totalScore / 30) * 100;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{formatDate(entry.date)}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          Score: <span className="font-bold text-blue-600">{entry.totalScore}</span>
                        </span>
                        {getImpairmentBadge(entry.totalScore)}
                      </div>
                    </div>
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Item Statistics */}
      {stats && stats.itemStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Item Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Functional Activity</TableHead>
                  <TableHead className="text-center">Avg Score</TableHead>
                  <TableHead className="text-center">Impairment Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.itemStats.map((itemStat) => (
                  <TableRow key={itemStat.itemNumber}>
                    <TableCell className="font-medium">{itemStat.itemNumber}</TableCell>
                    <TableCell>{itemStat.item}</TableCell>
                    <TableCell className="text-center">
                      {itemStat.averageScore > 0 ? (
                        <span className="font-medium">{itemStat.averageScore.toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-400">0.0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {itemStat.impairmentRate > 0 ? (
                        <span className={`font-medium ${itemStat.impairmentRate > 50 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {itemStat.impairmentRate.toFixed(0)}%
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
                No FAQ assessments yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by creating the first FAQ assessment for this patient.
              </p>
              <Button onClick={() => router.push(`/assessments/faq/new-assessment?patientId=${patientId}`)}>
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
                  <TableHead className="text-center">Impairment Level</TableHead>
                  <TableHead>Assessed By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>{formatDate(assessment.createdAt)}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-blue-600">
                        {assessment.faqDetails.totalScore}
                      </span>
                      <span className="text-gray-500 text-sm"> / 30</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getImpairmentBadge(assessment.faqDetails.totalScore)}
                    </TableCell>
                    <TableCell>
                      {assessment.createdBy.firstName} {assessment.createdBy.lastName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/assessments/faq/${assessment.id}`)}
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
