'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Badge } from '@repo/ui/components/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/components/table';
import { getCDRAssessment, getCDRStageLabel, getGlobalCDRColor, getCDRScoreColor, getCDRDomainNames } from '@/lib/cdr-api';
import { ArrowLeft, User, Calendar, Stethoscope } from 'lucide-react';

const DOMAIN_NAMES = getCDRDomainNames();

export default function CDRResultsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['cdr-assessment', assessmentId],
    queryFn: () => getCDRAssessment(assessmentId),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading assessment...</div>
      </div>
    );
  }

  if (!assessment || !assessment.cdrDetails) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">Assessment not found</div>
      </div>
    );
  }

  const cdr = assessment.cdrDetails;
  const patient = assessment.patient;
  const createdBy = assessment.createdBy;
  const sumOfBoxes =
    cdr.memory +
    cdr.orientation +
    cdr.judgmentProblem +
    cdr.communityAffairs +
    cdr.homeHobbies +
    cdr.personalCare;

  const domainScores = [
    { name: 'Memory', score: cdr.memory },
    { name: 'Orientation', score: cdr.orientation },
    { name: 'Judgment & Problem Solving', score: cdr.judgmentProblem },
    { name: 'Community Affairs', score: cdr.communityAffairs },
    { name: 'Home & Hobbies', score: cdr.homeHobbies },
    { name: 'Personal Care', score: cdr.personalCare },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreBadge = (score: number) => {
    const label = getCDRStageLabel(score);
    const colorClass = getCDRScoreColor(score);
    
    return (
      <Badge className={colorClass}>
        {score} - {label}
      </Badge>
    );
  };

  const getGlobalCDRBadge = (globalCDR: number) => {
    const label = getCDRStageLabel(globalCDR);
    const colorClass = getGlobalCDRColor(globalCDR);
    
    return (
      <Badge className={`${colorClass} text-lg px-4 py-2`}>
        CDR {globalCDR} - {label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">CDR Assessment Results</h1>
          <p className="text-gray-600">Clinical Dementia Rating</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/patients/${patient.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient
          </Button>
        </div>
      </div>

      {/* Global CDR Score Card */}
      <Card className="mb-6 border-2 border-blue-200">
        <CardHeader>
          <CardTitle>Global CDR Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-3">{getGlobalCDRBadge(cdr.globalScore)}</div>
              <p className="text-sm text-gray-600">Calculated using the standard M-Rule algorithm</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-600 mb-1">Sum of Boxes</div>
              <div className="text-4xl font-bold text-blue-600">{sumOfBoxes}</div>
              <div className="text-xs text-gray-500 mt-1">out of 18</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assessment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Patient</p>
                <p className="font-semibold">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-sm text-gray-500">MRN: {patient.medicalRecordNo}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Assessment Date</p>
                <p className="font-semibold">{formatDate(assessment.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Stethoscope className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Assessed By</p>
                <p className="font-semibold">
                  {createdBy.firstName} {createdBy.lastName}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Scores Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Domain Scores Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domainScores.map((domain, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{domain.name}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-lg font-bold text-blue-600">
                      {domain.score}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getScoreBadge(domain.score)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      {assessment.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{assessment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Interpretation Guide */}
      <Card>
        <CardHeader>
          <CardTitle>CDR Score Interpretation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Global CDR Ratings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                  <Badge className="bg-green-100 text-green-800">0</Badge>
                  <div className="text-sm">
                    <strong>None:</strong> No cognitive impairment
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <Badge className="bg-yellow-100 text-yellow-800">0.5</Badge>
                  <div className="text-sm">
                    <strong>Questionable:</strong> Questionable dementia
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                  <Badge className="bg-orange-100 text-orange-800">1</Badge>
                  <div className="text-sm">
                    <strong>Mild:</strong> Mild dementia
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                  <Badge className="bg-red-100 text-red-800">2</Badge>
                  <div className="text-sm">
                    <strong>Moderate:</strong> Moderate dementia
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                  <Badge className="bg-purple-100 text-purple-800">3</Badge>
                  <div className="text-sm">
                    <strong>Severe:</strong> Severe dementia
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Sum of Boxes</h3>
              <p className="text-sm text-gray-600">
                The Sum of Boxes (range 0-18) is the sum of all six domain scores.
                It provides a more granular measure of dementia severity and is
                particularly useful for tracking progression over time. It is more
                sensitive to change than the global CDR score alone.
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">M-Rule Algorithm</h3>
              <p className="text-sm text-gray-600">
                The global CDR is calculated using the Memory (M) rule: Memory is
                the primary category, and the global score is generally equal to
                the Memory score unless at least 3 of the other categories (Orientation,
                Judgment, Community Affairs, Home & Hobbies) are scored higher or
                lower than Memory.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
