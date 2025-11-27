# Phase 6: FAQ Assessment - Complete Implementation

## Overview

Phase 6 implements the **FAQ (Functional Activities Questionnaire)** assessment system for the Alzheimer's Assessment Platform. The FAQ is a widely-used instrument for measuring functional impairment in instrumental activities of daily living (IADLs), helping clinicians assess the impact of cognitive decline on everyday functioning.

### What is FAQ?

The Functional Activities Questionnaire is a 10-item questionnaire completed by an informant (usually a caregiver or family member) that evaluates the patient's ability to perform complex tasks that are necessary for independent living. It's particularly useful for:

- Differentiating between normal aging and dementia
- Tracking functional decline over time
- Assessing dementia severity
- Informing care planning decisions

### Scoring System

- **Items**: 10 functional activities
- **Scale**: Each item scored 0-3
  - 0 = Normal (performs independently)
  - 1 = Has difficulty but does by self
  - 2 = Requires assistance
  - 3 = Dependent (cannot perform)
- **Total Score**: Sum of all items (0-30)
- **Impairment Levels**:
  - 0 = No Impairment
  - 1-5 = Mild Impairment
  - 6-15 = Moderate Impairment
  - 16-25 = Severe Impairment
  - 26-30 = Very Severe Impairment
- **Clinical Threshold**: Score ≥9 suggests dementia-related functional impairment

### FAQ Items (10 Activities)

1. Writing checks, paying bills, balancing checkbook
2. Assembling tax records, business affairs, papers
3. Shopping alone for clothes, household necessities, groceries
4. Playing a game of skill such as bridge, other card games, chess
5. Heating water for coffee or tea and turning off stove
6. Preparing a balanced meal
7. Keeping track of current events
8. Attending to and understanding TV, books, magazines
9. Remembering appointments, family occasions, medications
10. Traveling out of neighborhood, driving, arranging to take buses

## Implementation Summary

### Backend (Fastify API)

1. **FAQ Service** (`apps/api/src/modules/assessments/faq/faq.service.ts`)
   - Business logic for FAQ assessments
   - Automatic scoring calculation
   - Item-level statistics and analytics
   - Patient history tracking

2. **FAQ Routes** (`apps/api/src/modules/assessments/faq/faq.routes.ts`)
   - RESTful API endpoints
   - Request validation with Zod
   - Error handling

3. **Database Schema** (Already exists from Phase 1)
   - `FAQAssessment` model with Prisma
   - Relationships with Assessment and Patient

### Frontend (Next.js)

1. **FAQ API Client** (`apps/web/lib/faq-api.ts`)
   - Type-safe API methods
   - TypeScript interfaces
   - Axios-based HTTP client

2. **FAQ Assessment Form** (`apps/web/app/assessments/faq/[patientId]/new/page.tsx`)
   - Single-page form with 10 items
   - Progress bar showing completion
   - Item overview grid for navigation
   - Color-coded response options
   - Scroll-to-item functionality

3. **FAQ Results Page** (`apps/web/app/assessments/faq/[id]/page.tsx`)
   - Total score display
   - Impairment level badge
   - Detailed item breakdown table
   - Score interpretation guide
   - Patient information

4. **FAQ History Page** (`apps/web/app/patients/[id]/assessments/faq/page.tsx`)
   - Statistics cards (total, average, latest, trend)
   - Score progression visualization
   - Item impairment analysis
   - Assessment history table
   - Empty state for first assessment

## Backend Implementation Details

### FAQ Service Methods

```typescript
class FAQService {
  // Create new FAQ assessment with automatic scoring
  async createAssessment(data: CreateFAQAssessmentInput): Promise<FAQAssessmentWithRelations>
  
  // Get FAQ assessment by ID with full details
  async getAssessmentById(assessmentId: string): Promise<FAQAssessmentWithRelations>
  
  // Get all FAQ assessments for a patient
  async getPatientAssessments(patientId: string, options?: PaginationOptions): Promise<PaginatedResult>
  
  // Get patient statistics (average, latest, trends)
  async getPatientStats(patientId: string): Promise<FAQStats>
  
  // Get item-level breakdown for patient
  async getItemBreakdown(patientId: string): Promise<ItemBreakdown[]>
  
  // Compare two FAQ assessments
  async compareAssessments(id1: string, id2: string): Promise<ComparisonResult>
  
  // Delete FAQ assessment
  async deleteAssessment(assessmentId: string): Promise<void>
}
```

### Scoring Helpers

```typescript
// Calculate impairment level from total score
function getImpairmentLevel(score: number): string {
  if (score === 0) return 'No Impairment';
  if (score <= 5) return 'Mild';
  if (score <= 15) return 'Moderate';
  if (score <= 25) return 'Severe';
  return 'Very Severe';
}

// Get score label for display
function getScoreLabel(score: number): string {
  return `${score}/30 (${getImpairmentLevel(score)})`;
}
```

### API Routes

#### 1. Create FAQ Assessment

```http
POST /api/assessments/faq
Content-Type: application/json
Authorization: Bearer <token>

{
  "patientId": "uuid",
  "answers": [0, 1, 2, 0, 1, 1, 0, 2, 1, 0],
  "notes": "Patient shows moderate difficulty with financial management"
}
```

**Response:**
```json
{
  "id": "assessment-uuid",
  "patientId": "patient-uuid",
  "assessedById": "user-uuid",
  "type": "FAQ",
  "createdAt": "2024-01-15T10:30:00Z",
  "faqAssessment": {
    "id": "faq-uuid",
    "assessmentId": "assessment-uuid",
    "answers": [0, 1, 2, 0, 1, 1, 0, 2, 1, 0],
    "totalScore": 8,
    "notes": "Patient shows moderate difficulty with financial management"
  },
  "patient": {
    "id": "patient-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "medicalRecordNumber": "MRN12345"
  },
  "assessedBy": {
    "id": "user-uuid",
    "firstName": "Dr. Jane",
    "lastName": "Smith"
  }
}
```

#### 2. Get FAQ Assessment

```http
GET /api/assessments/faq/:id
Authorization: Bearer <token>
```

#### 3. Get Patient FAQ Assessments

```http
GET /api/assessments/faq/patient/:patientId?page=1&limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "assessments": [...],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

#### 4. Get Patient FAQ Statistics

```http
GET /api/assessments/faq/patient/:patientId/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 5,
  "averageScore": 12.4,
  "latestScore": 14,
  "latestImpairment": "Moderate",
  "scoreHistory": [
    { "date": "2024-01-15", "totalScore": 14 },
    { "date": "2024-01-08", "totalScore": 12 },
    { "date": "2024-01-01", "totalScore": 10 }
  ],
  "itemStats": [
    {
      "itemNumber": 1,
      "item": "Writing checks, paying bills...",
      "averageScore": 1.8,
      "impairmentRate": 80.0
    }
  ]
}
```

#### 5. Compare FAQ Assessments

```http
GET /api/assessments/faq/compare/:id1/:id2
Authorization: Bearer <token>
```

**Response:**
```json
{
  "assessment1": {...},
  "assessment2": {...},
  "comparison": {
    "scoreDifference": 3,
    "percentageChange": 25.0,
    "itemChanges": [
      {
        "itemNumber": 1,
        "item": "Writing checks, paying bills...",
        "score1": 1,
        "score2": 2,
        "difference": 1
      }
    ]
  }
}
```

#### 6. Delete FAQ Assessment

```http
DELETE /api/assessments/faq/:id
Authorization: Bearer <token>
```

## Frontend Implementation Details

### FAQ Assessment Form Features

The FAQ assessment form provides an intuitive single-page experience:

1. **Progress Indicator**
   - Shows completion percentage
   - Visual progress bar
   - "X of 10 items completed" counter

2. **Item Overview Grid**
   - 2×5 grid layout (2 rows, 5 columns)
   - Click to scroll to specific item
   - Visual completion indicators
   - Color-coded by status

3. **Response Options**
   - 4 radio buttons per item (0-3)
   - Color-coded for visual clarity:
     - Green: Normal (0)
     - Yellow: Has Difficulty (1)
     - Orange: Requires Assistance (2)
     - Red: Dependent (3)
   - Clear option descriptions

4. **Form Validation**
   - All 10 items must be answered
   - Submit button disabled until complete
   - Clear validation messages

5. **Navigation**
   - Scroll to specific item from overview grid
   - Smooth scrolling animation
   - Visual feedback for current item

### FAQ Results Page Features

1. **Score Summary Card**
   - Large total score display (0-30)
   - Color-coded impairment level badge
   - Percentage representation

2. **Patient Information**
   - Name, MRN, age
   - Assessment date and time
   - Assessed by clinician name

3. **Item Breakdown Table**
   - All 10 items with responses
   - Color-coded badges for each score
   - Full item descriptions

4. **Score Interpretation Guide**
   - Impairment level ranges
   - Clinical significance
   - Recommendations

5. **Actions**
   - Print/Export functionality (future)
   - Delete assessment (admin only)
   - Compare with previous (if available)

### FAQ History Page Features

1. **Statistics Cards** (4 metrics)
   - Total assessments count
   - Average score across all assessments
   - Latest score with impairment badge
   - Trend indicator (improving/worsening/stable)

2. **Score Progression Chart**
   - Horizontal bar chart
   - Up to 10 most recent assessments
   - Score out of 30 displayed
   - Date labels
   - Impairment level badges

3. **Item Analysis Table**
   - All 10 items
   - Average score per item across all assessments
   - Impairment rate (% of assessments with score >0)
   - Identifies most problematic areas

4. **Assessment History Table**
   - Chronological list
   - Date, total score, impairment level
   - Assessed by clinician
   - View details button

5. **Empty State**
   - Friendly message for first-time use
   - "Create First Assessment" button
   - Guidance text

## Usage Examples

### Creating an FAQ Assessment

1. Navigate to patient detail page
2. Click "New FAQ" button
3. Complete all 10 items (select 0-3 for each)
4. Add optional notes
5. Click "Submit Assessment"
6. View results immediately

### Viewing FAQ History

1. From patient detail page, click "View FAQ History"
2. Review statistics cards for overview
3. Examine score progression chart for trends
4. Check item analysis for specific problem areas
5. Click "View Details" on any assessment to see full results

### Comparing FAQ Assessments

1. Navigate to FAQ history page
2. Select two assessments to compare (future feature)
3. View side-by-side comparison
4. Identify which items have changed
5. Calculate percentage change

## Testing Guide

### Backend Testing

#### 1. Test FAQ Service

```typescript
// Test automatic scoring calculation
const assessment = await faqService.createAssessment({
  patientId: 'patient-id',
  userId: 'user-id',
  answers: [1, 2, 1, 0, 1, 2, 1, 0, 1, 2],
  notes: 'Test assessment'
});
expect(assessment.faqAssessment.totalScore).toBe(11); // Sum of answers

// Test impairment level calculation
expect(getImpairmentLevel(0)).toBe('No Impairment');
expect(getImpairmentLevel(3)).toBe('Mild');
expect(getImpairmentLevel(10)).toBe('Moderate');
expect(getImpairmentLevel(20)).toBe('Severe');
expect(getImpairmentLevel(28)).toBe('Very Severe');

// Test statistics calculation
const stats = await faqService.getPatientStats('patient-id');
expect(stats.total).toBeGreaterThan(0);
expect(stats.averageScore).toBeGreaterThanOrEqual(0);
expect(stats.averageScore).toBeLessThanOrEqual(30);
```

#### 2. Test FAQ Routes

```bash
# Create FAQ assessment
curl -X POST http://localhost:3001/api/assessments/faq \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "patientId": "patient-uuid",
    "answers": [1, 2, 1, 0, 1, 2, 1, 0, 1, 2],
    "notes": "Test assessment"
  }'

# Get patient FAQ assessments
curl http://localhost:3001/api/assessments/faq/patient/patient-uuid \
  -H "Authorization: Bearer <token>"

# Get patient statistics
curl http://localhost:3001/api/assessments/faq/patient/patient-uuid/stats \
  -H "Authorization: Bearer <token>"

# Compare assessments
curl http://localhost:3001/api/assessments/faq/compare/id1/id2 \
  -H "Authorization: Bearer <token>"
```

### Frontend Testing

#### 1. Test FAQ Form

- [ ] Form loads correctly with all 10 items
- [ ] Progress bar updates as items are answered
- [ ] Item overview grid shows completion status
- [ ] Clicking grid item scrolls to that item
- [ ] All 4 radio options work for each item
- [ ] Submit button is disabled until all items answered
- [ ] Submit button is enabled when all items answered
- [ ] Form submission creates assessment successfully
- [ ] Success redirects to results page
- [ ] Error handling displays appropriate messages

#### 2. Test FAQ Results Page

- [ ] Total score displays correctly
- [ ] Impairment level badge shows correct color and text
- [ ] Patient information displays correctly
- [ ] All 10 items show in breakdown table
- [ ] Score badges have correct colors (green/yellow/orange/red)
- [ ] Notes display if provided
- [ ] "Back to Patient" button works
- [ ] Print functionality works (when implemented)

#### 3. Test FAQ History Page

- [ ] Statistics cards display correct values
- [ ] Trend indicator shows correct direction
- [ ] Score progression chart renders correctly
- [ ] Item analysis table shows all 10 items
- [ ] Impairment rates calculate correctly
- [ ] Assessment history table lists all assessments
- [ ] "View Details" buttons navigate correctly
- [ ] "New FAQ Assessment" button works
- [ ] Empty state displays when no assessments exist

## Security Features

### Authentication & Authorization

- All FAQ routes require valid JWT authentication
- Role-based access control (RBAC):
  - Clinicians can create and view assessments
  - Admins can delete assessments
  - Researchers can view anonymized data (future)

### Data Validation

- Request validation with Zod schemas:
  - Exactly 10 answers required
  - Each answer must be 0-3
  - PatientId and userId validated
  - Notes character limit enforced

### Audit Trail

- All FAQ operations logged to `AuditLog`:
  - CREATE_ASSESSMENT
  - VIEW_ASSESSMENT
  - DELETE_ASSESSMENT
- Tracks user, timestamp, IP address
- Immutable audit records

### Data Privacy

- HIPAA compliance considerations:
  - Encrypted data at rest (database level)
  - Encrypted data in transit (HTTPS)
  - Access logging for compliance
  - Patient data anonymization options

## Clinical Interpretation

### Score Ranges and Implications

| Score | Impairment Level | Clinical Significance | Recommendations |
|-------|-----------------|----------------------|----------------|
| 0 | No Impairment | Patient fully independent in IADLs | Continue monitoring |
| 1-5 | Mild | Minor difficulties, mostly independent | Monitor for progression, consider interventions |
| 6-15 | Moderate | Noticeable functional decline | Provide support, consider safety assessment |
| 16-25 | Severe | Significant impairment in daily functioning | Structured support needed, caregiver training |
| 26-30 | Very Severe | Nearly complete dependence | Full-time care, safety planning essential |

### Clinical Decision Points

- **Score ≥9**: Strong indicator of dementia-related functional impairment
- **Score ≥15**: Consider formal care needs assessment
- **Rapid increase (≥3 points in 3 months)**: Warrants immediate clinical review
- **High variance across items**: May indicate specific cognitive domain deficits

### Item-Level Interpretation

Items scoring 2-3 indicate specific areas requiring intervention:

- **Items 1-3** (finances, shopping): May need financial management support
- **Items 4-6** (cooking, meal prep): Safety concerns, nutritional risks
- **Items 7-8** (current events, comprehension): Cognitive stimulation needed
- **Item 9** (memory for appointments): Medication management risks
- **Item 10** (travel, driving): Safety evaluation critical

## Performance Considerations

### Database Optimization

- Indexed fields: `patientId`, `assessmentId`, `createdAt`
- Pagination for large result sets
- Efficient joins with Prisma includes
- Connection pooling enabled

### Frontend Optimization

- TanStack Query for data caching
- Optimistic updates for better UX
- Lazy loading for chart components
- Memoization of expensive calculations

## Integration Points

### With Other Assessments

FAQ assessment integrates with:

1. **GDS (Geriatric Depression Scale)**
   - High FAQ + high GDS may indicate depression-related functional impairment
   - Combined view in patient dashboard

2. **NPI (Neuropsychiatric Inventory)**
   - Behavioral symptoms may contribute to functional decline
   - Correlate NPI domains with FAQ items

3. **CDR (Clinical Dementia Rating)** - Coming in Phase 7
   - FAQ helps inform CDR Community Affairs and Home & Hobbies domains
   - Combined scoring for comprehensive dementia staging

### Dashboard Integration

- FAQ card shows "Available" status
- Quick access from patient detail page
- Statistics displayed in patient dashboard
- Trend analysis across all assessment types

## Next Steps (Phase 7: CDR Assessment)

With FAQ complete, the next phase will implement the Clinical Dementia Rating (CDR):

1. **CDR Backend**
   - 6-domain semi-structured interview
   - Box score algorithm for global CDR
   - Sum of Boxes calculation

2. **CDR Frontend**
   - Multi-step interview form
   - Domain-by-domain assessment
   - Algorithmic global score calculation
   - Comprehensive results visualization

3. **Integration**
   - Complete assessment suite (GDS, NPI, FAQ, CDR)
   - Cross-assessment analytics
   - Comprehensive patient profile

## File Inventory

### Backend Files (3 files)

1. `apps/api/src/modules/assessments/faq/faq.service.ts` (420 lines)
2. `apps/api/src/modules/assessments/faq/faq.routes.ts` (260 lines)
3. `apps/api/src/modules/assessments/assessment.routes.ts` (modified to register FAQ routes)

### Frontend Files (4 files)

1. `apps/web/lib/faq-api.ts` (170 lines)
2. `apps/web/app/assessments/faq/[patientId]/new/page.tsx` (255 lines)
3. `apps/web/app/assessments/faq/[id]/page.tsx` (330 lines)
4. `apps/web/app/patients/[id]/assessments/faq/page.tsx` (285 lines)

### Modified Files (2 files)

1. `apps/web/app/dashboard/page.tsx` (FAQ card updated to "Available")
2. `apps/web/app/patients/[id]/page.tsx` (FAQ button enabled, history link added)

### Total Implementation

- **New Files**: 7
- **Modified Files**: 3
- **Total Lines**: ~1,720 lines
- **Estimated Time**: 3-4 hours

## Conclusion

Phase 6 successfully implements a complete FAQ assessment system with:

✅ Backend service with automatic scoring  
✅ RESTful API with 6 endpoints  
✅ Type-safe frontend API client  
✅ Single-page assessment form with progress tracking  
✅ Comprehensive results page  
✅ History page with statistics and trends  
✅ Dashboard and patient page integration  
✅ Complete documentation  

The FAQ assessment is now fully functional and integrated into the Alzheimer's Assessment Platform, providing clinicians with a powerful tool for evaluating functional impairment in patients with cognitive decline.

**Phase 6: COMPLETE** ✅
