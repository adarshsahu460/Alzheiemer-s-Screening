'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { Label } from '@repo/ui/components/label';
import { FAQ_ITEMS, type FAQAnswer } from '@repo/types';
import { createFAQAssessment } from '@/lib/faq-api';
import { getPatient } from '@/lib/patient-api';
import { RequireRole } from '@/components/require-role';
import { Check } from 'lucide-react';

const SCORE_OPTIONS = [
  { value: 0, label: 'Normal', description: 'Never did the activity or no difficulty', color: 'green' },
  { value: 1, label: 'Has Difficulty', description: 'Does with difficulty or has started to make errors', color: 'yellow' },
  { value: 2, label: 'Requires Assistance', description: 'Requires assistance', color: 'orange' },
  { value: 3, label: 'Dependent', description: 'Dependent on others', color: 'red' },
];

export default function NewFAQAssessmentPage() {
  return (
    <RequireRole allowedRoles={['CLINICIAN', 'ADMIN']}>
      <NewFAQAssessmentContent />
    </RequireRole>
  );
}

function NewFAQAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = (searchParams.get('patientId') || '').trim();

  const [answers, setAnswers] = useState<FAQAnswer[]>(new Array(10).fill(null));
  const [notes, setNotes] = useState('');

  // Fetch patient data
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatient(patientId),
    enabled: !!patientId,
  });

  // Create assessment mutation
  const createMutation = useMutation({
    mutationFn: createFAQAssessment,
    onSuccess: (data) => {
      router.push(`/assessments/faq/${data.id}`);
    },
  });

  const handleAnswerChange = (index: number, value: number) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = value as FAQAnswer;
      return newAnswers;
    });
  };

  const handleSubmit = async () => {
    createMutation.mutate({
      patientId,
      answers,
      notes: notes || undefined,
    });
  };

  const allAnswered = answers.every(answer => answer !== null);
  const answeredCount = answers.filter(answer => answer !== null).length;
  const progressPercent = (answeredCount / 10) * 100;

  if (isLoadingPatient) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading patient data...</div>
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
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">New FAQ Assessment</h1>
        <p className="text-gray-600">
          Functional Activities Questionnaire for {patient.firstName} {patient.lastName} (MRN: {patient.medicalRecordNo || 'N/A'})
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-600">
            {answeredCount} / 10 items completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Item Overview Grid */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assessment Overview</CardTitle>
          <CardDescription>Click on an item to scroll to it</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {FAQ_ITEMS.map((item, index) => {
              const isAnswered = answers[index] !== null;
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    const element = document.getElementById(`item-${index}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`p-2 rounded-lg border-2 text-left text-sm transition-all ${
                    isAnswered
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs">Item {index + 1}</span>
                    {isAnswered && <Check className="h-3 w-3 text-green-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Items */}
      <div className="space-y-6 mb-6">
        {FAQ_ITEMS.map((item, index) => {
          const currentAnswer = answers[index];
          
          return (
            <Card key={index} id={`item-${index}`} className={currentAnswer !== null ? 'border-green-200' : ''}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {index + 1}. {item.text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SCORE_OPTIONS.map((option) => {
                    const isSelected = currentAnswer === option.value;
                    const colorClasses = {
                      green: 'border-green-500 bg-green-50',
                      yellow: 'border-yellow-500 bg-yellow-50',
                      orange: 'border-orange-500 bg-orange-50',
                      red: 'border-red-500 bg-red-50',
                    };

                    return (
                      <button
                        key={option.value}
                        onClick={() => handleAnswerChange(index, option.value)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? colorClasses[option.color as keyof typeof colorClasses]
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? `border-${option.color}-600 bg-${option.color}-600`
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="h-5 w-5 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{option.value}</span>
                              <span className="text-gray-600">-</span>
                              <span className="font-medium">{option.label}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {option.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Additional Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional observations or context..."
            rows={4}
            maxLength={2000}
          />
          <p className="text-xs text-gray-500 mt-2">
            {notes.length} / 2000 characters
          </p>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || createMutation.isPending}
          size="lg"
        >
          {createMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
        </Button>
      </div>

      {!allAnswered && (
        <p className="text-sm text-red-600 text-center mt-4">
          Please answer all 10 items before submitting
        </p>
      )}
    </div>
  );
}
