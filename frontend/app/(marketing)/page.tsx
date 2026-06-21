import { HeroSection } from "@/components/landing/HeroSection";
import { BancasBar } from "@/components/landing/BancasBar";
import { PainSection } from "@/components/landing/PainSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { CounterSection } from "@/components/landing/CounterSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <BancasBar />
      <PainSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ComparisonSection />
      <CounterSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}
