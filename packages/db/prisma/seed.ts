import { PrismaClient, UserRole, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed script to populate the database with initial data
 * Run with: npm run db:seed
 */
async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@alzheimer-app.com' },
    update: {},
    create: {
      email: 'admin@alzheimer-app.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create clinician user
  const clinicianPassword = await bcrypt.hash('clinician123', 10);
  const clinician = await prisma.user.upsert({
    where: { email: 'clinician@alzheimer-app.com' },
    update: {},
    create: {
      email: 'clinician@alzheimer-app.com',
      password: clinicianPassword,
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      role: UserRole.CLINICIAN,
    },
  });
  console.log('✅ Created clinician user:', clinician.email);

  // Create caregiver user
  const caregiverPassword = await bcrypt.hash('caregiver123', 10);
  const caregiver = await prisma.user.upsert({
    where: { email: 'caregiver@alzheimer-app.com' },
    update: {},
    create: {
      email: 'caregiver@alzheimer-app.com',
      password: caregiverPassword,
      firstName: 'Mary',
      lastName: 'Smith',
      role: UserRole.CAREGIVER,
    },
  });
  console.log('✅ Created caregiver user:', caregiver.email);

  // Create sample patient
  const patient = await prisma.patient.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1945-06-15'),
      gender: Gender.MALE,
      medicalRecordNo: 'MRN-001',
      email: 'john.doe@example.com',
      phone: '555-0123',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      diagnosisDate: new Date('2020-01-15'),
      notes: 'Sample patient for testing',
      caregiverId: caregiver.id,
    },
  });
  console.log('✅ Created sample patient:', patient.firstName, patient.lastName);

  console.log('🎉 Database seeding completed!');
  console.log('\n📝 Default credentials:');
  console.log('Admin: admin@alzheimer-app.com / admin123');
  console.log('Clinician: clinician@alzheimer-app.com / clinician123');
  console.log('Caregiver: caregiver@alzheimer-app.com / caregiver123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
