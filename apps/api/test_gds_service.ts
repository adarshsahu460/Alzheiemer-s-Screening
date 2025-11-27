
import { PrismaClient } from '@alzheimer/db';
import { gdsService } from './src/modules/assessments/gds/gds.service';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing GDS Service...');

    // Get a patient and a user (clinician)
    const patient = await prisma.patient.findFirst();
    const user = await prisma.user.findFirst({ where: { role: 'CLINICIAN' } });

    if (!patient || !user) {
        console.error('No patient or clinician found in DB');
        return;
    }

    console.log(`Using Patient: ${patient.id}, User: ${user.id}`);

    const answers = {
        answers: [
            { questionId: 1, answer: false }, // Reverse -> 1
            { questionId: 2, answer: false },
            { questionId: 3, answer: false },
            { questionId: 4, answer: false },
            { questionId: 5, answer: true }, // Reverse -> 0
            { questionId: 6, answer: true }, // Yes -> 1
            { questionId: 7, answer: true }, // Reverse -> 0
            { questionId: 8, answer: true }, // Yes -> 1
            { questionId: 9, answer: true }, // Yes -> 1
            { questionId: 10, answer: false },
            { questionId: 11, answer: false }, // Reverse -> 1
            { questionId: 12, answer: false },
            { questionId: 13, answer: true }, // Reverse -> 0
            { questionId: 14, answer: true }, // Yes -> 1
            { questionId: 15, answer: false },
        ]
    };

    try {
        const assessment = await gdsService.createAssessment({
            patientId: patient.id,
            answers: answers,
            assessedById: user.id,
            notes: 'Test assessment from script'
        });

        console.log('Assessment Created:', assessment.id);
        console.log('Score:', assessment.gdsDetails?.score);
        console.log('Severity:', assessment.gdsDetails?.severity);

        // Clean up
        await gdsService.deleteAssessment(assessment.id, user.id);
        console.log('Assessment deleted');

    } catch (error) {
        console.error('Error:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
