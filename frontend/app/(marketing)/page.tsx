import { Navbar } from "@/components/app/landing/navbar";
import { HeroSection } from "@/components/app/landing/hero-section";
import { BancasMarquee } from "@/components/app/landing/bancas-marquee";
import { ProblemSection } from "@/components/app/landing/problem-section";
import { HowItWorksSection } from "@/components/app/landing/how-it-works-section";
import { FeaturesSection } from "@/components/app/landing/features-section";
import { ComparisonSection } from "@/components/app/landing/comparison-section";
import { StatsCounter } from "@/components/app/landing/stats-counter";
import { TestimonialsSection } from "@/components/app/landing/testimonials-section";
import { PricingSection } from "@/components/app/landing/pricing-section";
import { FaqSection } from "@/components/app/landing/faq-section";
import { CtaFinalSection } from "@/components/app/landing/cta-final-section";
import { Footer } from "@/components/app/landing/footer";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <BancasMarquee />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ComparisonSection />
      <StatsCounter />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaFinalSection />
      <Footer />
    </div>
  );
}
