'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/components/table';
import { Badge } from '@repo/ui/components/badge';
import { getNPIAssessment } from '@/lib/npi-api';
import { NPI_DOMAINS } from '@repo/types';
import { ArrowLeft, Calendar, User, FileText, Activity } from 'lucide-react';

export default function NPIResultsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['npi-assessment', assessmentId],
    queryFn: () => getNPIAssessment(assessmentId),
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

  const { patient, createdBy, npiDetails, domainBreakdown } = assessment;

  // Calculate totalDistress from domainScores
  const totalDistress = npiDetails.domainScores.reduce((sum, domain) => sum + domain.distress, 0);

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

  const getSeverityInfo = (score: number): { level: string; color: string; description: string } => {
    if (score === 0) {
      return {
        level: 'No Symptoms',
        color: 'bg-gray-100 text-gray-800',
        description: 'No neuropsychiatric symptoms detected',
      };
    } else if (score <= 12) {
      return {
        level: 'Mild',
        color: 'bg-green-100 text-green-800',
        description: 'Mild neuropsychiatric symptoms present',
      };
    } else if (score <= 24) {
      return {
        level: 'Moderate',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Moderate neuropsychiatric symptoms requiring attention',
      };
    } else if (score <= 36) {
      return {
        level: 'Moderately Severe',
        color: 'bg-orange-100 text-orange-800',
        description: 'Moderately severe symptoms requiring intervention',
      };
    } else {
      return {
        level: 'Severe',
        color: 'bg-red-100 text-red-800',
        description: 'Severe neuropsychiatric symptoms requiring immediate intervention',
      };
    }
  };

  const getDistressInfo = (distress: number): { level: string; color: string } => {
    if (distress === 0) {
      return { level: 'None', color: 'bg-gray-100 text-gray-800' };
    } else if (distress <= 15) {
      return { level: 'Mild', color: 'bg-green-100 text-green-800' };
    } else if (distress <= 30) {
      return { level: 'Moderate', color: 'bg-yellow-100 text-yellow-800' };
    } else if (distress <= 45) {
      return { level: 'Severe', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { level: 'Very Severe', color: 'bg-red-100 text-red-800' };
    }
  };

  const severityInfo = getSeverityInfo(npiDetails.totalScore);
  const distressInfo = getDistressInfo(totalDistress);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">NPI Assessment Results</h1>
          <p className="text-gray-600">
            Neuropsychiatric Inventory - Comprehensive behavioral assessment
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/assessments/npi/new-assessment?patientId=${patient.id}`)}
          >
            New Assessment
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/patients/${patient.id}/assessments/npi`)}
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

      {/* Score Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Total Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Total NPI Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {npiDetails.totalScore}
              </div>
              <div className="text-gray-600 mb-4">out of 144 possible points</div>
              <Badge className={`text-sm px-4 py-2 ${severityInfo.color}`}>
                {severityInfo.level}
              </Badge>
              <p className="text-sm text-gray-600 mt-4">
                {severityInfo.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Distress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Caregiver Distress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-6xl font-bold text-orange-600 mb-4">
                {totalDistress}
              </div>
              <div className="text-gray-600 mb-4">out of 60 possible points</div>
              <Badge className={`text-sm px-4 py-2 ${distressInfo.color}`}>
                {distressInfo.level} Distress
              </Badge>
              <p className="text-sm text-gray-600 mt-4">
                Cumulative emotional impact on caregiver
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

      {/* Domain Breakdown Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Domain Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Domain</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Frequency</TableHead>
                <TableHead className="text-center">Severity</TableHead>
                <TableHead className="text-center">Domain Score</TableHead>
                <TableHead className="text-center">Distress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domainBreakdown?.map((domain) => {
                const domainScore = domain.isPresent ? (domain.frequency || 0) * (domain.severity || 0) : 0;
                
                return (
                  <TableRow key={domain.domainId}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={domain.isPresent ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                        {domain.isPresent ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.isPresent ? (
                        <span className="font-medium">{domain.frequency}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.isPresent ? (
                        <span className="font-medium">{domain.severity}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.isPresent ? (
                        <span className="font-bold text-blue-600">{domainScore}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {domain.isPresent ? (
                        <span className={`font-medium ${domain.distress && domain.distress > 3 ? 'text-orange-600' : ''}`}>
                          {domain.distress}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
              <h3 className="font-semibold mb-2">NPI Total Score Ranges:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <Badge className="bg-gray-100 text-gray-800">0</Badge>
                  <span>No symptoms</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-800">1-12</Badge>
                  <span>Mild symptoms</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-100 text-yellow-800">13-24</Badge>
                  <span>Moderate symptoms</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-100 text-orange-800">25-36</Badge>
                  <span>Moderately severe symptoms</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-100 text-red-800">37-144</Badge>
                  <span>Severe symptoms</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Domain Scoring:</h3>
              <p className="text-sm text-gray-700">
                Each domain score = Frequency (1-4) × Severity (1-3), ranging from 0-12 per domain
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Caregiver Distress:</h3>
              <p className="text-sm text-gray-700">
                Rated 0-5 for each present symptom, indicating emotional impact on caregiver
              </p>
            </div>

            <div className="border-t pt-4 bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Clinical Note:</strong> The NPI is a validated tool for assessing neuropsychiatric 
                symptoms in dementia. Higher scores indicate more frequent and severe behavioral symptoms. 
                Caregiver distress scores help identify areas where additional support may be needed. 
                This assessment should be interpreted by a qualified healthcare professional in the context 
                of the patient's overall clinical presentation.
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
