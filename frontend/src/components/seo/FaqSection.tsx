import { JsonLd } from './JsonLd';
import { FaqAccordion } from './FaqAccordion';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  faqs: FaqItem[];
  title?: string;
}

export type { FaqItem };

export function FaqSection({ faqs, title = 'Frequently Asked Questions' }: FaqSectionProps) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="py-8">
      {/* JSON-LD rendered server-side  -  not inside the client accordion component */}
      <JsonLd data={faqSchema} />
      <h2 className="text-2xl font-bold text-foreground mb-6">{title}</h2>
      <FaqAccordion faqs={faqs} />
    </section>
  );
}
