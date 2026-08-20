'use client';

import * as Accordion from '@radix-ui/react-accordion';
import type { FaqItem } from './FaqSection';

interface FaqAccordionProps {
  faqs: FaqItem[];
}

export function FaqAccordion({ faqs }: FaqAccordionProps) {
  return (
    <Accordion.Root type="single" collapsible className="space-y-2">
      {faqs.map(faq => (
        <Accordion.Item
          key={faq.question}
          value={faq.question}
          className="rounded-lg border border-border bg-background"
        >
          <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors [&[data-state=open]>svg]:rotate-180">
            <span>{faq.question}</span>
            <svg
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Accordion.Trigger>
          <Accordion.Content className="px-4 pb-3 text-sm text-muted-foreground data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            {faq.answer}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
