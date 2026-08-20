export type SportCategory =
  | 'football'
  | 'basketball'
  | 'motorsport'
  | 'combat'
  | 'cricket'
  | 'tennis'
  | 'american-football'
  | 'rugby'
  | 'other';

export interface RegionalPricing {
  countryIso: string;
  platform: string;
  price: number;
  currency: string;
  period: 'monthly' | 'annual' | 'per-event';
  notes?: string;
}

export interface SportStreaming {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: SportCategory;
  season: string;
  regionalPricing: RegionalPricing[];
  cheapestOption: { countryIso: string; price: number; currency: string; platform: string };
  mostExpensiveOption: { countryIso: string; price: number; currency: string; platform: string };
  globalPlatforms: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedSports: string[];
  keyEvents: string[];
  wikipediaUrl?: string;
  wikidataId?: string;
}

export const sports: SportStreaming[] = [
  {
    slug: 'premier-league',
    name: 'English Premier League',
    shortDescription:
      'The most-watched football league in the world, broadcast in 189 countries to over 4.7 billion viewers each season.',
    longDescription:
      'The English Premier League is the top tier of club football, featuring 20 teams competing across 38 matchdays from August to May. With clubs like Manchester City, Arsenal, Liverpool, and Manchester United, the EPL draws huge global demand for live streaming. Pricing varies widely by region, making it one of the biggest drivers of VPN adoption among sports fans worldwide.',
    category: 'football',
    season: 'August - May',
    regionalPricing: [
      { countryIso: 'US', platform: 'peacock', price: 13.99, currency: 'USD', period: 'monthly', notes: 'Peacock Premium Plus for all matches' },
      { countryIso: 'GB', platform: 'dazn', price: 54.99, currency: 'GBP', period: 'monthly', notes: 'Sky Sports required for most matches' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly', notes: 'JioCinema formerly free, now DAZN' },
      { countryIso: 'AU', platform: 'paramount-plus', price: 13.99, currency: 'AUD', period: 'monthly', notes: 'Optus Sport carries all matches' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly' },
      { countryIso: 'DE', platform: 'dazn', price: 44.99, currency: 'EUR', period: 'monthly' },
      { countryIso: 'BR', platform: 'espn-plus', price: 49.90, currency: 'BRL', period: 'monthly', notes: 'Via ESPN Brasil / Star+' },
      { countryIso: 'NG', platform: 'dazn', price: 2500, currency: 'NGN', period: 'monthly', notes: 'SuperSport via DStv' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'GB', price: 54.99, currency: 'GBP', platform: 'dazn' },
    globalPlatforms: ['peacock', 'dazn', 'paramount-plus', 'espn-plus'],
    faqs: [
      {
        question: 'Where can I watch the Premier League for the cheapest price?',
        answer:
          'Premier League pricing varies by country and rights cycle. Check the Premier League broadcast guide and your local broadcaster for the current authorized option before comparing prices.',
      },
      {
        question: 'Why is the Premier League so expensive in the UK?',
        answer:
          'Premier League coverage is costly in its home country because Sky Sports and TNT Sports split UK rights. Not all matches are broadcast live in the UK due to the 3pm blackout rule designed to protect stadium attendance.',
      },
      {
        question: 'Can I watch every Premier League match live?',
        answer:
          'In most countries outside the UK, every single match is available live. In the UK, the 3pm Saturday blackout prevents live broadcast of matches kicking off at that time.',
      },
      {
        question: 'What platforms stream the Premier League in the US?',
        answer:
          'In the US, NBC holds Premier League rights. Matches are split between Peacock (streaming), NBC, and USA Network. A Peacock Premium Plus subscription at $13.99/month gives you access to the most matches.',
      },
    ],
    relatedSports: ['champions-league', 'europa-league', 'la-liga', 'serie-a', 'bundesliga'],
    keyEvents: ['Manchester Derby', 'North London Derby', 'Merseyside Derby', 'Title Race', 'Relegation Battle'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Premier_League',
    wikidataId: 'https://www.wikidata.org/wiki/Q9448',
  },
  {
    slug: 'champions-league',
    name: 'UEFA Champions League',
    shortDescription:
      "European club football's top tournament, featuring the continent's best teams competing for the biggest prize.",
    longDescription:
      'The UEFA Champions League is the highest-level club football competition in the world. Running from September to June, it features top clubs from across Europe competing through group stages and knockout rounds. The final regularly attracts over 400 million viewers globally, making it one of the most-watched annual sporting events.',
    category: 'football',
    season: 'September - June',
    regionalPricing: [
      { countryIso: 'US', platform: 'paramount-plus', price: 13.99, currency: 'USD', period: 'monthly', notes: 'Paramount+ with Showtime' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 30.99, currency: 'GBP', period: 'monthly', notes: 'TNT Sports via Discovery+' },
      { countryIso: 'DE', platform: 'dazn', price: 44.99, currency: 'EUR', period: 'monthly' },
      { countryIso: 'ES', platform: 'dazn', price: 18.99, currency: 'EUR', period: 'monthly', notes: 'Movistar+ partnership' },
      { countryIso: 'IT', platform: 'amazon-prime-video', price: 4.99, currency: 'EUR', period: 'monthly', notes: 'Select matches; Mediaset Infinity for others' },
      { countryIso: 'BR', platform: 'dazn', price: 54.99, currency: 'BRL', period: 'monthly', notes: 'HBO Max also carries matches' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
      { countryIso: 'AU', platform: 'paramount-plus', price: 13.99, currency: 'AUD', period: 'monthly', notes: 'Stan Sport carries matches' },
    ],
    cheapestOption: { countryIso: 'IT', price: 4.99, currency: 'EUR', platform: 'amazon-prime-video' },
    mostExpensiveOption: { countryIso: 'DE', price: 44.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['paramount-plus', 'dazn', 'amazon-prime-video', 'discovery-plus'],
    faqs: [
      {
        question: 'What is the cheapest way to watch the Champions League?',
        answer:
          'Some countries have lower-cost Champions League packages than others. Check UEFA and local broadcaster listings for current authorized coverage in your country before subscribing.',
      },
      {
        question: 'Where can I watch the Champions League in the US?',
        answer:
          'Paramount+ holds exclusive US broadcasting rights for the Champions League. The Paramount+ with Showtime tier at $13.99/month provides access to every match.',
      },
      {
        question: 'Is the Champions League final free to watch?',
        answer:
          'In some countries, the Champions League final is broadcast on free-to-air television. In the UK, TNT Sports occasionally makes the final free. Check your local broadcaster for availability.',
      },
    ],
    relatedSports: ['premier-league', 'la-liga', 'serie-a', 'bundesliga', 'europa-league'],
    keyEvents: ['Group Stage Draw', 'Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Champions League Final'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/UEFA_Champions_League',
    wikidataId: 'https://www.wikidata.org/wiki/Q18756',
  },
  {
    slug: 'la-liga',
    name: 'Spanish La Liga',
    shortDescription:
      "Spain's top football division featuring FC Barcelona and Real Madrid, two of the most successful clubs in history.",
    longDescription:
      'La Liga is one of the strongest football leagues globally, home to clubs like FC Barcelona, Real Madrid, and Atletico Madrid. Known for its technical playing style, La Liga has produced players like Messi, Ronaldo, and Bellingham. The league runs from August to May and is broadcast in over 180 countries.',
    category: 'football',
    season: 'August - May',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 11.99, currency: 'USD', period: 'monthly' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly', notes: 'Premier Sport via DAZN' },
      { countryIso: 'ES', platform: 'dazn', price: 18.99, currency: 'EUR', period: 'monthly', notes: 'Movistar+ or DAZN required' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
      { countryIso: 'MX', platform: 'dazn', price: 249, currency: 'MXN', period: 'monthly', notes: 'Via SKY Mexico' },
      { countryIso: 'DE', platform: 'dazn', price: 44.99, currency: 'EUR', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'DE', price: 44.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['espn-plus', 'dazn'],
    faqs: [
      {
        question: 'How can I watch La Liga in the US?',
        answer:
          'ESPN+ holds La Liga broadcasting rights in the US. A subscription costs $11.99/month and includes access to all La Liga matches plus other ESPN+ content.',
      },
      {
        question: 'Is La Liga available on DAZN?',
        answer:
          'Yes, DAZN carries La Liga in multiple markets including the UK, Germany, Canada, and several other countries. Pricing varies by region.',
      },
      {
        question: 'What are the El Clasico viewing options?',
        answer:
          'El Clasico (Barcelona vs Real Madrid) is available on the same platforms that carry La Liga in your region. Due to high demand, these matches sometimes appear on expanded broadcast coverage.',
      },
    ],
    relatedSports: ['premier-league', 'champions-league', 'serie-a', 'bundesliga', 'ligue-1'],
    keyEvents: ['El Clasico', 'Madrid Derby', 'Catalan Derby', 'Title Decider', 'Relegation Playoffs'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/La_Liga',
    wikidataId: 'https://www.wikidata.org/wiki/Q324867',
  },
  {
    slug: 'serie-a',
    name: 'Italian Serie A',
    shortDescription:
      "Italy's top football league, known for tactical play and featuring clubs like Juventus, AC Milan, and Inter Milan.",
    longDescription:
      "Serie A is Italy's top professional football league and one of the strongest competitions in world football. Known for its emphasis on defensive organization and tactical thinking, the league features historic clubs with passionate fanbases. Serie A runs from August to May and has grown in global popularity in recent years.",
    category: 'football',
    season: 'August - May',
    regionalPricing: [
      { countryIso: 'US', platform: 'paramount-plus', price: 7.99, currency: 'USD', period: 'monthly' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 30.99, currency: 'GBP', period: 'monthly', notes: 'TNT Sports via Discovery+' },
      { countryIso: 'IT', platform: 'dazn', price: 34.99, currency: 'EUR', period: 'monthly', notes: 'DAZN holds exclusive rights' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
      { countryIso: 'BR', platform: 'espn-plus', price: 49.90, currency: 'BRL', period: 'monthly', notes: 'ESPN Brasil' },
      { countryIso: 'AU', platform: 'paramount-plus', price: 13.99, currency: 'AUD', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'IT', price: 34.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['paramount-plus', 'dazn', 'discovery-plus', 'espn-plus'],
    faqs: [
      {
        question: 'Where can I watch Serie A in the US?',
        answer:
          'Paramount+ holds US broadcasting rights for Serie A. The Essential plan at $7.99/month includes access to all matches, making it one of the most affordable options for top-flight European football.',
      },
      {
        question: 'Why is Serie A expensive in Italy?',
        answer:
          'DAZN holds Serie A rights in Italy. Pricing and packages change by season, so check DAZN Italy and Serie A broadcaster listings before subscribing.',
      },
      {
        question: 'Is Serie A growing in popularity?',
        answer:
          'Yes, Serie A has grown noticeably with high-profile transfers and more international broadcasting deals. The league now reaches over 200 countries worldwide.',
      },
    ],
    relatedSports: ['premier-league', 'champions-league', 'la-liga', 'bundesliga', 'europa-league'],
    keyEvents: ["Derby della Madonnina", "Derby d'Italia", 'Rome Derby', 'Scudetto Race', 'Coppa Italia Final'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Serie_A',
    wikidataId: 'https://www.wikidata.org/wiki/Q15804',
  },
  {
    slug: 'bundesliga',
    name: 'German Bundesliga',
    shortDescription:
      "Germany's top football league, famous for its atmosphere, affordable tickets, and the highest average attendance in world football.",
    longDescription:
      'The Bundesliga is the top professional football league in Germany and has the highest average stadium attendance of any football league globally. Known for its 50+1 ownership rule that keeps clubs fan-owned, the Bundesliga features high-scoring football. Bayern Munich has historically dominated, but the league has become more competitive in recent seasons.',
    category: 'football',
    season: 'August - May',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 11.99, currency: 'USD', period: 'monthly' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly' },
      { countryIso: 'DE', platform: 'dazn', price: 44.99, currency: 'EUR', period: 'monthly', notes: 'Sky Deutschland also carries matches' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly' },
      { countryIso: 'JP', platform: 'dazn', price: 3700, currency: 'JPY', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'DE', price: 44.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['espn-plus', 'dazn'],
    faqs: [
      {
        question: 'How can I watch the Bundesliga in the US?',
        answer:
          'ESPN+ carries all Bundesliga matches in the US for $11.99/month. The subscription also includes La Liga and many other sports, so it is good value.',
      },
      {
        question: 'Is the Bundesliga free to watch anywhere?',
        answer:
          'The Bundesliga is not regularly free-to-air in most countries. However, select matches may appear on free channels in Germany, and highlights are widely available on YouTube.',
      },
      {
        question: 'Why is the Bundesliga popular for neutral fans?',
        answer:
          'The Bundesliga is known for high-scoring matches, passionate fan culture with safe standing sections, and affordable pricing in many international markets. It also has a strong track record of developing young talent.',
      },
    ],
    relatedSports: ['premier-league', 'champions-league', 'la-liga', 'serie-a', 'ligue-1'],
    keyEvents: ['Der Klassiker', 'Revierderby', 'Nordderby', 'Title Race', 'Relegation Playoff'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Bundesliga',
    wikidataId: 'https://www.wikidata.org/wiki/Q82595',
  },
  {
    slug: 'ligue-1',
    name: 'French Ligue 1',
    shortDescription:
      "France's top football division, featuring Paris Saint-Germain and a league known for developing world-class talent.",
    longDescription:
      "Ligue 1 is the top division of French football, home to Paris Saint-Germain and several strong talent-developing clubs. The league has gained international attention thanks to PSG's high-profile roster and France's success in international football. Ligue 1 runs from August to May and is available through several global streaming platforms.",
    category: 'football',
    season: 'August - May',
    regionalPricing: [
      { countryIso: 'US', platform: 'amazon-prime-video', price: 14.99, currency: 'USD', period: 'monthly', notes: 'beIN Sports add-on' },
      { countryIso: 'GB', platform: 'amazon-prime-video', price: 14.99, currency: 'GBP', period: 'monthly', notes: 'beIN Sports Connect' },
      { countryIso: 'FR', platform: 'dazn', price: 29.99, currency: 'EUR', period: 'monthly', notes: 'DAZN acquired majority rights from 2024' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'FR', price: 29.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['dazn', 'amazon-prime-video'],
    faqs: [
      {
        question: 'Where can I watch Ligue 1 outside France?',
        answer:
          'Ligue 1 is available through beIN Sports in many countries, DAZN in select markets, and various regional broadcasters. In the US, beIN Sports is accessible as an add-on through Amazon Prime Video.',
      },
      {
        question: 'Is Ligue 1 worth watching after Messi and Neymar left PSG?',
        answer:
          'Yes. Ligue 1 remains one of the top five European leagues and continues to produce elite talent. The competitive balance has actually improved, with several clubs challenging for the title.',
      },
      {
        question: 'How much does DAZN charge for Ligue 1 in France?',
        answer:
          'DAZN acquired the majority of Ligue 1 rights in France starting from the 2024-25 season, priced at 29.99 EUR/month for the standard tier.',
      },
    ],
    relatedSports: ['premier-league', 'champions-league', 'la-liga', 'europa-league', 'serie-a'],
    keyEvents: ["Le Classique", "Derby de la Cote d'Azur", 'Olympico', 'Title Race', 'Coupe de France Final'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ligue_1',
    wikidataId: 'https://www.wikidata.org/wiki/Q13394',
  },
  {
    slug: 'nba',
    name: 'NBA Basketball',
    shortDescription:
      "The world's top basketball league with 30 teams, large global viewership, and one of the biggest streaming price gaps between countries.",
    longDescription:
      'The National Basketball Association is the most popular professional basketball league globally, featuring superstars and intense competition from October through June. NBA League Pass offers international streaming, but pricing varies widely by country: as low as $18/year in India versus over $200/year in the US. That gap makes it a strong candidate for geo-arbitrage via VPN.',
    category: 'basketball',
    season: 'October - June',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 22.99, currency: 'USD', period: 'monthly', notes: 'NBA League Pass; games also on ESPN+ and TNT' },
      { countryIso: 'IN', platform: 'dazn', price: 1499, currency: 'INR', period: 'annual', notes: 'NBA League Pass India ~$18/year' },
      { countryIso: 'BR', platform: 'dazn', price: 59.90, currency: 'BRL', period: 'monthly', notes: 'NBA League Pass Brazil' },
      { countryIso: 'AU', platform: 'espn-plus', price: 39.99, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports also available' },
      { countryIso: 'GB', platform: 'dazn', price: 14.99, currency: 'GBP', period: 'monthly', notes: 'NBA League Pass UK via Sky Sports' },
      { countryIso: 'PH', platform: 'dazn', price: 499, currency: 'PHP', period: 'annual', notes: 'NBA League Pass Philippines' },
      { countryIso: 'CA', platform: 'dazn', price: 29.99, currency: 'CAD', period: 'monthly' },
      { countryIso: 'MX', platform: 'dazn', price: 2999, currency: 'MXN', period: 'annual' },
    ],
    cheapestOption: { countryIso: 'IN', price: 1499, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'US', price: 22.99, currency: 'USD', platform: 'espn-plus' },
    globalPlatforms: ['espn-plus', 'dazn', 'youtube-premium'],
    faqs: [
      {
        question: 'How much can I save on NBA League Pass with a VPN?',
        answer:
          'NBA League Pass in India costs approximately $18/year compared to $200+/year in the US. That is a savings of over 90%. By connecting to a VPN server in India and purchasing through the Indian store, you can access the same content at a fraction of the price.',
      },
      {
        question: 'Does NBA League Pass have blackout restrictions?',
        answer:
          'In the US, NBA League Pass has local and national blackout restrictions. Games on ESPN, TNT, or local RSNs are blacked out. International League Pass subscriptions generally have no blackouts, which is another advantage of subscribing through a foreign market.',
      },
      {
        question: 'Where can I watch the NBA Finals?',
        answer:
          'The NBA Finals are broadcast on ABC in the US (free with antenna). Internationally, they are available through NBA League Pass or local broadcast partners in most countries.',
      },
      {
        question: 'Is NBA League Pass worth it?',
        answer:
          'NBA League Pass provides access to every out-of-market game, condensed game replays, and classic games. At international pricing, it is a solid deal for basketball fans.',
      },
    ],
    relatedSports: ['nfl', 'mlb', 'nhl', 'mls'],
    keyEvents: ['NBA All-Star Game', 'NBA Playoffs', 'NBA Finals', 'NBA Draft', 'Christmas Day Games'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/National_Basketball_Association',
    wikidataId: 'https://www.wikidata.org/wiki/Q155223',
  },
  {
    slug: 'nfl',
    name: 'NFL American Football',
    shortDescription:
      "America's most popular sport with the Super Bowl as the single most-watched broadcast event annually.",
    longDescription:
      'The National Football League is the most popular professional sports league in the United States, generating huge TV ratings and advertising revenue. The NFL season runs from September to February, ending with the Super Bowl. International interest has grown with games in London and Frankfurt, plus the expansion of NFL Game Pass globally.',
    category: 'american-football',
    season: 'September - February',
    regionalPricing: [
      { countryIso: 'US', platform: 'peacock', price: 13.99, currency: 'USD', period: 'monthly', notes: 'Sunday Night Football; also ESPN+ for MNF, Paramount+ for some games' },
      { countryIso: 'US', platform: 'amazon-prime-video', price: 14.99, currency: 'USD', period: 'monthly', notes: 'Thursday Night Football exclusive' },
      { countryIso: 'US', platform: 'youtube-premium', price: 72.99, currency: 'USD', period: 'monthly', notes: 'YouTube TV for NFL Sunday Ticket' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly', notes: 'NFL Game Pass via DAZN' },
      { countryIso: 'DE', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly', notes: 'NFL Game Pass via DAZN' },
      { countryIso: 'BR', platform: 'dazn', price: 54.99, currency: 'BRL', period: 'monthly', notes: 'NFL Game Pass' },
      { countryIso: 'AU', platform: 'espn-plus', price: 6.99, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports / ESPN via Foxtel' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'AU', price: 6.99, currency: 'AUD', platform: 'espn-plus' },
    mostExpensiveOption: { countryIso: 'US', price: 72.99, currency: 'USD', platform: 'youtube-premium' },
    globalPlatforms: ['dazn', 'amazon-prime-video', 'peacock', 'espn-plus', 'youtube-premium', 'paramount-plus'],
    faqs: [
      {
        question: 'Why is watching the NFL so complicated in the US?',
        answer:
          'NFL broadcasting rights in the US are split across multiple networks and platforms: CBS, FOX, NBC (Peacock), ESPN (Monday Night Football), Amazon Prime Video (Thursday Night Football), and YouTube TV (Sunday Ticket). This fragmentation makes it expensive to watch every game.',
      },
      {
        question: 'Is NFL Game Pass cheaper outside the US?',
        answer:
          'Often, but pricing, blackout rules, and included games vary by country. Check DAZN or the NFL Game Pass page in your current country before subscribing.',
      },
      {
        question: 'Can I watch the Super Bowl for free?',
        answer:
          'In the US, the Super Bowl rotates between CBS, FOX, and NBC and is typically available on their free streaming apps. Internationally, several countries offer free Super Bowl broadcasts.',
      },
      {
        question: 'What is NFL Sunday Ticket?',
        answer:
          'NFL Sunday Ticket is the premium package that shows every out-of-market Sunday afternoon game. It moved exclusively to YouTube TV in 2023 and costs $72.99/month during the season (or $349/season standalone).',
      },
    ],
    relatedSports: ['nba', 'mlb', 'nhl', 'rugby-world-cup'],
    keyEvents: ['Super Bowl', 'NFL Draft', 'NFL Playoffs', 'Monday Night Football', 'London Games'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/National_Football_League',
    wikidataId: 'https://www.wikidata.org/wiki/Q1215884',
  },
  {
    slug: 'mlb',
    name: 'MLB Baseball',
    shortDescription:
      'Major League Baseball features 162-game seasons across 30 teams, with extensive streaming options and significant price variation globally.',
    longDescription:
      'Major League Baseball is one of the oldest professional sports leagues in North America, running from late March through October with the World Series as the top event. With 162 regular-season games per team, MLB offers the most live content of any major sports league. MLB.TV provides full out-of-market streaming with notable international price differences.',
    category: 'other',
    season: 'March - October',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 24.99, currency: 'USD', period: 'monthly', notes: 'MLB.TV single team; $149.99/season full' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly', notes: 'MLB.TV international' },
      { countryIso: 'JP', platform: 'dazn', price: 3700, currency: 'JPY', period: 'monthly', notes: 'DAZN Japan carries MLB' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly', notes: 'Also on Sportsnet' },
      { countryIso: 'KR', platform: 'dazn', price: 15000, currency: 'KRW', period: 'monthly' },
      { countryIso: 'AU', platform: 'espn-plus', price: 6.99, currency: 'AUD', period: 'monthly', notes: 'Via Kayo Sports' },
    ],
    cheapestOption: { countryIso: 'AU', price: 6.99, currency: 'AUD', platform: 'espn-plus' },
    mostExpensiveOption: { countryIso: 'US', price: 24.99, currency: 'USD', platform: 'espn-plus' },
    globalPlatforms: ['espn-plus', 'dazn', 'apple-tv-plus', 'peacock'],
    faqs: [
      {
        question: 'Does MLB.TV have blackout restrictions?',
        answer:
          'In the US, MLB.TV blacks out locally televised games and nationally broadcast games on ESPN, FOX, and TBS. International MLB.TV subscriptions have no blackout restrictions, making them far more valuable.',
      },
      {
        question: 'Does Apple TV+ show MLB games?',
        answer:
          'Yes, Apple TV+ has a "Friday Night Baseball" package that streams select games exclusively. These games are free to Apple TV+ subscribers and sometimes available without a subscription.',
      },
      {
        question: 'How much does MLB.TV cost internationally?',
        answer:
          'International MLB.TV subscriptions are typically cheaper than the US version and, crucially, include no blackout restrictions. Prices vary by country but are often 30-50% less than US pricing.',
      },
    ],
    relatedSports: ['nba', 'nfl', 'nhl', 'mls'],
    keyEvents: ['Opening Day', 'All-Star Game', 'Trade Deadline', 'MLB Playoffs', 'World Series'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Major_League_Baseball',
    wikidataId: 'https://www.wikidata.org/wiki/Q743',
  },
  {
    slug: 'nhl',
    name: 'NHL Hockey',
    shortDescription:
      'The National Hockey League brings the fastest team sport to fans across North America and a growing international audience.',
    longDescription:
      'The NHL is the top professional ice hockey league in the world, featuring 32 teams across the US and Canada. The season runs from October to June, with the Stanley Cup Playoffs being one of the most intense postseasons in sports. International streaming through ESPN+ in the US and regional broadcasters elsewhere offers varied pricing.',
    category: 'other',
    season: 'October - June',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 11.99, currency: 'USD', period: 'monthly', notes: 'ESPN+ carries most games' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly', notes: 'Also Sportsnet and TSN' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly', notes: 'NHL.TV international' },
      { countryIso: 'SE', platform: 'dazn', price: 149, currency: 'SEK', period: 'monthly', notes: 'Via Viaplay' },
      { countryIso: 'FI', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly', notes: 'Via Viaplay' },
      { countryIso: 'DE', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'GB', price: 9.99, currency: 'GBP', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'CA', price: 24.99, currency: 'CAD', platform: 'dazn' },
    globalPlatforms: ['espn-plus', 'dazn'],
    faqs: [
      {
        question: 'Where can I watch the NHL in the US?',
        answer:
          'ESPN+ carries most out-of-market NHL games in the US for $11.99/month. National games also appear on ESPN, TNT, and ABC. Local games are available through regional sports networks.',
      },
      {
        question: 'Does NHL streaming have blackout restrictions?',
        answer:
          'Yes, in the US and Canada, local market games and nationally broadcast games are blacked out on NHL streaming. International subscriptions generally have no blackouts.',
      },
      {
        question: 'Is hockey popular outside North America?',
        answer:
          'Yes, hockey is hugely popular in Scandinavia, Finland, Czech Republic, Russia, and other European countries. The NHL has a growing international fanbase, boosted by European players starring in the league.',
      },
    ],
    relatedSports: ['nba', 'nfl', 'mlb', 'mls'],
    keyEvents: ['Stanley Cup Playoffs', 'Stanley Cup Finals', 'NHL Winter Classic', 'NHL All-Star Game', 'Trade Deadline'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/National_Hockey_League',
    wikidataId: 'https://www.wikidata.org/wiki/Q1215884',
  },
  {
    slug: 'formula-1',
    name: 'Formula 1 Racing',
    shortDescription:
      'The top tier of motorsport with 24 races across 5 continents. Free to watch in some countries, over $150 in others.',
    longDescription:
      "Formula 1 is the highest class of international racing for single-seater formula racing cars. With races held on well-known circuits from Monaco to Suzuka, F1 has grown rapidly in global popularity, partly thanks to Netflix's \"Drive to Survive\" series. Streaming pricing varies by country: F1 is free-to-air in some European markets, on Apple TV in the US from 2026, and on premium broadcasters such as Sky in the UK.",
    category: 'motorsport',
    season: 'March - December',
    regionalPricing: [
      { countryIso: 'US', platform: 'apple-tv-plus', price: 12.99, currency: 'USD', period: 'monthly', notes: 'Apple TV is the exclusive US F1 broadcaster from 2026' },
      { countryIso: 'GB', platform: 'dazn', price: 34.99, currency: 'GBP', period: 'monthly', notes: 'Sky Sports F1; select races free on Channel 4' },
      { countryIso: 'AT', platform: 'dazn', price: 0, currency: 'EUR', period: 'monthly', notes: 'Free on ORF and Servus TV' },
      { countryIso: 'BE', platform: 'dazn', price: 0, currency: 'EUR', period: 'monthly', notes: 'Free on RTBF' },
      { countryIso: 'DE', platform: 'dazn', price: 44.99, currency: 'EUR', period: 'monthly', notes: 'Sky Deutschland' },
      { countryIso: 'IT', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly', notes: 'Some races free on TV8' },
      { countryIso: 'NL', platform: 'dazn', price: 19.99, currency: 'EUR', period: 'monthly', notes: 'Viaplay Netherlands' },
      { countryIso: 'BR', platform: 'dazn', price: 0, currency: 'BRL', period: 'monthly', notes: 'Free on Band TV' },
    ],
    cheapestOption: { countryIso: 'AT', price: 0, currency: 'EUR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'DE', price: 44.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['apple-tv-plus', 'dazn'],
    faqs: [
      {
        question: 'Where can I watch Formula 1 for free?',
        answer:
          'F1 is broadcast free-to-air in Austria (ORF/Servus TV), Belgium (RTBF), Brazil (Band TV), and Luxembourg. Some races are free in Italy (TV8), and the UK has selected free-to-air highlights on Channel 4. Eligibility, payment, and local platform rules still apply.',
      },
      {
        question: 'What is F1 TV Pro and is it worth it?',
        answer:
          "F1 TV Pro is Formula 1's own streaming service offering live races, onboard cameras, team radio, and timing data in supported markets. In the US, Apple TV is the exclusive F1 broadcaster from 2026, so check current Apple TV and F1 TV availability before subscribing.",
      },
      {
        question: 'How has Netflix affected F1 popularity?',
        answer:
          'Netflix\'s "Drive to Survive" series has noticeably grown F1\'s global audience, particularly in the US. The show brought in millions of new fans and contributed to sold-out races and higher streaming demand.',
      },
      {
        question: 'Why is F1 so expensive in the UK?',
        answer:
          'Sky Sports holds UK live F1 rights, while Channel 4 has carried the British Grand Prix and selected highlights. Check current Sky, Now, and Channel 4 listings for the season.',
      },
    ],
    relatedSports: ['motogp', 'olympics'],
    keyEvents: ['Monaco Grand Prix', 'British Grand Prix', 'Italian Grand Prix', 'Abu Dhabi Grand Prix', 'Season Opener'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Formula_One',
    wikidataId: 'https://www.wikidata.org/wiki/Q1968',
  },
  {
    slug: 'motogp',
    name: 'MotoGP',
    shortDescription:
      'The top class of motorcycle road racing, with prototype bikes reaching 350+ km/h and close racing on circuits worldwide.',
    longDescription:
      'MotoGP is the highest class of motorcycle racing in the world, sanctioned by the FIM. Featuring custom-built prototypes reaching speeds over 350 km/h, MotoGP delivers some of the most exciting racing in motorsport. The championship visits circuits across Europe, Asia, the Americas, and Australia from March to November.',
    category: 'motorsport',
    season: 'March - November',
    regionalPricing: [
      { countryIso: 'US', platform: 'dazn', price: 9.99, currency: 'USD', period: 'monthly', notes: 'MotoGP VideoPass' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 30.99, currency: 'GBP', period: 'monthly', notes: 'TNT Sports carries MotoGP' },
      { countryIso: 'ES', platform: 'dazn', price: 18.99, currency: 'EUR', period: 'monthly', notes: 'Also on Movistar+' },
      { countryIso: 'IT', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly', notes: 'Sky Italia carries MotoGP' },
      { countryIso: 'AU', platform: 'dazn', price: 14.99, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports' },
      { countryIso: 'ID', platform: 'dazn', price: 99000, currency: 'IDR', period: 'annual', notes: 'Trans7 free-to-air for select races' },
    ],
    cheapestOption: { countryIso: 'ID', price: 99000, currency: 'IDR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'GB', price: 30.99, currency: 'GBP', platform: 'discovery-plus' },
    globalPlatforms: ['dazn', 'discovery-plus'],
    faqs: [
      {
        question: 'What is MotoGP VideoPass?',
        answer:
          'MotoGP VideoPass is the official streaming service offering live and on-demand access to all MotoGP, Moto2, and Moto3 sessions. It is available directly or through local broadcasters depending on your region.',
      },
      {
        question: 'Where can I watch MotoGP in the US?',
        answer:
          'In the US, MotoGP VideoPass is the primary streaming option at $9.99/month or $139.99/year. It provides access to all practice sessions, qualifying, and races live and on demand.',
      },
      {
        question: 'Is MotoGP free to watch anywhere?',
        answer:
          'Select races are broadcast free-to-air in some Southeast Asian countries like Indonesia. MotoGP occasionally offers free practice and qualifying streams on their YouTube channel.',
      },
    ],
    relatedSports: ['formula-1', 'olympics'],
    keyEvents: ['Italian Grand Prix', 'Spanish Grand Prix', 'Japanese Grand Prix', 'Season Finale', 'Sprint Races'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/MotoGP',
    wikidataId: 'https://www.wikidata.org/wiki/Q18215',
  },
  {
    slug: 'ufc',
    name: 'UFC Mixed Martial Arts',
    shortDescription:
      "The world's largest MMA organization, streaming on Paramount+ in the US under a media-rights deal that begins in 2026.",
    longDescription:
      'The Ultimate Fighting Championship is the largest mixed martial arts organization in the world, hosting events nearly every week. Beginning in 2026, Paramount+ is the exclusive US home for UFC numbered events and Fight Nights, with select marquee fights simulcast on CBS. Older ESPN+ PPV advice should be treated as historical.',
    category: 'combat',
    season: 'Year-round',
    regionalPricing: [
      { countryIso: 'US', platform: 'paramount-plus', price: 0, currency: 'USD', period: 'monthly', notes: 'Included with eligible Paramount+ subscriptions from 2026; check current plan terms, with select fights also on CBS' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 30.99, currency: 'GBP', period: 'monthly', notes: 'TNT Sports via Discovery+' },
      { countryIso: 'AU', platform: 'dazn', price: 6.99, currency: 'AUD', period: 'per-event', notes: 'Main card via Kayo Sports PPV or UFC Fight Pass' },
      { countryIso: 'BR', platform: 'paramount-plus', price: 34.90, currency: 'BRL', period: 'monthly' },
      { countryIso: 'DE', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'GB', price: 30.99, currency: 'GBP', platform: 'discovery-plus' },
    globalPlatforms: ['paramount-plus', 'dazn', 'discovery-plus'],
    faqs: [
      {
        question: 'Do I still need to pay per UFC PPV?',
        answer:
          'In the US, Paramount+ becomes the home for UFC numbered events and Fight Nights from 2026, replacing the previous ESPN+ PPV model. Check Paramount+ for the current plan requirements before fight night.',
      },
      {
        question: 'Where can I watch UFC in the UK?',
        answer:
          'TNT Sports via Discovery+ holds UK broadcasting rights for UFC. Due to time zone differences, main events typically air very late at night or early morning in the UK.',
      },
      {
        question: 'Is UFC Fight Pass still available?',
        answer:
          'UFC Fight Pass continues to offer the full fight library, early prelims, and exclusive content. In the US, live UFC event rights move to Paramount+ from 2026.',
      },
      {
        question: 'What is the best value for watching UFC?',
        answer:
          'In the US, start with Paramount+ from 2026. Outside the US, check the local UFC broadcaster and payment rules for your country before subscribing.',
      },
    ],
    relatedSports: ['boxing', 'wwe'],
    keyEvents: ['UFC 300+', 'International Fight Week', 'The Ultimate Fighter Finale', 'Conor McGregor Cards', 'Title Fights'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Ultimate_Fighting_Championship',
    wikidataId: 'https://www.wikidata.org/wiki/Q219541',
  },
  {
    slug: 'boxing',
    name: 'Professional Boxing',
    shortDescription:
      'Major professional boxing events featuring world championship fights across multiple weight classes and sanctioning bodies.',
    longDescription:
      'Professional boxing remains one of the biggest draws in combat sports, with megafights generating hundreds of millions in revenue. The boxing market is fragmented across multiple platforms, with fighters and promoters signing exclusive deals. Major fights from promoters like Top Rank, Matchroom, and PBC are spread across various streaming services, so fans often need multiple subscriptions.',
    category: 'combat',
    season: 'Year-round',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 11.99, currency: 'USD', period: 'monthly', notes: 'Top Rank fights; DAZN for Matchroom; some PPV $79.99+' },
      { countryIso: 'US', platform: 'dazn', price: 24.99, currency: 'USD', period: 'monthly', notes: 'Matchroom, Golden Boy fights' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly', notes: 'Matchroom fights; Sky Sports Box Office for PPV' },
      { countryIso: 'AU', platform: 'dazn', price: 13.99, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports also carries select fights' },
      { countryIso: 'MX', platform: 'dazn', price: 249, currency: 'MXN', period: 'monthly', notes: 'Boxing hugely popular; Azteca free fights' },
      { countryIso: 'JP', platform: 'dazn', price: 3700, currency: 'JPY', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'GB', price: 9.99, currency: 'GBP', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'US', price: 24.99, currency: 'USD', platform: 'dazn' },
    globalPlatforms: ['dazn', 'espn-plus', 'amazon-prime-video'],
    faqs: [
      {
        question: 'Why is boxing so fragmented across streaming services?',
        answer:
          'Boxing rights are tied to promoters, not a single league. Top Rank fighters are on ESPN+, Matchroom fighters on DAZN, and PBC fighters on various networks. Major PPV events may require separate one-time purchases on top of subscriptions.',
      },
      {
        question: 'Does DAZN still show boxing?',
        answer:
          'Yes, DAZN is one of the largest boxing streaming platforms globally, carrying Matchroom Boxing and Golden Boy Promotions events. Some major fights require a DAZN PPV add-on.',
      },
      {
        question: 'How can I watch boxing PPVs cheaper?',
        answer:
          'Boxing PPV prices vary by region and promoter. Check the official broadcaster in your country before buying, because payment country, event rights, and blackout rules can differ fight by fight.',
      },
    ],
    relatedSports: ['ufc', 'wwe'],
    keyEvents: ['Heavyweight Title Fights', 'Canelo Alvarez Fights', 'Undisputed Championships', 'Fury vs Usyk', 'Mexican Independence Weekend'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Boxing',
    wikidataId: 'https://www.wikidata.org/wiki/Q32112',
  },
  {
    slug: 'wwe',
    name: 'WWE Wrestling',
    shortDescription:
      "The world's largest professional wrestling entertainment company, now streaming on Netflix under a $5 billion deal.",
    longDescription:
      "World Wrestling Entertainment is the largest sports entertainment company globally, producing weekly shows, monthly premium live events, and a deep library of content spanning decades. In 2025, WWE's flagship show Monday Night Raw moved exclusively to Netflix as part of a 10-year deal worth over $5 billion, changing how fans access wrestling content.",
    category: 'combat',
    season: 'Year-round',
    regionalPricing: [
      { countryIso: 'US', platform: 'netflix', price: 15.49, currency: 'USD', period: 'monthly', notes: 'Raw exclusive on Netflix; SmackDown on USA Network' },
      { countryIso: 'GB', platform: 'netflix', price: 10.99, currency: 'GBP', period: 'monthly', notes: 'Raw on Netflix; SmackDown on TNT Sports' },
      { countryIso: 'IN', platform: 'netflix', price: 649, currency: 'INR', period: 'monthly', notes: 'Netflix India basic plan' },
      { countryIso: 'BR', platform: 'netflix', price: 39.90, currency: 'BRL', period: 'monthly' },
      { countryIso: 'CA', platform: 'netflix', price: 16.49, currency: 'CAD', period: 'monthly' },
      { countryIso: 'AU', platform: 'netflix', price: 18.99, currency: 'AUD', period: 'monthly' },
      { countryIso: 'DE', platform: 'netflix', price: 13.99, currency: 'EUR', period: 'monthly' },
      { countryIso: 'MX', platform: 'netflix', price: 199, currency: 'MXN', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'IN', price: 649, currency: 'INR', platform: 'netflix' },
    mostExpensiveOption: { countryIso: 'AU', price: 18.99, currency: 'AUD', platform: 'netflix' },
    globalPlatforms: ['netflix', 'peacock'],
    faqs: [
      {
        question: 'Is WWE Raw really on Netflix now?',
        answer:
          'Yes, as of January 2025, Monday Night Raw streams exclusively on Netflix worldwide as part of a 10-year deal worth over $5 billion. This makes Netflix the primary home for live WWE content.',
      },
      {
        question: 'Where can I watch WWE premium live events?',
        answer:
          'WWE premium live events (formerly PPVs) like WrestleMania and Royal Rumble stream on Peacock in the US and Netflix internationally. The WWE Network library is also available through these platforms.',
      },
      {
        question: 'Do I need separate subscriptions for all WWE content?',
        answer:
          'In the US, you need Netflix for Raw and Peacock for premium live events and the library. SmackDown airs on USA Network. Internationally, Netflix carries the broadest WWE coverage.',
      },
      {
        question: 'Is the WWE Netflix deal good for fans?',
        answer:
          'For most fans, the Netflix deal works out well. Instead of paying for a separate WWE Network subscription, Raw and premium events come bundled into existing Netflix subscriptions at no extra cost.',
      },
    ],
    relatedSports: ['ufc', 'boxing'],
    keyEvents: ['WrestleMania', 'Royal Rumble', 'SummerSlam', 'Survivor Series', 'Money in the Bank'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/WWE',
    wikidataId: 'https://www.wikidata.org/wiki/Q19573',
  },
  {
    slug: 'cricket-ipl',
    name: 'Indian Premier League Cricket',
    shortDescription:
      "The world's richest cricket league and India's most-watched sporting event, combining cricket with entertainment spectacle.",
    longDescription:
      'The Indian Premier League is a professional Twenty20 cricket league that reshaped the sport after launching in 2008. Featuring franchise teams from Indian cities, the IPL attracts the world\'s best cricketers and draws huge viewership. The tournament runs for roughly two months from March to May, with matches nearly every day during the season.',
    category: 'cricket',
    season: 'March - May',
    regionalPricing: [
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly', notes: 'JioStar/JioCinema; some matches free' },
      { countryIso: 'US', platform: 'paramount-plus', price: 13.99, currency: 'USD', period: 'monthly', notes: 'Willow TV via Paramount+' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly', notes: 'Sky Sports Cricket' },
      { countryIso: 'AU', platform: 'dazn', price: 14.99, currency: 'AUD', period: 'monthly', notes: 'Fox Cricket / Kayo' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly', notes: 'Willow TV' },
      { countryIso: 'AE', platform: 'dazn', price: 49, currency: 'AED', period: 'monthly', notes: 'Large South Asian diaspora market' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'CA', price: 24.99, currency: 'CAD', platform: 'dazn' },
    globalPlatforms: ['dazn', 'paramount-plus'],
    faqs: [
      {
        question: 'Can I watch IPL for free?',
        answer:
          'In India, select IPL matches have been available for free on JioCinema. The availability of free matches varies each season depending on broadcasting agreements.',
      },
      {
        question: 'Where can I watch IPL in the US?',
        answer:
          'In the US, IPL is available through Willow TV, which can be accessed via Paramount+ or as a standalone subscription. ESPN+ may also carry select matches.',
      },
      {
        question: 'What time do IPL matches start?',
        answer:
          'IPL matches typically start at 7:30 PM IST (2:00 PM GMT, 10:00 AM ET). Weekend matches sometimes have afternoon starts at 3:30 PM IST. For viewers in the Americas, this means morning or early afternoon viewing.',
      },
      {
        question: 'Is IPL the most-watched cricket league?',
        answer:
          'Yes, the IPL is the most-watched and most valuable cricket league in the world. The 2024 media rights deal was worth $6.2 billion for a five-year cycle, exceeding many football league deals.',
      },
    ],
    relatedSports: ['tennis-grand-slams', 'olympics'],
    keyEvents: ['IPL Auction', 'Opening Match', 'Playoffs', 'IPL Final', 'El Clasico Rivalries'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Indian_Premier_League',
    wikidataId: 'https://www.wikidata.org/wiki/Q428756',
  },
  {
    slug: 'tennis-grand-slams',
    name: 'Tennis Grand Slams',
    shortDescription:
      'The four major tennis tournaments: Australian Open, French Open, Wimbledon, and US Open, each broadcast by different platforms.',
    longDescription:
      'The four Grand Slam tournaments are the biggest events in professional tennis. Each tournament has its own surface, tradition, and broadcast setup, meaning fans need to navigate different platforms throughout the year. With matches lasting anywhere from one to five hours, Grand Slams often produce some of the most dramatic moments in live sport.',
    category: 'tennis',
    season: 'January - September',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 11.99, currency: 'USD', period: 'monthly', notes: 'Australian Open, Wimbledon on ESPN+; US Open too' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 6.99, currency: 'GBP', period: 'monthly', notes: 'Wimbledon free on BBC; others on various platforms' },
      { countryIso: 'AU', platform: 'dazn', price: 27.99, currency: 'AUD', period: 'monthly', notes: 'Channel 9 free for Australian Open' },
      { countryIso: 'FR', platform: 'amazon-prime-video', price: 6.99, currency: 'EUR', period: 'monthly', notes: 'French Open on France TV (free) and Amazon' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
      { countryIso: 'DE', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly', notes: 'Eurosport via Discovery+' },
    ],
    cheapestOption: { countryIso: 'GB', price: 0, currency: 'GBP', platform: 'discovery-plus' },
    mostExpensiveOption: { countryIso: 'AU', price: 27.99, currency: 'AUD', platform: 'dazn' },
    globalPlatforms: ['espn-plus', 'discovery-plus', 'amazon-prime-video', 'dazn'],
    faqs: [
      {
        question: 'Can I watch Wimbledon for free?',
        answer:
          'Yes, in the UK, Wimbledon is broadcast free on BBC iPlayer and BBC TV for viewers who meet UK viewing requirements. Outside the UK, use the official local broadcaster for your country.',
      },
      {
        question: 'Do I need different subscriptions for each Grand Slam?',
        answer:
          'Unfortunately, yes in many countries. Grand Slam rights are sold separately, so different platforms may carry different tournaments. In the US, ESPN+ covers most Grand Slams, simplifying access.',
      },
      {
        question: 'Is the French Open free to watch?',
        answer:
          'In France, the French Open is partially free on France TV. Amazon Prime Video also holds rights to select courts. Outside France, rights vary by country and platform.',
      },
    ],
    relatedSports: ['olympics', 'cricket-ipl'],
    keyEvents: ['Australian Open', 'French Open', 'Wimbledon', 'US Open', 'Davis Cup Finals'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Tennis',
    wikidataId: 'https://www.wikidata.org/wiki/Q847',
  },
  {
    slug: 'mls',
    name: 'Major League Soccer',
    shortDescription:
      "North America's professional football league, growing quickly with star signings and an exclusive streaming deal with Apple TV+.",
    longDescription:
      'Major League Soccer is the top professional soccer league in the United States and Canada. The league has grown quickly with high-profile signings and a deal with Apple TV+ that makes every match available worldwide through a single streaming platform. This global arrangement eliminates regional blackouts and simplifies access for international fans.',
    category: 'football',
    season: 'February - November',
    regionalPricing: [
      { countryIso: 'US', platform: 'apple-tv-plus', price: 14.99, currency: 'USD', period: 'monthly', notes: 'MLS Season Pass on Apple TV+' },
      { countryIso: 'GB', platform: 'apple-tv-plus', price: 14.99, currency: 'GBP', period: 'monthly', notes: 'MLS Season Pass global' },
      { countryIso: 'CA', platform: 'apple-tv-plus', price: 17.99, currency: 'CAD', period: 'monthly', notes: 'MLS Season Pass' },
      { countryIso: 'MX', platform: 'apple-tv-plus', price: 149, currency: 'MXN', period: 'monthly' },
      { countryIso: 'BR', platform: 'apple-tv-plus', price: 49.90, currency: 'BRL', period: 'monthly' },
      { countryIso: 'DE', platform: 'apple-tv-plus', price: 14.99, currency: 'EUR', period: 'monthly' },
      { countryIso: 'AU', platform: 'apple-tv-plus', price: 14.99, currency: 'AUD', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'AU', price: 14.99, currency: 'AUD', platform: 'apple-tv-plus' },
    mostExpensiveOption: { countryIso: 'CA', price: 17.99, currency: 'CAD', platform: 'apple-tv-plus' },
    globalPlatforms: ['apple-tv-plus'],
    faqs: [
      {
        question: 'How does the MLS Apple TV+ deal work?',
        answer:
          'MLS Season Pass on Apple TV+ is a $14.99/month add-on (or $99/season) that provides access to every MLS match worldwide with no blackouts. Apple TV+ subscribers get a discounted rate, and some matches are free even without a subscription.',
      },
      {
        question: 'Are there any MLS blackouts on Apple TV+?',
        answer:
          'No. A key feature of the MLS-Apple TV+ deal is zero blackout restrictions, anywhere in the world. Every match is available live regardless of your location.',
      },
      {
        question: 'Can I watch MLS for free?',
        answer:
          'Apple TV+ offers a selection of free MLS matches each week without requiring a subscription. For full access to all matches, the MLS Season Pass subscription is required.',
      },
    ],
    relatedSports: ['premier-league', 'copa-libertadores', 'nba', 'nfl'],
    keyEvents: ['MLS Cup', 'MLS All-Star Game', 'Leagues Cup', 'MLS Playoffs', 'Expansion Drafts'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Major_League_Soccer',
    wikidataId: 'https://www.wikidata.org/wiki/Q14764',
  },
  {
    slug: 'rugby-world-cup',
    name: 'Rugby World Cup',
    shortDescription:
      'The biggest event in international rugby union, held every four years with large viewership across the southern hemisphere and Europe.',
    longDescription:
      'The Rugby World Cup is the main event of World Rugby and one of the largest sporting events globally. Held every four years, it features national teams from across the world competing over several weeks. The tournament draws huge interest in traditional rugby nations like New Zealand, South Africa, England, and France. Between World Cups, the Six Nations and Rugby Championship keep fans engaged year-round.',
    category: 'rugby',
    season: 'September - November (World Cup years); Six Nations: February - March',
    regionalPricing: [
      { countryIso: 'US', platform: 'peacock', price: 13.99, currency: 'USD', period: 'monthly', notes: 'NBC holds US rugby rights' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 6.99, currency: 'GBP', period: 'monthly', notes: 'ITV free for World Cup; TNT for Premiership' },
      { countryIso: 'AU', platform: 'dazn', price: 27.99, currency: 'AUD', period: 'monthly', notes: 'Stan Sport for Wallabies; free-to-air for World Cup' },
      { countryIso: 'NZ', platform: 'dazn', price: 24.99, currency: 'NZD', period: 'monthly', notes: 'Sky Sport NZ' },
      { countryIso: 'ZA', platform: 'dazn', price: 449, currency: 'ZAR', period: 'monthly', notes: 'SuperSport via DStv' },
      { countryIso: 'FR', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly', notes: 'France TV free for national team matches' },
    ],
    cheapestOption: { countryIso: 'GB', price: 0, currency: 'GBP', platform: 'discovery-plus' },
    mostExpensiveOption: { countryIso: 'ZA', price: 449, currency: 'ZAR', platform: 'dazn' },
    globalPlatforms: ['peacock', 'discovery-plus', 'dazn'],
    faqs: [
      {
        question: 'Can I watch the Rugby World Cup for free?',
        answer:
          'Some countries carry Rugby World Cup matches free-to-air, such as the UK through ITV for past tournaments and France through France TV for major matches. Check the official tournament broadcast list for your country.',
      },
      {
        question: 'Where can I watch the Six Nations?',
        answer:
          'The Six Nations is free-to-air in the UK (BBC and ITV share coverage) and France (France TV). In the US, Peacock and NBC carry Six Nations matches.',
      },
      {
        question: 'When is the next Rugby World Cup?',
        answer:
          'The Rugby World Cup is held every four years. After the 2023 tournament in France, the next edition is scheduled for Australia in 2027.',
      },
    ],
    relatedSports: ['nfl', 'olympics', 'premier-league'],
    keyEvents: ['Rugby World Cup Final', 'Six Nations Grand Slam', 'Rugby Championship', 'British & Irish Lions Tour', 'Autumn Internationals'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Rugby_World_Cup',
    wikidataId: 'https://www.wikidata.org/wiki/Q192292',
  },
  {
    slug: 'europa-league',
    name: 'UEFA Europa League',
    shortDescription:
      "Europe's second-tier club competition featuring strong teams from across the continent, often with more accessible streaming prices.",
    longDescription:
      'The UEFA Europa League is European club football\'s second-tier competition, behind the Champions League. It features teams that narrowly missed Champions League qualification along with those dropping down from the Champions League group stage. The tournament runs from September to May and is often available on the same platforms as the Champions League at no additional cost.',
    category: 'football',
    season: 'September - May',
    regionalPricing: [
      { countryIso: 'US', platform: 'paramount-plus', price: 7.99, currency: 'USD', period: 'monthly' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 30.99, currency: 'GBP', period: 'monthly', notes: 'TNT Sports via Discovery+' },
      { countryIso: 'DE', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly', notes: 'RTL+ also carries matches' },
      { countryIso: 'ES', platform: 'dazn', price: 18.99, currency: 'EUR', period: 'monthly', notes: 'Movistar+' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
      { countryIso: 'AU', platform: 'paramount-plus', price: 13.99, currency: 'AUD', period: 'monthly', notes: 'Stan Sport' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'GB', price: 30.99, currency: 'GBP', platform: 'discovery-plus' },
    globalPlatforms: ['paramount-plus', 'dazn', 'discovery-plus'],
    faqs: [
      {
        question: 'Is the Europa League included with Champions League subscriptions?',
        answer:
          'In most countries, yes. Platforms that carry the Champions League typically also include the Europa League and Conference League at no extra cost.',
      },
      {
        question: 'Where can I watch the Europa League in the US?',
        answer:
          'Paramount+ carries the Europa League in the US. The Essential plan at $7.99/month includes access alongside Serie A, Champions League, and other football content.',
      },
      {
        question: 'Is the Europa League worth watching?',
        answer:
          'The Europa League features solid competition with teams from both major and smaller leagues. It has produced memorable matches and gives clubs a pathway to qualify for the Champions League.',
      },
    ],
    relatedSports: ['champions-league', 'premier-league', 'la-liga', 'serie-a', 'bundesliga'],
    keyEvents: ['Group Stage', 'Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Europa League Final'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/UEFA_Europa_League',
    wikidataId: 'https://www.wikidata.org/wiki/Q19317',
  },
  {
    slug: 'copa-libertadores',
    name: 'Copa Libertadores',
    shortDescription:
      "South America's top club football tournament, featuring intense rivalries and some of the most atmospheric matches in world football.",
    longDescription:
      "The Copa Libertadores is the top club football competition in South America, similar to Europe's Champions League. Known for its intense atmosphere, passionate fans, and fiercely competitive matches, the tournament features the best clubs from across the continent. It runs from February to November, with the final being one of the most watched events in Latin American sports.",
    category: 'football',
    season: 'February - November',
    regionalPricing: [
      { countryIso: 'BR', platform: 'paramount-plus', price: 19.90, currency: 'BRL', period: 'monthly', notes: 'Paramount+ Brasil' },
      { countryIso: 'AR', platform: 'espn-plus', price: 4999, currency: 'ARS', period: 'monthly', notes: 'ESPN via Star+' },
      { countryIso: 'US', platform: 'paramount-plus', price: 7.99, currency: 'USD', period: 'monthly', notes: 'beIN Sports also available' },
      { countryIso: 'MX', platform: 'espn-plus', price: 249, currency: 'MXN', period: 'monthly' },
      { countryIso: 'CO', platform: 'espn-plus', price: 29900, currency: 'COP', period: 'monthly' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'BR', price: 19.90, currency: 'BRL', platform: 'paramount-plus' },
    mostExpensiveOption: { countryIso: 'GB', price: 9.99, currency: 'GBP', platform: 'dazn' },
    globalPlatforms: ['paramount-plus', 'espn-plus', 'dazn'],
    faqs: [
      {
        question: 'Where can I watch the Copa Libertadores outside South America?',
        answer:
          'In the US, the Copa Libertadores is available on Paramount+ and beIN Sports. In Europe, coverage varies by country with platforms like DAZN carrying matches in select markets.',
      },
      {
        question: 'Is Copa Libertadores on Paramount+?',
        answer:
          'Yes, Paramount+ carries Copa Libertadores in several countries including Brazil and the US, making it one of the most accessible platforms for South American club football.',
      },
      {
        question: 'What makes the Copa Libertadores special?',
        answer:
          'The Copa Libertadores is known for its electric atmospheres, with South American fans creating some of the most intense stadium environments in world football. The tournament also regularly produces upsets and memorable matches.',
      },
    ],
    relatedSports: ['mls', 'premier-league', 'champions-league', 'la-liga'],
    keyEvents: ['Group Stage Draw', 'Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Copa Libertadores Final'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Copa_Libertadores',
    wikidataId: 'https://www.wikidata.org/wiki/Q185062',
  },
  {
    slug: 'pga-tour',
    name: 'PGA Tour Golf',
    shortDescription:
      "The main professional golf tour, featuring the world's best players competing in weekly tournaments and four major championships.",
    longDescription:
      "The PGA Tour is the primary organizing body for professional golf tours in the United States and North America. The world's top golfers compete in weekly events from January through August, plus the four major championships and the FedExCup Playoffs. Golf's broadcast schedule works well for streaming, with tournaments spanning four days.",
    category: 'other',
    season: 'January - August (FedExCup); Majors year-round',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 11.99, currency: 'USD', period: 'monthly', notes: 'ESPN+ for early rounds; CBS/NBC for weekend coverage' },
      { countryIso: 'GB', platform: 'dazn', price: 34.99, currency: 'GBP', period: 'monthly', notes: 'Sky Sports Golf' },
      { countryIso: 'AU', platform: 'dazn', price: 27.99, currency: 'AUD', period: 'monthly', notes: 'Fox Sports / Kayo' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly', notes: 'TSN' },
      { countryIso: 'JP', platform: 'dazn', price: 3700, currency: 'JPY', period: 'monthly' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'GB', price: 34.99, currency: 'GBP', platform: 'dazn' },
    globalPlatforms: ['espn-plus', 'dazn', 'peacock', 'paramount-plus'],
    faqs: [
      {
        question: 'Where can I watch the Masters for free?',
        answer:
          'The Masters offers free streaming through its official website and app, including featured groups and Amen Corner coverage. Full broadcast coverage is on ESPN+ (early rounds) and CBS (weekend rounds) in the US.',
      },
      {
        question: 'What platforms show PGA Tour golf in the US?',
        answer:
          'PGA Tour coverage in the US is split between ESPN+ (early round coverage), CBS, and NBC (weekend featured coverage). The Golf Channel also provides extensive PGA Tour programming.',
      },
      {
        question: 'Is golf streaming expensive?',
        answer:
          'Golf streaming costs vary widely by country. Basic PGA Tour coverage is included with ESPN+ in the US, while Sky Sports Golf is a major UK destination. Check the PGA Tour and local broadcaster listings for current legal options.',
      },
    ],
    relatedSports: ['tennis-grand-slams', 'formula-1', 'olympics'],
    keyEvents: ['The Masters', 'US Open', 'The Open Championship', 'PGA Championship', 'Ryder Cup'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/PGA_Tour',
    wikidataId: 'https://www.wikidata.org/wiki/Q910409',
  },
  {
    slug: 'eredivisie',
    name: 'Dutch Eredivisie',
    shortDescription:
      "The top division of Dutch football, a well-known talent factory that has produced some of the game's best players and tactical ideas.",
    longDescription:
      'The Eredivisie is the top professional football league in the Netherlands, known globally for developing top-level talent. Clubs like Ajax, PSV Eindhoven, and Feyenoord have strong European track records and continue to develop players who move to the world\'s biggest leagues. The league runs from August to May and plays an attacking style of football.',
    category: 'football',
    season: 'August - May',
    regionalPricing: [
      { countryIso: 'NL', platform: 'espn-plus', price: 16.99, currency: 'EUR', period: 'monthly', notes: 'ESPN Netherlands' },
      { countryIso: 'US', platform: 'espn-plus', price: 11.99, currency: 'USD', period: 'monthly' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly' },
      { countryIso: 'DE', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly' },
      { countryIso: 'BE', platform: 'dazn', price: 14.99, currency: 'EUR', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'GB', price: 9.99, currency: 'GBP', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'NL', price: 16.99, currency: 'EUR', platform: 'espn-plus' },
    globalPlatforms: ['espn-plus', 'dazn'],
    faqs: [
      {
        question: 'Where can I watch the Eredivisie in the US?',
        answer:
          'ESPN+ carries the Eredivisie in the US for $11.99/month, along with La Liga, Bundesliga, and other international football leagues.',
      },
      {
        question: 'Why is the Eredivisie worth watching?',
        answer:
          'The Eredivisie is famous for its attacking football philosophy and as a talent development league. Many world-class players including Cruyff, Van Basten, Bergkamp, and more recently De Jong and De Ligt developed in the Eredivisie.',
      },
      {
        question: 'Is the Eredivisie competitive?',
        answer:
          "While Ajax, PSV, and Feyenoord traditionally dominate, the Eredivisie regularly produces surprises and competitive matches. The league's open, attacking style leads to high-scoring, entertaining games.",
      },
    ],
    relatedSports: ['premier-league', 'champions-league', 'bundesliga', 'europa-league', 'ligue-1'],
    keyEvents: ['De Klassieker', 'De Topper', 'Eredivisie Title Race', 'Promotion/Relegation Playoff', 'KNVB Cup Final'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Eredivisie',
    wikidataId: 'https://www.wikidata.org/wiki/Q15108',
  },
  {
    slug: 'a-league',
    name: 'Australian A-League',
    shortDescription:
      "Australia's professional football league featuring clubs from Australia and New Zealand, growing steadily with increased investment.",
    longDescription:
      'The A-League is the top professional men\'s association football league in Australia and includes a team from New Zealand. Founded in 2004, the league has grown steadily and attracted notable international players. Running from October to May to avoid the Australian summer, the A-League provides accessible football for the Asia-Pacific region and has a dedicated following.',
    category: 'football',
    season: 'October - May',
    regionalPricing: [
      { countryIso: 'AU', platform: 'paramount-plus', price: 13.99, currency: 'AUD', period: 'monthly', notes: 'All matches on Paramount+ Australia' },
      { countryIso: 'NZ', platform: 'paramount-plus', price: 13.99, currency: 'NZD', period: 'monthly' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly' },
      { countryIso: 'US', platform: 'paramount-plus', price: 7.99, currency: 'USD', period: 'monthly' },
      { countryIso: 'IN', platform: 'dazn', price: 349, currency: 'INR', period: 'monthly' },
    ],
    cheapestOption: { countryIso: 'IN', price: 349, currency: 'INR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'AU', price: 13.99, currency: 'AUD', platform: 'paramount-plus' },
    globalPlatforms: ['paramount-plus', 'dazn'],
    faqs: [
      {
        question: 'Where can I watch the A-League in Australia?',
        answer:
          'Paramount+ holds exclusive A-League broadcasting rights in Australia at $13.99 AUD/month. Select matches may also appear on free-to-air Network 10.',
      },
      {
        question: 'Is the A-League available internationally?',
        answer:
          'Yes, the A-League is available in multiple international markets through platforms like DAZN and Paramount+. Coverage has expanded as the league grows in stature.',
      },
      {
        question: 'What are the biggest A-League clubs?',
        answer:
          'Sydney FC, Melbourne Victory, and Western Sydney Wanderers are traditionally the most popular clubs. Auckland FC joined as the newest expansion team, representing New Zealand.',
      },
    ],
    relatedSports: ['premier-league', 'mls', 'eredivisie', 'cricket-ipl'],
    keyEvents: ['A-League Grand Final', 'Sydney Derby', 'Melbourne Derby', 'FFA Cup', 'Season Opener'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/A-League_Men',
    wikidataId: 'https://www.wikidata.org/wiki/Q264820',
  },
  {
    slug: 'olympics',
    name: 'Olympic Games',
    shortDescription:
      "The world's largest multi-sport event, held every two years alternating between summer and winter editions, with complex broadcasting agreements.",
    longDescription:
      'The Olympic Games are the biggest international sporting competition, bringing together athletes from over 200 nations across dozens of sports. With the Summer and Winter Olympics alternating every two years, the Games draw large global audiences. Broadcasting rights are sold by country, creating real variation in coverage quality and cost. Many nations offer free-to-air coverage, while others require paid subscriptions for full access.',
    category: 'other',
    season: 'July - August (Summer); February (Winter); every 4 years each',
    regionalPricing: [
      { countryIso: 'US', platform: 'peacock', price: 13.99, currency: 'USD', period: 'monthly', notes: 'NBC/Peacock full coverage' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 6.99, currency: 'GBP', period: 'monthly', notes: 'Discovery+; BBC free for highlights and select events' },
      { countryIso: 'AU', platform: 'dazn', price: 0, currency: 'AUD', period: 'monthly', notes: 'Channel 9 free-to-air' },
      { countryIso: 'CA', platform: 'dazn', price: 0, currency: 'CAD', period: 'monthly', notes: 'CBC free-to-air' },
      { countryIso: 'DE', platform: 'discovery-plus', price: 5.99, currency: 'EUR', period: 'monthly', notes: 'ARD/ZDF free; Discovery+ for extra streams' },
      { countryIso: 'FR', platform: 'dazn', price: 0, currency: 'EUR', period: 'monthly', notes: 'France TV free-to-air' },
      { countryIso: 'JP', platform: 'dazn', price: 0, currency: 'JPY', period: 'monthly', notes: 'NHK and other networks free' },
      { countryIso: 'BR', platform: 'dazn', price: 0, currency: 'BRL', period: 'monthly', notes: 'Globo free-to-air' },
    ],
    cheapestOption: { countryIso: 'AU', price: 0, currency: 'AUD', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'US', price: 13.99, currency: 'USD', platform: 'peacock' },
    globalPlatforms: ['peacock', 'discovery-plus', 'dazn'],
    faqs: [
      {
        question: 'Can I watch the Olympics for free?',
        answer:
          'Many countries offer free-to-air Olympic coverage, including public or commercial broadcasters in Australia, Canada, France, Germany, Japan, and Brazil. Check your national rights holder for current free and paid options.',
      },
      {
        question: 'Where can I watch the Olympics in the US?',
        answer:
          'NBC holds exclusive US Olympic broadcasting rights. Peacock provides the widest streaming coverage at $13.99/month, while NBC, USA Network, and other NBC Universal channels carry select events on cable.',
      },
      {
        question: 'When are the next Olympic Games?',
        answer:
          'The 2026 Winter Olympics will be held in Milan-Cortina, Italy. The 2028 Summer Olympics will be held in Los Angeles, USA. The 2032 Summer Olympics are awarded to Brisbane, Australia.',
      },
      {
        question: 'Why do I need Discovery+ for the Olympics in Europe?',
        answer:
          'Discovery/Eurosport holds pan-European Olympic broadcasting rights. While many European countries still have free-to-air coverage through public broadcasters, Discovery+ provides the widest multi-stream coverage across all sports simultaneously.',
      },
      {
        question: 'How many sports are in the Summer Olympics?',
        answer:
          'The Summer Olympics features over 30 sports and 300+ events, from athletics and swimming to newer additions like breaking, skateboarding, and sport climbing. With so many events happening at once, streaming is the only practical way to follow everything.',
      },
    ],
    relatedSports: ['tennis-grand-slams', 'formula-1', 'rugby-world-cup', 'cricket-ipl'],
    keyEvents: ['Opening Ceremony', '100m Final', 'Marathon', 'Closing Ceremony', 'Gold Medal Events'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Olympic_Games',
    wikidataId: 'https://www.wikidata.org/wiki/Q5389',
  },
  {
    slug: 'wimbledon',
    name: 'Wimbledon',
    shortDescription:
      'The oldest Grand Slam tennis tournament, played on grass at the All England Club in London since 1877.',
    longDescription:
      "Wimbledon is the most storied tournament in tennis, held annually at the All England Lawn Tennis and Croquet Club since 1877. The tournament draws the world's top players across five disciplines: Gentlemen's Singles, Ladies' Singles, Gentlemen's Doubles, Ladies' Doubles, and Mixed Doubles. Unlike other Grand Slams, Wimbledon restricts player clothing to predominantly white and maintains strict traditions. Streaming access varies by region: UK fans get free BBC and ITV coverage while international viewers pay subscription fees.",
    category: 'tennis',
    season: 'June - July',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 10.99, currency: 'USD', period: 'monthly', notes: 'ESPN+ covers all courts and matches' },
      { countryIso: 'GB', platform: 'bbc-iplayer', price: 0, currency: 'GBP', period: 'monthly', notes: 'BBC and ITV share free coverage; all matches on BBC iPlayer and ITVX' },
      { countryIso: 'AU', platform: 'stan-sport', price: 10, currency: 'AUD', period: 'monthly', notes: 'Stan Sport add-on required' },
      { countryIso: 'DE', platform: 'eurosport', price: 7.99, currency: 'EUR', period: 'monthly', notes: 'Eurosport Player' },
      { countryIso: 'CA', platform: 'tsn', price: 19.99, currency: 'CAD', period: 'monthly', notes: 'TSN Direct streaming' },
    ],
    cheapestOption: { countryIso: 'GB', price: 0, currency: 'GBP', platform: 'bbc-iplayer' },
    mostExpensiveOption: { countryIso: 'CA', price: 19.99, currency: 'CAD', platform: 'tsn' },
    globalPlatforms: ['espn-plus', 'bbc-iplayer'],
    faqs: [
      {
        question: 'How can I watch Wimbledon for free?',
        answer:
          'UK residents can watch Wimbledon entirely for free via BBC iPlayer and ITVX, which share coverage of all courts. Outside the UK, free options are limited - AU fans with Stan Sport get the best-value paid access at around $10 AUD/month.',
      },
      {
        question: 'What channel shows Wimbledon in the United States?',
        answer:
          'ESPN and ESPN2 share Wimbledon rights in the US. ESPN+ provides live streaming of all courts simultaneously for $10.99/month, covering every match.',
      },
      {
        question: 'When is Wimbledon 2025?',
        answer:
          "Wimbledon is held annually in late June and early July over a two-week period. The tournament typically begins in the last week of June and concludes in mid-July with the Men's and Women's Singles Finals.",
      },
    ],
    relatedSports: ['roland-garros', 'tennis-grand-slams', 'formula-1'],
    keyEvents: ["Gentlemen's Singles Final", "Ladies' Singles Final", 'Mixed Doubles', 'Centre Court Opening Day'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Wimbledon_Championships',
    wikidataId: 'https://www.wikidata.org/wiki/Q60874',
  },
  {
    slug: 'roland-garros',
    name: 'Roland Garros (French Open)',
    shortDescription:
      'The only clay-court Grand Slam, held in Paris. A test of endurance and technique unlike the other three majors.',
    longDescription:
      "Roland Garros, the French Open, is the second Grand Slam of the tennis calendar and the only one played on clay. Held at the Stade Roland Garros in Paris, the slow clay surface rewards baseline play and produces marathon matches unlike any other tournament. Rafael Nadal won 14 titles here, one of the most dominant records in any sport. Streaming rights vary widely: France has free coverage while US fans access it via Peacock.",
    category: 'tennis',
    season: 'May - June',
    regionalPricing: [
      { countryIso: 'US', platform: 'peacock', price: 7.99, currency: 'USD', period: 'monthly', notes: 'NBC Sports/Peacock Premium' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 6.99, currency: 'GBP', period: 'monthly', notes: 'Eurosport via Discovery+' },
      { countryIso: 'FR', platform: 'france-tv', price: 0, currency: 'EUR', period: 'monthly', notes: 'France Télévisions broadcasts free; additional coverage on Roland-Garros TV' },
      { countryIso: 'AU', platform: 'stan-sport', price: 10, currency: 'AUD', period: 'monthly', notes: 'Stan Sport add-on' },
    ],
    cheapestOption: { countryIso: 'FR', price: 0, currency: 'EUR', platform: 'france-tv' },
    mostExpensiveOption: { countryIso: 'US', price: 7.99, currency: 'USD', platform: 'peacock' },
    globalPlatforms: ['peacock', 'discovery-plus', 'espn-plus'],
    faqs: [
      {
        question: 'Where can I watch Roland Garros in the US?',
        answer:
          'NBC holds US broadcasting rights for Roland Garros. Live matches are available on NBC Sports and streamed via Peacock Premium ($7.99/month). ESPN+ also streams selected matches.',
      },
      {
        question: 'Is the French Open available for free anywhere?',
        answer:
          'French residents can watch Roland Garros free on France Télévisions channels (France 2 and France 3), which broadcast extensive daily coverage. UK viewers need Discovery+ or Eurosport for full access.',
      },
      {
        question: 'What makes clay court tennis different?',
        answer:
          'Clay courts slow the ball and produce higher bounces compared to grass or hard courts. This rewards endurance, consistent baseline play, and heavy topspin, making Roland Garros the most physically demanding Grand Slam.',
      },
    ],
    relatedSports: ['wimbledon', 'tennis-grand-slams'],
    keyEvents: ["Men's Singles Final", "Women's Singles Final", 'Mixed Doubles Final', 'Night Sessions'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/French_Open',
    wikidataId: 'https://www.wikidata.org/wiki/Q13535',
  },
  {
    slug: 'the-masters',
    name: 'The Masters',
    shortDescription:
      "Golf's most exclusive major, held annually at Augusta National. The first Major of the year and the most recognizable.",
    longDescription:
      "The Masters Tournament is the first Major championship of the golf calendar and the only one held at the same venue each year, Augusta National Golf Club in Georgia. Known for its azalea-lined fairways, Amen Corner, and the green jacket awarded to the champion, The Masters attracts the sport's best players for four rounds of stroke play each April. Streaming rights have expanded in recent years, with ESPN+ and Masters.com offering multi-course coverage in the US.",
    category: 'other',
    season: 'April',
    regionalPricing: [
      { countryIso: 'US', platform: 'espn-plus', price: 10.99, currency: 'USD', period: 'monthly', notes: 'ESPN+ for Featured Group and Amen Corner coverage; final rounds on CBS free' },
      { countryIso: 'GB', platform: 'sky-sports', price: 54.99, currency: 'GBP', period: 'monthly', notes: 'Sky Sports Golf full coverage' },
      { countryIso: 'AU', platform: 'kayo-sports', price: 25, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports carries all rounds' },
      { countryIso: 'CA', platform: 'tsn', price: 19.99, currency: 'CAD', period: 'monthly', notes: 'TSN Direct streaming' },
    ],
    cheapestOption: { countryIso: 'US', price: 0, currency: 'USD', platform: 'masters-com' },
    mostExpensiveOption: { countryIso: 'GB', price: 54.99, currency: 'GBP', platform: 'sky-sports' },
    globalPlatforms: ['espn-plus', 'discovery-plus'],
    faqs: [
      {
        question: 'Can I watch The Masters for free?',
        answer:
          "Yes. Masters.com streams free Featured Group coverage throughout the week, and the final two rounds air on CBS in the US for free over-the-air. ESPN+ provides additional coverage of Amen Corner and Featured Groups for $10.99/month.",
      },
      {
        question: 'What is The Masters green jacket?',
        answer:
          "The green jacket is awarded to each Masters champion as a symbol of membership at Augusta National. Champions wear it during the following year's tournament and may take it home indefinitely. It is one of the most recognizable prizes in sport.",
      },
      {
        question: 'Where is The Masters played?',
        answer:
          "The Masters is always held at Augusta National Golf Club in Augusta, Georgia, USA. It is the only Major played at the same course every year. The course is known for its beauty, difficulty, and holes like Amen Corner (holes 11-13).",
      },
    ],
    relatedSports: ['pga-tour', 'formula-1', 'wimbledon'],
    keyEvents: ['Final Round Sunday', 'Par 3 Contest', 'Masters Champions Dinner', 'Amen Corner Coverage'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Masters_Tournament',
    wikidataId: 'https://www.wikidata.org/wiki/Q173279',
  },
  {
    slug: 'march-madness',
    name: 'March Madness (NCAA Basketball)',
    shortDescription:
      "The 68-team NCAA college basketball tournament and one of America's most-watched sporting events.",
    longDescription:
      'March Madness, formally the NCAA Division I Men\'s Basketball Tournament, is a single-elimination bracket competition involving 68 college basketball teams played across three weeks each March and April. Known for upsets, buzzer-beaters, and bracket-busting moments, March Madness gets huge cultural attention in the United States. Coverage spans CBS, TBS, TNT, and TruTV. International fans should check official international broadcasters, highlights, league apps, and local TV packages because VPN or Smart DNS use can conflict with service terms and may be blocked.',
    category: 'basketball',
    season: 'March - April',
    regionalPricing: [
      { countryIso: 'US', platform: 'paramount-plus', price: 5.99, currency: 'USD', period: 'monthly', notes: 'Paramount+ Essential covers CBS; upgrade for TBS/TNT/TruTV games' },
    ],
    cheapestOption: { countryIso: 'US', price: 5.99, currency: 'USD', platform: 'paramount-plus' },
    mostExpensiveOption: { countryIso: 'US', price: 5.99, currency: 'USD', platform: 'paramount-plus' },
    globalPlatforms: ['paramount-plus', 'peacock'],
    faqs: [
      {
        question: 'Where can I stream March Madness?',
        answer:
          'In the US, March Madness is broadcast across CBS, TBS, TNT, and TruTV. Paramount+ covers CBS games. The March Madness Live app (free with TV provider login) is the most convenient way to watch all games simultaneously.',
      },
      {
        question: 'Can I watch March Madness outside the US?',
        answer:
          'Official March Madness streaming options vary by country. International viewers should check NCAA guidance, local broadcasters, highlights, league apps, and TV packages; VPN or Smart DNS use can conflict with service terms and may be blocked.',
      },
      {
        question: 'How does the March Madness bracket work?',
        answer:
          'The NCAA Tournament uses a 68-team single-elimination bracket starting with the First Four play-in games. The field reduces through the Round of 64, 32, Sweet 16, Elite Eight, Final Four, and the National Championship game.',
      },
    ],
    relatedSports: ['nba', 'premier-league'],
    keyEvents: ['First Four', 'Round of 64', 'Sweet Sixteen', 'Final Four', 'National Championship'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_basketball_tournament',
    wikidataId: 'https://www.wikidata.org/wiki/Q284084',
  },
  {
    slug: 'afl',
    name: 'AFL (Australian Football League)',
    shortDescription:
      "Australia's top Australian rules football competition, a high-scoring sport unique to the country.",
    longDescription:
      'The Australian Football League is Australia\'s most-attended domestic sporting competition, featuring 18 clubs competing across a 23-round home-and-away season followed by a finals series. Australian rules football combines elements of soccer, rugby, and Gaelic football on large oval grounds. Kayo Sports is the main streaming platform in Australia, while AFL Live Pass serves international fans. The AFL Grand Final is consistently Australia\'s most-watched annual television event.',
    category: 'other',
    season: 'March - September',
    regionalPricing: [
      { countryIso: 'AU', platform: 'kayo-sports', price: 25, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports carries every game live; some free-to-air on 7Network' },
      { countryIso: 'US', platform: 'afl-live-pass', price: 9.99, currency: 'USD', period: 'monthly', notes: 'AFL Live Pass International streaming' },
      { countryIso: 'GB', platform: 'afl-live-pass', price: 9.99, currency: 'USD', period: 'monthly', notes: 'AFL Live Pass International streaming' },
    ],
    cheapestOption: { countryIso: 'US', price: 9.99, currency: 'USD', platform: 'afl-live-pass' },
    mostExpensiveOption: { countryIso: 'AU', price: 25, currency: 'AUD', platform: 'kayo-sports' },
    globalPlatforms: ['kayo-sports'],
    faqs: [
      {
        question: 'How can I watch AFL outside Australia?',
        answer:
          'The AFL offers AFL Live Pass International, a dedicated streaming service for fans outside Australia priced at $9.99 USD/month. It carries all AFL games live and on-demand.',
      },
      {
        question: 'What is AFL?',
        answer:
          'AFL stands for Australian Football League. It governs Australian rules football, a fast-paced contact sport played on oval grounds with 18 players per side. Teams score by kicking the ball through goalposts - six points for a goal, one point for a behind.',
      },
      {
        question: 'When is the AFL Grand Final?',
        answer:
          "The AFL Grand Final is held on the last Saturday of September each year at the Melbourne Cricket Ground (MCG). It regularly draws over 100,000 spectators at the venue and is Australia's most-watched annual television event.",
      },
    ],
    relatedSports: ['rugby-world-cup', 'cricket-ipl', 'premier-league'],
    keyEvents: ['AFL Grand Final', 'Anzac Day Match', "King's Birthday Match", 'Finals Series'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Australian_Football_League',
    wikidataId: 'https://www.wikidata.org/wiki/Q264820',
  },
  {
    slug: 'tour-de-france',
    name: 'Tour de France',
    shortDescription:
      "The world's most famous cycling race, 21 stages across France watched by millions worldwide each July.",
    longDescription:
      'The Tour de France is the most famous bicycle race in the world, covering approximately 3,400 kilometres across 21 stages over three weeks each July. Riders compete for the yellow jersey (maillot jaune), with stages ranging from flat sprints to brutal Alpine climbs. The race attracts roughly 12 million roadside spectators and hundreds of millions of television viewers globally. Streaming access includes free coverage in France and Australia alongside paid options in the US and UK.',
    category: 'other',
    season: 'July',
    regionalPricing: [
      { countryIso: 'US', platform: 'peacock', price: 7.99, currency: 'USD', period: 'monthly', notes: 'NBC Sports/Peacock Premium covers all stages' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 6.99, currency: 'GBP', period: 'monthly', notes: 'Eurosport via Discovery+' },
      { countryIso: 'AU', platform: 'sbs-on-demand', price: 0, currency: 'AUD', period: 'monthly', notes: 'SBS broadcasts free-to-air with full stage coverage' },
      { countryIso: 'FR', platform: 'france-tv', price: 0, currency: 'EUR', period: 'monthly', notes: 'France 2 and France 3 carry free-to-air coverage' },
    ],
    cheapestOption: { countryIso: 'FR', price: 0, currency: 'EUR', platform: 'france-tv' },
    mostExpensiveOption: { countryIso: 'US', price: 7.99, currency: 'USD', platform: 'peacock' },
    globalPlatforms: ['discovery-plus', 'peacock', 'eurosport'],
    faqs: [
      {
        question: 'Where can I watch the Tour de France for free?',
        answer:
          'French residents can watch every stage free on France 2 and France 3. Australian fans can also watch free on SBS and SBS On Demand. US and UK fans need a paid subscription to Peacock or Discovery+ respectively.',
      },
      {
        question: 'How long does the Tour de France last?',
        answer:
          "The Tour de France takes place over approximately three weeks in July, covering 21 stages. The race begins with a Grand Départ (ceremonial opening) and concludes with a traditional stage finishing on the Champs-Élysées in Paris.",
      },
      {
        question: 'What is the yellow jersey?',
        answer:
          "The maillot jaune (yellow jersey) is worn by the overall race leader, the rider with the lowest cumulative time across all completed stages. Winning the yellow jersey in Paris is the top prize in professional cycling.",
      },
    ],
    relatedSports: ['formula-1', 'wimbledon'],
    keyEvents: ['Grand Départ', "Alpe d'Huez Stage", 'Pyrenees Mountain Stages', 'Champs-Élysées Final Stage'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Tour_de_France',
    wikidataId: 'https://www.wikidata.org/wiki/Q33881',
  },
  {
    slug: 'six-nations',
    name: 'Six Nations Rugby',
    shortDescription:
      'The annual northern hemisphere rugby union championship between England, Scotland, Wales, Ireland, France, and Italy.',
    longDescription:
      "The Six Nations Championship is the main annual rugby union competition in the northern hemisphere, contested between England, Scotland, Wales, Ireland, France, and Italy each February and March. Teams play each other once in a round-robin format, competing for the Six Nations trophy plus special prizes like the Grand Slam (winning all five matches), Triple Crown (home nations only), and the Calcutta Cup (England vs Scotland). Much of the Six Nations is broadcast free-to-air across the participating nations, making it one of the most accessible top-level competitions in sport.",
    category: 'rugby',
    season: 'February - March',
    regionalPricing: [
      { countryIso: 'GB', platform: 'bbc-iplayer', price: 0, currency: 'GBP', period: 'monthly', notes: 'BBC and ITV share free-to-air coverage of all England, Scotland, and Wales home matches' },
      { countryIso: 'IE', platform: 'rte', price: 0, currency: 'EUR', period: 'monthly', notes: 'RTE broadcasts Ireland matches free-to-air' },
      { countryIso: 'FR', platform: 'france-tv', price: 0, currency: 'EUR', period: 'monthly', notes: 'France 2/TF1 carry France matches free' },
      { countryIso: 'AU', platform: 'stan-sport', price: 19.99, currency: 'AUD', period: 'monthly', notes: 'Stan Sport add-on' },
      { countryIso: 'US', platform: 'peacock', price: 14.99, currency: 'USD', period: 'monthly', notes: 'Peacock Premium carries selected matches' },
    ],
    cheapestOption: { countryIso: 'GB', price: 0, currency: 'GBP', platform: 'bbc-iplayer' },
    mostExpensiveOption: { countryIso: 'AU', price: 19.99, currency: 'AUD', platform: 'stan-sport' },
    globalPlatforms: ['peacock', 'stan-sport'],
    faqs: [
      {
        question: 'Where can I watch Six Nations in the UK?',
        answer:
          'The Six Nations is shown free-to-air in the UK. England and Scotland home matches are on ITV and STV respectively; Wales home matches on S4C/ITV. Away fixtures for UK nations are shared across BBC and ITV.',
      },
      {
        question: 'What is the Grand Slam in Six Nations?',
        answer:
          'A Grand Slam is achieved when a team wins all five of its Six Nations matches, defeating each other nation. It is the most prestigious achievement in the tournament and relatively rare - only a handful of teams achieve it each decade.',
      },
      {
        question: 'Who has won the most Six Nations titles?',
        answer:
          'England and Wales have the most Six Nations (and Five Nations) titles historically. Ireland has been the dominant force in the modern era, winning multiple Grand Slams and back-to-back championships in recent years.',
      },
    ],
    relatedSports: ['rugby-world-cup', 'premier-league', 'champions-league'],
    keyEvents: ['England vs Ireland', 'France vs England', 'Calcutta Cup', 'Grand Slam Decider', 'Final Weekend'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Six_Nations_Championship',
    wikidataId: 'https://www.wikidata.org/wiki/Q130653',
  },
  {
    slug: 'copa-america',
    name: 'Copa América',
    shortDescription:
      "South America's top international football championship and the world's oldest international football tournament.",
    longDescription:
      "Copa America is the international football championship of South America, organized by CONMEBOL and involving all ten South American nations plus invited guest teams. Founded in 1916, it is the world's oldest international football tournament. The competition is held every four years, with recent editions including North American guest teams through CONCACAF. Brazil, Argentina, and Uruguay have dominated historically. The 2024 edition was held across the United States, which increased streaming demand.",
    category: 'football',
    season: 'Every 4 years (Summer)',
    regionalPricing: [
      { countryIso: 'US', platform: 'hbo-max', price: 9.99, currency: 'USD', period: 'monthly', notes: 'TNT Sports/Max carries matches; some on Turner cable channels' },
      { countryIso: 'BR', platform: 'globo', price: 0, currency: 'BRL', period: 'monthly', notes: 'Globo and SporTV broadcast free-to-air in Brazil' },
      { countryIso: 'AR', platform: 'tyc-sports', price: 0, currency: 'ARS', period: 'monthly', notes: 'TyC Sports and El Trece broadcast free in Argentina' },
      { countryIso: 'MX', platform: 'vix', price: 0, currency: 'MXN', period: 'monthly', notes: 'ViX offers free broadcast coverage in Mexico' },
    ],
    cheapestOption: { countryIso: 'BR', price: 0, currency: 'BRL', platform: 'globo' },
    mostExpensiveOption: { countryIso: 'US', price: 9.99, currency: 'USD', platform: 'hbo-max' },
    globalPlatforms: ['hbo-max', 'espn-plus'],
    faqs: [
      {
        question: 'How often is Copa América held?',
        answer:
          'Copa América has been held every four years since moving to a fixed cycle. Historically it was held more frequently; since 2016 the tournament follows a quadrennial schedule aligned with the FIFA World Cup cycle.',
      },
      {
        question: 'Where can I watch Copa América in the United States?',
        answer:
          'In the US, Copa América is broadcast on TNT, TBS, and Univision. Streaming is available via Max (HBO Max) and the free Spanish-language option ViX. The 2024 edition, hosted in the US, attracted record streaming numbers.',
      },
      {
        question: 'Who has won Copa América the most times?',
        answer:
          "Argentina holds the record for most Copa America titles with 16, after winning in 2021 and again in 2024. Uruguay is second with 15. Argentina has been the strongest team in South American football in recent years.",
      },
    ],
    relatedSports: ['champions-league', 'premier-league', 'la-liga'],
    keyEvents: ['Group Stage', 'Quarter-Finals', 'Semi-Finals', 'Final', 'Third Place Play-Off'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Copa_Am%C3%A9rica',
    wikidataId: 'https://www.wikidata.org/wiki/Q170198',
  },
  {
    slug: 'cricket-world-cup',
    name: 'Cricket World Cup',
    shortDescription:
      "The ICC Men's Cricket World Cup, the biggest event in international cricket, held every four years.",
    longDescription:
      'The ICC Men\'s Cricket World Cup is the top international cricket tournament, organized by the International Cricket Council (ICC) and held every four years. The 50-over format tournament features the world\'s top cricketing nations competing across group stages and knockout rounds over roughly six weeks. India leads in both playing standards and viewership, with the subcontinent driving most global cricket streaming consumption. India\'s JioHotstar offers the most affordable access while UK viewers face the steepest costs.',
    category: 'cricket',
    season: 'Every 4 years (Oct-Nov)',
    regionalPricing: [
      { countryIso: 'IN', platform: 'jiohotstar', price: 149, currency: 'INR', period: 'monthly', notes: 'JioHotstar (formerly Hotstar) streams all matches' },
      { countryIso: 'AU', platform: 'kayo-sports', price: 25, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports and Channel 9 share broadcast rights' },
      { countryIso: 'GB', platform: 'sky-sports', price: 54.99, currency: 'GBP', period: 'monthly', notes: 'Sky Sports Cricket; some matches on Channel 4' },
      { countryIso: 'US', platform: 'espn-plus', price: 9.99, currency: 'USD', period: 'monthly', notes: 'ESPN+ streams ICC events' },
    ],
    cheapestOption: { countryIso: 'IN', price: 149, currency: 'INR', platform: 'jiohotstar' },
    mostExpensiveOption: { countryIso: 'GB', price: 54.99, currency: 'GBP', platform: 'sky-sports' },
    globalPlatforms: ['espn-plus', 'jiohotstar', 'kayo-sports'],
    faqs: [
      {
        question: 'How can I watch the Cricket World Cup in India?',
        answer:
          'JioHotstar (formerly Disney+ Hotstar) holds ICC broadcasting rights in India. Subscription starts at 149 INR/month, making India one of the most affordable places to watch international cricket live.',
      },
      {
        question: 'Is the Cricket World Cup available in the US?',
        answer:
          'Yes. ESPN+ streams ICC events in the US, including the Cricket World Cup, for $9.99/month. Willow TV is another specialist option for cricket fans in North America.',
      },
      {
        question: 'Which country has won the Cricket World Cup the most?',
        answer:
          "Australia has won the 50-over Cricket World Cup six times, more than any other nation, including their 2023 victory in India. India and the West Indies have each won it twice. The 2023 final was one of the most-watched cricket events in streaming history.",
      },
    ],
    relatedSports: ['cricket-ipl', 'rugby-world-cup'],
    keyEvents: ['Opening Match', 'India vs Pakistan', 'Semi-Finals', 'Final', 'Super Over'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Cricket_World_Cup',
    wikidataId: 'https://www.wikidata.org/wiki/Q170207',
  },
  {
    slug: 'olympics-summer',
    name: 'Olympics (Summer)',
    shortDescription:
      "The Summer Olympic Games, the world's largest multi-sport event, held every four years across 30+ sports.",
    longDescription:
      'The Summer Olympic Games are the world\'s largest and most-watched sporting event, featuring over 10,000 athletes from 200+ nations competing across more than 30 sports and 300 events. Streaming has changed how people watch the Olympics, turning it from a broadcast event into an on-demand, multi-stream experience. In the US, NBC holds exclusive rights via Peacock, while most other developed nations offer free coverage through public broadcasters. The Paris 2024 Olympics drew record streaming numbers, with digital platforms becoming the main way viewers followed the Games.',
    category: 'other',
    season: 'Every 4 years (July-August)',
    regionalPricing: [
      { countryIso: 'US', platform: 'peacock', price: 7.99, currency: 'USD', period: 'monthly', notes: 'Peacock is the exclusive streaming home of the Olympics in the US via NBC Sports' },
      { countryIso: 'GB', platform: 'bbc-iplayer', price: 0, currency: 'GBP', period: 'monthly', notes: 'BBC provides free full Olympic coverage on iPlayer' },
      { countryIso: 'AU', platform: '9now', price: 0, currency: 'AUD', period: 'monthly', notes: 'Channel 9 and 9Now provide free coverage in Australia' },
      { countryIso: 'FR', platform: 'france-tv', price: 0, currency: 'EUR', period: 'monthly', notes: 'France Télévisions broadcasts free; France hosted 2024 Paris Olympics' },
      { countryIso: 'CA', platform: 'cbc-gem', price: 0, currency: 'CAD', period: 'monthly', notes: 'CBC/Radio-Canada and CBC Gem provide free coverage in Canada' },
    ],
    cheapestOption: { countryIso: 'GB', price: 0, currency: 'GBP', platform: 'bbc-iplayer' },
    mostExpensiveOption: { countryIso: 'US', price: 7.99, currency: 'USD', platform: 'peacock' },
    globalPlatforms: ['peacock', 'bbc-iplayer', 'cbc-gem'],
    faqs: [
      {
        question: 'Where can I watch the Summer Olympics in the US?',
        answer:
          'NBC holds exclusive US rights to the Summer Olympics. Coverage is split across NBC, USA Network, and CNBC on cable, while Peacock ($7.99/month) streams every event live with simultaneous streams and on-demand replays.',
      },
      {
        question: 'When are the next Summer Olympics?',
        answer:
          'The 2028 Summer Olympics will be held in Los Angeles, USA. The 2032 Summer Olympics are awarded to Brisbane, Australia. After Paris 2024, LA28 will be the next edition of the Games.',
      },
      {
        question: 'How many sports are in the Summer Olympics?',
        answer:
          'The Summer Olympics features over 30 core sports and 300+ events. Recent additions include breaking (breakdancing), skateboarding, sport climbing, and surfing. The host city can also propose additional sports for their edition.',
      },
    ],
    relatedSports: ['formula-1', 'wimbledon', 'six-nations', 'cricket-world-cup'],
    keyEvents: ['Opening Ceremony', '100m Sprint Final', 'Swimming Finals', 'Gymnastics All-Around', 'Marathon', 'Closing Ceremony'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Summer_Olympic_Games',
    wikidataId: 'https://www.wikidata.org/wiki/Q5389',
  },
  {
    slug: 'nrl',
    name: 'NRL National Rugby League',
    shortDescription:
      'Australia and New Zealand\'s premier rugby league competition, featuring 17 clubs across the Telstra Premiership season.',
    longDescription:
      'The NRL Telstra Premiership is the top tier of rugby league in the southern hemisphere, featuring 16 Australian clubs and one New Zealand club (New Zealand Warriors). The season runs from March to October, culminating in the NRL Grand Final held at Accor Stadium in Sydney. The competition draws massive audiences in Australia, New Zealand, and the Pacific Islands, with international fans relying on streaming services and VPNs to access live coverage. Fox League (via Foxtel/Kayo) holds comprehensive Australian rights, while Sky Sport NZ covers New Zealand.',
    category: 'rugby',
    season: 'March - October',
    regionalPricing: [
      { countryIso: 'AU', platform: 'kayo-sports', price: 25.99, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports streams all NRL matches live via Fox League rights' },
      { countryIso: 'NZ', platform: 'sky-go', price: 27.99, currency: 'NZD', period: 'monthly', notes: 'Sky Sport NZ holds NRL broadcast rights in New Zealand' },
      { countryIso: 'GB', platform: 'premier-sports', price: 9.99, currency: 'GBP', period: 'monthly', notes: 'Premier Sports 1 carries selected NRL matches in the UK' },
      { countryIso: 'US', platform: 'espn-plus', price: 10.99, currency: 'USD', period: 'monthly', notes: 'ESPN+ streams selected NRL matches in North America' },
    ],
    cheapestOption: { countryIso: 'GB', price: 9.99, currency: 'GBP', platform: 'premier-sports' },
    mostExpensiveOption: { countryIso: 'NZ', price: 27.99, currency: 'NZD', platform: 'sky-go' },
    globalPlatforms: ['kayo-sports', 'espn-plus'],
    faqs: [
      {
        question: 'How can I watch NRL live in the UK?',
        answer:
          'Premier Sports 1 carries selected NRL matches in the UK. For complete coverage, check the NRL and broadcaster sites for current international streaming options and local blackout rules before subscribing.',
      },
      {
        question: 'Is NRL available for free anywhere?',
        answer:
          'Some NRL matches are broadcast free-to-air on Channel 9 in Australia. The NRL also streams certain games via the NRL app for Australian viewers. Outside Australia and New Zealand, a paid subscription is generally required.',
      },
      {
        question: 'When is the NRL Grand Final?',
        answer:
          'The NRL Grand Final is held in early October each year at Accor Stadium in Sydney. It is the most watched annual sporting event in Australia alongside the AFL Grand Final.',
      },
    ],
    relatedSports: ['rugby-world-cup', 'six-nations', 'super-rugby', 'afl'],
    keyEvents: ['NRL Grand Final', 'State of Origin Series', 'Magic Round', 'NRLW Grand Final', 'World Club Challenge'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/NRL_season_2025',
    wikidataId: 'https://www.wikidata.org/wiki/Q192192',
  },
  {
    slug: 'super-rugby',
    name: 'Super Rugby Pacific',
    shortDescription:
      'The premier southern hemisphere club rugby union competition featuring teams from Australia, New Zealand, South Africa, Japan, and Argentina.',
    longDescription:
      'Super Rugby Pacific is the top club rugby union competition in the southern hemisphere, featuring franchises from Australia, New Zealand, Fiji, and the Pacific Islands. The competition runs from February to June, with South African teams now competing in the separate Super Rugby Unlocked competition. Japanese team Sunwolves participated until 2020. The competition is the proving ground for Wallabies, All Blacks, and Pacific Island test players. Stan Sport holds Australian streaming rights, while Sky Sport NZ covers New Zealand, and Stan Sport / beIN Sports cover other markets.',
    category: 'rugby',
    season: 'February - June',
    regionalPricing: [
      { countryIso: 'AU', platform: 'stan', price: 12.99, currency: 'AUD', period: 'monthly', notes: 'Stan Sport add-on required on top of Stan base subscription for all Super Rugby Pacific matches' },
      { countryIso: 'NZ', platform: 'sky-go', price: 27.99, currency: 'NZD', period: 'monthly', notes: 'Sky Sport NZ has exclusive Super Rugby Pacific rights in New Zealand' },
      { countryIso: 'ZA', platform: 'dazn', price: 149, currency: 'ZAR', period: 'monthly', notes: 'SuperSport via DStv carries South African rugby coverage' },
      { countryIso: 'JP', platform: 'dazn', price: 4200, currency: 'JPY', period: 'monthly', notes: 'DAZN Japan streams Super Rugby Pacific' },
      { countryIso: 'AR', platform: 'espn-plus', price: 8.99, currency: 'USD', period: 'monthly', notes: 'ESPN carries rugby coverage in Argentina' },
    ],
    cheapestOption: { countryIso: 'AU', price: 12.99, currency: 'AUD', platform: 'stan' },
    mostExpensiveOption: { countryIso: 'NZ', price: 27.99, currency: 'NZD', platform: 'sky-go' },
    globalPlatforms: ['stan', 'dazn', 'espn-plus'],
    faqs: [
      {
        question: 'How can I watch Super Rugby Pacific in Australia?',
        answer:
          'Stan Sport holds exclusive streaming rights in Australia. You need a Stan subscription (from $12/month) plus the Stan Sport add-on ($12.99/month) to access all live Super Rugby Pacific matches.',
      },
      {
        question: 'Which teams compete in Super Rugby Pacific?',
        answer:
          'Super Rugby Pacific features five New Zealand franchises (Blues, Chiefs, Hurricanes, Crusaders, Highlanders), five Australian franchises (Brumbies, Reds, Waratahs, Force, Rebels), and two Pacific Island teams (Fijian Drua, Moana Pasifika).',
      },
      {
        question: 'Can I watch Super Rugby Pacific outside Australia and New Zealand?',
        answer:
          'Yes. DAZN carries rights in several markets including Japan and parts of Europe. In markets without a local broadcaster, a VPN to Australia or New Zealand is a popular option to access Stan Sport or Sky Sport NZ.',
      },
    ],
    relatedSports: ['rugby-world-cup', 'six-nations', 'nrl'],
    keyEvents: ['Super Rugby Pacific Final', 'ANZ Derby', 'Trans-Tasman Rivalry Matches', 'Finals Series'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Super_Rugby_Pacific',
    wikidataId: 'https://www.wikidata.org/wiki/Q1378467',
  },
  {
    slug: 'cricket-ashes',
    name: 'The Ashes',
    shortDescription:
      'The iconic Test cricket series between England and Australia, contested every two years in one of sport\'s oldest rivalries.',
    longDescription:
      'The Ashes is the most famous bilateral series in cricket, played between England and Australia since 1882. The series consists of five Test matches, with each edition alternating between England and Australia. The name derives from a satirical obituary published after England\'s first home defeat to Australia, mourning the death of English cricket and suggesting the ashes would be taken to Australia. Today the series captivates hundreds of millions of viewers across the cricket world. In Australia, Foxtel and Kayo Sports hold rights; in England, Sky Sports has exclusive coverage; and in India, Disney+ Hotstar (JioHotstar) streams the series.',
    category: 'cricket',
    season: 'Every 2 years (alternates Jul-Sep in England, Nov-Jan in Australia)',
    regionalPricing: [
      { countryIso: 'AU', platform: 'kayo-sports', price: 25.99, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports streams all Ashes Tests live via Fox Cricket' },
      { countryIso: 'GB', platform: 'sky-go', price: 0, currency: 'GBP', period: 'monthly', notes: 'Sky Sports Cricket holds exclusive UK rights; requires Sky subscription (~£43+/mo)' },
      { countryIso: 'IN', platform: 'jiohotstar', price: 299, currency: 'INR', period: 'monthly', notes: 'JioHotstar (formerly Disney+ Hotstar) streams Ashes in India' },
      { countryIso: 'US', platform: 'espn-plus', price: 10.99, currency: 'USD', period: 'monthly', notes: 'Willow TV and ESPN+ carry Ashes coverage in North America' },
      { countryIso: 'CA', platform: 'dazn', price: 24.99, currency: 'CAD', period: 'monthly', notes: 'Willow TV available in Canada for cricket coverage' },
    ],
    cheapestOption: { countryIso: 'IN', price: 299, currency: 'INR', platform: 'jiohotstar' },
    mostExpensiveOption: { countryIso: 'GB', price: 43, currency: 'GBP', platform: 'sky-go' },
    globalPlatforms: ['kayo-sports', 'jiohotstar', 'espn-plus'],
    faqs: [
      {
        question: 'How can I watch The Ashes in the UK without a Sky subscription?',
        answer:
          'Sky Sports holds UK rights to The Ashes, so there may be no free-to-air option in the UK for a given series. Check Sky, Now, and the ECB or Cricket Australia rights pages for current legal viewing options before the series starts.',
      },
      {
        question: 'When is the next Ashes series?',
        answer:
          'The Ashes alternates every two years. England host Australia in an English summer (July-September) and Australia host England in an Australian summer (November-January). Check the ECB and Cricket Australia websites for the next scheduled series.',
      },
      {
        question: 'How many matches are in The Ashes?',
        answer:
          'The Ashes consists of five Test matches played over 15 days of play (each Test is up to 5 days). The series can be won or drawn based on the number of Tests won by each side.',
      },
    ],
    relatedSports: ['cricket-ipl', 'cricket-world-cup', 'cricket-test'],
    keyEvents: ['First Test', 'Boxing Day Test (Melbourne)', 'Sydney Test', 'Lord\'s Test', 'Ashes Deciding Test'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/The_Ashes',
    wikidataId: 'https://www.wikidata.org/wiki/Q182957',
  },
  {
    slug: 'cricket-test',
    name: 'ICC Test Cricket',
    shortDescription:
      'The pinnacle format of cricket, played over five days between the twelve Full Member nations of the ICC.',
    longDescription:
      'Test cricket is the oldest and most prestigious format of the game, with matches played over up to five days between nations holding Full Member status of the International Cricket Council (ICC). Dating back to 1877, Test cricket features 12 nations including England, Australia, India, Pakistan, West Indies, South Africa, New Zealand, Sri Lanka, Bangladesh, Zimbabwe, Afghanistan, and Ireland. The ICC World Test Championship provides a context for bilateral series, with a Final held every two years. Streaming rights are held on a country-by-country basis, with India, England, and Australia being the most commercially significant markets.',
    category: 'cricket',
    season: 'Year-round (schedule varies by series)',
    regionalPricing: [
      { countryIso: 'IN', platform: 'jiohotstar', price: 299, currency: 'INR', period: 'monthly', notes: 'JioHotstar holds home series rights for India matches' },
      { countryIso: 'GB', platform: 'sky-go', price: 0, currency: 'GBP', period: 'monthly', notes: 'Sky Sports Cricket holds most England home and away Test rights' },
      { countryIso: 'AU', platform: 'kayo-sports', price: 25.99, currency: 'AUD', period: 'monthly', notes: 'Fox Cricket on Kayo Sports covers all Australia Tests' },
      { countryIso: 'PK', platform: 'dazn', price: 500, currency: 'PKR', period: 'monthly', notes: 'PTV Sports carries Pakistan home series free-to-air' },
      { countryIso: 'NZ', platform: 'sky-go', price: 27.99, currency: 'NZD', period: 'monthly', notes: 'Sky Sport NZ covers New Zealand home Test series' },
      { countryIso: 'ZA', platform: 'dazn', price: 149, currency: 'ZAR', period: 'monthly', notes: 'SuperSport via DStv holds South Africa home series rights' },
    ],
    cheapestOption: { countryIso: 'IN', price: 299, currency: 'INR', platform: 'jiohotstar' },
    mostExpensiveOption: { countryIso: 'AU', price: 25.99, currency: 'AUD', platform: 'kayo-sports' },
    globalPlatforms: ['jiohotstar', 'kayo-sports', 'espn-plus'],
    faqs: [
      {
        question: 'Which countries produce the most popular Test cricket?',
        answer:
          'India is by far the largest market for Test cricket, with the India vs England and India vs Australia series drawing the biggest global audiences. The Ashes (England vs Australia) is the most famous individual series, while India\'s home series at venues like the Wankhede in Mumbai or Eden Gardens in Kolkata sell out within minutes.',
      },
      {
        question: 'How long does a Test match last?',
        answer:
          'A Test match can last up to five days with a minimum of 90 overs bowled per day. Some Test matches end in fewer days if a team is bowled out twice for a low total. About 60% of all Test matches produce a result; the rest are draws.',
      },
      {
        question: 'What is the ICC World Test Championship?',
        answer:
          'The ICC World Test Championship (WTC) is a league competition played over a two-year cycle. Points are awarded for wins and draws in bilateral Test series. The top two nations at the end of the cycle contest the WTC Final, usually held at Lord\'s in England.',
      },
    ],
    relatedSports: ['cricket-ipl', 'cricket-world-cup', 'cricket-ashes'],
    keyEvents: ['WTC Final', 'The Ashes', 'Border-Gavaskar Trophy', 'India vs Pakistan Test', 'Boxing Day Test'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Test_cricket',
    wikidataId: 'https://www.wikidata.org/wiki/Q182530',
  },
  {
    slug: 'tennis-atp-tour',
    name: 'ATP & WTA Tour',
    shortDescription:
      'The full professional tennis circuit - ATP Masters 1000, ATP 500, and WTA Premier events spanning 30+ countries.',
    longDescription:
      'The ATP Tour and WTA Tour together constitute the full calendar of professional tennis outside the four Grand Slams. The ATP Tour runs events in three tiers: ATP Masters 1000 (nine mandatory events including Indian Wells, Miami, Monte Carlo, Madrid, Rome, Canada, Cincinnati, Shanghai, and Paris), ATP 500, and ATP 250. The WTA Tour has a parallel structure with WTA 1000, WTA 500, and WTA 250 events. Broadcasting rights are split between Tennis Channel (US), Amazon Prime Video (UK), beIN Sports (France/Spain), and various regional broadcasters. The tour runs virtually year-round from January to November.',
    category: 'tennis',
    season: 'January - November',
    regionalPricing: [
      { countryIso: 'US', platform: 'amazon-prime-video', price: 8.99, currency: 'USD', period: 'monthly', notes: 'Tennis Channel Plus and Amazon carry ATP/WTA events in the US' },
      { countryIso: 'GB', platform: 'amazon-prime-video', price: 8.99, currency: 'GBP', period: 'monthly', notes: 'Amazon Prime Video UK holds rights to selected ATP Masters events' },
      { countryIso: 'FR', platform: 'amazon-prime-video', price: 6.99, currency: 'EUR', period: 'monthly', notes: 'Amazon Prime Video France and beIN Sports share ATP/WTA rights' },
      { countryIso: 'ES', platform: 'amazon-prime-video', price: 4.99, currency: 'EUR', period: 'monthly', notes: 'Movistar+ and Amazon share ATP rights in Spain' },
      { countryIso: 'AU', platform: 'discovery-plus', price: 6.99, currency: 'AUD', period: 'monthly', notes: 'beIN Sports and Nine carry ATP/WTA events in Australia' },
      { countryIso: 'DE', platform: 'dazn', price: 44.99, currency: 'EUR', period: 'monthly', notes: 'Sky Germany and DAZN share ATP Tour coverage in Germany' },
    ],
    cheapestOption: { countryIso: 'FR', price: 4.99, currency: 'EUR', platform: 'amazon-prime-video' },
    mostExpensiveOption: { countryIso: 'DE', price: 44.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['amazon-prime-video', 'dazn', 'discovery-plus'],
    faqs: [
      {
        question: 'What is the difference between ATP Masters 1000 and ATP 500 events?',
        answer:
          'ATP Masters 1000 events are the highest tier below Grand Slams, with larger prize funds and mandatory participation for top-ranked players. ATP 500 events are the next tier and award 500 ranking points to the winner versus 1000 for Masters events.',
      },
      {
        question: 'How can I watch all ATP and WTA Tour matches live?',
        answer:
          'No single platform carries every ATP and WTA match globally. In the US, Tennis Channel Plus offers the broadest coverage. Amazon Prime Video holds rights to select Masters events in the UK and France. For markets without a local broadcaster, check official tour apps, highlight rights, and local TV packages; VPN use can conflict with service terms and may be blocked.',
      },
      {
        question: 'Which ATP Masters 1000 events are considered the most prestigious?',
        answer:
          'Indian Wells (BNP Paribas Open) and Miami Open are considered the "Sunshine Double" and are among the most prestigious events outside Grand Slams. Monte Carlo, Madrid, and Rome form the clay season leading into Roland Garros. The Paris Masters and Shanghai Rolex Masters close the indoor hard-court season.',
      },
    ],
    relatedSports: ['tennis-grand-slams', 'wimbledon', 'roland-garros'],
    keyEvents: ['Indian Wells Masters', 'Miami Open', 'Monte Carlo Masters', 'Madrid Open', 'Rome Masters', 'Paris Masters', 'WTA Finals'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/ATP_Tour',
    wikidataId: 'https://www.wikidata.org/wiki/Q160439',
  },
  {
    slug: 'mma-bellator',
    name: 'Bellator MMA',
    shortDescription:
      'One of the world\'s top MMA promotions with events in the US, UK, and Ireland, now rebranded as PFL Europe.',
    longDescription:
      'Bellator MMA was one of the premier mixed martial arts promotions globally, running major events in the United States, United Kingdom, and Ireland. In 2023, Bellator was acquired by the Professional Fighters League (PFL) and events are now branded as PFL Europe and PFL globally. Bellator has featured world-class fighters including Conor McGregor\'s early career bouts (before UFC), Gegard Mousasi, Patricio "Pitbull" Freire, and Ryan Bader. Paramount+ (formerly CBS Sports Network) held US streaming rights for many years, while Channel 5 and BBC iPlayer have carried free-to-air events in the UK and Ireland.',
    category: 'combat',
    season: 'Year-round',
    regionalPricing: [
      { countryIso: 'US', platform: 'paramount-plus', price: 7.99, currency: 'USD', period: 'monthly', notes: 'Paramount+ streams PFL/Bellator events in the US' },
      { countryIso: 'GB', platform: 'bbc-iplayer', price: 0, currency: 'GBP', period: 'monthly', notes: 'BBC iPlayer and Channel 5 carry selected Bellator/PFL events free' },
      { countryIso: 'IE', platform: 'bbc-iplayer', price: 0, currency: 'EUR', period: 'monthly', notes: 'Virgin Media and RTE carry selected MMA events in Ireland' },
      { countryIso: 'IT', platform: 'dazn', price: 34.99, currency: 'EUR', period: 'monthly', notes: 'DAZN Italy streams PFL/Bellator events' },
    ],
    cheapestOption: { countryIso: 'GB', price: 0, currency: 'GBP', platform: 'bbc-iplayer' },
    mostExpensiveOption: { countryIso: 'IT', price: 34.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['paramount-plus', 'dazn'],
    faqs: [
      {
        question: 'Is Bellator MMA still active?',
        answer:
          'Bellator MMA was acquired by the Professional Fighters League (PFL) in 2023. Events previously branded as Bellator now run under the PFL umbrella. The PFL continues to run events in the US, UK, Europe, and Middle East.',
      },
      {
        question: 'How does Bellator/PFL compare to the UFC?',
        answer:
          'The UFC is the largest MMA promotion globally by revenue and viewership. Bellator/PFL is considered the second or third largest promotion, with strong European presence. PFL uses a unique season format with playoffs and a $1 million prize per weight class.',
      },
      {
        question: 'Where can I watch Bellator MMA in the UK?',
        answer:
          'Channel 5 and BBC iPlayer have historically carried selected Bellator events free to air in the UK. For comprehensive coverage, a Paramount+ subscription or a VPN to access international streams is recommended.',
      },
    ],
    relatedSports: ['ufc', 'boxing', 'wwe'],
    keyEvents: ['Bellator World Grand Prix', 'PFL Championships', 'PFL Europe Events', 'Bellator Dublin'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Bellator_MMA',
    wikidataId: 'https://www.wikidata.org/wiki/Q1079788',
  },
  {
    slug: 'esports-lol-worlds',
    name: 'League of Legends World Championship',
    shortDescription:
      'The annual LoL esports world championship - the most watched esports event globally with tens of millions of concurrent viewers.',
    longDescription:
      'The League of Legends World Championship (Worlds) is the annual culmination of the competitive League of Legends season, organised by Riot Games. Teams from the LCK (Korea), LPL (China), LEC (Europe), and LCS (North America) qualify alongside representatives from other regional leagues. Worlds is consistently the most-watched esports event globally, peaking at over 70 million concurrent viewers for some finals. The event rotates between different host regions. Uniquely among major sports, Worlds is broadcast completely free of charge on YouTube and Twitch via the official LoL Esports channels, with no regional restrictions on viewing.',
    category: 'other',
    season: 'October - November (annual)',
    regionalPricing: [
      { countryIso: 'US', platform: 'youtube-premium', price: 0, currency: 'USD', period: 'monthly', notes: 'Free on YouTube (LoL Esports channel) and Twitch globally - no VPN needed' },
      { countryIso: 'KR', platform: 'youtube-premium', price: 0, currency: 'KRW', period: 'monthly', notes: 'Free on YouTube and local Korean channels; LCK broadcast on Naver' },
      { countryIso: 'CN', platform: 'youtube-premium', price: 0, currency: 'CNY', period: 'monthly', notes: 'Broadcast on Huya and Bilibili in China; YouTube blocked in China' },
      { countryIso: 'GB', platform: 'youtube-premium', price: 0, currency: 'GBP', period: 'monthly', notes: 'Free on YouTube (LoL Esports) and Twitch in the UK' },
      { countryIso: 'DE', platform: 'youtube-premium', price: 0, currency: 'EUR', period: 'monthly', notes: 'Free on YouTube and Twitch; LEC broadcast on official channels' },
    ],
    cheapestOption: { countryIso: 'US', price: 0, currency: 'USD', platform: 'youtube-premium' },
    mostExpensiveOption: { countryIso: 'US', price: 0, currency: 'USD', platform: 'youtube-premium' },
    globalPlatforms: ['youtube-premium'],
    faqs: [
      {
        question: 'Is the LoL World Championship free to watch?',
        answer:
          'Yes. Riot Games broadcasts the League of Legends World Championship completely free of charge on the official LoL Esports YouTube channel and on Twitch. There are no regional restrictions - anyone worldwide can watch without a VPN or subscription.',
      },
      {
        question: 'Which region has won the most LoL World Championships?',
        answer:
          'Korea (LCK) has historically dominated Worlds, with teams like T1 (formerly SKT T1), Samsung White, and Gen.G winning multiple titles. China (LPL) has emerged as a rival powerhouse, winning several championships. T1\'s Faker is widely considered the greatest LoL player of all time, having won four World Championships.',
      },
      {
        question: 'How many teams compete at Worlds?',
        answer:
          'The League of Legends World Championship typically features 22-24 teams from 12+ regional leagues worldwide. Korea and China receive the most qualification spots as the strongest regions, followed by Europe and North America.',
      },
    ],
    relatedSports: ['olympics'],
    keyEvents: ['Play-In Stage', 'Group Stage', 'Quarterfinals', 'Semifinals', 'Worlds Final'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/League_of_Legends_World_Championship',
    wikidataId: 'https://www.wikidata.org/wiki/Q16290371',
  },
  {
    slug: 'darts-pdc',
    name: 'PDC World Darts Championship',
    shortDescription:
      'The premier darts championship held at Alexandra Palace each December-January, broadcast by Sky Sports and watched by millions.',
    longDescription:
      'The PDC World Darts Championship is the most prestigious darts tournament in the world, held annually at Alexandra Palace in London from mid-December to early January. Organised by the Professional Darts Corporation (PDC), it features 96 players from around the globe competing for the Sid Waddell Trophy. The tournament is famous for its festive atmosphere, large crowds in fancy dress, and exceptional skill from the world\'s best players including Phil Taylor (16 world titles), Michael van Gerwen, Peter Wright, and Gerwyn Price. Sky Sports holds UK broadcast rights, while DAZN carries coverage in Germany and Austria, and Viaplay covers Scandinavia and the Netherlands.',
    category: 'other',
    season: 'December - January',
    regionalPricing: [
      { countryIso: 'GB', platform: 'sky-go', price: 0, currency: 'GBP', period: 'monthly', notes: 'Sky Sports Darts is the exclusive UK broadcaster; requires Sky subscription (~£43+/mo)' },
      { countryIso: 'DE', platform: 'dazn', price: 44.99, currency: 'EUR', period: 'monthly', notes: 'DAZN Germany streams the PDC World Championship and Premier League Darts' },
      { countryIso: 'AT', platform: 'dazn', price: 29.99, currency: 'EUR', period: 'monthly', notes: 'DAZN Austria carries PDC darts coverage' },
      { countryIso: 'NL', platform: 'dazn', price: 19.99, currency: 'EUR', period: 'monthly', notes: 'Viaplay Netherlands and DAZN carry darts in the Netherlands' },
      { countryIso: 'NO', platform: 'dazn', price: 279, currency: 'NOK', period: 'monthly', notes: 'Viaplay Norway carries PDC darts coverage' },
      { countryIso: 'AU', platform: 'kayo-sports', price: 25.99, currency: 'AUD', period: 'monthly', notes: 'Fox Sports Australia carries selected PDC events via Kayo Sports' },
    ],
    cheapestOption: { countryIso: 'NL', price: 19.99, currency: 'EUR', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'DE', price: 44.99, currency: 'EUR', platform: 'dazn' },
    globalPlatforms: ['dazn', 'sky-go', 'kayo-sports'],
    faqs: [
      {
        question: 'How can I watch the PDC World Darts Championship without Sky?',
        answer:
          'Sky Sports holds exclusive UK broadcast rights to the PDC World Darts Championship. Without a Sky subscription, you can use Now TV (Sky\'s streaming-only service) to buy a Sports pass. Alternatively, a VPN to the Netherlands or Germany allows access to more affordable DAZN subscriptions.',
      },
      {
        question: 'When is the PDC World Darts Championship held?',
        answer:
          'The PDC World Darts Championship runs from mid-December to early January, bridging Christmas and New Year. It concludes with the final in the first week of January. The venue is Alexandra Palace in London.',
      },
      {
        question: 'Who has won the most PDC World titles?',
        answer:
          'Phil Taylor dominated PDC darts with 14 world titles. Michael van Gerwen has won three world titles and is considered the dominant player of the modern era. Peter Wright and Gerwyn Price are among recent champions.',
      },
    ],
    relatedSports: ['snooker-world-championship'],
    keyEvents: ['First Round', 'Last 32', 'Quarterfinals', 'Semifinals', 'PDC World Final (Alexandra Palace)'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/PDC_World_Darts_Championship',
    wikidataId: 'https://www.wikidata.org/wiki/Q466913',
  },
  {
    slug: 'snooker-world-championship',
    name: 'World Snooker Championship',
    shortDescription:
      'The most prestigious snooker tournament, held annually at the Crucible Theatre in Sheffield with 17 days of BBC coverage.',
    longDescription:
      'The World Snooker Championship is the sport\'s most prestigious event, held each April-May at the Crucible Theatre in Sheffield, England. The tournament has been held at the Crucible since 1977 and is renowned for its intimate atmosphere and the pressure it places on players. The BBC broadcasts the full 17-day event free to air in the UK, with Eurosport carrying coverage across Europe and CCTV5 broadcasting in China, which has become one of snooker\'s largest markets. Ronnie O\'Sullivan has dominated the modern era with seven world titles, while Stephen Hendry held the record with seven titles during the 1990s. The maximum break of 147 carries a special prize at the Crucible.',
    category: 'other',
    season: 'April - May',
    regionalPricing: [
      { countryIso: 'GB', platform: 'bbc-iplayer', price: 0, currency: 'GBP', period: 'monthly', notes: 'BBC One and BBC Two broadcast the full World Championship free; BBC iPlayer streams all sessions' },
      { countryIso: 'CN', platform: 'youtube-premium', price: 0, currency: 'CNY', period: 'monthly', notes: 'CCTV5 broadcasts snooker free in China; Douyin and Bilibili carry online streams' },
      { countryIso: 'DE', platform: 'discovery-plus', price: 6.99, currency: 'EUR', period: 'monthly', notes: 'Eurosport (via Discovery+) carries World Snooker Championship in Germany' },
      { countryIso: 'FR', platform: 'discovery-plus', price: 5.99, currency: 'EUR', period: 'monthly', notes: 'Eurosport France broadcasts the Crucible sessions via Discovery+' },
      { countryIso: 'AU', platform: 'discovery-plus', price: 6.99, currency: 'AUD', period: 'monthly', notes: 'Eurosport and DAZN carry snooker coverage in Australia' },
      { countryIso: 'US', platform: 'discovery-plus', price: 4.99, currency: 'USD', period: 'monthly', notes: 'Discovery+ and Eurosport carry selected snooker events in the US' },
    ],
    cheapestOption: { countryIso: 'GB', price: 0, currency: 'GBP', platform: 'bbc-iplayer' },
    mostExpensiveOption: { countryIso: 'AU', price: 6.99, currency: 'AUD', platform: 'discovery-plus' },
    globalPlatforms: ['bbc-iplayer', 'discovery-plus'],
    faqs: [
      {
        question: 'Is the World Snooker Championship free to watch in the UK?',
        answer:
          'Yes. The BBC has held free-to-air rights to the World Snooker Championship for decades. All 17 days of coverage are broadcast on BBC One and BBC Two, with every session also available to stream free on BBC iPlayer.',
      },
      {
        question: 'Why is snooker so popular in China?',
        answer:
          'Snooker grew rapidly in China from the 2000s onward, driven by Ding Junhui\'s success as the first Chinese player to win ranking events at the top level. China now produces several top-100 ranked players and hosts multiple ranking events including the China Open and UK Championship.',
      },
      {
        question: 'Who has won the most World Snooker Championships?',
        answer:
          'Ronnie O\'Sullivan has won seven World Championships (2001, 2004, 2008, 2012, 2013, 2022, 2023), matching Stephen Hendry\'s record of seven titles. John Higgins and Mark Selby are each four-time world champions.',
      },
    ],
    relatedSports: ['darts-pdc'],
    keyEvents: ['Crucible First Round', 'Quarterfinals', 'Semifinals', 'World Snooker Final', 'Final Session'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/World_Snooker_Championship',
    wikidataId: 'https://www.wikidata.org/wiki/Q220628',
  },
  {
    slug: 'v8-supercars',
    name: 'Supercars Championship',
    shortDescription:
      'Australia\'s premier touring car racing series, featuring the iconic Holden vs Ford rivalry and the Bathurst 1000.',
    longDescription:
      'The Supercars Championship (formerly the V8 Supercars Championship) is Australia\'s top-tier touring car racing series. The championship features purpose-built race cars based on the Ford Mustang GT and Chevrolet Camaro, competing on a mix of street circuits, permanent racetracks, and the legendary Mount Panorama circuit at Bathurst. The Bathurst 1000, held each October, is the most prestigious race in the championship and one of the most iconic endurance races in the world. Fox Sports Australia holds exclusive pay-TV rights via Kayo Sports, while Network Ten broadcasts selected events free-to-air. The series attracts a passionate following in Australia and New Zealand.',
    category: 'motorsport',
    season: 'February - November',
    regionalPricing: [
      { countryIso: 'AU', platform: 'kayo-sports', price: 25.99, currency: 'AUD', period: 'monthly', notes: 'Kayo Sports streams all Supercars Championship rounds via Fox Sports Australia' },
      { countryIso: 'NZ', platform: 'sky-go', price: 27.99, currency: 'NZD', period: 'monthly', notes: 'Sky Sport NZ carries selected Supercars rounds including Bathurst 1000' },
      { countryIso: 'GB', platform: 'dazn', price: 9.99, currency: 'GBP', period: 'monthly', notes: 'MotorTrend and Eurosport carry selected Supercars events in the UK' },
    ],
    cheapestOption: { countryIso: 'GB', price: 9.99, currency: 'GBP', platform: 'dazn' },
    mostExpensiveOption: { countryIso: 'NZ', price: 27.99, currency: 'NZD', platform: 'sky-go' },
    globalPlatforms: ['kayo-sports', 'dazn'],
    faqs: [
      {
        question: 'What is the Bathurst 1000?',
        answer:
          'The Bathurst 1000 is a 1000-kilometre endurance race held each October at the Mount Panorama Circuit near Bathurst, New South Wales. It is the most prestigious race in the Supercars Championship and one of Australia\'s most iconic sporting events. The circuit is famous for its challenging mountain section and Conrod Straight.',
      },
      {
        question: 'How can I watch the Supercars Championship outside Australia?',
        answer:
          'Kayo Sports holds comprehensive Supercars streaming rights in Australia and is geo-restricted. International viewers should check Supercars, local broadcasters, and official event listings for the current rights holder in their country.',
      },
      {
        question: 'Are the Supercars still V8 engines?',
        answer:
          'Despite the former name "V8 Supercars," the current Supercars Championship introduced Gen3 regulations in 2023 featuring Ford Mustang GT and Chevrolet Camaro models with 5.0-litre V8 engines. The V8 engine remains a defining characteristic of the series.',
      },
    ],
    relatedSports: ['formula-1', 'motogp', 'a-league'],
    keyEvents: ['Bathurst 1000', 'Adelaide 500', 'Phillip Island', 'Gold Coast 500', 'Newcastle 500 (Season Finale)'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Supercars_Championship',
    wikidataId: 'https://www.wikidata.org/wiki/Q215351',
  },
  {
    slug: 'netball-super-league',
    name: 'Vitality Netball Superleague',
    shortDescription:
      'England\'s premier netball competition featuring top clubs from England and Wales, broadcast on Sky Sports and TNT Sports.',
    longDescription:
      'The Vitality Netball Superleague is the top tier of club netball in England and Wales, featuring ten franchises competing in a round-robin season followed by finals. The league has grown significantly in profile since England\'s Roses won gold at the 2018 Commonwealth Games and silver at the 2023 World Cup. Sky Sports and TNT Sports share broadcast rights in the UK. The competition has close links to the Australian Suncorp Super Netball league, and several players move between both competitions. The Superleague season runs from February to June, making it a popular sport during the spring months.',
    category: 'other',
    season: 'February - June',
    regionalPricing: [
      { countryIso: 'GB', platform: 'sky-go', price: 0, currency: 'GBP', period: 'monthly', notes: 'Sky Sports and TNT Sports carry Vitality Netball Superleague in the UK; Sky sub required' },
      { countryIso: 'AU', platform: 'kayo-sports', price: 25.99, currency: 'AUD', period: 'monthly', notes: 'Fox Sports Australia carries selected international netball and Suncorp Super Netball' },
      { countryIso: 'NZ', platform: 'sky-go', price: 27.99, currency: 'NZD', period: 'monthly', notes: 'Sky Sport NZ carries selected netball including Silver Ferns matches' },
    ],
    cheapestOption: { countryIso: 'AU', price: 25.99, currency: 'AUD', platform: 'kayo-sports' },
    mostExpensiveOption: { countryIso: 'NZ', price: 27.99, currency: 'NZD', platform: 'sky-go' },
    globalPlatforms: ['sky-go', 'kayo-sports'],
    faqs: [
      {
        question: 'How can I watch the Netball Superleague in the UK?',
        answer:
          'Sky Sports and TNT Sports share broadcast rights to the Vitality Netball Superleague in the UK. A Sky subscription is required for Sky Sports coverage. Selected matches may also be available on the Sky Sports YouTube channel or BBC Sport.',
      },
      {
        question: 'Which teams compete in the Vitality Netball Superleague?',
        answer:
          'The Vitality Netball Superleague features ten franchises: Leeds Rhinos, London Pulse, Manchester Thunder, Loughborough Lightning, Strathclyde Sirens, Celtic Dragons, Surrey Storm, Saracens Mavericks, Wasps, and Bath. Teams compete in a double round-robin before the top four contest the finals series.',
      },
      {
        question: 'Is there a professional netball league in Australia?',
        answer:
          'Yes. Australia\'s Suncorp Super Netball is the top-tier club netball competition in Australia, featuring eight franchises including the NSW Swifts, Melbourne Vixens, and Queensland Firebirds. It is broadcast on Kayo Sports and Nine\'s streaming platform.',
      },
    ],
    relatedSports: ['rugby-world-cup', 'six-nations', 'afl'],
    keyEvents: ['Vitality Netball Superleague Final', 'Grand Final', 'International Test Matches'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Vitality_Netball_Superleague',
    wikidataId: 'https://www.wikidata.org/wiki/Q6997938',
  },
  {
    slug: 'cycling-vuelta-espana',
    name: 'Vuelta a España',
    shortDescription:
      'Spain\'s Grand Tour cycling race - a three-week, 21-stage race held each August-September through the Iberian Peninsula.',
    longDescription:
      'The Vuelta a España (Tour of Spain) is one of cycling\'s three Grand Tours alongside the Tour de France and Giro d\'Italia. The race covers approximately 3,000 kilometres over 21 stages during August and September, finishing in Madrid. The Vuelta is known for its challenging mountain stages in the Spanish sierras and its unpredictable weather. Recent editions have started in countries including the Netherlands, Portugal, and the Basque Country. The race has been dominated by riders like Chris Froome, Alberto Contador, and Primož Roglič. Eurosport carries European broadcast rights, beIN Sports covers France and Spain, and GCN+ offers comprehensive global streaming coverage.',
    category: 'other',
    season: 'August - September',
    regionalPricing: [
      { countryIso: 'ES', platform: 'amazon-prime-video', price: 4.99, currency: 'EUR', period: 'monthly', notes: 'RTVE broadcasts free-to-air highlights; beIN Sports carries live coverage in Spain' },
      { countryIso: 'BE', platform: 'discovery-plus', price: 5.99, currency: 'EUR', period: 'monthly', notes: 'Eurosport Belgium via Discovery+ streams Vuelta live' },
      { countryIso: 'NL', platform: 'discovery-plus', price: 5.99, currency: 'EUR', period: 'monthly', notes: 'Eurosport Netherlands and NOS carry Grand Tour cycling coverage' },
      { countryIso: 'FR', platform: 'discovery-plus', price: 5.99, currency: 'EUR', period: 'monthly', notes: 'Eurosport France via Discovery+ and France Télévisions carry Vuelta highlights' },
      { countryIso: 'GB', platform: 'discovery-plus', price: 6.99, currency: 'GBP', period: 'monthly', notes: 'Eurosport UK via Discovery+ streams all 21 stages of the Vuelta' },
      { countryIso: 'AU', platform: 'discovery-plus', price: 6.99, currency: 'AUD', period: 'monthly', notes: 'Eurosport and SBS carry cycling Grand Tour coverage in Australia' },
    ],
    cheapestOption: { countryIso: 'BE', price: 5.99, currency: 'EUR', platform: 'discovery-plus' },
    mostExpensiveOption: { countryIso: 'GB', price: 6.99, currency: 'GBP', platform: 'discovery-plus' },
    globalPlatforms: ['discovery-plus', 'amazon-prime-video'],
    faqs: [
      {
        question: 'How is the Vuelta a España different from the Tour de France?',
        answer:
          'While the Tour de France (July) has greater global prestige and viewership, the Vuelta a España (August-September) is known for its more aggressive racing and spectacular mountain stages in the Spanish sierras. The Vuelta was historically used as a warm-up for classics riders or a final race of the season, but it has grown significantly in prestige.',
      },
      {
        question: 'Where can I watch the Vuelta a España in the UK?',
        answer:
          'Eurosport UK holds rights to the Vuelta a España in the UK. The most convenient streaming option is Discovery+ (which includes Eurosport) at £6.99/month. GCN+ also offers cycling-specific streaming coverage of all three Grand Tours.',
      },
      {
        question: 'Who has won the most Vuelta a España titles?',
        answer:
          'Roberto Heras holds the record with four Vuelta titles (2000, 2003, 2004, 2005). Alberto Contador won three Vueltas, while Tony Rominger also claimed three titles. Primož Roglič of Slovenia won three consecutive editions (2019, 2020, 2021) to become one of the dominant modern Vuelta riders.',
      },
    ],
    relatedSports: ['tour-de-france', 'olympics', 'pga-tour'],
    keyEvents: ['Stage 1 (Grand Départ)', 'Alto de l\'Angliru', 'Sierra Nevada Stage', 'Lagos de Covadonga', 'Final Stage Madrid'],
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Vuelta_a_Espa%C3%B1a',
    wikidataId: 'https://www.wikidata.org/wiki/Q220648',
  },
];

export function getSportBySlug(slug: string): SportStreaming | undefined {
  return sports.find((s) => s.slug === slug);
}

export function getSportsByCategory(category: SportCategory): SportStreaming[] {
  return sports.filter((s) => s.category === category);
}
