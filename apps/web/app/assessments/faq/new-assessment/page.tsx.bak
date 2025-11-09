'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPatient } from '@/lib/patient-api';
import { createGDSAssessment } from '@/lib/gds-api';
import { GDS_QUESTIONS } from '@repo/types';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
} from '@repo/ui';
import { ProtectedRoute, RequireRole } from '@/components/protected-route';

function GDSAssessmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [answers, setAnswers] = useState<boolean[]>(Array(15).fill(false));
  const [notes, setNotes] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId!),
    enabled: !!patientId,
  });

  // Create assessment mutation
  const createMutation = useMutation({
    mutationFn: createGDSAssessment,
    onSuccess: (response) => {
      // Redirect to results page
      router.push(`/assessments/gds/${response.data.id}`);
    },
  });

  const handleAnswerChange = (index: number, value: boolean) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentStep < GDS_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!patientId) return;
    
    try {
      await createMutation.mutateAsync({
        patientId,
        answers,
        notes: notes || undefined,
      });
    } catch (error) {
      console.error('Failed to create assessment:', error);
    }
  };

  const isAnswered = (index: number) => {
    // Check if question has been explicitly answered
    return answers[index] !== undefined;
  };

  const allQuestionsAnswered = answers.every(
    (answer) => answer !== undefined
  );

  const progress = Math.round(((currentStep + 1) / GDS_QUESTIONS.length) * 100);

  if (patientLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Loading patient...</p>
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

  const currentQuestion = GDS_QUESTIONS[currentStep];

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">GDS Assessment</h1>
        <p className="text-muted-foreground">
          Geriatric Depression Scale for {patient.firstName} {patient.lastName}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>
            Question {currentStep + 1} of {GDS_QUESTIONS.length}
          </span>
          <span>{progress}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Question {currentStep + 1}</CardTitle>
          <CardDescription>
            {currentQuestion.reverseScore && (
              <span className="text-xs text-orange-600">
                (Reverse scored question)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg mb-6">{currentQuestion.text}</p>

          <div className="space-y-3">
            <button
              onClick={() => handleAnswerChange(currentStep, true)}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                answers[currentStep] === true
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    answers[currentStep] === true
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {answers[currentStep] === true && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="font-medium">Yes</span>
              </div>
            </button>

            <button
              onClick={() => handleAnswerChange(currentStep, false)}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                answers[currentStep] === false
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    answers[currentStep] === false
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {answers[currentStep] === false && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="font-medium">No</span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mb-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={currentStep === GDS_QUESTIONS.length - 1}
        >
          Next
        </Button>
      </div>

      {/* Question Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Questions Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {GDS_QUESTIONS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`p-2 rounded border text-sm ${
                  index === currentStep
                    ? 'border-blue-600 bg-blue-50'
                    : answers[index] !== undefined
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Answered: {answers.filter((a) => a !== undefined).length} /{' '}
            {GDS_QUESTIONS.length}
          </p>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-md border border-input bg-background"
            placeholder="Any additional observations or notes..."
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!allQuestionsAnswered || createMutation.isPending}
          className="flex-1"
        >
          {createMutation.isPending ? 'Submitting...' : 'Complete Assessment'}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={createMutation.isPending}
        >
          Cancel
        </Button>
      </div>

      {!allQuestionsAnswered && (
        <p className="text-sm text-orange-600 mt-2 text-center">
          Please answer all questions before submitting
        </p>
      )}

      {createMutation.isError && (
        <p className="text-sm text-red-600 mt-2 text-center">
          Failed to create assessment. Please try again.
        </p>
      )}
    </div>
  );
}

export default function NewGDSAssessmentPage() {
  return (
    <ProtectedRoute>
      <RequireRole roles={['CLINICIAN', 'ADMIN']}>
        <GDSAssessmentForm />
      </RequireRole>
    </ProtectedRoute>
  );
}
