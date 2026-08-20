import type { SeoGovernance } from './seo';

export interface StreamingCountry {
  slug: string;
  name: string;
  iso: string;
  region: string;
  availablePlatforms: string[];
  topPlatforms: string[];
  streamingLandscape: string;
  currency: string;
  faqs: Array<{ question: string; answer: string }>;
  wikipediaUrl?: string;
  wikidataId?: string;
  seo?: SeoGovernance;
}

export const countries: StreamingCountry[] = [
  {
    slug: 'united-states',
    name: 'United States',
    iso: 'US',
    region: 'North America',
    availablePlatforms: [
      'netflix', 'hulu', 'disney-plus', 'hbo-max', 'amazon-prime-video', 'apple-tv-plus',
      'paramount-plus', 'peacock', 'espn-plus', 'discovery-plus', 'crunchyroll', 'funimation',
      'mubi', 'shudder', 'britbox', 'acorn-tv', 'tubi', 'pluto-tv', 'youtube-premium', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'hulu', 'disney-plus', 'hbo-max', 'amazon-prime-video'],
    streamingLandscape:
      'The US has more streaming services available than any other country. Netflix, Disney+, Max (HBO), Hulu, and Amazon Prime Video all compete here, which keeps prices relatively low and content investment high.',
    currency: 'USD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/United_States',
    wikidataId: 'https://www.wikidata.org/wiki/Q30',
    faqs: [
      {
        question: 'What streaming services are available in the US?',
        answer: 'The US has the largest selection of streaming services, including Netflix, Hulu, Disney+, HBO Max, Amazon Prime Video, Apple TV+, Peacock, Paramount+, ESPN+, and many more.',
      },
      {
        question: 'What is the cheapest streaming service in the US?',
        answer: 'Free services like Tubi and Pluto TV are available with no cost. Among paid services, Paramount+ Essential starts at $5.99/month and Peacock starts at $7.99/month.',
      },
    ],
  },
  {
    slug: 'united-kingdom',
    name: 'United Kingdom',
    iso: 'GB',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'discovery-plus', 'crunchyroll', 'mubi', 'shudder', 'britbox', 'acorn-tv',
      'peacock', 'pluto-tv', 'youtube-premium', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'britbox'],
    streamingLandscape:
      'The UK streaming market is well-developed, complemented by strong free public broadcasting from BBC iPlayer and ITV Hub. International services like Netflix and Disney+ compete alongside UK-specific options like BritBox and BBC Select.',
    currency: 'GBP',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/United_Kingdom',
    wikidataId: 'https://www.wikidata.org/wiki/Q145',
    faqs: [
      {
        question: 'Is Netflix available in the UK?',
        answer: 'Yes, Netflix is widely available in the UK. Check Netflix directly for the current UK plan lineup and monthly prices before subscribing.',
      },
      {
        question: 'What streaming services are unique to the UK?',
        answer: 'The UK has free services BBC iPlayer, ITVX, Channel 4, and My5, as well as BritBox which originated as a US-UK joint venture.',
      },
    ],
  },
  {
    slug: 'canada',
    name: 'Canada',
    iso: 'CA',
    region: 'North America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'crunchyroll', 'mubi', 'shudder', 'britbox', 'acorn-tv', 'tubi', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'Most major US streaming services are available in Canada, though content libraries differ due to licensing. Crave (Bell Media) carries HBO content, and CBC Gem offers free Canadian programming.',
    currency: 'CAD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Canada',
    wikidataId: 'https://www.wikidata.org/wiki/Q16',
    faqs: [
      {
        question: 'Is Hulu available in Canada?',
        answer: 'Hulu is not available in Canada. Canadians use Netflix, Amazon Prime Video, and Crave as primary alternatives.',
      },
      {
        question: 'What Canadian streaming services are there?',
        answer: 'Canadian-specific services include Crave (HBO content + originals), CBC Gem (free), and Tubi Canada.',
      },
    ],
  },
  {
    slug: 'australia',
    name: 'Australia',
    iso: 'AU',
    region: 'Oceania',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'discovery-plus', 'crunchyroll', 'mubi', 'shudder', 'britbox', 'acorn-tv',
      'tubi', 'youtube-premium', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus'],
    streamingLandscape:
      'All major international streaming services are available in Australia. Free local options include 9Now, 7Plus, ABC iview, and SBS On Demand. Stan is the main domestic paid service.',
    currency: 'AUD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Australia',
    wikidataId: 'https://www.wikidata.org/wiki/Q408',
    faqs: [
      {
        question: 'Is Netflix cheaper in Australia?',
        answer: 'Netflix pricing in Australia starts at AUD $7.99/month, which at current exchange rates is similar to US pricing.',
      },
      {
        question: 'What Australian streaming services exist?',
        answer: 'Australia has Stan (paid), Binge (Foxtel), plus free services like 9Now, 7Plus, ABC iview, and SBS On Demand.',
      },
    ],
  },
  {
    slug: 'germany',
    name: 'Germany',
    iso: 'DE',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'discovery-plus', 'crunchyroll', 'mubi', 'shudder', 'peacock', 'pluto-tv',
      'youtube-premium', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'disney-plus', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'All major international platforms are available in Germany. Local options include MagentaTV (Telekom), Joyn (free), and the public broadcasters ARD Mediathek and ZDF Mediathek (both free).',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Germany',
    wikidataId: 'https://www.wikidata.org/wiki/Q183',
    faqs: [
      {
        question: 'Is Netflix available in Germany?',
        answer: 'Yes, Netflix is available in Germany. Check Netflix directly for the current German plan lineup and monthly prices before subscribing.',
      },
      {
        question: 'What German streaming services are popular?',
        answer: 'MagentaTV, ARD Mediathek (free), ZDF Mediathek (free), and Joyn are popular German streaming options alongside international services.',
      },
    ],
  },
  {
    slug: 'france',
    name: 'France',
    iso: 'FR',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'mubi', 'pluto-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'French regulations require streaming platforms to invest in local content, which shapes what is available. MyCANAL (Canal+) is the main local paid service. France.tv and ARTE offer free public programming.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/France',
    wikidataId: 'https://www.wikidata.org/wiki/Q142',
    faqs: [
      {
        question: 'What is the most popular streaming service in France?',
        answer: 'Netflix leads in France, though MyCANAL (Canal+) remains highly popular for sports and premium content.',
      },
      {
        question: 'Are there French streaming services?',
        answer: 'Yes, MyCANAL, France.tv (free), ARTE.tv (free), and OCS are major French streaming platforms.',
      },
    ],
  },
  {
    slug: 'japan',
    name: 'Japan',
    iso: 'JP',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'hulu', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'disney-plus', 'crunchyroll', 'hulu'],
    streamingLandscape:
      'Japan has a unique streaming market with both international services and strong domestic platforms. U-NEXT, dTV, and AbemaTV are major local services. Hulu in Japan operates as a separate service from Hulu in the US.',
    currency: 'JPY',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Japan',
    wikidataId: 'https://www.wikidata.org/wiki/Q17',
    faqs: [
      {
        question: 'Is Hulu in Japan the same as US Hulu?',
        answer: 'No. Hulu Japan is operated by HJ Holdings and has a different content library from US Hulu. It focuses primarily on Japanese and international content.',
      },
      {
        question: 'What Japanese streaming services are available?',
        answer: 'Popular Japanese services include U-NEXT, AbemaTV (free/paid), dTV, NHK+, and Paravi alongside international platforms.',
      },
    ],
  },
  {
    slug: 'south-korea',
    name: 'South Korea',
    iso: 'KR',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'South Korea produces some of the most-watched content on Netflix globally (Squid Game, Kingdom). Domestic platforms Wavve, Watcha, and TVING (CJ ENM) compete with international services for Korean viewers.',
    currency: 'KRW',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/South_Korea',
    wikidataId: 'https://www.wikidata.org/wiki/Q884',
    faqs: [
      {
        question: 'Is Netflix big in South Korea?',
        answer: 'Yes, Netflix is one of the top streaming services in South Korea and produces Korean originals including Squid Game, Kingdom, and All of Us Are Dead.',
      },
      {
        question: 'What Korean streaming services are there?',
        answer: 'Major Korean streaming platforms include Wavve, TVING, Watcha, Seezn, and Naver Series On.',
      },
    ],
  },
  {
    slug: 'brazil',
    name: 'Brazil',
    iso: 'BR',
    region: 'South America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'paramount-plus', 'crunchyroll', 'mubi', 'pluto-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'disney-plus', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Brazil is Latin America\'s largest streaming market. Netflix produces Brazilian originals, while Globoplay (from Rede Globo, Brazil\'s biggest TV network) is the main local platform.',
    currency: 'BRL',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Brazil',
    wikidataId: 'https://www.wikidata.org/wiki/Q155',
    faqs: [
      {
        question: 'What is the most popular streaming service in Brazil?',
        answer: 'Netflix leads the paid streaming market in Brazil, with Globoplay being the top local service.',
      },
      {
        question: 'Is streaming affordable in Brazil?',
        answer: 'Streaming services typically offer pricing adapted to the Brazilian market. Netflix starts at BRL 18.90/month.',
      },
    ],
  },
  {
    slug: 'mexico',
    name: 'Mexico',
    iso: 'MX',
    region: 'North America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'paramount-plus', 'crunchyroll', 'acorn-tv', 'tubi', 'pluto-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'All major US streaming services are available in Mexico at locally adapted prices. Blim TV (Televisa) and ViX (TelevisaUnivision) are the main local platforms.',
    currency: 'MXN',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Mexico',
    wikidataId: 'https://www.wikidata.org/wiki/Q96',
    faqs: [
      {
        question: 'Is Netflix available in Mexico?',
        answer: 'Yes, Netflix is available in Mexico starting at MXN 99/month for the Standard with Ads plan.',
      },
      {
        question: 'What Mexican streaming services are there?',
        answer: 'ViX (free and premium) and Blim TV are major Mexican streaming services offering telenovelas and local content.',
      },
    ],
  },
  {
    slug: 'india',
    name: 'India',
    iso: 'IN',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['amazon-prime-video', 'disney-plus', 'netflix', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'India is the world\'s second-largest internet market. JioHotstar (merged Disney+ Hotstar and JioCinema) leads because of IPL cricket rights. Netflix and Amazon compete by producing Hindi and regional-language originals.',
    currency: 'INR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/India',
    wikidataId: 'https://www.wikidata.org/wiki/Q668',
    faqs: [
      {
        question: 'What is the most popular streaming service in India?',
        answer: 'Disney+ Hotstar (JioCinema) is the most popular due to IPL cricket rights. Amazon Prime Video and Netflix are also very popular.',
      },
      {
        question: 'Is streaming cheap in India?',
        answer: 'Yes, streaming services offer significantly lower prices in India. Netflix starts at INR 149/month for mobile-only.',
      },
    ],
  },
  {
    slug: 'spain',
    name: 'Spain',
    iso: 'ES',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'paramount-plus', 'crunchyroll', 'mubi', 'peacock', 'pluto-tv', 'youtube-premium', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'disney-plus', 'hbo-max', 'apple-tv-plus'],
    streamingLandscape:
      'All major international services are available in Spain. Movistar+ is the main local pay-TV and streaming service. ATRESplayer and Mitele offer free streaming from Spanish broadcasters.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Spain',
    wikidataId: 'https://www.wikidata.org/wiki/Q29',
    faqs: [
      {
        question: 'What streaming services are available in Spain?',
        answer: 'Spain has access to Netflix, Max (HBO), Disney+, Amazon Prime Video, Apple TV+, and local services like Movistar+, ATRESplayer, and Mitele.',
      },
    ],
  },
  {
    slug: 'italy',
    name: 'Italy',
    iso: 'IT',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'discovery-plus', 'crunchyroll', 'mubi', 'peacock', 'pluto-tv', 'youtube-premium',
      'britbox', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'RaiPlay (free, from public broadcaster RAI) and Mediaset Infinity compete with international services. NOW (Sky) is the main premium local option.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Italy',
    wikidataId: 'https://www.wikidata.org/wiki/Q38',
    faqs: [
      {
        question: 'What Italian streaming services are available?',
        answer: 'RaiPlay (free), Mediaset Infinity (free), NOW (Sky), and Infinity+ are major Italian streaming platforms alongside Netflix, Disney+, and Amazon Prime Video.',
      },
    ],
  },
  {
    slug: 'netherlands',
    name: 'Netherlands',
    iso: 'NL',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'discovery-plus', 'crunchyroll', 'mubi', 'youtube-premium', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'The Netherlands was one of the first markets where Netflix launched outside the US. NPO Start (free) offers Dutch public broadcasting content. Videoland is the major local paid streaming service.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Netherlands',
    wikidataId: 'https://www.wikidata.org/wiki/Q55',
    faqs: [
      {
        question: 'Is Max (HBO) available in the Netherlands?',
        answer: 'Yes, HBO Max is available in the Netherlands as part of Warner Bros. Discovery\'s European rollout.',
      },
    ],
  },
  {
    slug: 'sweden',
    name: 'Sweden',
    iso: 'SE',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'discovery-plus', 'crunchyroll', 'mubi', 'britbox', 'pluto-tv', 'youtube-premium',
      'hbo-max', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'Streaming adoption is high in Sweden. Viaplay is the main Nordic service, covering sports (F1, Premier League) and Nordic originals. SVT Play offers free Swedish public broadcasting.',
    currency: 'SEK',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Sweden',
    wikidataId: 'https://www.wikidata.org/wiki/Q34',
    faqs: [
      {
        question: 'What is Viaplay?',
        answer: 'Viaplay is a Nordic streaming service available in Scandinavia and select European markets, known for F1 and Premier League coverage.',
      },
    ],
  },
  {
    slug: 'norway',
    name: 'Norway',
    iso: 'NO',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'discovery-plus', 'crunchyroll', 'mubi', 'britbox', 'youtube-premium', 'hbo-max',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'Norway has very high streaming adoption rates. Viaplay is the leading Nordic service for sports content. NRK TV offers free Norwegian public broadcasting.',
    currency: 'NOK',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Norway',
    wikidataId: 'https://www.wikidata.org/wiki/Q20',
    faqs: [
      {
        question: 'Is HBO Max available in Norway?',
        answer: 'Yes, HBO Max is available in Norway as part of Warner Bros. Discovery\'s European rollout.',
      },
    ],
  },
  {
    slug: 'denmark',
    name: 'Denmark',
    iso: 'DK',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'discovery-plus', 'crunchyroll', 'mubi', 'britbox', 'youtube-premium', 'hbo-max',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'Denmark has high streaming adoption and is home to some of Scandinavia\'s best original content. DR TV offers free Danish public broadcasting. Viaplay is popular for sports.',
    currency: 'DKK',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Denmark',
    wikidataId: 'https://www.wikidata.org/wiki/Q35',
    faqs: [
      {
        question: 'What Danish streaming services are there?',
        answer: 'DR TV (free public broadcaster), TV 2 Play, and Viaplay are major Danish streaming services.',
      },
    ],
  },
  {
    slug: 'finland',
    name: 'Finland',
    iso: 'FI',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'paramount-plus',
      'discovery-plus', 'crunchyroll', 'mubi', 'britbox', 'youtube-premium', 'hbo-max',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'Finland has high broadband penetration and strong streaming adoption. Yle Areena offers free Finnish public broadcasting content. Viaplay is a major Nordic competitor.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Finland',
    wikidataId: 'https://www.wikidata.org/wiki/Q33',
    faqs: [
      {
        question: 'What Finnish streaming services are there?',
        answer: 'Yle Areena (free), Ruutu, and C More are major Finnish streaming platforms.',
      },
    ],
  },
  {
    slug: 'switzerland',
    name: 'Switzerland',
    iso: 'CH',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'discovery-plus',
      'crunchyroll', 'mubi', 'shudder', 'pluto-tv', 'youtube-premium', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'Switzerland has a multilingual population and access to streaming content in German, French, and Italian. RTS Play, SRF Play, and RSI La1 offer free public broadcasting in each language region.',
    currency: 'CHF',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Switzerland',
    wikidataId: 'https://www.wikidata.org/wiki/Q39',
    faqs: [
      {
        question: 'What language are streaming services in Switzerland?',
        answer: 'Major international services like Netflix offer content in all Swiss national languages (German, French, Italian). Public broadcasters serve each region in their respective language.',
      },
    ],
  },
  {
    slug: 'austria',
    name: 'Austria',
    iso: 'AT',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'discovery-plus',
      'crunchyroll', 'mubi', 'shudder', 'pluto-tv', 'youtube-premium', 'amc-plus',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'Austria shares a language and many content preferences with Germany, making it part of the DACH streaming market. ORF ON offers free Austrian public broadcasting content.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Austria',
    wikidataId: 'https://www.wikidata.org/wiki/Q40',
    faqs: [
      {
        question: 'Is Netflix available in Austria?',
        answer: 'Yes, Netflix is available in Austria. Check Netflix directly for the current Austrian plan lineup and monthly prices before subscribing.',
      },
    ],
  },
  {
    slug: 'new-zealand',
    name: 'New Zealand',
    iso: 'NZ',
    region: 'Oceania',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'shudder', 'acorn-tv', 'tubi', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'New Zealand has a strong streaming market with most international services available. TVNZ+ and ThreeNow offer free local content, while Neon (Sky TV) is the major local premium streaming service.',
    currency: 'NZD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/New_Zealand',
    wikidataId: 'https://www.wikidata.org/wiki/Q664',
    faqs: [
      {
        question: 'What New Zealand streaming services are there?',
        answer: 'TVNZ+ (free), ThreeNow (free), and Neon (Sky TV) are major New Zealand streaming platforms.',
      },
    ],
  },
  {
    slug: 'singapore',
    name: 'Singapore',
    iso: 'SG',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'acorn-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'Broadband speeds are fast and streaming adoption is high. MeWatch (Mediacorp) offers free Singaporean content. Viu is popular for Korean and Asian dramas.',
    currency: 'SGD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Singapore',
    wikidataId: 'https://www.wikidata.org/wiki/Q334',
    faqs: [
      {
        question: 'What local streaming services are in Singapore?',
        answer: 'MeWatch (Mediacorp), Toggle, and Viu are popular local and regional streaming services in Singapore.',
      },
    ],
  },
  {
    slug: 'hong-kong',
    name: 'Hong Kong',
    iso: 'HK',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'acorn-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'ViuTV offers local Cantonese content. Netflix and Disney+ both carry large international libraries, and most major streaming services are available.',
    currency: 'HKD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Hong_Kong',
    wikidataId: 'https://www.wikidata.org/wiki/Q8646',
    faqs: [
      {
        question: 'Is Netflix available in Hong Kong?',
        answer: 'Yes, Netflix is available in Hong Kong with a strong library of Asian content including Cantonese, Mandarin, Korean, and Japanese titles.',
      },
    ],
  },
  {
    slug: 'taiwan',
    name: 'Taiwan',
    iso: 'TW',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll'],
    streamingLandscape:
      'KKTV and LineTV are local Taiwanese streaming services with local dramas and Japanese content. Netflix also produces Taiwanese originals.',
    currency: 'TWD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Taiwan',
    wikidataId: 'https://www.wikidata.org/wiki/Q865',
    faqs: [
      {
        question: 'What Taiwanese streaming services are popular?',
        answer: 'KKTV, LineTV, and Catchplay are popular Taiwanese streaming services alongside international platforms.',
      },
    ],
  },
  {
    slug: 'argentina',
    name: 'Argentina',
    iso: 'AR',
    region: 'South America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'mubi', 'pluto-tv', 'youtube-premium', 'acorn-tv',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'disney-plus', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Argentina has a large and price-sensitive streaming market. Economic volatility affects subscription prices. Flow (Telecom) and Cablevisión are local services. Netflix has produced several Argentine originals.',
    currency: 'ARS',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Argentina',
    wikidataId: 'https://www.wikidata.org/wiki/Q414',
    faqs: [
      {
        question: 'Is streaming affordable in Argentina?',
        answer: 'Due to currency controls, streaming services in Argentina are relatively affordable in local currency. Netflix Argentina starts at ARS 1,299/month.',
      },
    ],
  },
  {
    slug: 'colombia',
    name: 'Colombia',
    iso: 'CO',
    region: 'South America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'acorn-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Netflix and other international services are widely used. Local telcos like Claro, Movistar, and Tigo bundle streaming with internet and mobile plans.',
    currency: 'COP',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Colombia',
    wikidataId: 'https://www.wikidata.org/wiki/Q739',
    faqs: [
      {
        question: 'Is Netflix popular in Colombia?',
        answer: 'Yes, Netflix is widely used in Colombia and carries a large Spanish-language catalog, including Colombian productions and other Latin American originals.',
      },
    ],
  },
  {
    slug: 'chile',
    name: 'Chile',
    iso: 'CL',
    region: 'South America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'acorn-tv', 'pluto-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Chile has Latin America\'s highest GDP per capita, and streaming adoption reflects that. Chilevision+ and Canal 13 Streaming offer local Chilean content alongside international services.',
    currency: 'CLP',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Chile',
    wikidataId: 'https://www.wikidata.org/wiki/Q298',
    faqs: [
      {
        question: 'What streaming services are popular in Chile?',
        answer: 'Netflix, Disney+, and Max (HBO) lead the market, alongside local options like Chilevision+ and Canal 13 Streaming.',
      },
    ],
  },
  {
    slug: 'south-africa',
    name: 'South Africa',
    iso: 'ZA',
    region: 'Africa',
    availablePlatforms: [
      'netflix', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'britbox', 'tubi', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'apple-tv-plus', 'britbox', 'crunchyroll'],
    streamingLandscape:
      'South Africa is Africa\'s largest streaming market. Showmax (Multichoice) is the main local service. Disney+ launched here in 2022, joining Netflix and Amazon Prime Video.',
    currency: 'ZAR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/South_Africa',
    wikidataId: 'https://www.wikidata.org/wiki/Q258',
    faqs: [
      {
        question: 'What streaming services are available in South Africa?',
        answer: 'South Africa has Netflix, Amazon Prime Video, Apple TV+, Showmax (local), DStv Stream, and select other international services.',
      },
    ],
  },
  {
    slug: 'uae',
    name: 'United Arab Emirates',
    iso: 'AE',
    region: 'Middle East',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'Shahid (MBC Group) and StarzPlay are the main local and regional services. Netflix, Disney+, and Amazon Prime Video are all available alongside Arabic-language platforms.',
    currency: 'AED',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/United_Arab_Emirates',
    wikidataId: 'https://www.wikidata.org/wiki/Q878',
    faqs: [
      {
        question: 'What Arabic streaming services are in the UAE?',
        answer: 'Shahid (MBC Group) and Anghami are major Arabic-language streaming platforms available in the UAE.',
      },
    ],
  },
  {
    slug: 'turkey',
    name: 'Turkey',
    iso: 'TR',
    region: 'Middle East',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'mubi',
      'discovery-plus', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'mubi'],
    streamingLandscape:
      'Turkey produces dramas (dizis) that are popular across the Middle East, Latin America, and beyond. Netflix produces Turkish originals, and BluTV and MUBI are local services.',
    currency: 'TRY',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Turkey',
    wikidataId: 'https://www.wikidata.org/wiki/Q43',
    faqs: [
      {
        question: 'Is Turkish content on Netflix?',
        answer: 'Yes, Netflix has produced numerous Turkish originals and also licenses popular Turkish dramas (dizis) for its platform.',
      },
    ],
  },
  {
    slug: 'poland',
    name: 'Poland',
    iso: 'PL',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'discovery-plus', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Polsat Box Go and Player are the main local streaming services. Netflix has produced Polish originals including "1983" and "The Woods."',
    currency: 'PLN',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Poland',
    wikidataId: 'https://www.wikidata.org/wiki/Q36',
    faqs: [
      {
        question: 'What Polish streaming services are there?',
        answer: 'Player (TVN), Polsat Box Go, TVP VOD (free), and Canal+ Online are major Polish streaming services.',
      },
    ],
  },
  {
    slug: 'portugal',
    name: 'Portugal',
    iso: 'PT',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'mubi', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'RTP Play offers free Portuguese public broadcasting. MEO and NOS bundle streaming with their telecom plans. All major international services are available.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Portugal',
    wikidataId: 'https://www.wikidata.org/wiki/Q45',
    faqs: [
      {
        question: 'Is content available in Portuguese on Netflix?',
        answer: 'Yes, Netflix offers extensive Portuguese-language content including Brazilian and Portuguese productions, dubbed and subbed options.',
      },
    ],
  },
  {
    slug: 'ireland',
    name: 'Ireland',
    iso: 'IE',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'mubi', 'shudder', 'britbox', 'acorn-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'britbox'],
    streamingLandscape:
      'Ireland gets access to most British streaming content. RTÉ Player offers free Irish public broadcasting. Netflix and Amazon Prime Video lead paid streaming.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Republic_of_Ireland',
    wikidataId: 'https://www.wikidata.org/wiki/Q27',
    faqs: [
      {
        question: 'Is Netflix available in Ireland?',
        answer: 'Yes, Netflix is fully available in Ireland at similar pricing to the UK.',
      },
      {
        question: 'What Irish streaming services are there?',
        answer: 'RTÉ Player (free) and Virgin Media Player offer Irish public and commercial broadcasting content online.',
      },
    ],
  },
  {
    slug: 'iceland',
    name: 'Iceland',
    iso: 'IS',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'mubi', 'youtube-premium', 'hbo-max',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'RÚV Sarpurinn offers free Icelandic public broadcasting. Nordic streaming services like Viaplay are popular for sports. All major international platforms are available.',
    currency: 'ISK',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Iceland',
    wikidataId: 'https://www.wikidata.org/wiki/Q189',
    faqs: [
      {
        question: 'Is Netflix available in Iceland?',
        answer: 'Yes, Netflix is available in Iceland. The Icelandic catalogue is similar to other Nordic markets.',
      },
    ],
  },
  {
    slug: 'czech-republic',
    name: 'Czech Republic',
    iso: 'CZ',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium', 'paramount-plus',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'apple-tv-plus'],
    streamingLandscape:
      'The Czech Republic has a growing streaming market. Prima+ and Voyo are major local streaming services offering Czech content alongside international platforms like Netflix and Max (HBO).',
    currency: 'CZK',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Czech_Republic',
    wikidataId: 'https://www.wikidata.org/wiki/Q213',
    faqs: [
      {
        question: 'What Czech streaming services exist?',
        answer: 'Voyo (Nova TV), Prima+, and ČT Sport (Czech Television) are major local streaming platforms.',
      },
    ],
  },
  {
    slug: 'slovakia',
    name: 'Slovakia',
    iso: 'SK',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'apple-tv-plus'],
    streamingLandscape:
      'The streaming market is similar to the Czech Republic. Netflix and Max lead paid streaming, with RTVS offering local public content.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Slovakia',
    wikidataId: 'https://www.wikidata.org/wiki/Q214',
    faqs: [
      {
        question: 'Is streaming affordable in Slovakia?',
        answer: 'Yes, major platforms like Netflix offer competitive pricing in Slovakia, typically at Central European rates.',
      },
    ],
  },
  {
    slug: 'belgium',
    name: 'Belgium',
    iso: 'BE',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'mubi', 'pluto-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'Belgium has a multilingual streaming market (French and Dutch). Public broadcasters VRT MAX and Auvio offer free regional content. Proximus Pickx and Telenet Play More are local paid platforms.',
    currency: 'EUR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Belgium',
    wikidataId: 'https://www.wikidata.org/wiki/Q31',
    faqs: [
      {
        question: 'What Belgian streaming services are available?',
        answer: 'VRT MAX (Dutch, free), Auvio (French, free), Proximus Pickx, and Telenet Play More are major Belgian streaming platforms.',
      },
    ],
  },
  {
    slug: 'romania',
    name: 'Romania',
    iso: 'RO',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'DIGI Online is a local streaming service. Netflix offers Romanian-dubbed content and is gaining subscribers quickly.',
    currency: 'RON',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Romania',
    wikidataId: 'https://www.wikidata.org/wiki/Q218',
    faqs: [
      {
        question: 'Is Netflix available in Romania?',
        answer: 'Yes, Netflix is available in Romania at pricing competitive with Western Europe.',
      },
    ],
  },
  {
    slug: 'hungary',
    name: 'Hungary',
    iso: 'HU',
    region: 'Europe',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'apple-tv-plus'],
    streamingLandscape:
      'RTL+ and TV2 Play are the main Hungarian platforms for local content. International services like Netflix and Max are also available.',
    currency: 'HUF',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Hungary',
    wikidataId: 'https://www.wikidata.org/wiki/Q28',
    faqs: [
      {
        question: 'What Hungarian streaming services are there?',
        answer: 'RTL+ and TV2 Play are major Hungarian streaming services offering local drama, reality, and news content.',
      },
    ],
  },
  {
    slug: 'nigeria',
    name: 'Nigeria',
    iso: 'NG',
    region: 'Africa',
    availablePlatforms: [
      'netflix', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll', 'youtube-premium'],
    streamingLandscape:
      'Nigeria is Africa\'s largest streaming market. Netflix produces Nollywood originals, and Showmax Africa (DStv) is the main local service.',
    currency: 'NGN',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Nigeria',
    wikidataId: 'https://www.wikidata.org/wiki/Q1033',
    faqs: [
      {
        question: 'Is Netflix popular in Nigeria?',
        answer: 'Yes, Netflix is widely used in Nigeria and produces Nollywood originals for the local market.',
      },
      {
        question: 'What is the most popular local streaming service in Nigeria?',
        answer: 'Showmax (from MultiChoice/DStv) is the leading local streaming platform in Nigeria, offering African content and international titles.',
      },
    ],
  },
  {
    slug: 'indonesia',
    name: 'Indonesia',
    iso: 'ID',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'crunchyroll', 'youtube-premium'],
    streamingLandscape:
      'Vidio and RCTI+ are the main local streaming services. Netflix produces Indonesian originals and offers mobile-only plans at local pricing.',
    currency: 'IDR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Indonesia',
    wikidataId: 'https://www.wikidata.org/wiki/Q252',
    faqs: [
      {
        question: 'Is Netflix available in Indonesia?',
        answer: 'Yes, Netflix is available in Indonesia with mobile-only plans starting at affordable local pricing.',
      },
    ],
  },
  {
    slug: 'philippines',
    name: 'Philippines',
    iso: 'PH',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'crunchyroll', 'apple-tv-plus'],
    streamingLandscape:
      'iWantTFC (ABS-CBN) offers free Filipino content. Netflix and Disney+ lead among international services.',
    currency: 'PHP',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Philippines',
    wikidataId: 'https://www.wikidata.org/wiki/Q928',
    faqs: [
      {
        question: 'What Filipino streaming services are popular?',
        answer: 'iWantTFC (ABS-CBN), Viu, and GMA Network are popular Filipino streaming platforms alongside international services.',
      },
    ],
  },
  {
    slug: 'thailand',
    name: 'Thailand',
    iso: 'TH',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'crunchyroll', 'apple-tv-plus'],
    streamingLandscape:
      'LINE TV and MONOMAX are local platforms. Netflix produces Thai originals. Disney+ (originally launched as Disney+ Hotstar in 2022) is also available.',
    currency: 'THB',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Thailand',
    wikidataId: 'https://www.wikidata.org/wiki/Q869',
    faqs: [
      {
        question: 'Is Disney+ available in Thailand?',
        answer: 'Yes, Disney+ (originally as Disney+ Hotstar) launched in Thailand in 2022 and has been growing rapidly.',
      },
    ],
  },
  {
    slug: 'malaysia',
    name: 'Malaysia',
    iso: 'MY',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'acorn-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'crunchyroll', 'apple-tv-plus'],
    streamingLandscape:
      'Astro Go and tonton (Media Prima) are the main local streaming platforms. Viu is popular for Korean dramas.',
    currency: 'MYR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Malaysia',
    wikidataId: 'https://www.wikidata.org/wiki/Q833',
    faqs: [
      {
        question: 'What Malaysian streaming services are there?',
        answer: 'Astro Go, tonton (Media Prima), and Viu are major local streaming services in Malaysia.',
      },
    ],
  },
  {
    slug: 'israel',
    name: 'Israel',
    iso: 'IL',
    region: 'Middle East',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'mubi', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'mubi'],
    streamingLandscape:
      'HOT VOD offers local Hebrew-language content. Netflix has produced Israeli originals including Fauda, Shtisel, and Tehran.',
    currency: 'ILS',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Israel',
    wikidataId: 'https://www.wikidata.org/wiki/Q801',
    faqs: [
      {
        question: 'Is Israeli content on Netflix?',
        answer: 'Yes, Netflix has produced Israeli originals including Fauda, Shtisel, and Tehran, which have gained international audiences.',
      },
    ],
  },
  {
    slug: 'bangladesh',
    name: 'Bangladesh',
    iso: 'BD',
    region: 'Asia',
    availablePlatforms: [
      'netflix', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'youtube-premium', 'crunchyroll', 'apple-tv-plus'],
    streamingLandscape:
      'Bongo BD and Chorki are local streaming services. Netflix mobile plans are popular because of affordable local pricing.',
    currency: 'BDT',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Bangladesh',
    wikidataId: 'https://www.wikidata.org/wiki/Q902',
    faqs: [
      {
        question: 'Is Netflix affordable in Bangladesh?',
        answer: 'Netflix offers mobile-only plans in Bangladesh at prices adapted to the local market.',
      },
    ],
  },
  {
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    iso: 'SA',
    region: 'Middle East',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'disney-plus', 'apple-tv-plus', 'hbo-max'],
    streamingLandscape:
      'Shahid (MBC Group) is the main local streaming service. Netflix and Amazon Prime Video lead among international platforms.',
    currency: 'SAR',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Saudi_Arabia',
    wikidataId: 'https://www.wikidata.org/wiki/Q851',
    faqs: [
      {
        question: 'What is the most popular streaming service in Saudi Arabia?',
        answer: 'Shahid (MBC Group) is the most popular local streaming platform in Saudi Arabia, while Netflix and Amazon Prime Video lead international services.',
      },
    ],
  },
  {
    slug: 'egypt',
    name: 'Egypt',
    iso: 'EG',
    region: 'Africa',
    availablePlatforms: [
      'netflix', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'apple-tv-plus', 'youtube-premium', 'crunchyroll'],
    streamingLandscape:
      'Watch iT (Egyptian Media Group) and Shahid are popular local services. Netflix offers Arabic-dubbed content for the Egyptian market.',
    currency: 'EGP',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Egypt',
    wikidataId: 'https://www.wikidata.org/wiki/Q79',
    faqs: [
      {
        question: 'Is Netflix available in Egypt?',
        answer: 'Yes, Netflix is available in Egypt with Arabic-language content and competitive regional pricing.',
      },
    ],
  },
  {
    slug: 'morocco',
    name: 'Morocco',
    iso: 'MA',
    region: 'Africa',
    availablePlatforms: [
      'netflix', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'apple-tv-plus', 'youtube-premium', 'crunchyroll'],
    streamingLandscape:
      'Morocco has a bilingual (Arabic/French) streaming market. SNRT Play offers free Moroccan public broadcasting. Netflix is the leading international streaming service with French and Arabic content.',
    currency: 'MAD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Morocco',
    wikidataId: 'https://www.wikidata.org/wiki/Q1028',
    faqs: [
      {
        question: 'Is Netflix available in Morocco?',
        answer: 'Yes, Netflix is available in Morocco with French and Arabic content options.',
      },
    ],
  },
  {
    slug: 'kenya',
    name: 'Kenya',
    iso: 'KE',
    region: 'Africa',
    availablePlatforms: [
      'netflix', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll',
      'youtube-premium',
    ],
    topPlatforms: ['netflix', 'amazon-prime-video', 'apple-tv-plus', 'crunchyroll', 'youtube-premium'],
    streamingLandscape:
      'Kenya is a tech hub in East Africa with growing streaming adoption. Showmax Africa is the leading local service. Netflix offers mobile-only plans popular with smartphone users.',
    currency: 'KES',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Kenya',
    wikidataId: 'https://www.wikidata.org/wiki/Q114',
    faqs: [
      {
        question: 'What streaming services are available in Kenya?',
        answer: 'Netflix, Amazon Prime Video, Showmax (Africa), and Apple TV+ are available in Kenya.',
      },
    ],
  },
  {
    slug: 'peru',
    name: 'Peru',
    iso: 'PE',
    region: 'South America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'pluto-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'All major international services are available. Local telcos like Claro and Movistar bundle streaming with internet plans.',
    currency: 'PEN',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Peru',
    wikidataId: 'https://www.wikidata.org/wiki/Q419',
    faqs: [
      {
        question: 'Is Netflix affordable in Peru?',
        answer: 'Yes, Netflix offers competitive pricing in Peru with plans starting at affordable local rates.',
      },
    ],
  },
  {
    slug: 'ecuador',
    name: 'Ecuador',
    iso: 'EC',
    region: 'South America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'pluto-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Ecuador uses the US dollar, making streaming pricing competitive. Netflix and Disney+ lead the market, with Claro Video and other telco bundles popular among local consumers.',
    currency: 'USD',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ecuador',
    wikidataId: 'https://www.wikidata.org/wiki/Q736',
    faqs: [
      {
        question: 'What streaming services are available in Ecuador?',
        answer: 'Netflix, Disney+, Max (HBO), and Amazon Prime Video are the main streaming services available in Ecuador.',
      },
    ],
  },
  {
    slug: 'uruguay',
    name: 'Uruguay',
    iso: 'UY',
    region: 'South America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'pluto-tv', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      "Uruguay has Latin America's highest internet penetration rate and strong streaming adoption. Netflix and Max (HBO) lead the market with the same content availability as the broader Latin American region.",
    currency: 'UYU',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Uruguay',
    wikidataId: 'https://www.wikidata.org/wiki/Q77',
    faqs: [
      {
        question: 'Is Netflix available in Uruguay?',
        answer: 'Yes, Netflix is available in Uruguay with Latin American pricing.',
      },
    ],
  },
  {
    slug: 'guatemala',
    name: 'Guatemala',
    iso: 'GT',
    region: 'North America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Netflix, Disney+, and Max are the primary international platforms. Local telcos bundle streaming with broadband services.',
    currency: 'GTQ',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Guatemala',
    wikidataId: 'https://www.wikidata.org/wiki/Q774',
    faqs: [
      {
        question: 'Is Netflix available in Guatemala?',
        answer: 'Yes, Netflix is available in Guatemala with pricing in US dollars at Central American rates.',
      },
    ],
  },
  {
    slug: 'costa-rica',
    name: 'Costa Rica',
    iso: 'CR',
    region: 'North America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Costa Rica has high internet penetration for Central America and strong streaming adoption. Netflix, Disney+, and Max (HBO) are the leading services.',
    currency: 'CRC',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Costa_Rica',
    wikidataId: 'https://www.wikidata.org/wiki/Q800',
    faqs: [
      {
        question: 'What streaming services work in Costa Rica?',
        answer: 'Netflix, Disney+, Max (HBO), and Amazon Prime Video are all available in Costa Rica.',
      },
    ],
  },
  {
    slug: 'dominican-republic',
    name: 'Dominican Republic',
    iso: 'DO',
    region: 'North America',
    availablePlatforms: [
      'netflix', 'disney-plus', 'amazon-prime-video', 'apple-tv-plus', 'hbo-max',
      'crunchyroll', 'youtube-premium',
    ],
    topPlatforms: ['netflix', 'disney-plus', 'amazon-prime-video', 'hbo-max', 'crunchyroll'],
    streamingLandscape:
      'Mobile internet adoption drives streaming usage. Netflix leads with Spanish-language content relevant to Dominican audiences.',
    currency: 'DOP',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Dominican_Republic',
    wikidataId: 'https://www.wikidata.org/wiki/Q786',
    faqs: [
      {
        question: 'Is Netflix available in the Dominican Republic?',
        answer: 'Yes, Netflix is available in the Dominican Republic with Latin American pricing and Spanish-language content.',
      },
    ],
  },
];

export function getCountryBySlug(slug: string): StreamingCountry | undefined {
  return countries.find(c => c.slug === slug);
}

export function getCountryByIso(iso: string): StreamingCountry | undefined {
  return countries.find(c => c.iso === iso);
}
