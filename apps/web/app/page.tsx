import Hero from '@/components/landing/Hero';
import Categories from '@/components/landing/Categories';
import HowItWorks from '@/components/landing/HowItWorks';
import PopularTasks from '@/components/landing/PopularTasks';
import Features from '@/components/landing/Features';
import CallToAction from '@/components/landing/CallToAction';

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Categories />
      <PopularTasks />
      <Features />
      <CallToAction />
    </>
  );
}
