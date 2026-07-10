import Link from "next/link";
import { Camera, PieChart, Wallet, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Track Expenses.{" "}
              <span className="text-primary">Snap a Receipt.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Stop manually typing every expense. Just take a photo of your
              receipt and our AI will identify each item, expand abbreviations,
              and categorize everything automatically.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">
            Budgeting Made Effortless
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Camera className="h-8 w-8 text-primary" />}
              title="Snap & Track"
              description="Take a photo of any receipt. AI identifies items like 'CHK BRST' as 'Chicken Breast' and categorizes them automatically."
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title="AI-Powered"
              description="Understands abbreviated merchant names, expands them, and assigns categories: Food, Hygiene, Cleaning, Drinks, and more."
            />
            <FeatureCard
              icon={<PieChart className="h-8 w-8 text-primary" />}
              title="Visual Insights"
              description="See where your money goes with beautiful charts. Track spending trends and stay within your monthly budgets."
            />
            <FeatureCard
              icon={<Wallet className="h-8 w-8 text-primary" />}
              title="Budget Control"
              description="Set monthly budgets per category. Get visual alerts when you're nearing your limits."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">
            How It Works
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <StepCard
              step="1"
              title="Snap Your Receipt"
              description="Take a photo or upload an image of your grocery, restaurant, or store receipt."
            />
            <StepCard
              step="2"
              title="AI Analyzes"
              description="Our AI reads each item, understands abbreviations, assigns categories, and extracts prices."
            />
            <StepCard
              step="3"
              title="Review & Save"
              description="Check the itemized list, make any adjustments, and save. Done in seconds!"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>Budget Tracker - Smart Expense Management. Built with Next.js & AI.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <article className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
        {step}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}
