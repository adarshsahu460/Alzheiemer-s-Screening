'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Label } from '@repo/ui/components/label';
// Note: Using native textarea; UI package has no Textarea component
import { createCDRAssessment, getCDRDomainNames } from '@/lib/cdr-api';
import { getPatient } from '@/lib/patient-api';
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react';

// CDR Domain descriptions and rating criteria
const DOMAIN_CRITERIA = {
  memory: {
    name: 'Memory',
    description: 'Ability to remember recent events, conversations, and information',
    options: [
      { value: 0, label: 'No memory loss or slight inconstant forgetfulness' },
      { value: 0.5, label: 'Mild consistent forgetfulness; partial recollection of events' },
      { value: 1, label: 'Moderate memory loss; more marked for recent events' },
      { value: 2, label: 'Severe memory loss; only highly learned material retained' },
      { value: 3, label: 'Severe memory loss; only fragments remain' },
    ],
  },
  orientation: {
    name: 'Orientation',
    description: 'Awareness of time, place, and person',
    options: [
      { value: 0, label: 'Fully oriented' },
      { value: 0.5, label: 'Fully oriented except for slight difficulty with time relationships' },
      { value: 1, label: 'Moderate difficulty with time relationships; oriented for place at examination' },
      { value: 2, label: 'Severe difficulty with time relationships; usually disoriented to time, often to place' },
      { value: 3, label: 'Oriented to person only' },
    ],
  },
  judgmentProblemSolving: {
    name: 'Judgment & Problem Solving',
    description: 'Ability to solve everyday problems and handle business affairs',
    options: [
      { value: 0, label: 'Solves everyday problems well; judgment good' },
      { value: 0.5, label: 'Slight impairment in solving problems, similarities, and differences' },
      { value: 1, label: 'Moderate difficulty in handling problems; social judgment usually maintained' },
      { value: 2, label: 'Severely impaired in handling problems; social judgment usually impaired' },
      { value: 3, label: 'Unable to make judgments or solve problems' },
    ],
  },
  communityAffairs: {
    name: 'Community Affairs',
    description: 'Independent function at usual level in job, shopping, volunteer groups',
    options: [
      { value: 0, label: 'Independent function at usual level' },
      { value: 0.5, label: 'Slight impairment in these activities' },
      { value: 1, label: 'Unable to function independently; appears normal to casual inspection' },
      { value: 2, label: 'No pretense of independent function outside home' },
      { value: 3, label: 'No pretense of independent function outside home; appears too ill to be taken out' },
    ],
  },
  homeHobbies: {
    name: 'Home & Hobbies',
    description: 'Life at home, hobbies, and intellectual interests',
    options: [
      { value: 0, label: 'Life at home, hobbies, intellectual interests well maintained' },
      { value: 0.5, label: 'Life at home, hobbies, intellectual interests slightly impaired' },
      { value: 1, label: 'Mild but definite impairment of function at home; more difficult chores abandoned' },
      { value: 2, label: 'Only simple chores preserved; very restricted interests, poorly sustained' },
      { value: 3, label: 'No significant function at home' },
    ],
  },
  personalCare: {
    name: 'Personal Care',
    description: 'Ability to care for self (dressing, hygiene, eating)',
    options: [
      { value: 0, label: 'Fully capable of self-care' },
      { value: 0.5, label: 'Fully capable of self-care' },
      { value: 1, label: 'Needs prompting' },
      { value: 2, label: 'Requires assistance in dressing, hygiene, keeping of personal effects' },
      { value: 3, label: 'Requires much help with personal care; frequent incontinence' },
    ],
  },
};

const DOMAIN_KEYS = [
  'memory',
  'orientation',
  'judgmentProblemSolving',
  'communityAffairs',
  'homeHobbies',
  'personalCare',
] as const;

type DomainKey = typeof DOMAIN_KEYS[number];

export default function NewCDRAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = (searchParams.get('patientId') || '').trim();

  const [currentStep, setCurrentStep] = useState(0);
  const [domainScores, setDomainScores] = useState<Record<DomainKey, number | null>>({
    memory: null,
    orientation: null,
    judgmentProblemSolving: null,
    communityAffairs: null,
    homeHobbies: null,
    personalCare: null,
  });
  const [notes, setNotes] = useState('');

  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId),
    enabled: !!patientId,
  });

  const createMutation = useMutation({
    mutationFn: createCDRAssessment,
    onSuccess: (data) => {
      router.push(`/assessments/cdr/${data.id}`);
    },
  });

  const currentDomainKey = DOMAIN_KEYS[currentStep];
  const currentDomain = DOMAIN_CRITERIA[currentDomainKey];
  const isLastStep = currentStep === DOMAIN_KEYS.length - 1;
  const isNotesStep = currentStep === DOMAIN_KEYS.length;

  const canProceed = domainScores[currentDomainKey] !== null;
  const allDomainsCompleted = DOMAIN_KEYS.every((key) => domainScores[key] !== null);

  const handleDomainScoreChange = (score: number) => {
    setDomainScores((prev) => ({
      ...prev,
      [currentDomainKey]: score,
    }));
  };

  const handleNext = () => {
    if (isLastStep) {
      setCurrentStep(DOMAIN_KEYS.length); // Move to notes step
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (!allDomainsCompleted) return;

    const scores = DOMAIN_KEYS.map((key) => domainScores[key] as number);

    await createMutation.mutateAsync({
      patientId,
      domainScores: scores,
      notes: notes || undefined,
    });
  };

  const getProgressPercentage = () => {
    const completedDomains = DOMAIN_KEYS.filter((key) => domainScores[key] !== null).length;
    return (completedDomains / DOMAIN_KEYS.length) * 100;
  };

  if (isLoadingPatient) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading patient information...</div>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">Missing patientId in URL. Navigate from patient page.</div>
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">New CDR Assessment</h1>
            <p className="text-gray-600">
              {patient.firstName} {patient.lastName} (MRN: {patient.medicalRecordNo || 'N/A'})
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/patients/${patientId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {isNotesStep
                ? 'Review & Notes'
                : `Domain ${currentStep + 1} of ${DOMAIN_KEYS.length}`}
            </span>
            <span>{Math.round(getProgressPercentage())}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Domain Overview Grid */}
      {!isNotesStep && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {DOMAIN_KEYS.map((key, index) => {
                const isCompleted = domainScores[key] !== null;
                const isCurrent = index === currentStep;

                return (
                  <button
                    key={key}
                    onClick={() => setCurrentStep(index)}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      isCurrent
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : isCompleted
                        ? 'bg-green-50 border border-green-300'
                        : 'bg-gray-50 border border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        Domain {index + 1}
                      </span>
                      {isCompleted && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      {DOMAIN_CRITERIA[key].name}
                    </div>
                    {isCompleted && (
                      <div className="text-xs text-gray-600 mt-1">
                        Score: {domainScores[key]}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Assessment Form */}
      {!isNotesStep && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-blue-600">Domain {currentStep + 1}:</span>
              {currentDomain.name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              {currentDomain.description}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentDomain.options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleDomainScoreChange(option.value)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  domainScores[currentDomainKey] === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        domainScores[currentDomainKey] === option.value
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {domainScores[currentDomainKey] === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">
                      Score: {option.value}
                    </div>
                    <div className="text-sm text-gray-600">{option.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes Step */}
      {isNotesStep && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Domain Summary */}
            <div>
              <h3 className="font-medium mb-3">Domain Scores Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DOMAIN_KEYS.map((key, index) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium">
                      {DOMAIN_CRITERIA[key].name}
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {domainScores[key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes (Optional)</Label>
              <textarea
                id="notes"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant observations, context, or comments about this assessment..."
                rows={4}
                maxLength={2000}
              />
            </div>

            {/* Alert */}
            <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Note:</strong> The global CDR score and sum of boxes will be
                automatically calculated using the standard CDR algorithm based on
                your domain ratings.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {!isNotesStep ? (
          <Button onClick={handleNext} disabled={!canProceed}>
            {isLastStep ? 'Continue to Review' : 'Next Domain'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!allDomainsCompleted || createMutation.isPending}
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Error Message */}
      {createMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Failed to create assessment. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
