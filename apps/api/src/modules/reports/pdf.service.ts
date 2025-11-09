import PDFDocument from 'pdfkit';
import type { Patient, GDSAssessment, NPIAssessment, FAQAssessment, CDRAssessment } from '@repo/db';
import { prisma } from '@repo/db';

interface ComprehensiveReportData {
  patient: Patient;
  gdsAssessments: GDSAssessment[];
  npiAssessments: NPIAssessment[];
  faqAssessments: FAQAssessment[];
  cdrAssessments: CDRAssessment[];
  analytics: {
    latestScores: {
      gds?: number;
      npi?: number;
      faq?: number;
      cdr?: number;
    };
    trends: {
      gds: string;
      npi: string;
      faq: string;
      cdr: string;
    };
    alerts: Array<{
      type: string;
      category: string;
      message: string;
    }>;
  };
}

export class PDFService {
  /**
   * Generate comprehensive PDF report for a patient
   */
  async generatePatientReport(patientId: string): Promise<Buffer> {
    // Fetch all data
    const data = await this.fetchReportData(patientId);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Generate report content
        this.addHeader(doc, data.patient);
        this.addPatientDemographics(doc, data.patient);
        this.addExecutiveSummary(doc, data);
        this.addGDSSection(doc, data.gdsAssessments);
        this.addNPISection(doc, data.npiAssessments);
        this.addFAQSection(doc, data.faqAssessments);
        this.addCDRSection(doc, data.cdrAssessments);
        this.addAlertsSection(doc, data.analytics.alerts);
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fetch all required data for the report
   */
  private async fetchReportData(patientId: string): Promise<ComprehensiveReportData> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    const [gdsAssessments, npiAssessments, faqAssessments, cdrAssessments] = await Promise.all([
      prisma.gDSAssessment.findMany({
        where: { patientId },
        orderBy: { assessmentDate: 'desc' },
        take: 10,
      }),
      prisma.nPIAssessment.findMany({
        where: { patientId },
        orderBy: { assessmentDate: 'desc' },
        take: 10,
      }),
      prisma.fAQAssessment.findMany({
        where: { patientId },
        orderBy: { assessmentDate: 'desc' },
        take: 10,
      }),
      prisma.cDRAssessment.findMany({
        where: { patientId },
        orderBy: { assessmentDate: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate analytics
    const analytics = this.calculateAnalytics(
      gdsAssessments,
      npiAssessments,
      faqAssessments,
      cdrAssessments
    );

    return {
      patient,
      gdsAssessments,
      npiAssessments,
      faqAssessments,
      cdrAssessments,
      analytics,
    };
  }

  /**
   * Calculate analytics for the report
   */
  private calculateAnalytics(
    gds: GDSAssessment[],
    npi: NPIAssessment[],
    faq: FAQAssessment[],
    cdr: CDRAssessment[]
  ) {
    const latestScores = {
      gds: gds[0]?.totalScore,
      npi: npi[0]?.totalScore,
      faq: faq[0]?.totalScore,
      cdr: cdr[0]?.globalScore,
    };

    const trends = {
      gds: this.calculateTrend(gds.map((a) => a.totalScore)),
      npi: this.calculateTrend(npi.map((a) => a.totalScore)),
      faq: this.calculateTrend(faq.map((a) => a.totalScore)),
      cdr: this.calculateTrend(cdr.map((a) => a.globalScore)),
    };

    const alerts = [];

    // Generate alerts
    if (latestScores.gds && latestScores.gds >= 10) {
      alerts.push({
        type: 'danger',
        category: 'Depression',
        message: `Severe depression detected (GDS: ${latestScores.gds}/15)`,
      });
    }
    if (latestScores.npi && latestScores.npi >= 37) {
      alerts.push({
        type: 'danger',
        category: 'Behavioral',
        message: `Severe behavioral symptoms (NPI: ${latestScores.npi}/144)`,
      });
    }
    if (latestScores.cdr && latestScores.cdr >= 2) {
      alerts.push({
        type: 'danger',
        category: 'Cognitive',
        message: `Moderate/Severe dementia (CDR: ${latestScores.cdr})`,
      });
    }

    return { latestScores, trends, alerts };
  }

  /**
   * Calculate trend direction from scores
   */
  private calculateTrend(scores: number[]): string {
    if (scores.length < 2) return 'Insufficient data';
    const recent = scores.slice(0, 3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const oldest = recent[recent.length - 1];
    const change = avg - oldest;

    if (change < -0.5) return 'Improving';
    if (change > 0.5) return 'Declining';
    return 'Stable';
  }

  /**
   * Add header to the PDF
   */
  private addHeader(doc: PDFKit.PDFDocument, patient: Patient) {
    doc
      .fontSize(24)
      .fillColor('#1e40af')
      .text('Alzheimer\'s Assessment Report', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .fillColor('#666666')
      .text(`Patient: ${patient.firstName} ${patient.lastName}`, { align: 'center' })
      .text(`MRN: ${patient.medicalRecordNumber}`, { align: 'center' })
      .text(`Report Generated: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`, { align: 'center' })
      .moveDown(1);

    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);

    doc.fillColor('#000000'); // Reset to black
  }

  /**
   * Add patient demographics section
   */
  private addPatientDemographics(doc: PDFKit.PDFDocument, patient: Patient) {
    doc
      .fontSize(16)
      .fillColor('#1f2937')
      .text('Patient Demographics', { underline: true })
      .moveDown(0.5);

    const age = this.calculateAge(patient.dateOfBirth);

    doc
      .fontSize(11)
      .fillColor('#374151')
      .text(`Date of Birth: ${new Date(patient.dateOfBirth).toLocaleDateString('en-US')}`, { continued: true })
      .text(`     Age: ${age} years`, { align: 'left' })
      .text(`Gender: ${patient.gender}`, { continued: true })
      .text(`     Medical Record #: ${patient.medicalRecordNumber}`)
      .moveDown(0.5);

    if (patient.email) {
      doc.text(`Email: ${patient.email}`);
    }
    if (patient.phone) {
      doc.text(`Phone: ${patient.phone}`);
    }
    if (patient.address) {
      doc.text(`Address: ${patient.address}`);
    }

    doc.moveDown(0.5);

    // Caregiver information
    if (patient.caregiverName) {
      doc
        .fontSize(14)
        .fillColor('#1f2937')
        .text('Caregiver Information', { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(11)
        .fillColor('#374151')
        .text(`Name: ${patient.caregiverName}`)
        .text(`Relationship: ${patient.caregiverRelationship || 'N/A'}`)
        .text(`Phone: ${patient.caregiverPhone || 'N/A'}`)
        .text(`Email: ${patient.caregiverEmail || 'N/A'}`)
        .moveDown(0.5);
    }

    if (patient.notes) {
      doc
        .fontSize(14)
        .fillColor('#1f2937')
        .text('Clinical Notes', { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(10)
        .fillColor('#4b5563')
        .text(patient.notes, { align: 'justify' })
        .moveDown(1);
    }

    doc.fillColor('#000000');
  }

  /**
   * Add executive summary section
   */
  private addExecutiveSummary(doc: PDFKit.PDFDocument, data: ComprehensiveReportData) {
    this.addPageBreakIfNeeded(doc, 200);

    doc
      .fontSize(16)
      .fillColor('#1f2937')
      .text('Executive Summary', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(11)
      .fillColor('#374151')
      .text(`Total Assessments: ${
        data.gdsAssessments.length + 
        data.npiAssessments.length + 
        data.faqAssessments.length + 
        data.cdrAssessments.length
      }`)
      .moveDown(0.5);

    // Latest scores summary
    doc.fontSize(12).fillColor('#1f2937').text('Latest Assessment Scores:', { underline: true }).moveDown(0.3);

    if (data.analytics.latestScores.gds !== undefined) {
      const severity = this.getGDSSeverity(data.analytics.latestScores.gds);
      doc
        .fontSize(11)
        .fillColor('#374151')
        .text(`• GDS (Depression): ${data.analytics.latestScores.gds}/15 - ${severity}`, {
          continued: true,
        })
        .fillColor('#666666')
        .text(` (${data.analytics.trends.gds})`, { align: 'left' })
        .fillColor('#374151');
    }

    if (data.analytics.latestScores.npi !== undefined) {
      const severity = this.getNPISeverity(data.analytics.latestScores.npi);
      doc
        .text(`• NPI (Behavioral): ${data.analytics.latestScores.npi}/144 - ${severity}`, {
          continued: true,
        })
        .fillColor('#666666')
        .text(` (${data.analytics.trends.npi})`, { align: 'left' })
        .fillColor('#374151');
    }

    if (data.analytics.latestScores.faq !== undefined) {
      const severity = this.getFAQSeverity(data.analytics.latestScores.faq);
      doc
        .text(`• FAQ (Functional): ${data.analytics.latestScores.faq}/30 - ${severity}`, {
          continued: true,
        })
        .fillColor('#666666')
        .text(` (${data.analytics.trends.faq})`, { align: 'left' })
        .fillColor('#374151');
    }

    if (data.analytics.latestScores.cdr !== undefined) {
      const severity = this.getCDRSeverity(data.analytics.latestScores.cdr);
      doc
        .text(`• CDR (Dementia Rating): ${data.analytics.latestScores.cdr} - ${severity}`, {
          continued: true,
        })
        .fillColor('#666666')
        .text(` (${data.analytics.trends.cdr})`, { align: 'left' })
        .fillColor('#374151');
    }

    doc.moveDown(1).fillColor('#000000');
  }

  /**
   * Add GDS assessment section
   */
  private addGDSSection(doc: PDFKit.PDFDocument, assessments: GDSAssessment[]) {
    if (assessments.length === 0) return;

    this.addPageBreakIfNeeded(doc, 250);

    doc
      .fontSize(16)
      .fillColor('#1f2937')
      .text('GDS - Geriatric Depression Scale', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor('#666666')
      .text('Measures depression symptoms in elderly patients (0-15 scale)')
      .moveDown(0.5);

    // Assessment history table
    this.drawAssessmentTable(doc, assessments, 'GDS', (assessment) => [
      new Date(assessment.assessmentDate).toLocaleDateString(),
      `${assessment.totalScore}/15`,
      this.getGDSSeverity(assessment.totalScore),
      assessment.notes || 'N/A',
    ]);

    doc.moveDown(1).fillColor('#000000');
  }

  /**
   * Add NPI assessment section
   */
  private addNPISection(doc: PDFKit.PDFDocument, assessments: NPIAssessment[]) {
    if (assessments.length === 0) return;

    this.addPageBreakIfNeeded(doc, 250);

    doc
      .fontSize(16)
      .fillColor('#1f2937')
      .text('NPI - Neuropsychiatric Inventory', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor('#666666')
      .text('Assesses behavioral and psychological symptoms (0-144 scale)')
      .moveDown(0.5);

    this.drawAssessmentTable(doc, assessments, 'NPI', (assessment) => [
      new Date(assessment.assessmentDate).toLocaleDateString(),
      `${assessment.totalScore}/144`,
      this.getNPISeverity(assessment.totalScore),
      `Distress: ${assessment.totalDistress}/60`,
    ]);

    doc.moveDown(1).fillColor('#000000');
  }

  /**
   * Add FAQ assessment section
   */
  private addFAQSection(doc: PDFKit.PDFDocument, assessments: FAQAssessment[]) {
    if (assessments.length === 0) return;

    this.addPageBreakIfNeeded(doc, 250);

    doc
      .fontSize(16)
      .fillColor('#1f2937')
      .text('FAQ - Functional Activities Questionnaire', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor('#666666')
      .text('Evaluates functional impairment in daily activities (0-30 scale)')
      .moveDown(0.5);

    this.drawAssessmentTable(doc, assessments, 'FAQ', (assessment) => [
      new Date(assessment.assessmentDate).toLocaleDateString(),
      `${assessment.totalScore}/30`,
      this.getFAQSeverity(assessment.totalScore),
      assessment.notes || 'N/A',
    ]);

    doc.moveDown(1).fillColor('#000000');
  }

  /**
   * Add CDR assessment section
   */
  private addCDRSection(doc: PDFKit.PDFDocument, assessments: CDRAssessment[]) {
    if (assessments.length === 0) return;

    this.addPageBreakIfNeeded(doc, 250);

    doc
      .fontSize(16)
      .fillColor('#1f2937')
      .text('CDR - Clinical Dementia Rating', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor('#666666')
      .text('Rates severity of dementia across 6 cognitive domains (0-3 scale)')
      .moveDown(0.5);

    this.drawAssessmentTable(doc, assessments, 'CDR', (assessment) => [
      new Date(assessment.assessmentDate).toLocaleDateString(),
      `Global: ${assessment.globalScore}`,
      this.getCDRSeverity(assessment.globalScore),
      `Sum of Boxes: ${assessment.sumOfBoxes}/18`,
    ]);

    doc.moveDown(1).fillColor('#000000');
  }

  /**
   * Add alerts section
   */
  private addAlertsSection(
    doc: PDFKit.PDFDocument,
    alerts: Array<{ type: string; category: string; message: string }>
  ) {
    if (alerts.length === 0) return;

    this.addPageBreakIfNeeded(doc, 150);

    doc
      .fontSize(16)
      .fillColor('#dc2626')
      .text('⚠️ Clinical Alerts', { underline: true })
      .moveDown(0.5);

    alerts.forEach((alert) => {
      doc
        .fontSize(11)
        .fillColor(alert.type === 'danger' ? '#dc2626' : '#f59e0b')
        .text(`• ${alert.category}: ${alert.message}`)
        .moveDown(0.3);
    });

    doc.moveDown(1).fillColor('#000000');
  }

  /**
   * Draw assessment table
   */
  private drawAssessmentTable(
    doc: PDFKit.PDFDocument,
    assessments: any[],
    type: string,
    rowMapper: (assessment: any) => string[]
  ) {
    const headers = ['Date', 'Score', 'Severity', 'Notes'];
    const columnWidths = [100, 80, 120, 180];
    const rowHeight = 20;
    const startX = 50;
    let startY = doc.y;

    // Draw header
    doc.fontSize(10).fillColor('#1f2937');
    headers.forEach((header, i) => {
      const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(header, x, startY, { width: columnWidths[i], align: 'left' });
    });

    startY += rowHeight;
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(startX, startY)
      .lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), startY)
      .stroke();

    // Draw rows
    const displayAssessments = assessments.slice(0, 5); // Show last 5 assessments
    displayAssessments.forEach((assessment) => {
      startY += 5;
      const row = rowMapper(assessment);

      doc.fontSize(9).fillColor('#374151');
      row.forEach((cell, i) => {
        const x = startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(cell, x, startY, { width: columnWidths[i], align: 'left' });
      });

      startY += rowHeight;
    });

    doc.y = startY + 10;
  }

  /**
   * Add footer to each page
   */
  private addFooter(doc: PDFKit.PDFDocument) {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .text(
          `Page ${i + 1} of ${pageCount} | Confidential Medical Report | Generated: ${new Date().toLocaleString()}`,
          50,
          doc.page.height - 50,
          { align: 'center', lineBreak: false }
        );
    }
  }

  /**
   * Add page break if needed
   */
  private addPageBreakIfNeeded(doc: PDFKit.PDFDocument, requiredSpace: number) {
    if (doc.y + requiredSpace > doc.page.height - 100) {
      doc.addPage();
    }
  }

  /**
   * Helper methods for severity classification
   */
  private getGDSSeverity(score: number): string {
    if (score >= 10) return 'Severe Depression';
    if (score >= 5) return 'Mild Depression';
    return 'Normal';
  }

  private getNPISeverity(score: number): string {
    if (score >= 37) return 'Severe';
    if (score >= 14) return 'Moderate';
    if (score >= 1) return 'Mild';
    return 'None';
  }

  private getFAQSeverity(score: number): string {
    if (score >= 9) return 'Significant Impairment';
    if (score >= 1) return 'Mild Impairment';
    return 'Normal';
  }

  private getCDRSeverity(score: number): string {
    if (score === 0) return 'No Dementia';
    if (score === 0.5) return 'Questionable Dementia';
    if (score === 1) return 'Mild Dementia';
    if (score === 2) return 'Moderate Dementia';
    if (score === 3) return 'Severe Dementia';
    return 'Unknown';
  }

  private calculateAge(dateOfBirth: Date | string): number {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
}

export const pdfService = new PDFService();
