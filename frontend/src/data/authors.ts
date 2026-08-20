export interface Author {
  slug: string;
  name: string;
  title: string;
  bio: string;
  expertise: string[];
  twitterHandle?: string;
  linkedInUrl?: string;
}

export const authors: Author[] = [
  {
    slug: 'sofia-reyes',
    name: 'Sofia Reyes',
    title: 'Streaming Industry Analyst',
    bio: "Sofia Reyes has spent eight years covering the global streaming industry, with bylines at TechCrunch, Variety, and The Information. Her work focuses on streaming platform availability, territorial licensing deals, and the data behind catalog size disparities across markets. Before going independent, she led OTT market research at a media intelligence firm tracking subscriber trends across 60 countries. Sofia has testified before the EU Digital Markets Act working group on streaming geo-restrictions and co-authored a widely cited 2024 report on cross-border content access. She holds a BSc in Media Economics from Universidad Autonoma de Madrid and an MSc in Digital Media from the London School of Economics.",
    expertise: ['streaming platform availability', 'geo-restrictions', 'territorial licensing', 'industry data', 'platform comparisons'],
    twitterHandle: 'sofiareyes_stream',
    linkedInUrl: 'https://linkedin.com/in/sofia-reyes-streaming',
  },
  {
    slug: 'marcus-webb',
    name: 'Marcus Webb',
    title: 'Technology & VPN Researcher',
    bio: "Marcus Webb is a network engineer turned technology journalist who has spent a decade testing VPNs, DNS services, and streaming infrastructure. He previously worked as a senior network architect for a UK-based ISP before pivoting to research and writing. Marcus has reviewed over 40 VPN providers, contributed to the Open Technology Fund's circumvention research, and writes the quarterly Streaming Infrastructure Report covering CDN performance, VPN detection systems, and Smart DNS reliability. His technical background gives him direct insight into why certain services fail in specific markets. He holds a BEng in Computer Networks from the University of Manchester and CompTIA Security+ certification.",
    expertise: ['VPN technology', 'Smart DNS', 'network architecture', 'streaming device compatibility', 'sports streaming', 'geo-restriction circumvention'],
    twitterHandle: 'marcuswebb_tech',
    linkedInUrl: 'https://linkedin.com/in/marcus-webb-vpn',
  },
  {
    slug: 'alex-chen',
    name: 'Alex Chen',
    title: 'Streaming Data Analyst & Consumer Tech Reporter',
    bio: "Alex Chen covers the business of streaming from a consumer-first perspective, specializing in pricing analysis, content availability research, and cord-cutting economics. He spent five years as a data analyst at a media consultancy tracking platform launches, pricing changes, and subscriber churn across 40 markets before transitioning to full-time research and writing. Alex's comparative pricing datasets have been referenced by CNBC, Business Insider, and the Wall Street Journal. He maintains a quarterly index of streaming price changes across all major platforms and regularly contributes to consumer technology outlets. He holds a BS in Data Science from UC Berkeley and an MBA from the University of Washington.",
    expertise: ['streaming pricing', 'cord-cutting economics', 'content availability data', 'consumer tech', 'platform comparisons', 'free streaming services'],
    twitterHandle: 'alexchen_stream',
    linkedInUrl: 'https://linkedin.com/in/alex-chen-streaming',
  },
  {
    slug: 'priya-nair',
    name: 'Priya Nair',
    title: 'International Media Rights Analyst',
    bio: "Priya Nair specializes in content licensing and streaming market dynamics across Asia-Pacific, the Middle East, Latin America, and Africa. She spent six years at a global media rights consultancy advising broadcasters and OTT platforms on territorial acquisition strategies before becoming an independent analyst and writer. Priya's research on JioHotstar's 500-million-user milestone was cited by Reuters and the Financial Times. She tracks licensing deal flows, co-production agreements, and the regulatory landscape shaping what viewers can access in each region. Her writing appears in The Hollywood Reporter, Variety, and the International Journal of Digital Television. She holds an MA in International Media Studies from SOAS University of London.",
    expertise: ['international media rights', 'APAC streaming', 'MENA streaming', 'Latin America streaming', 'content licensing', 'Africa streaming markets'],
    twitterHandle: 'priyanair_media',
    linkedInUrl: 'https://linkedin.com/in/priya-nair-media-rights',
  },
];

export function getAuthorBySlug(slug: string): Author | undefined {
  return authors.find(a => a.slug === slug);
}
