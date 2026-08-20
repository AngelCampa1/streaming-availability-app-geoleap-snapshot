import type { SeoGovernance } from './seo';

export type GenreCategory = 'international' | 'niche' | 'mainstream' | 'documentary' | 'family';

export interface GenrePlatformEntry {
  platformSlug: string;
  librarySize: string;
  strengths: string[];
  exclusiveHighlights: string[];
}

export interface GenreGuide {
  slug: string;
  name: string;
  displayName: string;
  shortDescription: string;
  longDescription: string;
  category: GenreCategory;
  bestPlatforms: GenrePlatformEntry[];
  viewingStats: string;
  trendingTitles: string[];
  bestCountriesFor: Array<{ countrySlug: string; reason: string }>;
  faqs: Array<{ question: string; answer: string }>;
  relatedGenres: string[];
  relatedGlossary: string[];
  seo?: SeoGovernance;
}

export const genreGuides: GenreGuide[] = [
  {
    slug: 'anime',
    name: 'Anime',
    displayName: 'Anime',
    shortDescription: 'Japanese animation spanning action, romance, fantasy, and slice-of-life, now one of the most-watched categories worldwide.',
    longDescription:
      'Anime has grown from a niche hobby into one of the most-watched content categories worldwide. Crunchyroll hosts 2,000+ series and Netflix has built a library of 500+ anime titles, with the genre accounting for roughly 8-9% of Netflix global viewing hours. From shonen epics like One Piece to Studio Ghibli films, anime attracts hundreds of millions of viewers across every continent.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'crunchyroll',
        librarySize: '2,000+ series',
        strengths: ['Largest anime catalog', 'Simulcast within hours of Japan broadcast', 'Manga reader included'],
        exclusiveHighlights: ['Jujutsu Kaisen', 'One Piece', 'Dragon Ball Super', 'Chainsaw Man'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '500+ titles',
        strengths: ['High-budget originals', 'Dubs in 30+ languages', 'Offline downloads'],
        exclusiveHighlights: ['Cyberpunk: Edgerunners', 'Blue Eye Samurai', 'Pluto', 'Scott Pilgrim Takes Off'],
      },
      {
        platformSlug: 'hidive',
        librarySize: '800+ titles',
        strengths: ['Sentai Filmworks exclusives', 'Uncensored versions', 'Affordable pricing'],
        exclusiveHighlights: ['Vinland Saga', 'The Legendary Hero Is Dead!', 'I Got a Cheat Skill in Another World'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '200+ titles',
        strengths: ['Exclusive simulcasts', 'Part of Prime membership', 'Global availability'],
        exclusiveHighlights: ['Solo Leveling', 'Wistoria: Wand and Sword'],
      },
    ],
    viewingStats: 'Anime accounts for 8-9% of all Netflix global viewing hours',
    trendingTitles: ['Jujutsu Kaisen', 'Solo Leveling', 'One Piece', 'Demon Slayer', 'Chainsaw Man', 'Blue Eye Samurai'],
    bestCountriesFor: [
      { countrySlug: 'japan', reason: 'Origin country with the largest library and earliest releases' },
      { countrySlug: 'united-states', reason: 'Largest overseas anime market with all major platforms available' },
      { countrySlug: 'india', reason: 'Fastest-growing anime fanbase with localized content on Crunchyroll and Netflix' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for anime?',
        answer: 'Crunchyroll is the leading anime-specific platform with 2,000+ series, simulcasts, and manga. Netflix is best for high-quality originals and dubbed content, while HIDIVE offers niche Sentai Filmworks exclusives.',
      },
      {
        question: 'How much does anime streaming cost?',
        answer: 'Crunchyroll starts at $7.99/month. Netflix anime is included in all plans starting at $6.99/month. HIDIVE is $4.99/month, making it the most affordable dedicated option.',
      },
      {
        question: 'Can I watch anime with English dubs?',
        answer: 'Yes. Netflix offers dubs in 30+ languages. Crunchyroll provides English dubs for most popular series. HIDIVE and Funimation also focus heavily on dubbed content.',
      },
      {
        question: 'What percentage of streaming viewers watch anime?',
        answer: 'Anime represents roughly 8-9% of Netflix global viewing hours. In the US, anime viewership has grown over 100% since 2020, making it one of the fastest-growing content categories.',
      },
      {
        question: 'Is streaming anime legally online?',
        answer: 'Yes - streaming anime on licensed platforms like Crunchyroll, Netflix, HIDIVE, and Amazon Prime Video is completely legal. These services pay licensing fees to Japanese studios and publishers. Avoid unlicensed piracy sites, which deprive creators of revenue and carry legal risks depending on your country.',
      },
      {
        question: 'Where can I watch anime legally for free?',
        answer: 'Crunchyroll is primarily a paid anime service, though trial or free viewing availability can change by market. Tubi carries anime titles for free with ads, and Pluto TV runs dedicated anime channels in some markets. For ad-free legal anime, compare Crunchyroll, Netflix, HIDIVE, and local services in your country.',
      },
    ],
    relatedGenres: ['sci-fi', 'fantasy', 'kids-animation'],
    relatedGlossary: ['simulcast', 'geo-restriction', 'content-library'],
  },
  {
    slug: 'k-drama',
    name: 'K-Drama',
    displayName: 'Korean Drama',
    shortDescription: 'Korean dramas draw huge global audiences. Squid Game alone reached 265.2M views in its first 28 days.',
    longDescription:
      'Korean drama, or K-drama, has become a global hit powered by the Hallyu wave. Squid Game pulled in 265.2 million views in its first 28 days on Netflix, making it the platform\'s most-watched series ever. The K-drama market is valued at over $1.2 billion and keeps growing as platforms invest in Korean-language originals. From romantic comedies to psychological thrillers, K-dramas offer tightly paced storytelling in typically 16-episode seasons.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '300+ K-dramas',
        strengths: ['Biggest K-drama investor globally', 'Subtitles in 30+ languages', 'Original productions'],
        exclusiveHighlights: ['Squid Game', 'All of Us Are Dead', 'The Glory', 'Queen of Tears'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '100+ K-dramas',
        strengths: ['Growing Korean content library', 'Included with Prime', 'Global reach'],
        exclusiveHighlights: ['Reacher (K-drama crossover audiences)', 'Head of the Household'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '10+ premium K-dramas',
        strengths: ['High-budget productions', 'Award-winning quality', 'Ad-free experience'],
        exclusiveHighlights: ['Dr. Brain', 'Pachinko'],
      },
    ],
    viewingStats: 'Squid Game reached 265.2M views in 28 days, making it Netflix\'s most-watched series ever',
    trendingTitles: ['Squid Game Season 2', 'Queen of Tears', 'The Glory', 'Lovely Runner', 'Marry My Husband', 'All of Us Are Dead'],
    bestCountriesFor: [
      { countrySlug: 'south-korea', reason: 'Origin country with all K-drama platforms and earliest access' },
      { countrySlug: 'united-states', reason: 'Largest international K-drama audience with Netflix and Viki access' },
      { countrySlug: 'japan', reason: 'Strong cultural affinity and localized K-drama libraries' },
    ],
    faqs: [
      {
        question: 'Where can I watch K-dramas with subtitles?',
        answer: 'Netflix offers the largest K-drama library with subtitles in 30+ languages. Viki specializes in Asian dramas with community-contributed subtitles in 200+ languages. Amazon Prime Video also carries a growing selection.',
      },
      {
        question: 'How big is the K-drama market?',
        answer: 'The global K-drama market is valued at over $1.2 billion. Netflix alone has invested more than $2.5 billion in Korean content since 2015.',
      },
      {
        question: 'What is the most-watched K-drama of all time?',
        answer: 'Squid Game holds the record as Netflix\'s most-watched series globally with 265.2 million views in its first 28 days. Other record-breakers include All of Us Are Dead and The Glory.',
      },
      {
        question: 'What is the best streaming service for K-dramas?',
        answer: 'Netflix is the dominant K-drama platform globally with 300+ titles and $2.5 billion invested in Korean content through 2028. For subtitles in 200+ languages including rare languages, Viki (free and $4.99/month premium) is unmatched. Amazon Prime Video and Apple TV+ have smaller but growing K-drama libraries.',
      },
      {
        question: 'Are K-dramas available in my country?',
        answer: 'Netflix K-drama Originals like Squid Game and The Glory are available in all 190+ Netflix territories worldwide. Licensed K-dramas vary by region - use GeoLeap to search any title and see which platforms carry it in your country.',
      },
    ],
    relatedGenres: ['romantic-comedy', 'thriller', 'telenovelas'],
    relatedGlossary: ['hallyu', 'simulcast', 'geo-restriction'],
  },
  {
    slug: 'documentaries',
    name: 'Documentaries',
    displayName: 'Documentaries',
    shortDescription: 'Nature, true stories, and investigative reporting. Netflix, Discovery+, CuriosityStream, and more.',
    longDescription:
      'Documentaries are a major reason people subscribe to streaming services. Netflix leads with Oscar-winning original documentaries, while Discovery+ has the largest factual content library in the world. CuriosityStream focuses on science and history docs at budget-friendly pricing, and Apple TV+ produces visually striking nature and biographical documentaries. The documentary category spans nature, science, history, biography, political, and investigative sub-genres.',
    category: 'documentary',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '1,500+ documentaries',
        strengths: ['Oscar-winning originals', 'Wide variety of sub-genres', 'Global availability'],
        exclusiveHighlights: ['Our Planet', 'The Social Dilemma', 'American Factory', 'My Octopus Teacher'],
      },
      {
        platformSlug: 'discovery-plus',
        librarySize: '2,500+ titles',
        strengths: ['Largest factual library', 'Nature and science focus', 'Discovery Channel archive'],
        exclusiveHighlights: ['Planet Earth III', 'Frozen Planet', 'Gold Rush', 'Deadliest Catch'],
      },
      {
        platformSlug: 'curiosity-stream',
        librarySize: '3,000+ titles',
        strengths: ['Budget-friendly at $2.99/mo', 'Science and history focus', 'No ads on any plan'],
        exclusiveHighlights: ['Stephen Hawking\'s Favorite Places', 'Deep Ocean', 'Breakthrough'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '100+ documentaries',
        strengths: ['Cinematic production quality', 'Award-winning nature docs', 'Celebrity narrators'],
        exclusiveHighlights: ['Prehistoric Planet', 'The Velvet Queen', 'Tiny World', 'Fireball'],
      },
    ],
    viewingStats: 'Documentary viewership grew 24% year-over-year on major streaming platforms',
    trendingTitles: ['Our Planet', 'Planet Earth III', 'The Social Dilemma', 'Prehistoric Planet', 'Blue Planet', 'My Octopus Teacher'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Access to all major documentary platforms including Discovery+ and CuriosityStream' },
      { countrySlug: 'united-kingdom', reason: 'BBC Earth and Discovery+ provide world-class nature and science content' },
      { countrySlug: 'australia', reason: 'Strong documentary culture with local platforms complementing global services' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for documentaries?',
        answer: 'CuriosityStream offers the best value for documentary fans at $2.99/month with 3,000+ titles. Discovery+ has the largest factual library (2,500+ titles). Netflix leads in original documentary production with Oscar-winning films.',
      },
      {
        question: 'Are there free documentary streaming options?',
        answer: 'Yes. Tubi and Pluto TV offer free documentaries with ads. PBS and YouTube also have extensive free documentary catalogs.',
      },
      {
        question: 'What is the most-watched documentary on Netflix?',
        answer: 'Our Planet and The Social Dilemma are among Netflix\'s most-watched documentaries. True crime docs like Making a Murderer and Tiger King also drew very large audiences.',
      },
    ],
    relatedGenres: ['true-crime', 'sports-documentaries'],
    relatedGlossary: ['content-library', 'ad-supported', 'svod'],
  },
  {
    slug: 'true-crime',
    name: 'True Crime',
    displayName: 'True Crime',
    shortDescription: 'Real-life mysteries and investigations. Netflix, Peacock, and HBO lead in true crime content.',
    longDescription:
      'True crime has grown into one of streaming\'s most popular genres. Netflix leads with series like Making a Murderer and Dahmer that regularly top weekly charts, while Peacock and HBO Max produce premium investigative docuseries. The genre spans serial killer profiles, cold case investigations, wrongful conviction stories, and courtroom dramas. True crime podcasts have also fueled demand for video content, building a fanbase that binges entire series in single sittings.',
    category: 'niche',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '400+ true crime titles',
        strengths: ['Biggest true crime producer', 'Original docuseries', 'Global reach'],
        exclusiveHighlights: ['Dahmer', 'Making a Murderer', 'The Night Stalker', 'Unsolved Mysteries'],
      },
      {
        platformSlug: 'peacock',
        librarySize: '150+ true crime titles',
        strengths: ['NBCUniversal true crime archive', 'Dateline library', 'Free tier available'],
        exclusiveHighlights: ['Dr. Death', 'Joe vs Carole', 'A Friend of the Family'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '100+ true crime titles',
        strengths: ['Premium investigative series', 'Award-winning productions', 'HBO documentary legacy'],
        exclusiveHighlights: ['The Jinx', 'I\'ll Be Gone in the Dark', 'The Staircase', 'Murder on Middle Beach'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '200+ true crime titles',
        strengths: ['FX true crime originals', 'Next-day network episodes', 'Affordable pricing'],
        exclusiveHighlights: ['The Act', 'Under the Banner of Heaven', 'Candy'],
      },
    ],
    viewingStats: 'True crime titles appear in Netflix Top 10 weekly charts over 70% of the time',
    trendingTitles: ['Dahmer', 'Making a Murderer', 'The Jinx Part 2', 'Unsolved Mysteries', 'The Night Stalker', 'American Murder'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Most true crime content available across Netflix, Peacock, Hulu, and HBO' },
      { countrySlug: 'united-kingdom', reason: 'Strong true crime catalog on Netflix UK and Channel 4' },
      { countrySlug: 'australia', reason: 'Growing true crime selection on local platforms and Netflix AU' },
    ],
    faqs: [
      {
        question: 'What streaming service has the most true crime content?',
        answer: 'Netflix has the largest true crime library with 400+ titles including original docuseries. Peacock offers 150+ titles including the extensive Dateline archive. HBO Max features premium investigative documentaries.',
      },
      {
        question: 'Is true crime popular on streaming?',
        answer: 'Extremely. True crime titles appear in Netflix\'s Top 10 weekly charts over 70% of the time. Dahmer became one of Netflix\'s most-watched English-language series ever with over 1 billion viewing hours.',
      },
      {
        question: 'Can I watch true crime documentaries for free?',
        answer: 'Yes. Peacock offers a free tier with some true crime content. Tubi and Pluto TV also have free true crime selections with ads.',
      },
    ],
    relatedGenres: ['documentaries', 'thriller'],
    relatedGlossary: ['content-library', 'binge-watching', 'docuseries'],
  },
  {
    slug: 'reality-tv',
    name: 'Reality TV',
    displayName: 'Reality TV',
    shortDescription: 'Competition shows, dating series, and lifestyle content. Hulu, Discovery+, and Netflix lead reality streaming.',
    longDescription:
      'Reality TV works well on streaming platforms, where binge-friendly formats and next-day availability keep viewers coming back. Hulu offers next-day access to network reality shows, Discovery+ covers the lifestyle and home improvement space, and Netflix has built global hits like Love Is Blind. The genre spans competition shows, dating series, makeover programs, cooking competitions, and travel/lifestyle content.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'hulu',
        librarySize: '500+ reality titles',
        strengths: ['Next-day network episodes', 'Bachelor franchise', 'Reality show archives'],
        exclusiveHighlights: ['The Kardashians', 'The Bachelor', 'Claim to Fame', 'The Golden Bachelor'],
      },
      {
        platformSlug: 'discovery-plus',
        librarySize: '1,000+ reality titles',
        strengths: ['HGTV and Food Network library', 'Home renovation shows', 'TLC archive'],
        exclusiveHighlights: ['90 Day Fiance', 'Fixer Upper', 'House Hunters', 'Chopped'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '300+ reality titles',
        strengths: ['Global reality originals', 'International dating shows', 'Binge-release format'],
        exclusiveHighlights: ['Love Is Blind', 'The Circle', 'Too Hot to Handle', 'Squid Game: The Challenge'],
      },
      {
        platformSlug: 'peacock',
        librarySize: '200+ reality titles',
        strengths: ['Bravo library', 'Real Housewives franchise', 'Below Deck archive'],
        exclusiveHighlights: ['Real Housewives', 'Below Deck', 'Top Chef', 'Vanderpump Rules'],
      },
    ],
    viewingStats: 'Love Is Blind generated 30M+ viewing hours in its first week on Netflix',
    trendingTitles: ['Love Is Blind', 'The Traitors', 'Squid Game: The Challenge', '90 Day Fiance', 'The Golden Bachelor', 'The Circle'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'All reality platforms available including Hulu, Discovery+, and Peacock' },
      { countrySlug: 'united-kingdom', reason: 'Strong reality TV culture with ITV Hub and Netflix UK originals' },
      { countrySlug: 'canada', reason: 'Netflix Canada and Discovery+ offer extensive reality catalogs' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for reality TV?',
        answer: 'Discovery+ has the largest reality catalog with 1,000+ titles across HGTV, TLC, and Food Network. Hulu is best for next-day network reality shows. Netflix leads in original reality competition series.',
      },
      {
        question: 'Can I watch The Bachelor on streaming?',
        answer: 'Yes. New Bachelor episodes are available next-day on Hulu. Full past seasons are available on Hulu and sometimes on Disney+.',
      },
      {
        question: 'What reality shows are trending on Netflix?',
        answer: 'Love Is Blind, The Circle, Too Hot to Handle, and Squid Game: The Challenge are among Netflix\'s most popular reality series globally.',
      },
    ],
    relatedGenres: ['true-crime', 'stand-up-comedy'],
    relatedGlossary: ['binge-watching', 'simulcast', 'ad-supported'],
  },
  {
    slug: 'bollywood',
    name: 'Bollywood',
    displayName: 'Bollywood & Indian Cinema',
    shortDescription: 'The world\'s largest film industry by output. Stream Bollywood hits on Netflix India, Amazon, and JioCinema.',
    longDescription:
      'India\'s film industry produces over 1,800 films annually, making Bollywood and regional Indian cinema the world\'s most prolific. Streaming has opened up access to Indian content globally, with Netflix India, Amazon Prime Video India, and JioCinema at the forefront. From blockbuster Bollywood musicals to regional films in Tamil, Telugu, and Malayalam, Indian cinema spans romance, action, drama, and musical genres. The Indian OTT market is projected to reach $12 billion by 2030.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '600+ Indian titles',
        strengths: ['Original Indian productions', 'Multiple regional languages', 'Global reach'],
        exclusiveHighlights: ['Sacred Games', 'Delhi Crime', 'Khakee', 'Heeramandi'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '800+ Indian titles',
        strengths: ['Largest Indian streaming library', 'Regional language content', 'Amazon Originals India'],
        exclusiveHighlights: ['Mirzapur', 'The Family Man', 'Panchayat', 'Citadel India'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '20+ Indian titles',
        strengths: ['Premium Indian originals', 'International co-productions', 'High production value'],
        exclusiveHighlights: ['Shantaram', 'Hijack'],
      },
    ],
    viewingStats: 'India\'s OTT streaming market is projected to reach $12 billion by 2030',
    trendingTitles: ['The Family Man', 'Mirzapur', 'Sacred Games', 'Panchayat', 'Heeramandi', 'RRR'],
    bestCountriesFor: [
      { countrySlug: 'india', reason: 'Origin country with all platforms, regional languages, and lowest pricing' },
      { countrySlug: 'united-states', reason: 'Large diaspora community with Netflix and Amazon access' },
      { countrySlug: 'united-kingdom', reason: 'Growing Indian content libraries on major platforms' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for Bollywood movies?',
        answer: 'Amazon Prime Video has the largest Indian content library with 800+ titles. Netflix India offers premium originals like Sacred Games and Heeramandi. JioCinema provides a massive free library within India.',
      },
      {
        question: 'Can I watch Bollywood movies outside India?',
        answer: 'Yes. Netflix and Amazon Prime Video offer Indian content globally, though libraries vary by country. Some titles are available on YouTube Premium and specialty platforms.',
      },
      {
        question: 'How big is the Indian streaming market?',
        answer: 'India\'s OTT market is one of the world\'s fastest-growing, projected to reach $12 billion by 2030. India produces over 1,800 films annually, more than any other country.',
      },
    ],
    relatedGenres: ['telenovelas', 'romantic-comedy', 'k-drama'],
    relatedGlossary: ['geo-restriction', 'content-library', 'regional-licensing'],
  },
  {
    slug: 'horror',
    name: 'Horror',
    displayName: 'Horror',
    shortDescription: 'Slashers, psychological terror, and supernatural thrillers. Shudder, AMC+, and Netflix lead horror streaming.',
    longDescription:
      'Horror streaming got a boost from specialty platform Shudder, which curates horror, thriller, and supernatural content. AMC+ builds on AMC\'s legacy with The Walking Dead universe and original horror series. Netflix and Hulu produce horror originals that regularly top weekly charts. The genre spans classic slashers, psychological horror, supernatural thrillers, folk horror, and found footage. Streaming has also made obscure international horror easier to find than ever.',
    category: 'niche',
    bestPlatforms: [
      {
        platformSlug: 'shudder',
        librarySize: '800+ horror titles',
        strengths: ['Horror-dedicated platform', 'Curated collections', 'Exclusive premieres', 'Just $5.99/mo'],
        exclusiveHighlights: ['Creepshow', 'V/H/S/85', 'The Last Drive-In', 'Deadstream'],
      },
      {
        platformSlug: 'amc-plus',
        librarySize: '200+ horror titles',
        strengths: ['Walking Dead universe', 'AMC originals', 'IFC Films catalog'],
        exclusiveHighlights: ['The Walking Dead: Daryl Dixon', 'Interview with the Vampire', 'Mayfair Witches'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '500+ horror titles',
        strengths: ['Big-budget originals', 'International horror', 'Mike Flanagan productions'],
        exclusiveHighlights: ['The Haunting of Hill House', 'Wednesday', 'Fear Street', 'Stranger Things'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '300+ horror titles',
        strengths: ['FX horror originals', 'Blumhouse films', 'Next-day network content'],
        exclusiveHighlights: ['Prey', 'American Horror Story', 'Alien: Romulus'],
      },
    ],
    viewingStats: 'Shudder has grown to over 1.5 million subscribers, making it the top horror-specific platform',
    trendingTitles: ['The Haunting of Hill House', 'Stranger Things', 'Wednesday', 'Interview with the Vampire', 'Prey', 'Creepshow'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'All horror platforms available including Shudder, AMC+, and Hulu' },
      { countrySlug: 'canada', reason: 'Shudder and Netflix Canada offer strong horror catalogs' },
      { countrySlug: 'united-kingdom', reason: 'Shudder UK and Netflix UK provide extensive horror libraries' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for horror movies?',
        answer: 'Shudder is the top dedicated horror platform with 800+ titles at just $5.99/month. Netflix has the largest general horror catalog (500+ titles). AMC+ is ideal for Walking Dead and Anne Rice universe fans.',
      },
      {
        question: 'Is Shudder worth it for horror fans?',
        answer: 'Yes. At $5.99/month, Shudder offers 800+ curated horror titles, exclusive premieres, and original series. For dedicated horror fans, it is the go-to platform.',
      },
      {
        question: 'What are the scariest shows on Netflix?',
        answer: 'The Haunting of Hill House, Midnight Mass, and The Haunting of Bly Manor (all by Mike Flanagan) are critically acclaimed. Wednesday, Stranger Things, and Fear Street are popular genre hits.',
      },
    ],
    relatedGenres: ['thriller', 'sci-fi', 'true-crime'],
    relatedGlossary: ['content-library', 'exclusive-content', 'niche-platform'],
  },
  {
    slug: 'sci-fi',
    name: 'Sci-Fi',
    displayName: 'Science Fiction',
    shortDescription: 'Space operas, dystopian futures, and time travel. Apple TV+, Netflix, and Amazon lead sci-fi streaming.',
    longDescription:
      'Science fiction is one of the biggest draws for premium streaming. Apple TV+ has built a strong sci-fi lineup with Foundation, Severance, and For All Mankind. Netflix produces the widest variety of sci-fi content, from blockbusters like Stranger Things to international originals. Amazon Prime Video features The Expanse and Fallout. The genre\'s high production costs and loyal fanbases mean Apple TV+, Netflix, and Amazon all compete heavily for sci-fi viewers.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '50+ sci-fi titles',
        strengths: ['Award-winning originals', 'Highest production values', 'No ads on any plan'],
        exclusiveHighlights: ['Severance', 'Foundation', 'For All Mankind', 'Silo', 'Dark Matter'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '600+ sci-fi titles',
        strengths: ['Largest sci-fi catalog', 'International sci-fi originals', 'Binge-release format'],
        exclusiveHighlights: ['Stranger Things', '3 Body Problem', 'Black Mirror', 'Dark'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '400+ sci-fi titles',
        strengths: ['Premium adaptations', 'Included with Prime', 'IMDb TV free titles'],
        exclusiveHighlights: ['Fallout', 'The Expanse', 'Upload', 'Night Sky'],
      },
      {
        platformSlug: 'paramount-plus',
        librarySize: '150+ sci-fi titles',
        strengths: ['Star Trek universe', 'CBS sci-fi archive', 'Affordable pricing'],
        exclusiveHighlights: ['Star Trek: Strange New Worlds', 'Star Trek: Picard', 'Halo'],
      },
    ],
    viewingStats: 'Severance Season 2 became Apple TV+\'s most-watched premiere with 8.5M views in 4 days',
    trendingTitles: ['Severance', 'Fallout', '3 Body Problem', 'Foundation', 'Silo', 'Stranger Things'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Full access to Apple TV+, Netflix, Amazon, and Paramount+ sci-fi libraries' },
      { countrySlug: 'united-kingdom', reason: 'Strong sci-fi selection plus BBC Doctor Who and Channel 4 originals' },
      { countrySlug: 'germany', reason: 'Netflix Germany offers Dark and strong international sci-fi catalog' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for science fiction?',
        answer: 'Apple TV+ leads in critically acclaimed sci-fi originals (Severance, Foundation, Silo). Netflix has the largest catalog with 600+ titles. Amazon Prime Video offers premium adaptations like Fallout and The Expanse.',
      },
      {
        question: 'Where can I watch Star Trek?',
        answer: 'Paramount+ is the home of all Star Trek series including Strange New Worlds, Discovery, and Picard, plus the complete classic series archive.',
      },
      {
        question: 'Is Apple TV+ worth it for sci-fi fans?',
        answer: 'Yes. Apple TV+ produces some of the highest-rated sci-fi series on any platform including Severance, Foundation, For All Mankind, Silo, and Dark Matter. At $9.99/month, it is premium but ad-free.',
      },
    ],
    relatedGenres: ['fantasy', 'anime', 'thriller'],
    relatedGlossary: ['streaming-wars', 'exclusive-content', 'svod'],
  },
  {
    slug: 'telenovelas',
    name: 'Telenovelas',
    displayName: 'Telenovelas & Latin Drama',
    shortDescription: 'Passionate storytelling from Latin America and Spain. Netflix, ViX, and Amazon bring telenovelas worldwide.',
    longDescription:
      'Telenovelas are a staple of Latin American entertainment, featuring dramatic storylines, romance, and family sagas in limited-run formats. Streaming has brought the genre well beyond its traditional broadcast audience. Netflix put major investment into Spanish-language originals like La Casa de Papel (Money Heist), which became the platform\'s most-watched non-English series. ViX (from TelevisaUnivision) has the largest telenovela library, while Amazon Prime Video expands its Latin American original slate.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '200+ Latin titles',
        strengths: ['Spanish-language originals', 'Global distribution', 'Subtitles and dubs'],
        exclusiveHighlights: ['La Casa de Papel', 'Elite', 'Who Killed Sara-', 'Dark Desire'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '100+ Latin titles',
        strengths: ['Growing Latin American slate', 'Included with Prime', 'Regional originals'],
        exclusiveHighlights: ['El Presidente', 'Maradona: Blessed Dream', 'Los Ricos Tambien Lloran'],
      },
      {
        platformSlug: 'disney-plus',
        librarySize: '50+ Latin titles',
        strengths: ['Star-branded Latin content', 'Family-friendly telenovelas', 'Global availability'],
        exclusiveHighlights: ['Santa Evita', 'Nada'],
      },
    ],
    viewingStats: 'La Casa de Papel became Netflix\'s most-watched non-English series with 69B+ minutes viewed',
    trendingTitles: ['La Casa de Papel', 'Elite', 'Dark Desire', 'Who Killed Sara-', 'Rebelde', 'Pasion de Gavilanes'],
    bestCountriesFor: [
      { countrySlug: 'mexico', reason: 'Origin market for telenovelas with ViX, Netflix, and Amazon access' },
      { countrySlug: 'brazil', reason: 'Strong telenovela tradition with Globoplay and Netflix Brazil' },
      { countrySlug: 'united-states', reason: 'Large Hispanic audience with access to ViX, Netflix, and Amazon' },
    ],
    faqs: [
      {
        question: 'Where can I watch telenovelas online?',
        answer: 'Netflix has the largest global telenovela library with 200+ titles. ViX (from TelevisaUnivision) specializes in telenovelas with a free ad-supported tier. Amazon Prime Video also carries a growing Latin American catalog.',
      },
      {
        question: 'What is the most popular telenovela on Netflix?',
        answer: 'La Casa de Papel (Money Heist) is Netflix\'s most-watched non-English series ever with over 69 billion minutes viewed. Elite and Who Killed Sara- are also top performers.',
      },
      {
        question: 'Can I watch telenovelas with English subtitles?',
        answer: 'Yes. Netflix offers English subtitles on all telenovelas. ViX provides subtitles on select titles. Amazon Prime Video also includes English subtitle options for most Latin American content.',
      },
    ],
    relatedGenres: ['k-drama', 'bollywood', 'romantic-comedy'],
    relatedGlossary: ['geo-restriction', 'content-library', 'regional-licensing'],
  },
  {
    slug: 'british-drama',
    name: 'British Drama',
    displayName: 'British Drama',
    shortDescription: 'Period pieces, detective thrillers, and BBC drama. BritBox, Acorn TV, and Netflix bring the best of British TV.',
    longDescription:
      'British drama is known for sharp writing, period productions, and detective series. BritBox (a BBC/ITV joint venture) has the largest British TV library, while Acorn TV curates British, Australian, and international dramas. Netflix has invested in British originals like The Crown and Bridgerton, bringing UK storytelling to global audiences. From Downton Abbey to Sherlock, British dramas consistently rank among the most acclaimed content on any platform.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'britbox',
        librarySize: '1,000+ British titles',
        strengths: ['Definitive BBC/ITV library', 'Classic and new British shows', 'Affordable at $8.99/mo'],
        exclusiveHighlights: ['Midsomer Murders', 'EastEnders', 'Emmerdale', 'Classic Doctor Who'],
      },
      {
        platformSlug: 'acorn-tv',
        librarySize: '500+ titles',
        strengths: ['Curated British and international drama', 'Mystery and detective focus', 'Just $6.99/mo'],
        exclusiveHighlights: ['Agatha Raisin', 'Doc Martin', 'Murdoch Mysteries', 'Jack Irish'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '300+ British titles',
        strengths: ['Big-budget British originals', 'Global availability', 'Period dramas'],
        exclusiveHighlights: ['The Crown', 'Bridgerton', 'Top Boy', 'Heartstopper'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '200+ British titles',
        strengths: ['Included with Prime', 'Channel 4 co-productions', 'British film catalog'],
        exclusiveHighlights: ['Fleabag', 'Good Omens', 'Clarkson\'s Farm', 'The Grand Tour'],
      },
    ],
    viewingStats: 'The Crown is Netflix\'s most-watched British drama with over 21B minutes viewed across all seasons',
    trendingTitles: ['The Crown', 'Bridgerton', 'Fleabag', 'Good Omens', 'Slow Horses', 'Heartstopper'],
    bestCountriesFor: [
      { countrySlug: 'united-kingdom', reason: 'Origin country with BBC iPlayer, ITV Hub, and all British platforms' },
      { countrySlug: 'united-states', reason: 'BritBox, Acorn TV, and major platforms offer extensive British libraries' },
      { countrySlug: 'australia', reason: 'Strong cultural ties with BritBox AU and ABC iview' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for British TV?',
        answer: 'BritBox offers the definitive British TV library with 1,000+ titles from BBC and ITV. Acorn TV curates 500+ British and international dramas. Netflix carries big-budget British originals like The Crown and Bridgerton.',
      },
      {
        question: 'Is BritBox worth it?',
        answer: 'At $8.99/month, BritBox is good value for British TV fans, with the largest collection of BBC and ITV content outside the UK, including classics and new exclusives.',
      },
      {
        question: 'Can I watch BBC shows in the US?',
        answer: 'Yes. BritBox carries the largest BBC library in the US. Many BBC shows also appear on Netflix, Amazon Prime Video, and PBS Masterpiece.',
      },
    ],
    relatedGenres: ['thriller', 'documentaries', 'true-crime'],
    relatedGlossary: ['geo-restriction', 'content-library', 'simulcast'],
  },
  {
    slug: 'stand-up-comedy',
    name: 'Stand-Up Comedy',
    displayName: 'Stand-Up Comedy',
    shortDescription: 'Netflix leads stand-up with 400+ specials, from Dave Chappelle to Ali Wong and global comedians.',
    longDescription:
      'Stand-up comedy specials are a big part of Netflix\'s catalog, backed by hundreds of millions in exclusive deals with top comedians. Netflix hosts 400+ stand-up specials, far more than any competitor. Amazon Prime Video and YouTube Premium also produce comedy specials, while HBO Max continues its long run of HBO Comedy specials. The format\'s low production cost and high replay value make it a smart bet for streaming platforms.',
    category: 'niche',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '400+ specials',
        strengths: ['Largest stand-up library', 'Exclusive comedian deals', 'Global comedy specials'],
        exclusiveHighlights: ['Dave Chappelle specials', 'Ali Wong: Single Lady', 'Chris Rock: Selective Outrage', 'Hannah Gadsby: Nanette'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '100+ specials',
        strengths: ['Included with Prime', 'International comedians', 'Growing investment'],
        exclusiveHighlights: ['Borat Subsequent Moviefilm', 'James Acaster: Repertoire'],
      },
      {
        platformSlug: 'youtube-premium',
        librarySize: '200+ specials',
        strengths: ['Free comedy content available', 'Creator-produced specials', 'Global reach'],
        exclusiveHighlights: ['Desi Banks specials', 'Creator comedy originals'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '150+ specials',
        strengths: ['Legacy HBO comedy specials', 'Premium productions', 'John Oliver archive'],
        exclusiveHighlights: ['John Mulaney: Baby J', 'Jerrod Carmichael: Rothaniel', 'Bo Burnham: Inside'],
      },
    ],
    viewingStats: 'Netflix has invested over $500M in stand-up comedy specials since 2015',
    trendingTitles: ['Ali Wong: Single Lady', 'Chris Rock: Selective Outrage', 'Dave Chappelle: The Dreamer', 'John Mulaney: Baby J', 'Ramy Youssef: More Feelings'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Largest stand-up catalog across all platforms' },
      { countrySlug: 'united-kingdom', reason: 'Strong local comedy scene with Netflix UK and BBC specials' },
      { countrySlug: 'canada', reason: 'Rich comedy tradition with Netflix and Amazon access' },
    ],
    faqs: [
      {
        question: 'What streaming service has the most stand-up comedy?',
        answer: 'Netflix dominates with 400+ stand-up specials, including exclusive deals with Dave Chappelle, Chris Rock, and Ali Wong. HBO Max has 150+ specials from its legacy HBO comedy catalog.',
      },
      {
        question: 'Can I watch stand-up comedy for free?',
        answer: 'Yes. YouTube has thousands of free stand-up clips and some full specials. Tubi and Pluto TV also offer free comedy specials with ads.',
      },
      {
        question: 'How much has Netflix spent on comedy specials?',
        answer: 'Netflix has invested over $500 million in stand-up comedy specials since 2015, signing exclusive multi-special deals with top comedians worldwide.',
      },
    ],
    relatedGenres: ['reality-tv', 'documentaries'],
    relatedGlossary: ['exclusive-content', 'svod', 'content-library'],
  },
  {
    slug: 'kids-animation',
    name: 'Kids Animation',
    displayName: 'Kids & Family Animation',
    shortDescription: 'Disney+ leads family animation with Pixar and Marvel. Netflix and Amazon compete with original kids content.',
    longDescription:
      'Kids and family animation drives household subscriptions. Disney+ leads with the entire Pixar, Disney Animation, and Marvel animated catalog. Netflix has responded with original animated series and films, while Amazon Prime Video offers a growing kids library. PBS Kids provides free educational content, and Apple TV+ carries Peanuts and other family-friendly originals. Families stick with services that have good kids content, which is why every platform invests in this category.',
    category: 'family',
    bestPlatforms: [
      {
        platformSlug: 'disney-plus',
        librarySize: '1,500+ kids titles',
        strengths: ['Pixar and Disney Animation vault', 'Marvel and Star Wars animated', 'Parental controls', 'Download for offline'],
        exclusiveHighlights: ['Frozen', 'Moana', 'Encanto', 'Bluey', 'Marvel animated series'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '800+ kids titles',
        strengths: ['Original animated series', 'Interactive shows', 'Kids profiles with restrictions'],
        exclusiveHighlights: ['CoComelon', 'Boss Baby: Back in the Crib', 'My Dad the Bounty Hunter', 'Ada Twist, Scientist'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '500+ kids titles',
        strengths: ['Amazon Kids+ add-on', 'Educational content', 'Included with Prime'],
        exclusiveHighlights: ['Pete the Cat', 'Kung Fu Panda', 'If You Give a Mouse a Cookie'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '50+ kids titles',
        strengths: ['Peanuts specials', 'High-quality originals', 'No ads'],
        exclusiveHighlights: ['Peanuts holiday specials', 'Ghostwriter', 'Helpsters', 'Snoopy in Space'],
      },
    ],
    viewingStats: 'Disney+ has 1,500+ kids titles - more than any other platform',
    trendingTitles: ['Bluey', 'CoComelon', 'Encanto', 'Moana', 'Frozen', 'Inside Out 2'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'All kids platforms available including Disney+, Netflix, and PBS Kids' },
      { countrySlug: 'united-kingdom', reason: 'Disney+ and CBeebies on BBC iPlayer offer excellent kids content' },
      { countrySlug: 'australia', reason: 'Bluey home country with Disney+ and ABC Kids' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for kids?',
        answer: 'Disney+ leads with 1,500+ kids titles including Pixar, Disney Animation, Marvel, and Star Wars. Netflix offers 800+ kids titles with original animated series. Amazon Kids+ provides a curated ad-free experience for children.',
      },
      {
        question: 'Are there free kids streaming options?',
        answer: 'Yes. PBS Kids offers free educational shows. YouTube Kids is free with ads. Tubi and Pluto TV also have free kids sections.',
      },
      {
        question: 'Is Disney+ safe for kids?',
        answer: 'Yes. Disney+ offers parental controls, kids profiles with content restrictions, and the ability to set content ratings limits. The platform was designed with family viewing in mind.',
      },
    ],
    relatedGenres: ['anime', 'fantasy'],
    relatedGlossary: ['parental-controls', 'content-library', 'ad-free'],
  },
  {
    slug: 'turkish-dramas',
    name: 'Turkish Dramas',
    displayName: 'Turkish Dramas (Dizi)',
    shortDescription: 'Turkey is the world\'s #2 TV exporter. Netflix and Amazon bring Turkish dramas to 150+ countries.',
    longDescription:
      'Turkish dramas, known as dizi, have made Turkey the world\'s second-largest TV exporter after the United States. These emotionally driven series feature high production values, historical settings, and complex family dynamics. Netflix distributes Turkish originals to 150+ countries. The genre has large followings in the Middle East, Latin America, and South Asia. Shows like Magnificent Century have been watched by over 500 million viewers worldwide.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '100+ Turkish titles',
        strengths: ['Global distribution', 'Turkish originals', 'Subtitles in dozens of languages'],
        exclusiveHighlights: ['The Protector', 'The Gift', 'Fatma', 'Midnight at the Pera Palace'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '50+ Turkish titles',
        strengths: ['Growing Turkish catalog', 'Included with Prime', 'Regional availability'],
        exclusiveHighlights: ['Magnificent Century', 'Intersection'],
      },
      {
        platformSlug: 'disney-plus',
        librarySize: '20+ Turkish titles',
        strengths: ['Star-branded content', 'Premium Turkish productions', 'Family-friendly options'],
        exclusiveHighlights: ['Ataturk', 'Escape from Kabul'],
      },
    ],
    viewingStats: 'Turkey is the world\'s #2 TV content exporter - Turkish dramas reach 700M+ viewers in 150+ countries',
    trendingTitles: ['The Protector', 'Magnificent Century', 'Fatma', 'Midnight at the Pera Palace', 'The Gift', 'Intersection'],
    bestCountriesFor: [
      { countrySlug: 'germany', reason: 'Large Turkish diaspora community and extensive Netflix catalog' },
      { countrySlug: 'brazil', reason: 'Growing Turkish drama fanbase with Netflix and Amazon access' },
      { countrySlug: 'india', reason: 'Rapidly growing audience for Turkish content on streaming platforms' },
    ],
    faqs: [
      {
        question: 'Where can I watch Turkish dramas online?',
        answer: 'Netflix offers the largest global Turkish drama library with 100+ titles and subtitles in dozens of languages. Amazon Prime Video and Disney+ also carry Turkish content in many regions.',
      },
      {
        question: 'Why are Turkish dramas so popular?',
        answer: 'Turkish dramas combine high production values, sweeping storylines, and emotional depth. Turkey is the world\'s #2 TV exporter, with series reaching 700 million viewers in 150+ countries.',
      },
      {
        question: 'Are Turkish dramas available with English subtitles?',
        answer: 'Yes. Netflix provides English subtitles on all Turkish dramas. Amazon Prime Video and other platforms also offer subtitle options for most Turkish content.',
      },
    ],
    relatedGenres: ['k-drama', 'telenovelas', 'british-drama'],
    relatedGlossary: ['geo-restriction', 'content-library', 'simulcast'],
  },
  {
    slug: 'french-cinema',
    name: 'French Cinema',
    displayName: 'French Cinema',
    shortDescription: 'Art-house classics and modern thrillers. MUBI, Criterion Channel, and Netflix curate the best of French film.',
    longDescription:
      'French cinema has a long tradition of artistic filmmaking, from the New Wave classics of Godard and Truffaut to modern auteur works and genre-bending thrillers. MUBI curates a rotating selection of international art-house films with a strong French focus, while Criterion Channel preserves classic French cinema. Netflix has backed French-language originals like Lupin, which became a worldwide hit. The genre spans drama, comedy, thriller, and romance, and appeals to both cinephiles and casual viewers.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'mubi',
        librarySize: '400+ French titles',
        strengths: ['Art-house curation', 'Rotating selection', 'Festival premieres', 'Director spotlights'],
        exclusiveHighlights: ['Curated New Wave classics', 'Cannes selections', 'French auteur retrospectives'],
      },
      {
        platformSlug: 'criterion-channel',
        librarySize: '300+ French titles',
        strengths: ['Classic French cinema archive', 'Director collections', 'Film scholar commentary'],
        exclusiveHighlights: ['Complete Godard collection', 'Truffaut retrospectives', 'Agnes Varda films'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '150+ French titles',
        strengths: ['French-language originals', 'Global distribution', 'Mainstream French content'],
        exclusiveHighlights: ['Lupin', 'The Hook Up Plan', 'Inhuman Resources', 'Arsene Lupin'],
      },
    ],
    viewingStats: 'Lupin became the first French-language Netflix series to reach 70M+ households in its first month',
    trendingTitles: ['Lupin', 'The Hook Up Plan', 'Anatomy of a Fall', 'Blue Is the Warmest Color', 'Portrait of a Lady on Fire'],
    bestCountriesFor: [
      { countrySlug: 'france', reason: 'Origin country with the largest French content libraries and local platforms' },
      { countrySlug: 'canada', reason: 'French-speaking Quebec ensures strong French content availability' },
      { countrySlug: 'united-states', reason: 'MUBI, Criterion Channel, and Netflix offer curated French cinema' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for French movies?',
        answer: 'MUBI curates the best art-house French films with a rotating library. Criterion Channel preserves classic French cinema with scholarly commentary. Netflix offers mainstream French originals like Lupin.',
      },
      {
        question: 'Is Lupin worth watching?',
        answer: 'Yes. Lupin became Netflix\'s first French-language series to reach 70 million households in its first month. The show blends heist thriller and mystery in a modern Parisian setting.',
      },
      {
        question: 'Can I watch French movies with subtitles?',
        answer: 'Yes. Netflix, MUBI, and Criterion Channel all provide English subtitles for French content. MUBI also offers subtitles in multiple additional languages.',
      },
    ],
    relatedGenres: ['documentaries', 'thriller', 'romantic-comedy'],
    relatedGlossary: ['art-house', 'content-library', 'geo-restriction'],
  },
  {
    slug: 'romantic-comedy',
    name: 'Romantic Comedy',
    displayName: 'Romantic Comedy',
    shortDescription: 'Feel-good love stories and laugh-out-loud romances. Netflix, Hulu, and Amazon lead the rom-com revival.',
    longDescription:
      'Romantic comedies have made a comeback on streaming after years of decline in theaters. Netflix leads with original films and series that consistently top viewing charts. Hulu offers a deep catalog of classic and modern rom-coms, while Amazon Prime Video invests in original romantic content. The genre spans meet-cute films, workplace romances, holiday specials, and romantic dramedies. Streaming platforms now produce more rom-coms annually than traditional studios.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '500+ rom-com titles',
        strengths: ['Original rom-com films', 'Holiday romance specials', 'Global romantic content'],
        exclusiveHighlights: ['Set It Up', 'To All the Boys I\'ve Loved Before', 'Anyone But You', 'Your Place or Mine'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '300+ rom-com titles',
        strengths: ['Classic rom-com catalog', 'Next-day network romances', 'Studio film library'],
        exclusiveHighlights: ['Fire Island', 'No Hard Feelings', 'Plus One'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '400+ rom-com titles',
        strengths: ['Large back-catalog', 'Included with Prime', 'Theatrical releases'],
        exclusiveHighlights: ['The Big Sick', 'Shotgun Wedding', 'I Want You Back'],
      },
    ],
    viewingStats: 'To All the Boys I\'ve Loved Before was watched by 80M+ households in its first month on Netflix',
    trendingTitles: ['To All the Boys I\'ve Loved Before', 'Set It Up', 'Anyone But You', 'No Hard Feelings', 'Shotgun Wedding', 'Your Place or Mine'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Largest rom-com library across Netflix, Hulu, and Amazon' },
      { countrySlug: 'united-kingdom', reason: 'Strong British rom-com tradition with Netflix UK and Amazon' },
      { countrySlug: 'australia', reason: 'Growing rom-com catalog on Netflix AU and Amazon AU' },
    ],
    faqs: [
      {
        question: 'What streaming service has the best romantic comedies?',
        answer: 'Netflix leads with 500+ rom-com titles and the most original productions. Amazon Prime Video has a deep back-catalog of 400+ titles. Hulu offers 300+ rom-coms including classic studio films.',
      },
      {
        question: 'Are rom-coms making a comeback?',
        answer: 'Yes. Streaming platforms have revived the rom-com genre, producing more original romantic comedies than traditional studios. Netflix alone releases 20+ rom-coms annually.',
      },
      {
        question: 'What is the most popular rom-com on Netflix?',
        answer: 'To All the Boys I\'ve Loved Before was watched by over 80 million households in its first month, making it one of Netflix\'s most successful original rom-coms.',
      },
    ],
    relatedGenres: ['k-drama', 'bollywood', 'stand-up-comedy'],
    relatedGlossary: ['content-library', 'binge-watching', 'svod'],
  },
  {
    slug: 'thriller',
    name: 'Thriller',
    displayName: 'Thrillers & Suspense',
    shortDescription: 'Suspense, twists, and tension. Netflix, Apple TV+, and Amazon produce the best thrillers on streaming.',
    longDescription:
      'Thrillers are among the most-watched genres on streaming platforms, blending suspense, twists, and psychological tension. Netflix produces the highest volume of thriller content, while Apple TV+ has earned acclaim with shows like Severance and Slow Horses. Amazon Prime Video focuses on thriller adaptations and spy series. The genre spans psychological thrillers, spy dramas, crime thrillers, and action suspense, and it consistently ranks among the most popular streaming categories.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '800+ thriller titles',
        strengths: ['Largest thriller catalog', 'International thrillers', 'Weekly chart-toppers'],
        exclusiveHighlights: ['You', 'Ozark', 'The Night Agent', 'Fool Me Once', 'Griselda'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '40+ thriller titles',
        strengths: ['Critically acclaimed originals', 'Spy thriller focus', 'Award-winning productions'],
        exclusiveHighlights: ['Slow Horses', 'Severance', 'Hijack', 'Presumed Innocent', 'Black Bird'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '500+ thriller titles',
        strengths: ['Tom Clancy franchise', 'Spy series', 'Included with Prime'],
        exclusiveHighlights: ['Jack Ryan', 'Reacher', 'The Power', 'Citadel'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '200+ thriller titles',
        strengths: ['Premium HBO thrillers', 'Limited series focus', 'Award-winning productions'],
        exclusiveHighlights: ['True Detective', 'The White Lotus', 'Industry', 'Succession'],
      },
    ],
    viewingStats: 'The Night Agent became Netflix\'s 5th most-watched English-language series with 812M viewing hours',
    trendingTitles: ['The Night Agent', 'Slow Horses', 'Reacher', 'You', 'Fool Me Once', 'Griselda'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'All thriller platforms available with the largest combined catalog' },
      { countrySlug: 'united-kingdom', reason: 'Slow Horses and British spy thrillers plus global platforms' },
      { countrySlug: 'germany', reason: 'Netflix Germany carries Dark and strong international thriller selection' },
    ],
    faqs: [
      {
        question: 'What streaming service has the best thrillers?',
        answer: 'Netflix has the largest thriller catalog with 800+ titles. Apple TV+ produces the most critically acclaimed thriller originals including Slow Horses and Severance. Amazon offers Reacher and Jack Ryan.',
      },
      {
        question: 'What is the most popular thriller on Netflix?',
        answer: 'The Night Agent became Netflix\'s 5th most-watched English-language series with 812 million viewing hours. You, Ozark, and Fool Me Once are also among the top performers.',
      },
      {
        question: 'Are Apple TV+ thrillers worth subscribing for?',
        answer: 'Yes. Apple TV+ produces some of the highest-rated thrillers on any platform, including Slow Horses (91% Rotten Tomatoes), Severance, and Hijack. The quality-to-quantity ratio is excellent.',
      },
    ],
    relatedGenres: ['true-crime', 'horror', 'sci-fi'],
    relatedGlossary: ['binge-watching', 'exclusive-content', 'svod'],
  },
  {
    slug: 'fantasy',
    name: 'Fantasy',
    displayName: 'Fantasy & Epic',
    shortDescription: 'Billion-dollar fantasy epics. Amazon\'s Rings of Power, HBO\'s House of the Dragon, and Netflix lead the genre.',
    longDescription:
      'Fantasy is the most expensive genre in streaming, with platforms spending billions on epic adaptations. Amazon put over $1 billion into The Lord of the Rings: The Rings of Power, while HBO\'s House of the Dragon continues the Game of Thrones story. Netflix produces a wide variety of fantasy content from The Witcher to Shadow and Bone. Apple TV+ and Disney+ also compete with original fantasy series. Large fanbases and franchise potential keep every major platform investing here.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '200+ fantasy titles',
        strengths: ['$1B+ Tolkien investment', 'Wheel of Time adaptation', 'Included with Prime'],
        exclusiveHighlights: ['The Rings of Power', 'The Wheel of Time', 'Good Omens'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '150+ fantasy titles',
        strengths: ['Game of Thrones universe', 'Premium fantasy productions', 'Award-winning series'],
        exclusiveHighlights: ['House of the Dragon', 'Game of Thrones', 'His Dark Materials', 'A Knight of the Seven Kingdoms'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '400+ fantasy titles',
        strengths: ['Widest fantasy catalog', 'International fantasy', 'Book adaptations'],
        exclusiveHighlights: ['The Witcher', 'Shadow and Bone', 'Arcane', 'Avatar: The Last Airbender'],
      },
      {
        platformSlug: 'disney-plus',
        librarySize: '200+ fantasy titles',
        strengths: ['Marvel and Star Wars', 'Disney classics', 'Family-friendly fantasy'],
        exclusiveHighlights: ['Loki', 'Percy Jackson', 'Willow', 'Ahsoka'],
      },
    ],
    viewingStats: 'Amazon invested over $1 billion in Rings of Power - the most expensive TV series ever produced',
    trendingTitles: ['House of the Dragon', 'The Rings of Power', 'The Witcher', 'Loki', 'Percy Jackson', 'Arcane'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'All fantasy platforms available with the largest combined library' },
      { countrySlug: 'united-kingdom', reason: 'Strong fantasy tradition with HBO, Amazon, and Netflix access' },
      { countrySlug: 'germany', reason: 'Major fantasy market with dubbed content on all platforms' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for fantasy?',
        answer: 'HBO Max leads with House of the Dragon and the Game of Thrones universe. Amazon Prime Video offers The Rings of Power and Wheel of Time. Netflix has the widest catalog with 400+ fantasy titles.',
      },
      {
        question: 'How much did Amazon spend on Rings of Power?',
        answer: 'Amazon invested over $1 billion in The Lord of the Rings: The Rings of Power, making it the most expensive television series ever produced. The rights alone cost $250 million.',
      },
      {
        question: 'Where can I watch Game of Thrones and House of the Dragon?',
        answer: 'Both Game of Thrones and House of the Dragon are exclusively available on HBO Max (Max). No other streaming service carries these series.',
      },
    ],
    relatedGenres: ['sci-fi', 'anime', 'kids-animation'],
    relatedGlossary: ['streaming-wars', 'exclusive-content', 'franchise'],
  },
  {
    slug: 'sports-documentaries',
    name: 'Sports Documentaries',
    displayName: 'Sports Documentaries',
    shortDescription: 'Behind-the-scenes access and legendary stories. ESPN+, Netflix, and Apple TV+ lead sports documentary streaming.',
    longDescription:
      'Sports documentaries have become much more popular on streaming, helped by Netflix\'s approach of mixing athletic drama with good storytelling. ESPN+ has the deepest sports documentary archive through the acclaimed 30 for 30 series. Netflix produces global sports docuseries like Formula 1: Drive to Survive, which is credited with growing F1\'s US audience by 40%. Apple TV+ and Amazon Prime Video also produce sports documentaries with behind-the-scenes access to major leagues and athletes.',
    category: 'documentary',
    bestPlatforms: [
      {
        platformSlug: 'espn-plus',
        librarySize: '500+ sports docs',
        strengths: ['30 for 30 archive', 'Deepest sports documentary library', 'Live sports bundle'],
        exclusiveHighlights: ['30 for 30 series', 'The Last Dance (co-production)', 'E:60 specials'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '200+ sports docs',
        strengths: ['Global sports docuseries', 'Behind-the-scenes access', 'Binge format'],
        exclusiveHighlights: ['Formula 1: Drive to Survive', 'Full Swing', 'Quarterback', 'Sprint'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '150+ sports docs',
        strengths: ['European football docs', 'Boxing specials', 'Included with Prime'],
        exclusiveHighlights: ['All or Nothing series', 'El Corazon de Sergio Ramos', 'Inside Borussia Dortmund'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '30+ sports docs',
        strengths: ['Premium sports storytelling', 'MLS Season Pass tie-in', 'Award-quality productions'],
        exclusiveHighlights: ['The Dynasty: New England Patriots', 'Make or Break', 'They Call Me Magic'],
      },
    ],
    viewingStats: 'Drive to Survive is credited with growing F1\'s US audience by 40% since its 2019 debut',
    trendingTitles: ['Formula 1: Drive to Survive', 'Full Swing', 'Quarterback', 'The Last Dance', 'The Dynasty', 'Sprint'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'ESPN+, Netflix, and all sports doc platforms available' },
      { countrySlug: 'united-kingdom', reason: 'Strong football documentary culture on Amazon and Netflix' },
      { countrySlug: 'brazil', reason: 'Football documentaries and Netflix sports content widely available' },
    ],
    faqs: [
      {
        question: 'What streaming service has the best sports documentaries?',
        answer: 'ESPN+ has the deepest library with 500+ sports docs including the acclaimed 30 for 30 series. Netflix produces the most popular sports docuseries like Drive to Survive and Full Swing. Apple TV+ offers premium sports storytelling.',
      },
      {
        question: 'Did Drive to Survive really grow F1 viewership?',
        answer: 'Yes. Formula 1: Drive to Survive is credited with growing F1\'s US audience by approximately 40% since its 2019 debut on Netflix.',
      },
      {
        question: 'Where can I watch The Last Dance?',
        answer: 'The Last Dance is available on Netflix in most countries. It was originally a co-production between ESPN and Netflix, documenting Michael Jordan\'s final season with the Chicago Bulls.',
      },
    ],
    relatedGenres: ['documentaries', 'true-crime'],
    relatedGlossary: ['exclusive-content', 'content-library', 'svod'],
  },
  {
    slug: 'nordic-noir',
    name: 'Nordic Noir',
    displayName: 'Nordic Noir',
    shortDescription: 'Atmospheric Scandinavian crime dramas. The Bridge, Borgen, and Trapped helped popularize subtitled TV worldwide.',
    longDescription:
      'Nordic Noir is a genre of crime drama from Scandinavia, known for bleak settings, morally complex characters, and dark social commentary in police procedural formats. Series like The Bridge (Broen), Borgen, and Trapped have built large international fanbases, showing that subtitled drama can find mainstream global audiences. Netflix, Mubi, and Amazon Prime Video acquire and commission Nordic content, and the genre consistently performs above average for international programming.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '50+ Nordic titles',
        strengths: ['Original Nordic commissions', 'Dubbed and subtitled options', 'Global distribution'],
        exclusiveHighlights: ['Borgen: Power & Glory', 'Ragnarok', 'Equinox', 'Young Royals'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '30+ Nordic titles',
        strengths: ['Classic series archive', 'Included with Prime', 'Growing Nordic slate'],
        exclusiveHighlights: ['The Bridge', 'Those Who Kill', 'Follow the Money'],
      },
      {
        platformSlug: 'mubi',
        librarySize: '20+ curated Nordic films',
        strengths: ['Curated arthouse selection', 'Critically acclaimed films', 'Film-first approach'],
        exclusiveHighlights: ['Rare Nordic arthouse titles', 'Festival premieres'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '15+ Nordic titles',
        strengths: ['Premium Scandinavian productions', 'HBO Europe co-productions', 'Award-winning originals'],
        exclusiveHighlights: ['Beforeigners', 'Twin'],
      },
    ],
    viewingStats: 'Nordic drama exports grew over 300% between 2012 and 2023 according to Nordic content agencies',
    trendingTitles: ['The Bridge', 'Borgen', 'Trapped', 'Twin', 'The Valhalla Murders', 'Young Royals'],
    bestCountriesFor: [
      { countrySlug: 'sweden', reason: 'Origin country for The Bridge and many classic series, with full domestic library access' },
      { countrySlug: 'norway', reason: 'Home of Ragnarok, Beforeigners, and Norway\'s growing streaming scene' },
      { countrySlug: 'denmark', reason: 'Birthplace of Borgen and The Killing with the richest crime drama heritage' },
      { countrySlug: 'united-kingdom', reason: 'Biggest international fanbase for Nordic Noir with strong platform availability' },
      { countrySlug: 'united-states', reason: 'Netflix and Amazon carry extensive Nordic catalogs for US audiences' },
    ],
    faqs: [
      {
        question: 'What streaming service has the best Nordic Noir selection?',
        answer: 'Netflix has the largest Nordic Noir catalog globally with original commissions and acquired classics. Amazon Prime Video carries many classic series including The Bridge. Mubi is best for curated Nordic arthouse film.',
      },
      {
        question: 'What is the best Nordic Noir series to start with?',
        answer: 'The Bridge (Broen/Broen) is often called the defining Nordic Noir series, with a strong premise and sharp character writing. Borgen is ideal for fans of political drama, while Trapped offers Icelandic landscapes alongside tense crime plots.',
      },
    ],
    relatedGenres: ['crime-drama', 'thriller', 'british-drama'],
    relatedGlossary: ['geo-restriction', 'content-library', 'simulcast'],
  },
  {
    slug: 'crime-drama',
    name: 'Crime Drama',
    displayName: 'Crime Drama',
    shortDescription: 'The Wire, True Detective, Ozark, and more. Crime drama is one of the most popular genres on premium streaming.',
    longDescription:
      'Crime drama is one of streaming\'s most consistently popular categories, covering detective procedurals, organized crime sagas, and character-driven investigations. HBO set the standard with The Wire, True Detective, and The Sopranos, while Netflix produces global crime hits in multiple languages. Moral ambiguity, complex plots, and high stakes keep viewers engaged across episodic and serialized formats. Crime drama also has the highest rewatch rates of any genre on major streaming platforms.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '700+ crime titles',
        strengths: ['Global crime originals', 'International crime series', 'Binge-release model'],
        exclusiveHighlights: ['Ozark', 'Narcos', 'Mindhunter', 'Ripley', 'The Gentlemen'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '300+ crime titles',
        strengths: ['Prestige HBO catalog', 'Award-winning originals', 'The Wire, Sopranos archive'],
        exclusiveHighlights: ['True Detective', 'The Wire', 'The Sopranos', 'Mare of Easttown'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '400+ crime titles',
        strengths: ['Included with Prime', 'British crime series', 'International crime dramas'],
        exclusiveHighlights: ['The Rig', 'Alex Cross', 'Reacher'],
      },
      {
        platformSlug: 'peacock',
        librarySize: '200+ crime titles',
        strengths: ['Law & Order franchise', 'NBC crime procedurals', 'Free tier available'],
        exclusiveHighlights: ['Law & Order', 'SVU archive', 'Bel-Air'],
      },
    ],
    viewingStats: 'Crime drama accounts for over 15% of all premium streaming hours watched globally',
    trendingTitles: ['True Detective', 'The Wire', 'Ozark', 'Mindhunter', 'Ripley', 'The Gentlemen'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Full access to HBO, Netflix, Amazon, and Peacock crime libraries' },
      { countrySlug: 'united-kingdom', reason: 'Strong British crime tradition plus access to all major US platforms' },
      { countrySlug: 'australia', reason: 'Netflix AU and Stan carry extensive crime drama catalogs' },
    ],
    faqs: [
      {
        question: 'What is the best crime drama on streaming?',
        answer: 'HBO Max is the best platform for prestige crime drama, with The Wire, The Sopranos, True Detective, and Mare of Easttown. Netflix leads in volume with 700+ crime titles and acclaimed originals like Ozark, Mindhunter, and Ripley.',
      },
      {
        question: 'Where can I watch The Wire?',
        answer: 'The Wire is available on Max (HBO Max) in the US and most international markets. It is widely considered the greatest crime drama ever made and is available to stream in its entirety on Max.',
      },
    ],
    relatedGenres: ['nordic-noir', 'true-crime', 'thriller', 'british-drama'],
    relatedGlossary: ['content-library', 'binge-watching', 'svod'],
  },
  {
    slug: 'medical-drama',
    name: 'Medical Drama',
    displayName: 'Medical Drama',
    shortDescription: 'High-stakes hospital dramas. Grey\'s Anatomy, House MD, and The Pitt keep audiences coming back.',
    longDescription:
      'Medical drama is one of television\'s most lasting genres, mixing life-and-death stakes with character-driven storytelling and procedural tension. Hulu has the entire Grey\'s Anatomy archive, the longest-running primetime medical drama in US history. Netflix carries House MD and produces international medical dramas, while newer entries like The Pitt have brought fresh attention to the genre. Hospital settings are easy for anyone to connect with, which keeps this genre popular across demographics.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'hulu',
        librarySize: '500+ medical titles',
        strengths: ['Grey\'s Anatomy full archive', 'Next-day ABC episodes', 'Shonda Rhimes catalog'],
        exclusiveHighlights: ['Grey\'s Anatomy', 'Station 19', 'The Good Doctor (early seasons)'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '200+ medical titles',
        strengths: ['International medical dramas', 'Original productions', 'Global library'],
        exclusiveHighlights: ['House MD (select regions)', 'Grey\'s Anatomy (non-US)', 'Lenox Hill'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '100+ medical titles',
        strengths: ['Included with Prime', 'Classic archive titles', 'International series'],
        exclusiveHighlights: ['House MD', 'ER archive'],
      },
      {
        platformSlug: 'disney-plus',
        librarySize: '50+ medical titles',
        strengths: ['ABC medical drama catalog', 'Family-accessible content', 'Grey\'s via Star'],
        exclusiveHighlights: ['The Good Doctor', 'Grey\'s Anatomy (via Star)'],
      },
    ],
    viewingStats: 'Grey\'s Anatomy has over 400 episodes across 20 seasons, making it Hulu\'s most-streamed legacy drama',
    trendingTitles: ["Grey's Anatomy", 'House MD', 'The Good Doctor', 'The Pitt', 'ER', 'Scrubs'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Full access to Hulu, Disney+, and NBC medical dramas with same-day streaming' },
      { countrySlug: 'united-kingdom', reason: 'Netflix UK and Disney+ carry most major US medical dramas' },
      { countrySlug: 'canada', reason: 'Crave and major platforms carry extensive medical drama libraries' },
    ],
    faqs: [
      {
        question: 'Where can I watch Grey\'s Anatomy-',
        answer: 'Hulu has the most comprehensive Grey\'s Anatomy catalog in the US, including all current and past seasons. Outside the US, Grey\'s Anatomy is available on Disney+ via the Star library in many markets.',
      },
      {
        question: 'What is the best new medical drama on streaming?',
        answer: 'The Pitt on Max has been praised as a realistic, tense ER drama. The Good Doctor on Amazon Prime Video offers a strong take on autism representation in medicine. House MD is still the benchmark for medical mystery procedurals.',
      },
    ],
    relatedGenres: ['crime-drama', 'thriller', 'sci-fi'],
    relatedGlossary: ['svod', 'content-library', 'binge-watching'],
  },
  {
    slug: 'period-drama',
    name: 'Period Drama',
    displayName: 'Period Drama & Historical',
    shortDescription: 'Lavish historical productions. Bridgerton, The Crown, Outlander, and Peaky Blinders on streaming.',
    longDescription:
      'Period drama and historical fiction include some of the most expensive productions in streaming. Netflix\'s Bridgerton and The Crown have shown that lavish costume dramas draw large global audiences, while BritBox and Acorn TV serve fans of classic British period productions. Amazon Prime Video carries adaptations like Downton Abbey and Outlander. High production budgets and detailed storytelling attract subscribers who want cinematic-quality television.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '200+ period titles',
        strengths: ['Lavish original productions', 'Global reach', 'Multiple languages'],
        exclusiveHighlights: ['Bridgerton', 'The Crown', 'Peaky Blinders', 'Reign'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '150+ period titles',
        strengths: ['HBO prestige catalog', 'Premium historical dramas', 'Award-winning productions'],
        exclusiveHighlights: ['House of the Dragon', 'Rome', 'Band of Brothers', 'The Gilded Age'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '300+ period titles',
        strengths: ['Classic British period dramas', 'Included with Prime', 'Downton Abbey universe'],
        exclusiveHighlights: ['Outlander', 'Downton Abbey films', 'The Terror', 'My Brilliant Friend'],
      },
      {
        platformSlug: 'britbox',
        librarySize: '200+ British period titles',
        strengths: ['Definitive British period drama archive', 'Classic ITV and BBC dramas', 'Affordable pricing'],
        exclusiveHighlights: ['Sanditon', 'The Durrells', 'Tutankhamun', 'Classic Upstairs Downstairs'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '30+ period titles',
        strengths: ['High production values', 'Original historical commissions', 'No ads'],
        exclusiveHighlights: ['Dickinson', 'Slow Horses', 'Masters of the Air'],
      },
    ],
    viewingStats: 'Bridgerton Season 3 amassed over 45 million views in its first four weeks on Netflix',
    trendingTitles: ['Bridgerton', 'The Crown', 'Outlander', 'Downton Abbey', 'Peaky Blinders', 'House of the Dragon'],
    bestCountriesFor: [
      { countrySlug: 'united-kingdom', reason: 'Home of British period drama with BBC iPlayer, ITV, BritBox, and all major platforms' },
      { countrySlug: 'united-states', reason: 'All major streaming platforms offer extensive period drama libraries' },
      { countrySlug: 'australia', reason: 'Strong cultural affinity for British period drama with BritBox AU and Netflix AU' },
    ],
    faqs: [
      {
        question: 'What is the best streaming service for period dramas?',
        answer: 'Netflix leads with modern hit originals like Bridgerton and The Crown. BritBox offers the definitive archive of classic British period dramas. Amazon Prime Video has a strong catalog including Outlander and Downton Abbey.',
      },
      {
        question: 'Is Outlander on Netflix?',
        answer: 'Outlander is available on Amazon Prime Video in most markets. Netflix does not carry Outlander. In some regions it is also available on Starz.',
      },
    ],
    relatedGenres: ['british-drama', 'romantic-comedy', 'k-drama'],
    relatedGlossary: ['content-library', 'licensed-content', 'svod'],
  },
  {
    slug: 'nature-documentary',
    name: 'Nature Documentary',
    displayName: 'Nature Documentary',
    shortDescription: 'Planet Earth, Our Planet, and Frozen Planet. Streaming has made nature documentaries easier to find than ever.',
    longDescription:
      'Nature documentaries are a showpiece for streaming platforms, with Apple TV+, Netflix, and Discovery+ producing visually striking series about the natural world. Apple TV+\'s Prehistoric Planet brought dinosaurs to life with detailed CGI, while Netflix\'s Our Planet (narrated by David Attenborough) became one of the most-watched documentaries in streaming history. Discovery+ has the largest factual content library globally, including BBC Earth co-productions and decades of wildlife programming.',
    category: 'documentary',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '200+ nature titles',
        strengths: ['David Attenborough originals', 'Our Planet franchise', 'Global reach'],
        exclusiveHighlights: ['Our Planet', 'Life on Our Planet', 'My Octopus Teacher', 'Breaking Boundaries'],
      },
      {
        platformSlug: 'disney-plus',
        librarySize: '300+ nature titles',
        strengths: ['National Geographic archive', 'Disneynature films', 'BBC Earth content'],
        exclusiveHighlights: ['Planet Earth III', 'Wild Isles', 'Jane', 'Disneynature series'],
      },
      {
        platformSlug: 'discovery-plus',
        librarySize: '1,000+ nature and wildlife titles',
        strengths: ['Largest wildlife library', 'BBC Earth co-productions', 'Discovery Channel archive'],
        exclusiveHighlights: ['Frozen Planet II', 'Planet Earth II (select regions)', 'Blue Planet II'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '100+ nature titles',
        strengths: ['Included with Prime', 'Growing natural history slate', 'International titles'],
        exclusiveHighlights: ['One Strange Rock', 'Bears', 'The Last Glaciers'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '20+ nature titles',
        strengths: ['Cinematic production quality', 'Award-winning originals', 'No ads'],
        exclusiveHighlights: ['Prehistoric Planet', 'The Velvet Queen', 'Tiny World', 'Earth at Night in Color'],
      },
    ],
    viewingStats: 'Our Planet reached 25+ million households in its first month on Netflix, making it one of the most-watched documentaries in streaming history',
    trendingTitles: ['Planet Earth III', 'Our Planet', 'Frozen Planet II', 'Wild Isles', 'Life on Our Planet', 'Prehistoric Planet'],
    bestCountriesFor: [
      { countrySlug: 'united-kingdom', reason: 'BBC Earth co-productions and Discovery+ provide world-class nature content' },
      { countrySlug: 'united-states', reason: 'All major platforms including Disney+ National Geographic, Netflix, and Discovery+ available' },
      { countrySlug: 'australia', reason: 'Strong nature documentary culture with local platforms and major streaming services' },
    ],
    faqs: [
      {
        question: 'Where can I watch Planet Earth III?',
        answer: 'Planet Earth III is available on Disney+ (via National Geographic) in most international markets. In the UK, it aired on BBC One and is available on BBC iPlayer.',
      },
      {
        question: 'What is the best nature documentary on streaming?',
        answer: 'Our Planet on Netflix (narrated by David Attenborough) and Planet Earth III on Disney+/BBC are widely regarded as the best nature documentaries on streaming. Prehistoric Planet on Apple TV+ stands out for its CGI-enhanced prehistoric wildlife approach.',
      },
    ],
    relatedGenres: ['documentaries', 'sci-fi', 'kids-animation'],
    relatedGlossary: ['content-library', 'svod', 'original-content'],
  },
  {
    slug: 'food-cooking',
    name: 'Food & Cooking',
    displayName: 'Food & Cooking',
    shortDescription: 'The Bear, Chef\'s Table, and Salt Fat Acid Heat. Food content is one of streaming\'s most popular categories.',
    longDescription:
      'Food and cooking content has moved well beyond daytime TV into prime streaming territory. Netflix\'s Chef\'s Table brought cinematic storytelling to food documentaries, while FX\'s The Bear (on Hulu) became a breakout hit that raised the bar for kitchen drama. Discovery+ has the largest cooking and food lifestyle library globally through Food Network and the Cooking Channel archives. The category spans competition formats, travel-focused food shows, and narrative documentaries.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '150+ food titles',
        strengths: ['Prestige food documentaries', 'Chef\'s Table franchise', 'International food content'],
        exclusiveHighlights: ['Chef\'s Table', 'Salt Fat Acid Heat', 'Ugly Delicious', 'The Final Table'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '200+ food titles',
        strengths: ['The Bear (FX)', 'Food Network archive', 'Competition shows'],
        exclusiveHighlights: ['The Bear', 'Top Chef (select seasons)', 'Gordon Ramsay content'],
      },
      {
        platformSlug: 'discovery-plus',
        librarySize: '500+ food and cooking titles',
        strengths: ['Food Network full archive', 'Cooking Channel library', 'Competition show archive'],
        exclusiveHighlights: ['Chopped', 'Diners Drive-Ins and Dives', 'The Pioneer Woman', 'Barefoot Contessa'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '100+ food titles',
        strengths: ['Included with Prime', 'Comedic food content', 'International food shows'],
        exclusiveHighlights: ['The Grand Tour (food segments)', 'Anthony Bourdain archive'],
      },
      {
        platformSlug: 'disney-plus',
        librarySize: '50+ food titles',
        strengths: ['National Geographic food docs', 'Family-friendly cooking content', 'Disney food specials'],
        exclusiveHighlights: ['Ratatouille making-of content', 'National Geographic food docs'],
      },
    ],
    viewingStats: 'The Bear Season 2 generated over 10 million views in its first 5 days on Hulu, making it the most-watched FX series premiere',
    trendingTitles: ['The Bear', "Chef's Table", 'Salt Fat Acid Heat', 'Ugly Delicious', 'The Final Table', 'Chopped'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Full access to Discovery+, Hulu, and Netflix with the most comprehensive food content libraries' },
      { countrySlug: 'united-kingdom', reason: 'Netflix UK and BBC iPlayer carry strong food documentary and competition content' },
      { countrySlug: 'canada', reason: 'Discovery+ Canada and Netflix offer strong food and cooking catalogs' },
    ],
    faqs: [
      {
        question: 'Where can I watch The Bear?',
        answer: 'The Bear is an FX original series available on Hulu in the US with new episodes streaming the same day they air. Internationally, The Bear is available on Disney+ (via the Star library) in most markets.',
      },
      {
        question: 'What streaming service has the most cooking shows?',
        answer: 'Discovery+ has the largest cooking show library globally with 500+ titles from Food Network and the Cooking Channel, including full archives of Chopped, Diners Drive-Ins and Dives, and Barefoot Contessa.',
      },
    ],
    relatedGenres: ['reality-tv', 'documentaries', 'nature-documentary'],
    relatedGlossary: ['svod', 'content-library', 'binge-watching'],
  },
  {
    slug: 'spanish-language-drama',
    name: 'Spanish Language Drama',
    displayName: 'Spanish Language Drama',
    shortDescription: 'Money Heist, Elite, and Narcos. Spanish-language drama is Netflix\'s top-performing international content category.',
    longDescription:
      'Spanish-language drama is one of streaming\'s strongest international categories, driven by Netflix\'s large investment in Spanish-language originals. La Casa de Papel (Money Heist) became Netflix\'s most-watched non-English series ever with 69 billion minutes viewed. From Spain\'s Elite and the Colombian-American Narcos to Mexican and Argentine originals, the category covers crime dramas, thrillers, coming-of-age stories, and procedurals from across the Spanish-speaking world.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '300+ Spanish-language titles',
        strengths: ['Most-watched non-English originals globally', 'Spanish and Latin American productions', 'Global distribution'],
        exclusiveHighlights: ['La Casa de Papel (Money Heist)', 'Elite', 'Narcos', 'Vis a Vis', 'Valeria'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '100+ Spanish-language titles',
        strengths: ['HBO Latin America productions', 'Premium drama quality', 'Co-production with European broadcasters'],
        exclusiveHighlights: ['El Internado: Las Cumbres', 'La Fortuna', 'Patria'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '150+ Spanish-language titles',
        strengths: ['Growing Latin American original slate', 'Included with Prime', 'Regional originals'],
        exclusiveHighlights: ['El Presidente', 'Maradona: Blessed Dream', 'LOL: Last One Laughing Mexico'],
      },
      {
        platformSlug: 'disney-plus',
        librarySize: '50+ Spanish-language titles',
        strengths: ['Star-branded Latin content', 'Disney Latin America originals', 'Family-accessible'],
        exclusiveHighlights: ['Santa Evita', 'Sr. Ávila', 'Nada'],
      },
    ],
    viewingStats: 'La Casa de Papel became Netflix\'s most-watched non-English series with 69 billion minutes viewed',
    trendingTitles: ['La Casa de Papel', 'Narcos', 'Elite', 'Vis a Vis', 'Valeria', 'Club de Cuervos'],
    bestCountriesFor: [
      { countrySlug: 'spain', reason: 'Origin country for Elite, La Casa de Papel, and the largest Spanish-language Netflix catalog' },
      { countrySlug: 'mexico', reason: 'Large domestic streaming market with Netflix Mexico and Amazon originals' },
      { countrySlug: 'united-states', reason: 'Large Spanish-speaking audience with ViX, Netflix, and Amazon access' },
      { countrySlug: 'argentina', reason: 'Growing original production hub with Amazon and Netflix Argentine originals' },
    ],
    faqs: [
      {
        question: 'Where can I watch Money Heist (La Casa de Papel)?',
        answer: 'Money Heist is available exclusively on Netflix globally. All five parts are available to stream in the original Spanish with subtitles or dubbed into multiple languages including English.',
      },
      {
        question: 'What is the best Spanish-language drama on Netflix?',
        answer: 'La Casa de Papel (Money Heist) is the most-watched, but Elite offers a sharp, stylish thriller set in an elite Madrid school. Narcos (filmed primarily in Spanish) is the best gateway for viewers new to the genre.',
      },
    ],
    relatedGenres: ['crime-drama', 'telenovelas', 'nordic-noir', 'thriller'],
    relatedGlossary: ['geo-restriction', 'content-library', 'simulcast'],
  },
  {
    slug: 'psychological-thriller',
    name: 'Psychological Thriller',
    displayName: 'Psychological Thriller',
    shortDescription: 'Mindhunter, You, Severance, and Black Mirror. Mind-bending tension and slow-burn suspense on streaming.',
    longDescription:
      'Psychological thrillers are among the most binged content on streaming platforms, mixing tension, mind-bending narratives, and complex moral questions. Netflix leads with Mindhunter, You, and the Black Mirror anthology, while Apple TV+\'s Severance has become a standout in workplace horror. The genre works well on streaming because slow-burn tension rewards concentrated viewing and drives social media discussion. Psychological thrillers also get a lot of rewatches as viewers look for missed clues.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '400+ psychological thriller titles',
        strengths: ['Largest selection', 'Original psychological dramas', 'International thrillers'],
        exclusiveHighlights: ['Mindhunter', 'You', 'Black Mirror', 'Squid Game', 'Dark'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '200+ thriller titles',
        strengths: ['Prestige HBO thrillers', 'Award-winning originals', 'Sharp Objects, Sharp Minds'],
        exclusiveHighlights: ['Sharp Objects', 'The Undoing', 'White Lotus', 'Succession'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '250+ thriller titles',
        strengths: ['Included with Prime', 'International psychological dramas', 'Thriller film catalog'],
        exclusiveHighlights: ['Utopia', 'The Wilds', 'Alex Rider'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '30+ thriller titles',
        strengths: ['Award-winning originals', 'Highest production values', 'Critically acclaimed'],
        exclusiveHighlights: ['Severance', 'Presumed Innocent', 'The Shrink Next Door'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '200+ thriller titles',
        strengths: ['FX thriller catalog', 'Next-day cable thrillers', 'Handmaid\'s Tale universe'],
        exclusiveHighlights: ["The Handmaid's Tale", 'Nine Perfect Strangers', 'Dopesick'],
      },
    ],
    viewingStats: 'Severance Season 2 set Apple TV+ viewership records; You has been in Netflix\'s global Top 10 for over 100 weeks cumulatively',
    trendingTitles: ['Mindhunter', 'You', 'Squid Game', 'Black Mirror', 'Severance', 'Dark'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'All major platforms available with the deepest selection of US and international psychological thrillers' },
      { countrySlug: 'united-kingdom', reason: 'Netflix UK and Apple TV+ offer strong catalogs; UK produces acclaimed thrillers like The Undoing' },
      { countrySlug: 'germany', reason: 'Netflix Germany features Dark and other acclaimed German psychological thrillers' },
    ],
    faqs: [
      {
        question: 'What is the best psychological thriller on streaming right now?',
        answer: 'Severance on Apple TV+ is widely considered the best current psychological thriller on streaming. Mindhunter on Netflix, despite being cancelled, is a masterclass in slow-burn tension. Black Mirror offers standalone episodes for viewers who prefer anthology format.',
      },
      {
        question: 'Is there a season 3 of Mindhunter?',
        answer: 'As of 2025, Netflix has not officially renewed Mindhunter for Season 3. Director David Fincher has stated the show is on indefinite hold. Both existing seasons remain available on Netflix and are considered essential viewing.',
      },
    ],
    relatedGenres: ['crime-drama', 'horror', 'sci-fi', 'nordic-noir'],
    relatedGlossary: ['content-library', 'binge-watching', 'exclusive-content'],
  },
  {
    slug: 'korean-variety',
    name: 'Korean Variety Shows',
    displayName: 'Korean Variety Shows',
    shortDescription: 'Running Man, Knowing Bros, and Amazing Saturday. Korean variety entertainment is growing fast on global streaming.',
    longDescription:
      'Korean variety shows are a popular entertainment format that combines comedy, games, celebrity interactions, and challenges. While K-drama gets more mainstream attention globally, Korean variety shows have a passionate international fanbase that follows idol groups and celebrities across long-running formats. Netflix has started investing in Korean variety content, while platforms like Viki and dedicated YouTube channels have traditionally hosted subtitled variety content. The Hallyu wave has carried variety shows into international markets alongside music and drama.',
    category: 'international',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '30+ Korean variety titles',
        strengths: ['Growing Korean variety investment', 'High-quality subtitles', 'Global distribution'],
        exclusiveHighlights: ['Physical: 100', 'Single\'s Inferno', 'Busted!', 'Zombieverse'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '15+ Korean variety titles',
        strengths: ['Included with Prime', 'Growing Korean content investment'],
        exclusiveHighlights: ['I Can See Your Voice', 'Amazing Saturday (select seasons)'],
      },
      {
        platformSlug: 'crunchyroll',
        librarySize: '20+ Korean entertainment titles',
        strengths: ['Asian entertainment focus', 'Fan subtitle quality', 'Simulcast speed'],
        exclusiveHighlights: ['Running Man episodes', 'K-pop variety content'],
      },
    ],
    viewingStats: 'Physical: 100 became one of Netflix\'s most-watched non-English language series in Q1 2023',
    trendingTitles: ['Running Man', 'Knowing Bros', '2 Days 1 Night', 'I Can See Your Voice', 'Amazing Saturday', 'Physical: 100'],
    bestCountriesFor: [
      { countrySlug: 'south-korea', reason: 'Origin country with all platforms and simultaneous broadcast access' },
      { countrySlug: 'united-states', reason: 'Netflix and Amazon carry growing Korean variety catalogs' },
      { countrySlug: 'japan', reason: 'Strong K-content fanbase with dedicated platform availability' },
      { countrySlug: 'thailand', reason: 'One of the largest international markets for Korean variety content' },
    ],
    faqs: [
      {
        question: 'Where can I watch Korean variety shows with English subtitles?',
        answer: 'Netflix carries a growing selection of Korean variety shows including Physical: 100 and Single\'s Inferno with high-quality English subtitles. Viki (Rakuten Viki) is the leading platform for community-subtitled Korean variety content. Amazon Prime Video is expanding its Korean variety catalog.',
      },
      {
        question: 'What is the best Korean variety show for beginners?',
        answer: 'Physical: 100 on Netflix is an ideal entry point - it is a compelling competition show requiring no prior knowledge of Korean celebrities. Running Man is the classic long-running variety show beloved by fans worldwide for its physical challenges and comedy.',
      },
    ],
    relatedGenres: ['k-drama', 'reality-tv', 'anime'],
    relatedGlossary: ['simulcast', 'geo-restriction', 'content-library'],
  },
  {
    slug: 'true-crime-documentary',
    name: 'True Crime Documentary',
    displayName: 'True Crime Documentary',
    shortDescription: 'Making a Murderer, The Jinx, Tiger King. True crime documentaries are one of streaming\'s most binged formats.',
    longDescription:
      'True crime documentaries are one of streaming\'s top content categories, mixing investigative journalism with cinematic production. Netflix\'s Making a Murderer pioneered the long-form true crime docuseries format that other platforms have since copied. HBO\'s The Jinx showed what a documentary investigation could accomplish, contributing to a real-world arrest. The genre has some of the highest binge rates on any streaming platform, with viewers consuming entire multi-episode series in single sittings.',
    category: 'documentary',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '400+ true crime titles',
        strengths: ['Most true crime originals', 'Global production partnerships', 'Strong SEO and discoverability'],
        exclusiveHighlights: ['Making a Murderer', 'Tiger King', 'Monster', "Don't F**k with Cats", 'American Nightmare'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '100+ true crime titles',
        strengths: ['Premium investigative quality', 'Award-winning productions', 'Long-form investigation format'],
        exclusiveHighlights: ['The Jinx', "I'll Be Gone in the Dark", 'The Staircase', 'Allen v. Farrow'],
      },
      {
        platformSlug: 'peacock',
        librarySize: '150+ true crime titles',
        strengths: ['Dateline full archive', 'NBC News investigations', 'Free tier available'],
        exclusiveHighlights: ['Dateline', 'Dr. Death', 'Joe vs Carole', 'Wild Crime'],
      },
      {
        platformSlug: 'discovery-plus',
        librarySize: '300+ true crime titles',
        strengths: ['ID (Investigation Discovery) full archive', 'Largest true crime library', 'Unfiltered investigations'],
        exclusiveHighlights: ['See No Evil', 'Web of Lies', 'Fatal Vows', 'Deadly Women'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '200+ true crime titles',
        strengths: ['FX true crime originals', 'Documentary films', 'Next-day ABC News content'],
        exclusiveHighlights: ['The Act', 'Under the Banner of Heaven', 'Candy', 'New York Times Presents'],
      },
    ],
    viewingStats: 'Tiger King reached 34 million US viewers in its first 10 days - the fastest-watched Netflix documentary in US history at the time',
    trendingTitles: ['Making a Murderer', 'The Jinx', 'Tiger King', 'Monster', "Don't F**k with Cats", 'American Nightmare'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Most true crime content available across Netflix, Peacock, Hulu, Discovery+, and HBO' },
      { countrySlug: 'united-kingdom', reason: 'Strong true crime catalog on Netflix UK and Channel 4' },
      { countrySlug: 'australia', reason: 'Growing true crime selection on Netflix AU and Stan' },
    ],
    faqs: [
      {
        question: 'What streaming service has the most true crime documentaries?',
        answer: 'Discovery+ (via Investigation Discovery) has the largest overall true crime library with 300+ titles. Netflix has the most high-profile originals including Making a Murderer, Tiger King, and Monster. Peacock has the complete Dateline archive.',
      },
      {
        question: 'What is the most-watched true crime documentary on Netflix?',
        answer: 'Tiger King: Murder, Mayhem and Madness reached 34 million US viewers in its first 10 days, making it one of the fastest-watched documentaries in Netflix history. Monster (The Jeffrey Dahmer Story) accumulated over 700 million viewing minutes in its first week.',
      },
    ],
    relatedGenres: ['documentaries', 'true-crime', 'crime-drama'],
    relatedGlossary: ['content-library', 'binge-watching', 'svod'],
  },
  {
    slug: 'action',
    name: 'Action',
    displayName: 'Action',
    shortDescription: 'High-stakes sequences, fight choreography, and chase scenes. Netflix, Prime Video, and Disney+ dominate.',
    longDescription:
      'Action is one of streaming\'s most-watched categories, built on car chases, hand-to-hand combat, set-piece explosions, and narrow escapes. The genre rewards rewatching and works well on big screens, which is why platforms invest so heavily in it. Netflix has committed billions to action originals, producing films like Extraction (a record 99 million views in its first month) and Red Notice alongside legacy studio titles. Amazon Prime Video holds a significant edge with the entire Mission: Impossible catalog and John Wick series. Disney+ brings Marvel and Star Wars, where action is woven into nearly every episode. The genre spans everything from grounded spy thrillers and martial arts films to superhero blockbusters and military action. If you want non-stop momentum with minimal downtime, this is where to look.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '1,000+ action titles',
        strengths: ['High-budget originals', 'International action content', 'Offline downloads'],
        exclusiveHighlights: ['Extraction', 'Red Notice', 'The Gray Man', 'Rebel Moon'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '800+ action titles',
        strengths: ['Mission: Impossible and John Wick library', 'Action originals', 'Included with Prime'],
        exclusiveHighlights: ['Reacher', 'The Boys', 'Jack Ryan', 'Citadel'],
      },
      {
        platformSlug: 'disney-plus',
        librarySize: '600+ action titles',
        strengths: ['Marvel Cinematic Universe', 'Star Wars', 'Indiana Jones and legacy Lucasfilm'],
        exclusiveHighlights: ['Avengers series', 'The Mandalorian', 'Andor', 'Black Panther'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '500+ action titles',
        strengths: ['DC films and series', 'Warner Bros. action catalog', 'Snyder Cut and theatrical releases'],
        exclusiveHighlights: ['Peacemaker', 'Dark Knight trilogy', 'Mad Max: Fury Road', 'John Wick: Chapter 4'],
      },
    ],
    viewingStats: 'Extraction reached 99 million views in its first 28 days on Netflix, one of the platform\'s all-time records',
    trendingTitles: ['Extraction 2', 'Reacher', 'The Gray Man', 'Jack Ryan', 'The Boys', 'Andor'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'All major action platforms available with complete libraries' },
      { countrySlug: 'united-kingdom', reason: 'Strong access to Netflix, Prime Video, and Disney+ action catalogs' },
      { countrySlug: 'canada', reason: 'Full access to all four major platforms with competitive pricing' },
    ],
    faqs: [
      {
        question: 'Which streaming service has the best action movies?',
        answer: 'Netflix leads for original action films with Extraction, Red Notice, and The Gray Man. Amazon Prime Video has the best licensed catalog with Mission: Impossible, John Wick, and Reacher. Disney+ dominates superhero action with the full MCU.',
      },
      {
        question: 'Where can I watch Marvel and DC action series?',
        answer: 'Marvel series (Loki, WandaVision, Daredevil: Born Again) stream exclusively on Disney+. DC series like Peacemaker and The Penguin are on HBO Max (Max). Both platforms require separate subscriptions.',
      },
      {
        question: 'Are there good action series on streaming, not just movies?',
        answer: 'Yes. Reacher and Jack Ryan on Prime Video, The Boys and Citadel on Prime Video, and Andor and The Mandalorian on Disney+ all deliver feature-film production quality in serialized form.',
      },
    ],
    relatedGenres: ['thriller', 'sci-fi', 'crime-thriller'],
    relatedGlossary: ['content-library', 'svod', 'geo-restriction'],
  },
  {
    slug: 'comedy',
    name: 'Comedy',
    displayName: 'Comedy',
    shortDescription: 'Sitcoms, dark comedies, and absurdist humor spanning decades of television and original streaming.',
    longDescription:
      'Comedy is the most culturally specific genre in streaming - a joke that lands perfectly for one audience falls flat for another. That said, a few streaming platforms have figured it out at scale. Netflix built its comedy reputation with shows like Arrested Development, The Kominsky Method, and Abbott Elementary-adjacent originals, while also acquiring classic sitcoms. Hulu holds the rights to the most-rewatched American sitcoms: Seinfeld, It\'s Always Sunny in Philadelphia, and Parks and Recreation. Max carries Friends and The Big Bang Theory - still among the most-streamed shows on any platform years after their finales. Apple TV+ has emerged as a prestige comedy destination with Ted Lasso and Shrinking. Whether you want broad network sitcoms, dry British humor, or single-camera cringe comedy, the catalog across these platforms is enormous.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '800+ comedy titles',
        strengths: ['Original comedy series and specials', 'International comedy', 'Dark comedy originals'],
        exclusiveHighlights: ['The Kominsky Method', 'Russian Doll', 'Never Have I Ever', 'Sex Education'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '700+ comedy titles',
        strengths: ['Classic sitcom library', 'Next-day network comedy', 'FX on Hulu comedies'],
        exclusiveHighlights: ['Seinfeld', 'It\'s Always Sunny in Philadelphia', 'What We Do in the Shadows', 'Only Murders in the Building'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '600+ comedy titles',
        strengths: ['Friends and The Big Bang Theory', 'HBO prestige comedies', 'Adult animated comedy'],
        exclusiveHighlights: ['Friends', 'The Big Bang Theory', 'Succession', 'Barry', 'Hacks'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '50+ comedy series',
        strengths: ['Prestige single-camera comedies', 'Award-winning originals', 'Ad-free experience'],
        exclusiveHighlights: ['Ted Lasso', 'Shrinking', 'The Afterparty', 'Mythic Quest'],
      },
    ],
    viewingStats: 'Friends remained the most-streamed show on Max in 2023, accumulating billions of minutes watched',
    trendingTitles: ['Ted Lasso', 'Only Murders in the Building', 'Hacks', 'Shrinking', 'What We Do in the Shadows', 'Sex Education'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Largest comedy catalog with all platforms available including Hulu\'s complete sitcom library' },
      { countrySlug: 'united-kingdom', reason: 'Strong British comedy on BritBox, plus full access to Netflix and Apple TV+ originals' },
      { countrySlug: 'canada', reason: 'Full access to Netflix, Hulu alternatives, and Apple TV+ comedy libraries' },
    ],
    faqs: [
      {
        question: 'Where can I watch Friends and The Big Bang Theory streaming?',
        answer: 'Both are exclusive to Max (HBO Max) in the US. Friends and The Big Bang Theory are consistently among the most-watched titles on the platform.',
      },
      {
        question: 'Which streaming service has the best original comedies?',
        answer: 'Apple TV+ has the strongest prestige comedy originals with Ted Lasso and Shrinking. Netflix leads in volume with dark and international comedies. Hulu has the best FX comedy catalog including What We Do in the Shadows.',
      },
    ],
    relatedGenres: ['stand-up-comedy', 'romantic-comedy', 'reality-tv'],
    relatedGlossary: ['content-library', 'svod', 'binge-watching'],
  },
  {
    slug: 'drama',
    name: 'Drama',
    displayName: 'Drama',
    shortDescription: 'Character-driven storytelling built on conflict, consequence, and performance. The backbone of prestige television.',
    longDescription:
      'Drama is the genre most responsible for the phrase "peak TV." From Breaking Bad to Succession, prestige drama has redefined what television can do, and streaming platforms have leaned all the way in. HBO Max is the default destination for prestige drama - it holds the entire HBO catalog including The Sopranos, The Wire, and Succession alongside newer originals like The Last of Us and White Lotus. Netflix has invested heavily in drama originals across dozens of countries, producing hits like Ozark, Squid Game, and The Crown. Apple TV+ built its brand almost entirely on drama, with Slow Horses, The Morning Show, and Severance earning consistent critical praise. Amazon Prime Video sits in the middle, funding big-budget literary adaptations alongside original series. If you care about writing, performance, and long-form storytelling, drama is where streaming puts its biggest bets.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'hbo-max',
        librarySize: '500+ drama series',
        strengths: ['Complete HBO archive', 'Prestige original dramas', 'Award-winning catalog'],
        exclusiveHighlights: ['The Sopranos', 'The Wire', 'Succession', 'The Last of Us', 'White Lotus'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '1,200+ drama titles',
        strengths: ['International drama originals', 'Wide genre range', 'Global availability'],
        exclusiveHighlights: ['Ozark', 'The Crown', 'Squid Game', 'Mindhunter', 'Peaky Blinders'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '60+ drama series',
        strengths: ['Consistent critical quality', 'Premium productions', 'Ad-free viewing'],
        exclusiveHighlights: ['Slow Horses', 'Severance', 'The Morning Show', 'Sugar', 'Presumed Innocent'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '700+ drama titles',
        strengths: ['Big-budget literary adaptations', 'Original drama series', 'International content'],
        exclusiveHighlights: ['The Rings of Power', 'Fleabag', 'Transparent', 'The Diplomat'],
      },
    ],
    viewingStats: 'The Last of Us set an HBO record with 40.2 million viewers per episode across platforms',
    trendingTitles: ['The Last of Us', 'Slow Horses', 'Severance', 'White Lotus', 'The Crown', 'Succession'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Complete access to HBO, Netflix, Apple TV+, and Prime Video drama libraries' },
      { countrySlug: 'united-kingdom', reason: 'Strong BBC and ITV drama alongside all streaming platform originals' },
      { countrySlug: 'australia', reason: 'Good access to Netflix, Binge (HBO), and Apple TV+ drama catalogs' },
    ],
    faqs: [
      {
        question: 'What streaming service has the best drama series?',
        answer: 'HBO Max (Max) has the strongest catalog with The Sopranos, The Wire, Succession, and The Last of Us. Apple TV+ leads for new prestige dramas. Netflix has the best international drama selection.',
      },
      {
        question: 'Is The Sopranos on streaming?',
        answer: 'Yes. The Sopranos streams exclusively on Max (HBO Max) in the US. It\'s part of the complete HBO archive available on the platform.',
      },
    ],
    relatedGenres: ['crime-drama', 'thriller', 'period-drama'],
    relatedGlossary: ['svod', 'content-library', 'binge-watching'],
  },
  {
    slug: 'romance',
    name: 'Romance',
    displayName: 'Romance',
    shortDescription: 'Love stories, slow burns, and will-they-won\'t-they dynamics across film and television.',
    longDescription:
      'Romance is one of the most reliably popular categories on streaming, and Netflix in particular has built a profitable business around it. The platform\'s original romance films - To All the Boys I\'ve Loved Before, The Kissing Booth, and Purple Hearts - have drawn hundreds of millions of views. Netflix also dominates serialized romantic drama with Bridgerton, which broke the platform\'s record for most-watched English-language series in its first season. Hulu carries a strong catalog of romantic comedies and network dramas with romantic leads. Amazon Prime Video has invested in theatrical-quality romance films. The genre ranges from lighthearted romantic comedies to slow-burn character studies, period romances, and international love stories. It performs especially well on mobile and during weekends, which is reflected in where platforms concentrate their original investment.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '600+ romance titles',
        strengths: ['Dominant in romance originals', 'High-volume film releases', 'International romance dramas'],
        exclusiveHighlights: ['Bridgerton', 'To All the Boys I\'ve Loved Before', 'Purple Hearts', 'Virgin River'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '400+ romance titles',
        strengths: ['Network romantic dramas', 'Hallmark Channel content', 'FX romance series'],
        exclusiveHighlights: ['Normal People', 'Love Victor', 'High Fidelity', 'The Mindy Project'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '300+ romance titles',
        strengths: ['Theatrical romance films', 'Original romantic series', 'International love stories'],
        exclusiveHighlights: ['Daisy Jones & The Six', 'The Idea of You', 'Modern Love', 'Catherine Called Birdy'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '30+ romance titles',
        strengths: ['Prestige romantic dramas', 'Award-caliber productions', 'Ad-free experience'],
        exclusiveHighlights: ['Slow Horses (romantic subplot)', 'Surface', 'Argylle'],
      },
    ],
    viewingStats: 'Bridgerton Season 2 broke Netflix\'s record for most-watched English-language series with 627.11 million hours viewed in its first 28 days',
    trendingTitles: ['Bridgerton', 'Virgin River', 'Emily in Paris', 'The Idea of You', 'Normal People', 'Daisy Jones & The Six'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Largest romance catalog on Netflix and Hulu including exclusive originals' },
      { countrySlug: 'united-kingdom', reason: 'Strong British romance and period romance on Netflix UK and BritBox' },
      { countrySlug: 'south-korea', reason: 'K-drama romance is a dominant genre with extensive Netflix investment' },
    ],
    faqs: [
      {
        question: 'Where can I watch Bridgerton?',
        answer: 'Bridgerton is a Netflix original and streams exclusively on Netflix worldwide. All seasons are available in full.',
      },
      {
        question: 'Which streaming service has the best romantic movies?',
        answer: 'Netflix has the highest volume of original romance films including To All the Boys, Purple Hearts, and The Idea of You. Amazon Prime Video focuses on theatrical quality romance films. Hulu has the strongest classic romantic comedy catalog.',
      },
    ],
    relatedGenres: ['romantic-comedy', 'k-drama', 'drama'],
    relatedGlossary: ['content-library', 'svod', 'binge-watching'],
  },
  {
    slug: 'historical-drama',
    name: 'Historical Drama',
    displayName: 'Historical Drama',
    shortDescription: 'Epic stories set in real historical periods - wars, kingdoms, and political upheaval. Different from period drama\'s focus on social manners.',
    longDescription:
      'Historical drama places real events and historical figures at the center of the story. Unlike period drama, which tends to focus on social class and manners in a specific era, historical drama is built around actual conflicts, rulers, invasions, and turning points in history. Vikings, The Last Kingdom, and The Crown dramatize real people and real events with varying degrees of fidelity. Netflix has invested heavily here with The Crown, Marco Polo, and its Vikings spinoff Vikings: Valhalla. Amazon Prime Video co-produced Vikings originally through History Channel and holds a catalog of historical epics. HBO has Rome and Band of Brothers, two of the most acclaimed historical dramas ever made. Apple TV+ has taken a different angle with shows like Masters of the Air. The genre appeals to viewers who want their entertainment to feel grounded in something real - actual battles, documented monarchs, recorded political crises.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '200+ historical drama titles',
        strengths: ['High-budget originals', 'Royal and political epics', 'International historical content'],
        exclusiveHighlights: ['The Crown', 'Vikings: Valhalla', 'Marco Polo', 'The English'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '150+ historical drama titles',
        strengths: ['Critically acclaimed war epics', 'Roman history', 'WWII dramatizations'],
        exclusiveHighlights: ['Band of Brothers', 'Rome', 'The Pacific', 'House of the Dragon'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '200+ historical drama titles',
        strengths: ['Vikings original series', 'The Last Kingdom library', 'British historical dramas'],
        exclusiveHighlights: ['Vikings', 'The Last Kingdom', 'Peaky Blinders (shared)', 'Outlander'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '20+ historical drama titles',
        strengths: ['WWII production quality', 'Award-winning cinematography', 'Ad-free viewing'],
        exclusiveHighlights: ['Masters of the Air', 'Shantaram', 'Tetris'],
      },
    ],
    viewingStats: 'The Crown attracted over 73 million households in its first year on Netflix, making it one of the platform\'s most-watched drama series',
    trendingTitles: ['The Crown', 'Vikings: Valhalla', 'Masters of the Air', 'House of the Dragon', 'Band of Brothers', 'The Last Kingdom'],
    bestCountriesFor: [
      { countrySlug: 'united-kingdom', reason: 'Strongest access to British historical dramas including The Crown, Peaky Blinders, and BritBox archive' },
      { countrySlug: 'united-states', reason: 'Full access to Netflix, HBO, Amazon, and Apple TV+ historical catalogs' },
      { countrySlug: 'norway', reason: 'Origin country for Vikings content with localized Nordic historical programming' },
    ],
    faqs: [
      {
        question: 'What is the difference between historical drama and period drama?',
        answer: 'Historical drama is built around real historical events and people - actual monarchs, real wars, documented political crises. Period drama uses a historical setting as backdrop for fictional social stories, focusing on class, manners, and romance. The Crown is historical drama; Downton Abbey is period drama.',
      },
      {
        question: 'Where can I watch Vikings streaming?',
        answer: 'The original Vikings series (6 seasons) is available on Amazon Prime Video and Peacock in the US. Vikings: Valhalla, the Netflix-produced sequel series, streams exclusively on Netflix worldwide.',
      },
    ],
    relatedGenres: ['period-drama', 'drama', 'war-military'],
    relatedGlossary: ['content-library', 'svod', 'geo-restriction'],
  },
  {
    slug: 'reality-competition',
    name: 'Reality Competition',
    displayName: 'Reality Competition',
    shortDescription: 'Structured competition formats where contestants compete for prizes or survival. Survivor, Big Brother, and Amazing Race defined the genre.',
    longDescription:
      'Reality competition is the genre that turned unscripted television into prime-time programming. Survivor, which debuted in 2000, demonstrated that audiences would engage intensely with real people in competitive situations - and platforms have never looked back. The genre spans physical endurance (Survivor, Amazing Race), social strategy (Big Brother, The Traitors), talent performance (American Idol, The Voice, RuPaul\'s Drag Race), and dating competition (Love Is Blind, The Bachelor). Peacock, Hulu, and Netflix have all invested in competition formats. Netflix produced Squid Game: The Challenge as an extension of its fictional IP. Amazon Prime Video produces The Grand Tour and has sports competition content. The genre\'s built-in elimination structure drives appointment viewing and social media discussion in a way that few scripted shows can match. Paramount+ and Peacock hold large libraries of legacy competition formats.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '100+ reality competition titles',
        strengths: ['Original competition formats', 'International reality shows', 'Love Is Blind franchise'],
        exclusiveHighlights: ['Love Is Blind', 'Squid Game: The Challenge', 'The Circle', 'Too Hot to Handle'],
      },
      {
        platformSlug: 'peacock',
        librarySize: '200+ reality competition titles',
        strengths: ['NBC legacy formats', 'Complete Survivor and Big Brother archive', 'The Voice library'],
        exclusiveHighlights: ['Survivor', 'Big Brother', 'The Voice', 'America\'s Got Talent'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '150+ reality competition titles',
        strengths: ['Next-day ABC and Fox competition shows', 'RuPaul\'s Drag Race library', 'The Amazing Race'],
        exclusiveHighlights: ['The Amazing Race', 'American Idol', 'RuPaul\'s Drag Race', 'Hell\'s Kitchen'],
      },
      {
        platformSlug: 'paramount-plus',
        librarySize: '200+ reality competition titles',
        strengths: ['CBS reality archive', 'Current season access', 'CBS All Access legacy content'],
        exclusiveHighlights: ['The Challenge', 'Top Chef', 'Project Runway', 'Big Brother (streaming)'],
      },
    ],
    viewingStats: 'Survivor has aired 46 seasons since 2000, making it one of the longest-running competition formats in television history',
    trendingTitles: ['Survivor', 'The Traitors', 'Love Is Blind', 'The Amazing Race', 'Big Brother', 'RuPaul\'s Drag Race'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Most complete reality competition catalog across Peacock, Hulu, Netflix, and Paramount+' },
      { countrySlug: 'united-kingdom', reason: 'Strong local formats (Great British Bake Off, The Traitors UK) alongside US imports' },
      { countrySlug: 'australia', reason: 'Local versions of Survivor, Big Brother, and The Voice plus US imports on Netflix' },
    ],
    faqs: [
      {
        question: 'Where can I watch Survivor streaming?',
        answer: 'Survivor streams on Paramount+ in the US with current and past seasons available. Peacock also carries Survivor episodes. Outside the US, availability varies by country.',
      },
      {
        question: 'Which streaming service has the most reality competition shows?',
        answer: 'Peacock has the largest legacy catalog with full archives of Survivor, Big Brother, and The Voice. Netflix leads in original competition formats like Love Is Blind and The Circle. Hulu has the best current-season access for ABC and Fox competition shows.',
      },
    ],
    relatedGenres: ['reality-tv', 'documentary', 'food-cooking'],
    relatedGlossary: ['svod', 'content-library', 'binge-watching'],
  },
  {
    slug: 'western-animation',
    name: 'Western Animation',
    displayName: 'Western Animation',
    shortDescription: 'Adult animated comedies and family animation from US and European studios - from Rick and Morty to Pixar.',
    longDescription:
      'Western animation covers an unusually wide range: Pixar films for six-year-olds and Rick and Morty for adults who stayed up watching Adult Swim in college are both technically in this category. The genre splits cleanly into family animation - Disney, Pixar, DreamWorks, Illumination - and adult animation - Rick and Morty, Family Guy, Bob\'s Burgers, Archer, BoJack Horseman. Disney+ is the obvious home for family animation, holding the complete Disney and Pixar libraries alongside newer originals. Max holds the Adult Swim catalog and is the exclusive home of Rick and Morty. Hulu carries Family Guy, Bob\'s Burgers, and current Fox animated series. Netflix has built a strong adult animation original slate with BoJack Horseman, Big Mouth, and The Midnight Gospel. Amazon Prime Video has Invincible, which has become one of the most-discussed adult animated superhero series on streaming.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'disney-plus',
        librarySize: '400+ animated titles',
        strengths: ['Complete Disney and Pixar catalog', 'Disney+ originals', 'Family-friendly interface'],
        exclusiveHighlights: ['Inside Out 2', 'Encanto', 'Luca', 'The Simpsons (all seasons)', 'Gravity Falls'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '300+ animated titles',
        strengths: ['Adult Swim archive', 'Rick and Morty exclusive', 'Looney Tunes and Warner catalog'],
        exclusiveHighlights: ['Rick and Morty', 'Aqua Teen Hunger Force', 'Primal', 'Batman: The Animated Series'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '250+ animated titles',
        strengths: ['Fox animated series library', 'Current-season Family Guy and Bob\'s Burgers', 'FX animation'],
        exclusiveHighlights: ['Family Guy', 'Bob\'s Burgers', 'Archer', 'Solar Opposites'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '200+ animated titles',
        strengths: ['Original adult animation', 'International animated series', 'DreamWorks partnership content'],
        exclusiveHighlights: ['BoJack Horseman', 'Big Mouth', 'Arcane', 'The Midnight Gospel'],
      },
    ],
    viewingStats: 'The Simpsons, exclusively streaming on Disney+, has 34+ seasons of episodes available - one of the largest single-show animated libraries on streaming',
    trendingTitles: ['Rick and Morty', 'Arcane', 'BoJack Horseman', 'Inside Out 2', 'Primal', 'Invincible'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Complete access to Disney+, Max, Hulu, and Netflix animated libraries' },
      { countrySlug: 'canada', reason: 'Full access to all major animation platforms at competitive pricing' },
      { countrySlug: 'united-kingdom', reason: 'Disney+, Netflix, and Max animation catalogs all available' },
    ],
    faqs: [
      {
        question: 'Where can I watch Rick and Morty streaming?',
        answer: 'Rick and Morty is exclusive to Max (HBO Max) in the US. Outside the US, availability depends on local licensing arrangements.',
      },
      {
        question: 'Where can I watch all Pixar movies on streaming?',
        answer: 'All Pixar films stream exclusively on Disney+ in the US. The library includes Toy Story through Elemental and Inside Out 2.',
      },
    ],
    relatedGenres: ['kids-animation', 'comedy', 'sci-fi'],
    relatedGlossary: ['content-library', 'svod', 'geo-restriction'],
  },
  {
    slug: 'crime-thriller',
    name: 'Crime Thriller',
    displayName: 'Crime Thriller',
    shortDescription: 'Psychological tension, complex antagonists, and plotting built around criminal acts. Heavier on suspense than procedural crime drama.',
    longDescription:
      'Crime thriller is distinct from crime drama in what it prioritizes. Crime drama (The Wire, Law & Order, Bosch) focuses on procedure, institution, and character across long seasons. Crime thriller compresses tension - it\'s built on psychological pressure, unreliable perspectives, and the mechanics of the criminal act itself. Think Ozark\'s slow suffocation, You\'s obsessive first-person narration, or Mindhunter\'s quiet dread. The genre rewards viewers who want to feel genuinely unsettled rather than just entertained. Netflix has committed heavily to crime thrillers with Ozark, Narcos, Money Heist, and Lupin. HBO Max holds Breaking Bad (via the full AMC library) alongside its own prestige crime output. Amazon Prime Video has The Gentleman and Slow Horses. Apple TV+\'s Slow Horses has become one of the most praised crime thrillers on streaming. The international expansion of this genre - Spanish, French, German, and Korean crime thrillers - has broadened it significantly.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '400+ crime thriller titles',
        strengths: ['International crime thrillers', 'Original heist and cartel dramas', 'Psychological thriller originals'],
        exclusiveHighlights: ['Ozark', 'Narcos', 'Money Heist', 'Lupin', 'You'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '300+ crime thriller titles',
        strengths: ['Breaking Bad and Better Call Saul', 'True Detective', 'AMC crime catalog'],
        exclusiveHighlights: ['Breaking Bad', 'Better Call Saul', 'True Detective', 'Mare of Easttown'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '30+ crime thriller titles',
        strengths: ['Critically acclaimed spy thrillers', 'Gary Oldman-led prestige output', 'High production quality'],
        exclusiveHighlights: ['Slow Horses', 'Presumed Innocent', 'Sugar', 'Disclaimer'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '250+ crime thriller titles',
        strengths: ['British crime thrillers', 'International crime originals', 'Film crime catalog'],
        exclusiveHighlights: ['The Gentlemen', 'Bosch', 'Ripper Street', 'Fleabag (dark comedy thriller)'],
      },
    ],
    viewingStats: 'Breaking Bad and Better Call Saul consistently rank among the highest-rated TV dramas on review aggregators, both streaming on Max',
    trendingTitles: ['Slow Horses', 'Ozark', 'True Detective: Night Country', 'Presumed Innocent', 'Breaking Bad', 'Money Heist'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Complete access to Netflix, Max, Apple TV+, and Prime Video crime thriller catalogs' },
      { countrySlug: 'united-kingdom', reason: 'Strong British crime thrillers on BritBox, Netflix UK, and Apple TV+' },
      { countrySlug: 'spain', reason: 'Origin country for Money Heist and access to Europe\'s best crime thriller originals on Netflix' },
    ],
    faqs: [
      {
        question: 'What is the difference between crime drama and crime thriller?',
        answer: 'Crime drama focuses on institutions, procedure, and ensemble character work over long arcs - The Wire and Bosch are prime examples. Crime thriller prioritizes psychological tension, the criminal\'s perspective, and tighter plot mechanics. Ozark, You, and Mindhunter are crime thrillers. The line blurs, but the emotional experience is different.',
      },
      {
        question: 'Where can I watch Breaking Bad streaming?',
        answer: 'Breaking Bad and its sequel series Better Call Saul stream exclusively on Max (HBO Max) in the US. Both are available in full.',
      },
    ],
    relatedGenres: ['crime-drama', 'thriller', 'psychological-thriller'],
    relatedGlossary: ['svod', 'content-library', 'geo-restriction'],
  },
  {
    slug: 'war-military',
    name: 'War & Military',
    displayName: 'War & Military',
    shortDescription: 'Combat drama, military biography, and the human cost of conflict. From WWII miniseries to modern warfare.',
    longDescription:
      'War and military content on streaming spans the full spectrum from harrowing combat drama to military biography to procedural shows about life on bases and ships. The genre is anchored by a handful of landmark productions: Band of Brothers and The Pacific on HBO, Masters of the Air on Apple TV+, and Platoon-era films available across platforms. HBO\'s investment in WWII storytelling through Steven Spielberg and Tom Hanks remains the benchmark - Band of Brothers frequently tops viewer polls for best war content on streaming. Netflix has The English, Black Hawk Down (licensing), and original military-adjacent thrillers. Apple TV+ positioned Masters of the Air as a prestige WWII production in the same lineage as Band of Brothers. Amazon Prime Video holds a significant library of war films. The genre draws viewers who want to understand the scale and human reality of historical conflicts.',
    category: 'mainstream',
    bestPlatforms: [
      {
        platformSlug: 'hbo-max',
        librarySize: '100+ war and military titles',
        strengths: ['Band of Brothers and The Pacific', 'HBO WWII prestige content', 'War film catalog'],
        exclusiveHighlights: ['Band of Brothers', 'The Pacific', 'Generation Kill', 'The Plot Against America'],
      },
      {
        platformSlug: 'apple-tv-plus',
        librarySize: '20+ war and military titles',
        strengths: ['WWII aerial combat', 'High production budget', 'Award-winning cinematography'],
        exclusiveHighlights: ['Masters of the Air', 'Echo 3', 'Greyhound'],
      },
      {
        platformSlug: 'netflix',
        librarySize: '150+ war and military titles',
        strengths: ['International war films', 'WWII documentaries', 'Modern warfare originals'],
        exclusiveHighlights: ['All Quiet on the Western Front', 'The Forgotten Battle', 'Monsoon Shootout', 'Spectral'],
      },
      {
        platformSlug: 'amazon-prime-video',
        librarySize: '200+ war and military titles',
        strengths: ['Large war film library', 'Military action originals', 'Classic war films'],
        exclusiveHighlights: ['The Outpost', 'The Liberator', 'Hacksaw Ridge', 'Dunkirk'],
      },
    ],
    viewingStats: 'Band of Brothers has maintained a 9.4 rating on IMDb across millions of votes - one of the highest-rated miniseries in television history',
    trendingTitles: ['Masters of the Air', 'Band of Brothers', 'All Quiet on the Western Front', 'The Pacific', 'Generation Kill', 'Greyhound'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Full access to HBO, Apple TV+, Netflix, and Prime Video war content' },
      { countrySlug: 'united-kingdom', reason: 'Strong British WWII content on BritBox and Max, plus Netflix war originals' },
      { countrySlug: 'germany', reason: 'Access to German-language war productions and All Quiet on the Western Front on Netflix' },
    ],
    faqs: [
      {
        question: 'Where can I watch Band of Brothers streaming?',
        answer: 'Band of Brothers streams exclusively on Max (HBO Max) in the US as part of the HBO catalog. The Pacific and Generation Kill are also on Max.',
      },
      {
        question: 'What is the best World War II series on streaming?',
        answer: 'Band of Brothers (Max) and Masters of the Air (Apple TV+) are the most acclaimed WWII miniseries on streaming. The Pacific (Max) is the direct follow-up to Band of Brothers. All Quiet on the Western Front (Netflix) won the Academy Award for Best International Feature Film.',
      },
    ],
    relatedGenres: ['historical-drama', 'drama', 'thriller'],
    relatedGlossary: ['content-library', 'svod', 'geo-restriction'],
  },
  {
    slug: 'lgbtq-streaming',
    name: 'LGBTQ+ Content',
    displayName: 'LGBTQ+ Streaming',
    shortDescription: 'Queer-centered storytelling across drama, comedy, and documentary - from Pose to RuPaul\'s Drag Race.',
    longDescription:
      'LGBTQ+ content on streaming has shifted from niche specialty programming to mainstream award contenders. Pose on Netflix drew critical acclaim for its ballroom culture portrayal, with a majority-trans cast. RuPaul\'s Drag Race, originally on Logo then VH1, now streams across Paramount+ and has spawned franchises in a dozen countries. Netflix has invested heavily in queer-centered originals including Heartstopper, Sex Education, and Schitt\'s Creek (acquired). Hulu holds a strong catalog of LGBTQ+ films and has been home to The L Word: Generation Q and It\'s a Sin. Apple TV+ produced Pachinko, which has received praise for its LGBTQ+ representation alongside its historical narrative. Max carries Looking and the full HBO catalog which includes significant queer representation across decades of programming. The category spans coming-of-age stories, political dramas, documentaries about the HIV crisis, and competition formats with large queer fan bases.',
    category: 'niche',
    bestPlatforms: [
      {
        platformSlug: 'netflix',
        librarySize: '200+ LGBTQ+ titles',
        strengths: ['Original queer dramas', 'International LGBTQ+ content', 'Strong trans representation'],
        exclusiveHighlights: ['Heartstopper', 'Sex Education', 'Pose', 'Schitt\'s Creek', 'The Politician'],
      },
      {
        platformSlug: 'hulu',
        librarySize: '150+ LGBTQ+ titles',
        strengths: ['LGBTQ+ film catalog', 'The L Word library', 'FX queer content'],
        exclusiveHighlights: ['It\'s a Sin', 'The L Word: Generation Q', 'Looking (via Max add-on)', 'Bros'],
      },
      {
        platformSlug: 'paramount-plus',
        librarySize: '100+ LGBTQ+ titles',
        strengths: ['RuPaul\'s Drag Race franchise', 'All-Stars seasons', 'International Drag Race versions'],
        exclusiveHighlights: ['RuPaul\'s Drag Race', 'Drag Race All Stars', 'UK vs The World', 'Canada\'s Drag Race'],
      },
      {
        platformSlug: 'hbo-max',
        librarySize: '200+ LGBTQ+ titles',
        strengths: ['HBO queer drama archive', 'Looking and True Blood', 'Documentary collection'],
        exclusiveHighlights: ['Looking', 'True Blood', 'Euphoria', 'The Normal Heart', 'Angels in America'],
      },
    ],
    viewingStats: 'Heartstopper Season 1 ranked in Netflix\'s top 10 across 54 countries in its first week of release',
    trendingTitles: ['Heartstopper', 'RuPaul\'s Drag Race', 'Sex Education', 'Pose', 'Euphoria', 'It\'s a Sin'],
    bestCountriesFor: [
      { countrySlug: 'united-states', reason: 'Full access to Netflix, Hulu, Paramount+, and Max LGBTQ+ catalogs' },
      { countrySlug: 'united-kingdom', reason: 'Strong British LGBTQ+ originals on Channel 4 (It\'s a Sin) and Netflix UK' },
      { countrySlug: 'canada', reason: 'Full access to all major platforms plus strong Canadian LGBTQ+ productions on CBC Gem' },
    ],
    faqs: [
      {
        question: 'What streaming service has the most LGBTQ+ content?',
        answer: 'Netflix has the largest volume of LGBTQ+ originals including Heartstopper, Pose, and Sex Education. Max carries HBO\'s extensive queer drama catalog. Paramount+ is the home of RuPaul\'s Drag Race and its international franchise.',
      },
      {
        question: 'Where can I watch RuPaul\'s Drag Race streaming-',
        answer: 'RuPaul\'s Drag Race and all All-Stars seasons stream on Paramount+ in the US. International versions including UK, Canada, and Germany are also available on Paramount+ or local streaming services depending on country.',
      },
    ],
    relatedGenres: ['reality-competition', 'drama', 'documentary'],
    relatedGlossary: ['content-library', 'svod', 'geo-restriction'],
  },
];

export function getGenreBySlug(slug: string): GenreGuide | undefined {
  return genreGuides.find(g => g.slug === slug);
}
