
import { calculateGDSScore, GDS_QUESTIONS } from './packages/types/scoring/gds';

console.log('Testing GDS Scoring...');

// Simulate answers where some contribute to score
// Q1: No (Reverse scored) -> Should be +1
// Q2: No -> 0
// Q6: Yes -> +1
const mockAnswers = [
    { questionId: 1, answer: false },
    { questionId: 2, answer: false },
    { questionId: 3, answer: false },
    { questionId: 4, answer: false },
    { questionId: 5, answer: true }, // Reverse, Yes -> 0
    { questionId: 6, answer: true }, // Yes -> +1
    { questionId: 7, answer: true }, // Reverse, Yes -> 0
    { questionId: 8, answer: true }, // Yes -> +1
    { questionId: 9, answer: true }, // Yes -> +1
    { questionId: 10, answer: false },
    { questionId: 11, answer: false }, // Reverse, No -> +1
    { questionId: 12, answer: false },
    { questionId: 13, answer: true }, // Reverse, Yes -> 0
    { questionId: 14, answer: true }, // Yes -> +1
    { questionId: 15, answer: false },
];

console.log('Mock Answers:', JSON.stringify(mockAnswers, null, 2));

const result = calculateGDSScore(mockAnswers);

console.log('Result:', JSON.stringify(result, null, 2));

// Expected score:
// Q1: No (Reverse) -> 1
// Q6: Yes -> 1
// Q8: Yes -> 1
// Q9: Yes -> 1
// Q11: No (Reverse) -> 1
// Q14: Yes -> 1
// Total: 6
