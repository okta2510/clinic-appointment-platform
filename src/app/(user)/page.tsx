import { Advantages } from '@/components/user/landing-page/advantages';
import { ClinicBanner } from '@/components/user/landing-page/clinic-banner';
import { DoctorsSection } from '@/components/user/landing-page/doctors-section';
import { Hero } from '@/components/user/landing-page/hero';
import { ResultsCarousel } from '@/components/user/landing-page/results-carousel';
import { Stats } from '@/components/user/landing-page/stats';
import { TreatmentTabs } from '@/components/user/landing-page/treatment-tabs';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ResultsCarousel />
      <div className="bg-white">
        <TreatmentTabs />
      </div>
      <ClinicBanner />
      <Advantages />
      <Stats />
      <div className="bg-white">
        <DoctorsSection />
      </div>
    </>
  );
}
