import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Alzheimer&apos;s Assessment Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Comprehensive tools for tracking and assessing Alzheimer&apos;s
            progression
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h2 className="text-2xl font-semibold mb-2">GDS</h2>
              <p className="text-muted-foreground">
                Geriatric Depression Scale - 15 question assessment
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h2 className="text-2xl font-semibold mb-2">NPI</h2>
              <p className="text-muted-foreground">
                Neuropsychiatric Inventory - Domain-based evaluation
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h2 className="text-2xl font-semibold mb-2">FAQ</h2>
              <p className="text-muted-foreground">
                Functional Activities Questionnaire - 10 item functional
                assessment
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h2 className="text-2xl font-semibold mb-2">CDR</h2>
              <p className="text-muted-foreground">
                Clinical Dementia Rating - Box score assessment
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Link
              href="/login"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
