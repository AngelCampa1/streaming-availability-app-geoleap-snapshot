import type { FaqItem } from '@/components/seo/FaqSection';

interface PlatformCountryFaqParams {
  platformName: string;
  countryName: string;
  isAvailable: boolean;
  startingPrice?: number;
  currency?: string;
  hasFreeTier?: boolean;
}

export function generatePlatformCountryFaqs(params: PlatformCountryFaqParams): FaqItem[] {
  const { platformName, countryName, isAvailable, startingPrice, currency, hasFreeTier } = params;

  const faqs: FaqItem[] = [];

  if (isAvailable) {
    faqs.push({
      question: `Is ${platformName} available in ${countryName}?`,
      answer: `Yes, ${platformName} is available in ${countryName}. You can sign up directly through the ${platformName} website or app.`,
    });

    if (hasFreeTier) {
      faqs.push({
        question: `How much does ${platformName} cost in ${countryName}?`,
        answer: `${platformName} offers a free tier in ${countryName}. Premium plans with additional features are also available.`,
      });
    } else if (startingPrice && currency) {
      faqs.push({
        question: `How much does ${platformName} cost in ${countryName}?`,
        answer: `${platformName} starts at ${currency} ${startingPrice}/month in ${countryName}. Pricing may vary by plan and region.`,
      });
    }

    faqs.push({
      question: `What content does ${platformName} have in ${countryName}?`,
      answer: `The ${platformName} content library in ${countryName} may differ from other countries due to regional licensing agreements. Use GeoLeap to search specific titles and check availability.`,
    });

    faqs.push({
      question: `Can I use ${platformName} while traveling from ${countryName}?`,
      answer: `${platformName} may restrict some content when you travel outside ${countryName} due to geo-licensing. Your subscription remains active, but the available library may change based on your location.`,
    });
  } else {
    faqs.push({
      question: `Is ${platformName} available in ${countryName}?`,
      answer: `No, ${platformName} is not currently available in ${countryName}. Check GeoLeap for alternative streaming services available in your region.`,
    });

    faqs.push({
      question: `When will ${platformName} launch in ${countryName}?`,
      answer: `There is no confirmed launch date for ${platformName} in ${countryName}. Streaming services expand to new markets periodically  -  check back for updates.`,
    });

    faqs.push({
      question: `What are the alternatives to ${platformName} in ${countryName}?`,
      answer: `Several streaming services are available in ${countryName}. Visit the GeoLeap ${countryName} guide to see all available platforms with pricing and content information.`,
    });
  }

  return faqs;
}
