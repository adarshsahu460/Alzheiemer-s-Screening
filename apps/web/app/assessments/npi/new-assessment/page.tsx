'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Label } from '@repo/ui/components/label';
import { NPI_DOMAINS, type NPIDomainScore } from '@repo/types';
import { createNPIAssessment } from '@/lib/npi-api';
import { getPatient } from '@/lib/patient-api';
import { ProtectedRoute, RequireRole } from '@/components/protected-route';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

interface DomainFormData {
  isPresent: boolean;
  frequency: number | null;
  severity: number | null;
  distress: number | null;
}

export default function NewNPIAssessmentPage() {
  return (
    <RequireRole roles={['CLINICIAN', 'ADMIN']}>
      <NewNPIAssessmentContent />
    </RequireRole>
  );
}

function NewNPIAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');

  const [currentDomain, setCurrentDomain] = useState(0);
  const [domainData, setDomainData] = useState<DomainFormData[]>(
    NPI_DOMAINS.map(() => ({
      isPresent: false,
      frequency: null,
      severity: null,
      distress: null,
    }))
  );
  const [notes, setNotes] = useState('');

  // Fetch patient data
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId!),
    enabled: !!patientId,
  });

  // Create assessment mutation
  const createMutation = useMutation({
    mutationFn: createNPIAssessment,
    onSuccess: (data) => {
      router.push(`/assessments/npi/${data.id}`);
    },
  });

  const currentDomainInfo = NPI_DOMAINS[currentDomain];
  const currentData = domainData[currentDomain];

  const handlePresenceChange = (isPresent: boolean) => {
    setDomainData(prev => {
      const newData = [...prev];
      newData[currentDomain] = {
        isPresent,
        frequency: isPresent ? (newData[currentDomain].frequency || 1) : null,
        severity: isPresent ? (newData[currentDomain].severity || 1) : null,
        distress: isPresent ? (newData[currentDomain].distress || 0) : null,
      };
      return newData;
    });
  };

  const handleFrequencyChange = (frequency: number) => {
    setDomainData(prev => {
      const newData = [...prev];
      newData[currentDomain].frequency = frequency;
      return newData;
    });
  };

  const handleSeverityChange = (severity: number) => {
    setDomainData(prev => {
      const newData = [...prev];
      newData[currentDomain].severity = severity;
      return newData;
    });
  };

  const handleDistressChange = (distress: number) => {
    setDomainData(prev => {
      const newData = [...prev];
      newData[currentDomain].distress = distress;
      return newData;
    });
  };

  const handleNext = () => {
    if (currentDomain < NPI_DOMAINS.length - 1) {
      setCurrentDomain(currentDomain + 1);
    }
  };

  const handlePrevious = () => {
    if (currentDomain > 0) {
      setCurrentDomain(currentDomain - 1);
    }
  };

  const handleDomainJump = (index: number) => {
    setCurrentDomain(index);
  };

  const handleSubmit = async () => {
    if (!patientId) return;

    const domainScores: NPIDomainScore[] = domainData
      .map((data, index) => {
        if (!data.isPresent) return null;
        
        const frequency = data.frequency ?? 0;
        const severity = data.severity ?? 0;
        
        return {
          domainId: NPI_DOMAINS[index].id,
          frequency,
          severity,
          distress: data.distress ?? 0,
          score: frequency * severity,
        };
      })
      .filter((d) => d !== null) as NPIDomainScore[];

    createMutation.mutate({
      patientId,
      domainScores,
      notes: notes || undefined,
    });
  };

  const isDomainComplete = (index: number): boolean => {
    const data = domainData[index];
    if (!data.isPresent) return true;
    return data.frequency !== null && data.severity !== null && data.distress !== null;
  };

  const allDomainsComplete = domainData.every((_, index) => isDomainComplete(index));
  const completedCount = domainData.filter((_, index) => isDomainComplete(index)).length;
  const progressPercent = (completedCount / NPI_DOMAINS.length) * 100;

  if (isLoadingPatient) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading patient data...</div>
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">New NPI Assessment</h1>
        <p className="text-gray-600">
          Patient: {patient.firstName} {patient.lastName} (MRN: {patient.medicalRecordNumber})
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-600">
            {completedCount} / {NPI_DOMAINS.length} domains complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Domain Navigation Grid */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Domain Overview</CardTitle>
          <CardDescription>Click on a domain to jump to it</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {NPI_DOMAINS.map((domain, index) => {
              const isComplete = isDomainComplete(index);
              const isCurrent = index === currentDomain;
              const isPresent = domainData[index].isPresent;

              return (
                <button
                  key={domain.id}
                  onClick={() => handleDomainJump(index)}
                  className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50'
                      : isComplete
                      ? isPresent
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{domain.name}</span>
                    {isComplete && <Check className="h-4 w-4 text-green-600" />}
                  </div>
                  {isPresent && (
                    <div className="text-xs text-gray-600 mt-1">Present</div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Domain Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {currentDomain + 1}. {currentDomainInfo.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Presence Question */}
          <div>
            <Label className="text-base mb-3 block">
              Is this symptom present?
            </Label>
            <div className="flex gap-4">
              <button
                onClick={() => handlePresenceChange(true)}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  currentData.isPresent
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">Yes</div>
                  <div className="text-xs text-gray-600 mt-1">Symptom is present</div>
                </div>
              </button>
              <button
                onClick={() => handlePresenceChange(false)}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  !currentData.isPresent
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">No</div>
                  <div className="text-xs text-gray-600 mt-1">Symptom is not present</div>
                </div>
              </button>
            </div>
          </div>

          {/* Frequency, Severity, Distress (only if present) */}
          {currentData.isPresent && (
            <>
              {/* Frequency */}
              <div>
                <Label className="text-base mb-3 block">
                  Frequency: How often does this occur?
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 1, label: 'Occasionally', desc: 'Less than once per week' },
                    { value: 2, label: 'Often', desc: 'About once per week' },
                    { value: 3, label: 'Frequently', desc: 'Several times per week' },
                    { value: 4, label: 'Very Frequently', desc: 'Daily or more' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFrequencyChange(option.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentData.frequency === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm">{option.value}</div>
                        <div className="text-xs font-medium mt-1">{option.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{option.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <Label className="text-base mb-3 block">
                  Severity: How severe is this symptom?
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 1, label: 'Mild', desc: 'Noticeable but not disruptive' },
                    { value: 2, label: 'Moderate', desc: 'Significant and disruptive' },
                    { value: 3, label: 'Severe', desc: 'Very marked and disruptive' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSeverityChange(option.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentData.severity === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm">{option.value}</div>
                        <div className="text-xs font-medium mt-1">{option.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{option.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Caregiver Distress */}
              <div>
                <Label className="text-base mb-3 block">
                  Caregiver Distress: How emotionally distressing is this for the caregiver?
                </Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { value: 0, label: 'None' },
                    { value: 1, label: 'Minimal' },
                    { value: 2, label: 'Mild' },
                    { value: 3, label: 'Moderate' },
                    { value: 4, label: 'Severe' },
                    { value: 5, label: 'Extreme' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleDistressChange(option.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentData.distress === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{option.value}</div>
                        <div className="text-xs mt-1">{option.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes (only on last domain) */}
      {currentDomain === NPI_DOMAINS.length - 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Additional Notes (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Enter any additional observations or context..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-md border border-gray-300 p-2"
            />
            <p className="text-xs text-gray-500 mt-2">
              {notes.length} / 2000 characters
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentDomain === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="text-sm text-gray-600">
          Domain {currentDomain + 1} of {NPI_DOMAINS.length}
        </div>

        {currentDomain < NPI_DOMAINS.length - 1 ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!allDomainsComplete || createMutation.isPending}
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        )}
      </div>

      {!allDomainsComplete && currentDomain === NPI_DOMAINS.length - 1 && (
        <p className="text-sm text-red-600 text-center mt-4">
          Please complete all domains before submitting
        </p>
      )}
    </div>
  );
}
