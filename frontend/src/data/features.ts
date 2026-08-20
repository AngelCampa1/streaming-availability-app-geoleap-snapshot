export interface ProductFeature {
  slug: string;
  name: string;
  shortName: string;
  problem: string;
  solution: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  primaryCta: string;
  useCases: string[];
  proofPoints: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  related: string[];
}

export const productFeatures: ProductFeature[] = [
  {
    slug: 'streaming-availability-search',
    name: 'Streaming availability search',
    shortName: 'Availability search',
    eyebrow: 'Find the right country first',
    problem:
      'Streaming apps answer one country at a time. If a movie is missing, you are left checking Netflix, Disney+, Prime Video, and other apps one by one.',
    solution:
      'GeoLeap searches 42 streaming services across 57 countries so you can see where a title is available before you change apps or VPN locations.',
    summary:
      'Search once to find which countries and services carry the movie or show you want to watch.',
    seoTitle: 'Streaming Availability Search Across 42 Services | GeoLeap',
    seoDescription:
      'Search streaming availability across 42 services and 57 countries. Find where a movie or TV show is available before switching apps or VPN countries.',
    primaryCta: 'Search availability',
    useCases: [
      'Find the country where a missing Netflix title is still available.',
      'Check whether a movie is included with a subscription before renting it.',
      'Compare availability across services before signing up for another app.',
    ],
    proofPoints: [
      'Covers 42 streaming services',
      'Checks 57 country catalogs',
      'Works for movies, shows, anime, documentaries, and sports pages',
    ],
    faq: [
      {
        question: 'What does streaming availability search check?',
        answer:
          'It checks supported streaming services and country catalogs to show where a title is available to stream, rent, or buy.',
      },
      {
        question: 'Do I need to create an account to search?',
        answer:
          'You can start with the free search flow. Premium unlocks higher usage limits, saved titles, and alerts.',
      },
    ],
    related: ['vpn-country-finder', 'subscription-savings', 'watchlist-alerts'],
  },
  {
    slug: 'vpn-country-finder',
    name: 'VPN country finder',
    shortName: 'VPN country finder',
    eyebrow: 'Stop guessing server locations',
    problem:
      'VPN apps give you a long country list, but they do not tell you which country has the title you want. Most people jump between servers and hope one works.',
    solution:
      'GeoLeap shows the country match first. Open your VPN after you know which region is worth trying.',
    summary:
      'Use title availability data to choose a practical VPN country instead of testing servers blindly.',
    seoTitle: 'VPN Country Finder for Streaming | GeoLeap',
    seoDescription:
      'Find which VPN country to try for streaming by checking title availability across 57 countries before changing servers.',
    primaryCta: 'Find a VPN country',
    useCases: [
      'Pick a country for a title before opening your VPN app.',
      'Avoid wasting time on regions where the title is not listed.',
      'Plan a streaming session when you already use NordVPN, ExpressVPN, Surfshark, or another provider.',
    ],
    proofPoints: [
      'Country-first results',
      'Provider-neutral guidance',
      'Links into unblock and VPN guidance pages',
    ],
    faq: [
      {
        question: 'Does GeoLeap sell a VPN?',
        answer:
          'No. GeoLeap tells you which country may be worth checking. You can use the VPN provider you already chose.',
      },
      {
        question: 'Will every VPN server work?',
        answer:
          'No. Streaming platforms can block VPN traffic. GeoLeap helps you choose a country to try, but your VPN provider and the streaming app control access.',
      },
    ],
    related: ['streaming-availability-search', 'language-and-subtitle-checker', 'platform-country-guides'],
  },
  {
    slug: 'subscription-savings',
    name: 'Subscription savings',
    shortName: 'Subscription savings',
    eyebrow: 'Use what you already pay for',
    problem:
      'It is easy to rent a movie or start another trial while the same title sits inside a subscription you already have in another country.',
    solution:
      'GeoLeap compares services and countries before you spend more, so you can check existing subscriptions first.',
    summary:
      'Find titles inside your current streaming services before paying for another rental, add-on, or subscription.',
    seoTitle: 'Save Money on Streaming Subscriptions | GeoLeap',
    seoDescription:
      'Use GeoLeap to check existing subscriptions before renting a movie or adding another streaming service.',
    primaryCta: 'Check your subscriptions',
    useCases: [
      'Check paid services before renting a movie.',
      'Compare platforms when a show moves between catalogs.',
      'Use country and platform guides before adding another monthly bill.',
    ],
    proofPoints: [
      'Links search, platform, comparison, and pricing pages',
      'Built around current subscriptions',
      'Helpful before trials and rentals',
    ],
    faq: [
      {
        question: 'Can GeoLeap tell me if I already have access?',
        answer:
          'GeoLeap can show where a title is available. You can compare that result with the streaming services you already pay for.',
      },
      {
        question: 'Does this replace streaming platform search?',
        answer:
          'No. It gives you a wider starting point before you open each streaming app.',
      },
    ],
    related: ['streaming-availability-search', 'platform-country-guides', 'watchlist-alerts'],
  },
  {
    slug: 'language-and-subtitle-checker',
    name: 'Language and subtitle checker',
    shortName: 'Audio and subtitles',
    eyebrow: 'Check the practical details',
    problem:
      'Finding the right country does not help if the available version lacks the audio or subtitles you need.',
    solution:
      'GeoLeap helps you check language details during the streaming search flow, so you can spot problems before movie night starts.',
    summary:
      'Review audio and subtitle fit before you commit to a country, service, or rental.',
    seoTitle: 'Streaming Language and Subtitle Checker | GeoLeap',
    seoDescription:
      'Check streaming audio and subtitle details while comparing where to watch movies and TV shows across countries.',
    primaryCta: 'Check language options',
    useCases: [
      'Avoid picking a country that only has dubbed audio.',
      'Check whether a family movie has subtitles everyone can use.',
      'Compare language fit before renting or switching regions.',
    ],
    proofPoints: [
      'Built into the viewing decision',
      'Useful on mobile before watching',
      'Connects with country and how-to-watch pages',
    ],
    faq: [
      {
        question: 'Why do subtitles vary by country?',
        answer:
          'Streaming rights and app catalogs can vary by region, and language tracks may be licensed separately.',
      },
      {
        question: 'Should I still confirm inside the streaming app?',
        answer:
          'Yes. GeoLeap helps you narrow the choice, but streaming apps can change catalog details.',
      },
    ],
    related: ['vpn-country-finder', 'streaming-availability-search', 'mobile-streaming-search'],
  },
  {
    slug: 'mobile-streaming-search',
    name: 'Mobile streaming search',
    shortName: 'Mobile search',
    eyebrow: 'Built for couch searches',
    problem:
      'Most streaming decisions happen on a phone while the TV is already on. Desktop-heavy comparison tools slow that down.',
    solution:
      'GeoLeap keeps search, country matches, guides, and next steps usable on small screens first.',
    summary:
      'Search from your phone, scan the result, and decide what to try next without fighting the interface.',
    seoTitle: 'Mobile Streaming Search for Movies and Shows | GeoLeap',
    seoDescription:
      'Use GeoLeap on mobile to find where movies and TV shows stream across 42 services and 57 countries.',
    primaryCta: 'Search on mobile',
    useCases: [
      'Look up a title while sitting in front of the TV.',
      'Send a country or platform page to someone else.',
      'Check a result quickly while traveling.',
    ],
    proofPoints: [
      'Mobile-first page layouts',
      'Touch-friendly actions',
      'Fast links to search, guides, and pricing',
    ],
    faq: [
      {
        question: 'Does GeoLeap work on phones?',
        answer:
          'Yes. The main search, feature pages, guides, and comparison pages are designed for mobile use.',
      },
      {
        question: 'Do I need the app?',
        answer:
          'No. GeoLeap runs in the browser, so you can use it from your phone, tablet, or laptop.',
      },
    ],
    related: ['streaming-availability-search', 'watchlist-alerts', 'language-and-subtitle-checker'],
  },
  {
    slug: 'watchlist-alerts',
    name: 'Watchlist and availability alerts',
    shortName: 'Watchlist alerts',
    eyebrow: 'Save titles worth checking again',
    problem:
      'A title that is missing today may appear next month, but few people remember to check again.',
    solution:
      'GeoLeap lets you keep a watchlist and use availability alerts when a title becomes easier to watch.',
    summary:
      'Save movies and shows so you can revisit availability instead of repeating the same search later.',
    seoTitle: 'Streaming Watchlist and Availability Alerts | GeoLeap',
    seoDescription:
      'Save streaming titles and get availability alerts when movies or TV shows become easier to watch.',
    primaryCta: 'Save a title',
    useCases: [
      'Save a movie that is not in your subscriptions today.',
      'Track shows that move between services.',
      'Build a short list before deciding whether Premium is worth it.',
    ],
    proofPoints: [
      'Connects search with account features',
      'Useful for titles that move between catalogs',
      'Pairs with Premium alerts and unlimited watchlist options',
    ],
    faq: [
      {
        question: 'Are watchlist alerts free?',
        answer:
          'The free plan supports basic use. Premium adds higher limits and stronger alert features.',
      },
      {
        question: 'What should I save?',
        answer:
          'Save titles you want to watch but cannot currently find inside the services you already use.',
      },
    ],
    related: ['subscription-savings', 'mobile-streaming-search', 'streaming-availability-search'],
  },
  {
    slug: 'platform-country-guides',
    name: 'Platform and country guides',
    shortName: 'Platform guides',
    eyebrow: 'Research before you subscribe',
    problem:
      'Streaming prices, catalogs, and platform availability vary by country. Generic platform reviews often skip the local details.',
    solution:
      'GeoLeap connects platform reviews, country guides, comparisons, and unblock pages so you can research a service in context.',
    summary:
      'Use platform, country, and comparison pages together before choosing a streaming service.',
    seoTitle: 'Streaming Platform and Country Guides | GeoLeap',
    seoDescription:
      'Compare streaming platforms, countries, prices, catalogs, and unblock options with GeoLeap guides.',
    primaryCta: 'Explore guides',
    useCases: [
      'Compare a streaming platform before subscribing.',
      'Check what services matter in a specific country.',
      'Move from a platform review to comparisons and country pages.',
    ],
    proofPoints: [
      'Strong internal links across platforms, countries, comparisons, and guides',
      'Useful for SEO and AI answer discovery',
      'Updated around the programmatic content set',
    ],
    faq: [
      {
        question: 'What makes platform country guides useful?',
        answer:
          'They connect service details with country availability, pricing, and related comparisons instead of treating every market the same.',
      },
      {
        question: 'Where should I start?',
        answer:
          'Start with the platform page if you know the service. Start with a country page if you know where you will watch.',
      },
    ],
    related: ['subscription-savings', 'vpn-country-finder', 'streaming-availability-search'],
  },
];

export function getProductFeature(slug: string): ProductFeature | undefined {
  return productFeatures.find(feature => feature.slug === slug);
}

export function getRelatedProductFeatures(feature: ProductFeature): ProductFeature[] {
  return feature.related
    .map(slug => getProductFeature(slug))
    .filter((item): item is ProductFeature => Boolean(item));
}
