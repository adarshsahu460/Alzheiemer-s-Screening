'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';
import { getPatient } from '@/lib/patient-api';
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Minus, Download, Activity } from 'lucide-react';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PatientAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId),
  });

  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['analytics-overview', patientId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/analytics/patient/${patientId}/overview`, {
        withCredentials: true,
      });
      return response.data;
    },
  });

  const { data: correlations } = useQuery({
    queryKey: ['analytics-correlations', patientId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/analytics/patient/${patientId}/correlations`, {
        withCredentials: true,
      });
      return response.data;
    },
  });

  if (isLoadingOverview) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  if (!patient || !overview) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">Unable to load analytics</div>
      </div>
    );
  }

  const getTrendBadge = (trend: string) => {
    const trends: Record<string, { icon: any; color: string; label: string }> = {
      improving: { icon: TrendingDown, color: 'bg-green-100 text-green-800', label: 'Improving' },
      stable: { icon: Minus, color: 'bg-gray-100 text-gray-800', label: 'Stable' },
      declining: { icon: TrendingUp, color: 'bg-yellow-100 text-yellow-800', label: 'Declining' },
      rapidly_declining: { icon: TrendingUp, color: 'bg-red-100 text-red-800', label: 'Rapidly Declining' },
    };
    const config = trends[trend] || trends.stable;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getAlertIcon = (type: string) => {
    const colors: Record<string, string> = {
      danger: 'text-red-600',
      warning: 'text-yellow-600',
      info: 'text-blue-600',
    };
    return <AlertTriangle className={`h-5 w-5 ${colors[type] || 'text-gray-600'}`} />;
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await apiClient.get(`/api/reports/patient/${patientId}/pdf`, {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patient-report-${(patient as any)?.medicalRecordNo || patientId}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Patient Analytics & Comprehensive Report</h1>
          <p className="text-gray-600">
            {patient.firstName} {patient.lastName} (MRN: {(patient as any)?.medicalRecordNo || 'N/A'})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/patients/${patientId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isDownloading}>
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Assessment Counts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Total Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.assessmentCounts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">GDS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{overview.assessmentCounts.gds}</div>
            <p className="text-xs text-gray-500">Depression</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">NPI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{overview.assessmentCounts.npi}</div>
            <p className="text-xs text-gray-500">Behavioral</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overview.assessmentCounts.faq}</div>
            <p className="text-xs text-gray-500">Functional</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">CDR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.assessmentCounts.cdr}</div>
            <p className="text-xs text-gray-500">Dementia Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {overview.alerts && overview.alerts.length > 0 && (
        <Card className="mb-6 border-2 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Clinical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.alerts.map((alert: any, index: number) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-4 rounded-lg ${
                    alert.type === 'danger' ? 'bg-red-50 border border-red-200' :
                    alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="font-medium">{alert.category}</div>
                    <div className="text-sm text-gray-700">{alert.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Trend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overall Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Overall Patient Trend</p>
              {getTrendBadge(overview.trends.overallTrend)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">GDS (Depression)</p>
              {getTrendBadge(overview.trends.gds.direction)}
              <p className="text-xs text-gray-500 mt-1">
                Change: {overview.trends.gds.changeRate.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">NPI (Behavioral)</p>
              {getTrendBadge(overview.trends.npi.direction)}
              <p className="text-xs text-gray-500 mt-1">
                Change: {overview.trends.npi.changeRate.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">FAQ (Functional)</p>
              {getTrendBadge(overview.trends.faq.direction)}
              <p className="text-xs text-gray-500 mt-1">
                Change: {overview.trends.faq.changeRate.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">CDR (Cognition)</p>
              {getTrendBadge(overview.trends.cdr.direction)}
              <p className="text-xs text-gray-500 mt-1">
                Change: {overview.trends.cdr.changeRate.toFixed(2)}
              </p>
            </div>
          </div>

          {overview.trends.notes && overview.trends.notes.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium mb-2 text-sm">Clinical Notes:</h4>
              <ul className="space-y-1">
                {overview.trends.notes.map((note: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700">• {note}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Assessment Scores */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Latest Assessment Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overview.latestAssessments.gds && (
              <div className="p-4 border-2 border-blue-200 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">GDS - Depression Scale</div>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {overview.latestAssessments.gds.score}<span className="text-sm text-gray-500">/15</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">{overview.latestAssessments.gds.severity}</Badge>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(overview.latestAssessments.gds.date).toLocaleDateString()}
                </p>
              </div>
            )}
            {overview.latestAssessments.npi && (
              <div className="p-4 border-2 border-purple-200 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">NPI - Behavioral Symptoms</div>
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {overview.latestAssessments.npi.score}<span className="text-sm text-gray-500">/144</span>
                </div>
                <Badge className="bg-purple-100 text-purple-800">{overview.latestAssessments.npi.severity}</Badge>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(overview.latestAssessments.npi.date).toLocaleDateString()}
                </p>
              </div>
            )}
            {overview.latestAssessments.faq && (
              <div className="p-4 border-2 border-orange-200 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">FAQ - Functional Abilities</div>
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {overview.latestAssessments.faq.score}<span className="text-sm text-gray-500">/30</span>
                </div>
                <Badge className="bg-orange-100 text-orange-800">{overview.latestAssessments.faq.severity}</Badge>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(overview.latestAssessments.faq.date).toLocaleDateString()}
                </p>
              </div>
            )}
            {overview.latestAssessments.cdr && (
              <div className="p-4 border-2 border-green-200 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">CDR - Dementia Rating</div>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {overview.latestAssessments.cdr.score}
                </div>
                <Badge className="bg-green-100 text-green-800">{overview.latestAssessments.cdr.severity}</Badge>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(overview.latestAssessments.cdr.date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Assessment Correlations */}
      {correlations && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cross-Assessment Correlations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium mb-1">GDS ↔ NPI</div>
                <div className="text-xs text-gray-600">
                  r = {correlations.correlations.gdsNpi.correlation.toFixed(3)}
                </div>
                <Badge className="mt-1">{correlations.correlations.gdsNpi.strength}</Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium mb-1">FAQ ↔ CDR</div>
                <div className="text-xs text-gray-600">
                  r = {correlations.correlations.faqCdr.correlation.toFixed(3)}
                </div>
                <Badge className="mt-1">{correlations.correlations.faqCdr.strength}</Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium mb-1">GDS ↔ FAQ</div>
                <div className="text-xs text-gray-600">
                  r = {correlations.correlations.gdsFaq.correlation.toFixed(3)}
                </div>
                <Badge className="mt-1">{correlations.correlations.gdsFaq.strength}</Badge>
              </div>
            </div>
            {correlations.insights && correlations.insights.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Insights:</h4>
                <ul className="space-y-1">
                  {correlations.insights.map((insight: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700">• {insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Links to Assessment Histories */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment History Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => router.push(`/patients/${patientId}/assessments/gds`)}>
              <Activity className="h-4 w-4 mr-2" />
              View GDS History
            </Button>
            <Button variant="outline" onClick={() => router.push(`/patients/${patientId}/assessments/npi`)}>
              <Activity className="h-4 w-4 mr-2" />
              View NPI History
            </Button>
            <Button variant="outline" onClick={() => router.push(`/patients/${patientId}/assessments/faq`)}>
              <Activity className="h-4 w-4 mr-2" />
              View FAQ History
            </Button>
            <Button variant="outline" onClick={() => router.push(`/patients/${patientId}/assessments/cdr`)}>
              <Activity className="h-4 w-4 mr-2" />
              View CDR History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
