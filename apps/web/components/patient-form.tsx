'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Card, CardContent } from '@repo/ui';
import type { CreatePatientInput, UpdatePatientInput } from '@repo/types';

interface PatientFormProps {
  initialData?: Partial<UpdatePatientInput & { id: string }>;
  onSubmit: (data: CreatePatientInput | UpdatePatientInput) => Promise<void>;
  isEdit?: boolean;
}

export function PatientForm({
  initialData,
  onSubmit,
  isEdit = false,
}: PatientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    dateOfBirth: initialData?.dateOfBirth
      ? new Date(initialData.dateOfBirth).toISOString().split('T')[0]
      : '',
    gender: (initialData?.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'MALE',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    medicalRecordNumber: initialData?.medicalRecordNumber || '',
    caregiverName: initialData?.caregiverName || '',
    caregiverRelationship: initialData?.caregiverRelationship || '',
    caregiverPhone: initialData?.caregiverPhone || '',
    caregiverEmail: initialData?.caregiverEmail || '',
    notes: initialData?.notes || '',
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Convert empty strings to null
      const submitData: any = { ...formData };
      Object.keys(submitData).forEach((key) => {
        if (submitData[key] === '') {
          submitData[key] = null;
        }
      });

      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Personal Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="gender">
                Gender <span className="text-red-500">*</span>
              </Label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                required
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="medicalRecordNumber">
                Medical Record Number (MRN)
              </Label>
              <Input
                id="medicalRecordNumber"
                name="medicalRecordNumber"
                value={formData.medicalRecordNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Caregiver Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Caregiver Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="caregiverName">Caregiver Name</Label>
              <Input
                id="caregiverName"
                name="caregiverName"
                value={formData.caregiverName}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="caregiverRelationship">Relationship</Label>
              <select
                id="caregiverRelationship"
                name="caregiverRelationship"
                value={formData.caregiverRelationship}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Select relationship...</option>
                <option value="SPOUSE">Spouse</option>
                <option value="CHILD">Child</option>
                <option value="SIBLING">Sibling</option>
                <option value="PARENT">Parent</option>
                <option value="FRIEND">Friend</option>
                <option value="PROFESSIONAL">Professional Caregiver</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="caregiverPhone">Caregiver Phone</Label>
              <Input
                id="caregiverPhone"
                name="caregiverPhone"
                type="tel"
                value={formData.caregiverPhone}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="caregiverEmail">Caregiver Email</Label>
              <Input
                id="caregiverEmail"
                name="caregiverEmail"
                type="email"
                value={formData.caregiverEmail}
                onChange={handleChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-input bg-background"
              placeholder="Any additional notes about the patient..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Patient' : 'Create Patient'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
