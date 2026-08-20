import { StickyCTA } from '@/components/cro/StickyCTA';
import { EmailCapture } from '@/components/cro/EmailCapture';
import { ProductStats } from '@/components/cro/ProductStats';
import MainNavigation from '@/components/navigation/MainNavigation';
import { Footer } from '@/components/layout/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MainNavigation />
      <ProductStats />
      {children}
      <EmailCapture />
      <StickyCTA />
      <Footer />
    </>
  );
}
