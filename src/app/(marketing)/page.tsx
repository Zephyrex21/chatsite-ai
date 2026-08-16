import { Hero } from '@/components/marketing/Hero';
import { RecentChats } from '@/components/marketing/RecentChats';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';

export default function Home() {
  return (
    <>
      <Hero />
      <RecentChats />
      <HowItWorks />
      <FeaturesSection />
    </>
  );
}
