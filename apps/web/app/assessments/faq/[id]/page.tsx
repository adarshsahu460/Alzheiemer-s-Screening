'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/components/table';
import { Badge } from '@repo/ui/components/badge';
import { getFAQAssessment } from '@/lib/faq-api';
import { ArrowLeft, User, FileText, Activity } from 'lucide-react';

export default function FAQResultsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['faq-assessment', assessmentId],
    queryFn: () => getFAQAssessment(assessmentId),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading assessment...</div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">Assessment not found</div>
      </div>
    );
  }

  const { patient, createdBy, faqDetails, itemBreakdown } = assessment;

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getImpairmentInfo = (score: number): { level: string; color: string; description: string } => {
    if (score === 0) {
      return {
        level: 'No Impairment',
        color: 'bg-gray-100 text-gray-800',
        description: 'No functional impairment detected',
      };
    } else if (score <= 5) {
      return {
        level: 'Mild Impairment',
        color: 'bg-green-100 text-green-800',
        description: 'Mild functional impairment - monitor over time',
      };
    } else if (score <= 15) {
      return {
        level: 'Moderate Impairment',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Moderate functional impairment - intervention may be beneficial',
      };
    } else if (score <= 25) {
      return {
        level: 'Severe Impairment',
        color: 'bg-orange-100 text-orange-800',
        description: 'Severe functional impairment - intervention recommended',
      };
    } else {
      return {
        level: 'Very Severe Impairment',
        color: 'bg-red-100 text-red-800',
        description: 'Very severe functional impairment - urgent intervention needed',
      };
    }
  };

  const getScoreBadge = (score: number) => {
    if (score === 0) {
      return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
    } else if (score === 1) {
      return <Badge className="bg-yellow-100 text-yellow-800">Has Difficulty</Badge>;
    } else if (score === 2) {
      return <Badge className="bg-orange-100 text-orange-800">Requires Assistance</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Dependent</Badge>;
    }
  };

  const impairmentInfo = getImpairmentInfo(faqDetails.totalScore);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">FAQ Assessment Results</h1>
          <p className="text-gray-600">
            Functional Activities Questionnaire - ADL/IADL assessment
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/assessments/faq/new-assessment?patientId=${patient.id}`)}
          >
            New Assessment
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/patients/${patient.id}/assessments/faq`)}
          >
            View History
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/patients/${patient.id}`)}
          >
            View Patient
          </Button>
        </div>
      </div>

      {/* Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Total FAQ Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {faqDetails.totalScore}
              </div>
              <div className="text-gray-600 mb-4">out of 30 possible points</div>
              <Badge className={`text-sm px-4 py-2 ${impairmentInfo.color}`}>
                {impairmentInfo.level}
              </Badge>
              <p className="text-sm text-gray-600 mt-4">
                {impairmentInfo.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Name</div>
              <div className="font-medium">
                {patient.firstName} {patient.lastName}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Age</div>
              <div className="font-medium">{calculateAge(patient.dateOfBirth)} years</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">MRN</div>
              <div className="font-medium">{patient.medicalRecordNo}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Assessment Date</div>
              <div className="font-medium">{formatDate(assessment.createdAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Breakdown Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Item Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Functional Activity</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemBreakdown?.map((item) => (
                <TableRow key={item.itemNumber}>
                  <TableCell className="font-medium">{item.itemNumber}</TableCell>
                  <TableCell>{item.item}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-blue-600 text-lg">{item.score}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getScoreBadge(item.score)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes Card (if notes exist) */}
      {assessment.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{assessment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Assessed By Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Assessment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Assessed By</div>
              <div className="font-medium">
                {createdBy.firstName} {createdBy.lastName}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Email</div>
              <div className="font-medium">{createdBy.email}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Date & Time</div>
              <div className="font-medium">{formatDateTime(assessment.createdAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Interpretation */}
      <Card>
        <CardHeader>
          <CardTitle>Score Interpretation Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">FAQ Total Score Ranges:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <Badge className="bg-gray-100 text-gray-800">0</Badge>
                  <span>No functional impairment</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-800">1-5</Badge>
                  <span>Mild impairment - monitor over time</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-100 text-yellow-800">6-15</Badge>
                  <span>Moderate impairment - intervention may be beneficial</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-100 text-orange-800">16-25</Badge>
                  <span>Severe impairment - intervention recommended</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-100 text-red-800">26-30</Badge>
                  <span>Very severe impairment - urgent intervention needed</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Item Scoring:</h3>
              <div className="space-y-1 text-sm">
                <div><strong>0 - Normal:</strong> Never did the activity or no difficulty</div>
                <div><strong>1 - Has Difficulty:</strong> Does with difficulty or has started to make errors</div>
                <div><strong>2 - Requires Assistance:</strong> Requires assistance to complete the activity</div>
                <div><strong>3 - Dependent:</strong> Completely dependent on others for the activity</div>
              </div>
            </div>

            <div className="border-t pt-4 bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Clinical Note:</strong> The FAQ is a validated instrument for assessing functional 
                abilities in activities of daily living (ADLs) and instrumental activities of daily living (IADLs). 
                Scores ≥9 suggest impairment consistent with dementia. Higher scores indicate greater functional 
                dependence and may signal need for caregiver support, home modifications, or assisted living placement. 
                This assessment should be interpreted by a qualified healthcare professional in the context of 
                the patient's overall clinical presentation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="mt-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </div>
  );
}
