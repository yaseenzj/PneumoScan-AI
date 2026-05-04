import Link from "next/link"
import { ArrowRight, BrainCircuit, Activity, ShieldCheck, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/Header"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-muted/20">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col items-center justify-center space-y-4 text-center lg:items-start lg:text-left">
                <div className="space-y-2">
                  <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
                    Upload X-ray, <br className="hidden lg:block" /> Detect Pneumonia in Seconds.
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl lg:text-base xl:text-xl">
                    Rapid emergency chest x-ray screening using explainable AI.
                    Instantly identify pneumonia with AI-generated heatmaps and high-accuracy confidence scores.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" className="rounded-full shadow-lg" asChild>
                    <Link href="/login">
                      Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full shadow-sm bg-background/50 backdrop-blur-md" asChild>
                    <Link href="/dashboard">View Demo Dashboard</Link>
                  </Button>
                </div>
              </div>

              {/* Demo Image / Mockup Card */}
              <div className="mx-auto flex w-full max-w-[500px] items-center justify-center lg:max-w-none">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border bg-muted/30">
                  <div className="absolute inset-x-0 top-0 h-10 border-b bg-muted/50 backdrop-blur flex items-center px-4 gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                    <div className="h-3 w-3 rounded-full bg-green-400"></div>
                    <div className="flex-1 text-center text-xs font-medium text-muted-foreground">PneumoniaXpert Web Analysis</div>
                  </div>
                  <div className="absolute inset-0 top-10 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-900/10 to-transparent">
                    <div className="relative w-3/4 aspect-square max-w-[250px] bg-slate-200 dark:bg-slate-800 rounded-lg shadow-inner flex items-center justify-center overflow-hidden border">
                      {/* Placeholder for Xray */}
                      <Activity className="h-16 w-16 text-muted-foreground/30" />

                      {/* Simulated overlay */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-red-500/40 rounded-full blur-2xl mix-blend-multiply dark:mix-blend-screen animate-pulse"></div>
                    </div>
                    <div className="mt-6 w-full max-w-[250px] bg-background/80 backdrop-blur rounded p-3 shadow-sm border">
                      <div className="text-xs text-muted-foreground mb-1">Result</div>
                      <div className="text-sm font-bold text-red-500 flex items-center justify-between">
                        PNEUMONIA DETECTED <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-xs">96%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Capabilities</div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Built for Clinical Speed & Precision</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our model provides secondary screening for busy radiologists, helping quickly triage a high volume of chest radiographs.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 lg:grid-cols-3 lg:gap-12">
              <FeatureCard
                icon={<BrainCircuit className="h-8 w-8 text-blue-500" />}
                title="AI Accuracy 96%"
                description="Trained on Kaggle's extensive RSNA pneumonia dataset, delivering state-of-the-art confidence."
              />
              <FeatureCard
                icon={<ShieldCheck className="h-8 w-8 text-green-500" />}
                title="Explainable Heatmaps"
                description="Grad-CAM visualizations exactly highlight the suspected thoracic regions for pneumonia."
              />
              <FeatureCard
                icon={<Upload className="h-8 w-8 text-purple-500" />}
                title="Instant PDF Reports"
                description="Export generated findings, timestamps, and patient details straight to a medical-grade PDF."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4 md:px-6">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for Hackathon. AI predictions are for demonstration purposes only.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-background p-6 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/5 transition-colors">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
