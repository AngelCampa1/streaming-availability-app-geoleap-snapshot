export interface GlossaryTerm {
  slug: string;
  term: string;
  shortDefinition: string;
  longExplanation: string;
  relatedTerms: string[];
  category: 'streaming' | 'technology' | 'content' | 'business' | 'rights';
  faqs?: Array<{ question: string; answer: string }>;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    slug: 'svod',
    term: 'SVOD',
    shortDefinition: 'Subscription Video on Demand - a recurring-fee streaming model.',
    longExplanation:
      'SVOD (Subscription Video on Demand) is a streaming model where viewers pay a recurring fee (monthly or annual) to access a library of content. Netflix, Disney+, and HBO Max are common examples. SVOD is the most widely used paid streaming model worldwide.',
    relatedTerms: ['avod', 'tvod', 'pvod', 'fast', 'freemium'],
    category: 'business',
    faqs: [
      { question: 'What does SVOD stand for?', answer: 'SVOD stands for Subscription Video on Demand.' },
      { question: 'What are examples of SVOD services?', answer: 'Netflix, Disney+, HBO Max (Max), Amazon Prime Video, and Apple TV+ are all SVOD services.' },
    ],
  },
  {
    slug: 'avod',
    term: 'AVOD',
    shortDefinition: 'Advertising-based Video on Demand - free streaming funded by ads.',
    longExplanation:
      'AVOD (Advertising Video on Demand) is a streaming model where content is free to viewers but paid for by advertising. Tubi, Pluto TV, and the ad-supported tiers of Netflix and Hulu use this model. AVOD has grown as viewers look for cheaper alternatives.',
    relatedTerms: ['svod', 'tvod', 'fast', 'free-tier'],
    category: 'business',
    faqs: [
      { question: 'What is AVOD streaming?', answer: 'AVOD stands for Advertising Video on Demand. It is a free streaming model where content is paid for by advertisements.' },
    ],
  },
  {
    slug: 'tvod',
    term: 'TVOD',
    shortDefinition: 'Transactional Video on Demand - pay-per-title streaming.',
    longExplanation:
      'TVOD (Transactional Video on Demand) is a model where viewers pay for individual movies or TV episodes instead of a subscription. This includes digital rental (48-hour access) and digital purchase (permanent ownership). Apple TV (purchases), Amazon Prime Video (rentals), and Vudu are well-known TVOD platforms.',
    relatedTerms: ['svod', 'avod', 'pvod', 'windowing'],
    category: 'business',
  },
  {
    slug: 'pvod',
    term: 'PVOD',
    shortDefinition: 'Premium Video on Demand - early digital release of films at higher prices.',
    longExplanation:
      'PVOD (Premium Video on Demand) is the practice of releasing movies digitally at a premium price ($19.99-$29.99) before they leave theaters or shortly after. It became common during COVID-19 and lets studios earn digital revenue earlier in a film\'s release cycle.',
    relatedTerms: ['tvod', 'svod', 'day-and-date-release', 'windowing'],
    category: 'business',
  },
  {
    slug: 'fast',
    term: 'FAST',
    shortDefinition: 'Free Ad-Supported Streaming Television - free live and on-demand channels.',
    longExplanation:
      'FAST (Free Ad-Supported Streaming Television) is a type of streaming service that offers free, live channel-style viewing paid for by advertising. Unlike AVOD, FAST imitates the linear TV experience with scheduled programming. Pluto TV, Tubi (linear channels), and Samsung TV+ are popular FAST platforms.',
    relatedTerms: ['avod', 'svod', 'ott', 'linear-tv'],
    category: 'business',
  },
  {
    slug: 'drm',
    term: 'DRM',
    shortDefinition: 'Digital Rights Management - technology protecting streaming content from piracy.',
    longExplanation:
      'DRM (Digital Rights Management) is a group of technologies streaming services use to prevent unauthorized copying and distribution of copyrighted content. Common DRM systems include Widevine (Google/Netflix), FairPlay (Apple), and PlayReady (Microsoft). DRM also enforces geo-restrictions and device limits.',
    relatedTerms: ['geo-blocking', 'streaming-rights', 'licensed-content'],
    category: 'technology',
    faqs: [
      { question: 'Why can\'t I screen record Netflix-', answer: 'Netflix uses DRM (Digital Rights Management) technology that prevents screen recording software from capturing the video.' },
    ],
  },
  {
    slug: 'geo-blocking',
    term: 'Geo-blocking',
    shortDefinition: 'Restricting access to streaming content based on geographic location.',
    longExplanation:
      'Geo-blocking is when a streaming service restricts access to content based on a user\'s geographic location, usually determined by their IP address. Streaming services do this because they hold different content licenses in different countries. A movie on Netflix US may not be on Netflix UK because of regional licensing deals.',
    relatedTerms: ['geo-restriction', 'vpn', 'streaming-rights', 'drm', 'licensed-content'],
    category: 'rights',
    faqs: [
      { question: 'Why is content blocked in my country?', answer: 'Streaming services acquire content licenses on a country-by-country basis. If a service doesn\'t hold the rights for your country, the content will be geo-blocked.' },
      { question: 'Can a VPN bypass geo-blocking?', answer: 'VPNs can technically bypass geo-blocking by routing your connection through a server in another country. However, this may violate streaming services\' terms of service.' },
    ],
  },
  {
    slug: 'geo-restriction',
    term: 'Geo-restriction',
    shortDefinition: 'Limiting content availability based on geographic location.',
    longExplanation:
      'Geo-restriction is broadly synonymous with geo-blocking. It is any limitation placed on content based on the user\'s location. Streaming services use geo-restrictions to comply with licensing agreements, copyright laws, and regulatory requirements in different countries.',
    relatedTerms: ['geo-blocking', 'vpn', 'streaming-rights', 'drm'],
    category: 'rights',
  },
  {
    slug: 'vpn',
    term: 'VPN',
    shortDefinition: 'Virtual Private Network - a tool that masks your location and encrypts traffic.',
    longExplanation:
      'A VPN (Virtual Private Network) creates an encrypted tunnel between your device and a server in another location. It hides your real IP address and makes it look like you are browsing from a different location. Some users use VPNs to access geo-restricted streaming content, though this usually violates streaming services\' terms of service.',
    relatedTerms: ['geo-blocking', 'geo-restriction', 'drm'],
    category: 'technology',
    faqs: [
      { question: 'Is using a VPN for streaming legal?', answer: 'VPN laws vary by country, and using a VPN to change streaming regions may violate streaming services\' terms of service. Streaming services may block known VPN IP addresses.' },
    ],
  },
  {
    slug: 'cdn',
    term: 'CDN',
    shortDefinition: 'Content Delivery Network - infrastructure for delivering streaming video globally.',
    longExplanation:
      'A CDN (Content Delivery Network) is a network of servers spread across different locations that delivers video content to users from the nearest server. Netflix runs its own CDN called Open Connect, while other services use commercial CDNs like Akamai, Cloudflare, or AWS CloudFront. CDNs reduce latency and buffering.',
    relatedTerms: ['latency', 'buffering', 'adaptive-bitrate', 'transcoding'],
    category: 'technology',
  },
  {
    slug: 'adaptive-bitrate',
    term: 'Adaptive Bitrate (ABR)',
    shortDefinition: 'Technology that automatically adjusts video quality based on connection speed.',
    longExplanation:
      'Adaptive Bitrate (ABR) streaming automatically adjusts video quality in real time based on available bandwidth. When your connection slows down, the player switches to a lower bitrate. When it speeds up, quality improves. Netflix, YouTube, and most streaming services use ABR. Common standards include HLS and MPEG-DASH.',
    relatedTerms: ['buffering', 'resolution', '4k-uhd', 'hd', 'cdn', 'latency'],
    category: 'technology',
  },
  {
    slug: 'hdr',
    term: 'HDR',
    shortDefinition: 'High Dynamic Range - video format with wider color gamut and brighter highlights.',
    longExplanation:
      'HDR (High Dynamic Range) is a video format with greater contrast between dark shadows and bright highlights, plus a wider color range. Streaming HDR formats include HDR10, HDR10+, and Dolby Vision. Most premium streaming services offer HDR content, but you need an HDR-capable TV or monitor to see the difference.',
    relatedTerms: ['4k-uhd', 'dolby-atmos', 'resolution'],
    category: 'technology',
  },
  {
    slug: 'dolby-atmos',
    term: 'Dolby Atmos',
    shortDefinition: 'Immersive 3D audio format available on select streaming content.',
    longExplanation:
      'Dolby Atmos is an audio technology that creates a three-dimensional sound experience by adding height channels to traditional surround sound. Netflix, Apple TV+, Disney+, and other services offer Dolby Atmos on select titles. You need compatible hardware like a Dolby Atmos soundbar or AV receiver for playback.',
    relatedTerms: ['hdr', '4k-uhd'],
    category: 'technology',
  },
  {
    slug: 'simulcast',
    term: 'Simulcast',
    shortDefinition: 'Streaming episodes simultaneously with their original broadcast in Japan.',
    longExplanation:
      'In the anime industry, simulcast means streaming episodes online at the same time (or within hours) as their original broadcast in Japan. Crunchyroll pioneered anime simulcasting, letting international fans watch new episodes legally without waiting months for a licensed release.',
    relatedTerms: ['svod', 'licensed-content', 'streaming-rights'],
    category: 'content',
  },
  {
    slug: 'day-and-date-release',
    term: 'Day-and-Date Release',
    shortDefinition: 'Releasing a film on streaming the same day as its theatrical release.',
    longExplanation:
      'Day-and-date release is when a film is available on a streaming platform on the same day it opens in theaters. Netflix started this approach, and it became widespread during COVID-19. Warner Bros. released its entire 2021 film slate on HBO Max and in theaters at the same time. Most studios have since gone back to traditional theatrical windows.',
    relatedTerms: ['pvod', 'tvod', 'windowing', 'streaming-rights'],
    category: 'business',
  },
  {
    slug: 'windowing',
    term: 'Windowing',
    shortDefinition: 'The sequential release of content across different distribution channels.',
    longExplanation:
      'Windowing is the practice of releasing content on different distribution platforms in sequence over time. For films, the traditional order is: theatrical release to PVOD to DVD/Blu-ray to SVOD/AVOD. Each "window" has a different price point and audience. Streaming has changed traditional windowing considerably.',
    relatedTerms: ['pvod', 'tvod', 'svod', 'day-and-date-release', 'streaming-rights'],
    category: 'business',
  },
  {
    slug: 'content-library',
    term: 'Content Library',
    shortDefinition: 'The total collection of movies, shows, and other content on a streaming platform.',
    longExplanation:
      'A streaming service\'s content library is its complete catalog of available titles, including licensed content and original productions. Library size is often compared between services, though quality and relevance matter more than raw numbers. Content libraries vary a lot by country because of licensing deals.',
    relatedTerms: ['licensed-content', 'original-content', 'streaming-rights', 'geo-blocking'],
    category: 'content',
  },
  {
    slug: 'streaming-rights',
    term: 'Streaming Rights',
    shortDefinition: 'The legal licenses that allow streaming services to show content in specific territories.',
    longExplanation:
      'Streaming rights are the legal licenses that allow a streaming service to distribute specific content in defined territories. Rights are usually negotiated on a country-by-country or regional basis and for limited time periods. When rights expire, content can disappear from a platform. Competition for streaming rights has pushed content costs much higher.',
    relatedTerms: ['licensed-content', 'geo-blocking', 'drm', 'windowing'],
    category: 'rights',
  },
  {
    slug: 'original-content',
    term: 'Original Content',
    shortDefinition: 'Films and series produced exclusively by or for a streaming platform.',
    longExplanation:
      'Original content (or originals) means films and series produced exclusively for or co-produced by a streaming service. Netflix Originals, Amazon Originals, and Apple TV+ content are examples. Originals matter because they are not available on competing platforms. Industry-wide spending on originals has passed $100B+.',
    relatedTerms: ['licensed-content', 'content-library', 'streaming-rights'],
    category: 'content',
  },
  {
    slug: 'licensed-content',
    term: 'Licensed Content',
    shortDefinition: 'Movies and TV shows a streaming service pays to host but does not own.',
    longExplanation:
      'Licensed content is movies and TV shows that a streaming service pays to host but does not own. The service buys time-limited rights from studios or distributors. Licensed content can be removed when deals expire or studios take the rights back for their own platforms. This is why shows and movies sometimes disappear from streaming services.',
    relatedTerms: ['original-content', 'streaming-rights', 'windowing', 'content-library'],
    category: 'rights',
  },
  {
    slug: 'transcoding',
    term: 'Transcoding',
    shortDefinition: 'Converting video files into multiple formats and resolutions for streaming.',
    longExplanation:
      'Transcoding is the process of converting source video files into multiple formats, resolutions, and bitrates so they play well on different devices and network speeds. Netflix transcodes each title into hundreds of versions for adaptive bitrate streaming. Common codecs used in transcoding include H.264, H.265 (HEVC), and AV1.',
    relatedTerms: ['adaptive-bitrate', 'cdn', 'resolution', '4k-uhd'],
    category: 'technology',
  },
  {
    slug: 'latency',
    term: 'Latency',
    shortDefinition: 'The delay between a request and the streaming service responding with content.',
    longExplanation:
      'In streaming, latency is the delay between a viewer action (like pressing play or skipping ahead) and the content starting to play. High latency causes noticeable delays. For live streaming, latency is the gap between a real event and when viewers see it. CDNs and adaptive bitrate help reduce latency.',
    relatedTerms: ['buffering', 'cdn', 'adaptive-bitrate', 'live-streaming'],
    category: 'technology',
  },
  {
    slug: 'buffering',
    term: 'Buffering',
    shortDefinition: 'Temporary pause in playback while the player downloads more video data.',
    longExplanation:
      'Buffering happens when a video player pauses playback to download more content from the streaming server. It occurs because content is arriving slower than it plays back. Slow internet, server distance, and network congestion all cause buffering. Adaptive bitrate streaming helps reduce it.',
    relatedTerms: ['adaptive-bitrate', 'latency', 'cdn', 'resolution'],
    category: 'technology',
  },
  {
    slug: 'resolution',
    term: 'Resolution',
    shortDefinition: 'The number of pixels in a video image - higher means sharper picture.',
    longExplanation:
      'Video resolution is the number of pixels in the image, expressed as width ? height. Common streaming resolutions are SD (480p), HD (720p), Full HD (1080p), and 4K UHD (2160p). Higher resolutions need faster internet connections. Most streaming services offer up to 4K on their premium plans.',
    relatedTerms: ['4k-uhd', 'hd', 'sd', 'hdr', 'adaptive-bitrate'],
    category: 'technology',
  },
  {
    slug: '4k-uhd',
    term: '4K Ultra HD',
    shortDefinition: '3840 ? 2160 pixel resolution - four times the detail of 1080p Full HD.',
    longExplanation:
      '4K Ultra HD (UHD) is a video resolution of 3840 ? 2160 pixels, four times the detail of 1080p Full HD. Netflix, Disney+, Amazon Prime Video, and Apple TV+ all offer 4K content, often combined with HDR for better picture quality. 4K streaming usually needs a 15-25 Mbps connection.',
    relatedTerms: ['hd', 'sd', 'hdr', 'resolution', 'dolby-atmos'],
    category: 'technology',
  },
  {
    slug: 'hd',
    term: 'HD (High Definition)',
    shortDefinition: '720p or 1080p video resolution offering significantly better picture than SD.',
    longExplanation:
      'HD (High Definition) is video at 720p (1280 ? 720) or 1080p (1920 ? 1080) resolution. 1080p is also called Full HD or FHD. Most streaming services default to HD when the connection is fast enough. HD needs about 5-8 Mbps for smooth playback.',
    relatedTerms: ['4k-uhd', 'sd', 'resolution', 'adaptive-bitrate'],
    category: 'technology',
  },
  {
    slug: 'sd',
    term: 'SD (Standard Definition)',
    shortDefinition: '480p video resolution - older format with less detail than HD.',
    longExplanation:
      'SD (Standard Definition) is video at 480p (720 ? 480) or similar low resolutions. Streaming services fall back to SD on slow connections since it needs under 1 Mbps of bandwidth. SD looks noticeably worse than HD on modern large screens.',
    relatedTerms: ['hd', '4k-uhd', 'resolution', 'adaptive-bitrate'],
    category: 'technology',
  },
  {
    slug: 'subtitle',
    term: 'Subtitle',
    shortDefinition: 'Text displayed on screen translating or transcribing dialogue.',
    longExplanation:
      'Subtitles are text overlays on video that translate or transcribe dialogue and sometimes other audio. Foreign-language subtitles translate dialogue into the viewer\'s language. SDH (Subtitles for the Deaf and Hard of Hearing) also describe sound effects. All major streaming services offer subtitle options in multiple languages.',
    relatedTerms: ['closed-caption', 'audio-description'],
    category: 'content',
  },
  {
    slug: 'closed-caption',
    term: 'Closed Caption',
    shortDefinition: 'Synchronized text that includes dialogue and audio cues for accessibility.',
    longExplanation:
      'Closed captions (CC) are synchronized text overlays that include dialogue and descriptions of significant sounds (e.g., "[EXPLOSION]", "[PHONE RINGING]"). CC is designed for deaf and hard-of-hearing viewers. They can be turned on or off, hence "closed." All major streaming services in the US are legally required to provide closed captions.',
    relatedTerms: ['subtitle', 'audio-description'],
    category: 'content',
  },
  {
    slug: 'audio-description',
    term: 'Audio Description',
    shortDefinition: 'Narrated description of visual content for blind or visually impaired viewers.',
    longExplanation:
      'Audio description (AD) is an extra audio track that narrates what is happening on screen for viewers who are blind or have low vision. A narrator describes actions, settings, and visual details during pauses in dialogue. Netflix, Disney+, and other major services offer audio description on many titles.',
    relatedTerms: ['closed-caption', 'subtitle'],
    category: 'content',
  },
  {
    slug: 'binge-watching',
    term: 'Binge-watching',
    shortDefinition: 'Watching multiple episodes of a TV series in rapid succession.',
    longExplanation:
      'Binge-watching means watching multiple consecutive episodes of a TV series in one sitting. Netflix popularized this by releasing entire seasons at once instead of weekly. Surveys show that binge-watching is now normal for TV consumption, with 70%+ of streaming viewers regularly watching 3+ episodes in a row.',
    relatedTerms: ['svod', 'cord-cutting', 'ott'],
    category: 'content',
  },
  {
    slug: 'cord-cutting',
    term: 'Cord-cutting',
    shortDefinition: 'Cancelling cable or satellite TV subscriptions in favor of streaming services.',
    longExplanation:
      'Cord-cutting is when consumers cancel traditional cable or satellite TV subscriptions and switch to streaming services and internet-based TV instead. Cord-cutting picked up speed in the 2010s as streaming libraries grew and live TV streaming options appeared. Traditional pay-TV providers have lost tens of millions of subscribers.',
    relatedTerms: ['ott', 'svod', 'fast', 'linear-tv', 'binge-watching'],
    category: 'business',
  },
  {
    slug: 'ott',
    term: 'OTT',
    shortDefinition: 'Over-the-Top - content delivered via internet, bypassing traditional broadcast.',
    longExplanation:
      'OTT (Over-the-Top) is the delivery of film and TV content over the internet, bypassing traditional cable, satellite, or broadcast TV. The term comes from delivering content "over the top" of existing internet infrastructure. Netflix, YouTube, Hulu, and all major streaming services are OTT services.',
    relatedTerms: ['svod', 'avod', 'fast', 'linear-tv', 'cord-cutting'],
    category: 'business',
  },
  {
    slug: 'linear-tv',
    term: 'Linear TV',
    shortDefinition: 'Traditional scheduled broadcast or cable television.',
    longExplanation:
      'Linear TV is traditional television broadcast on a fixed schedule, where viewers watch content at the time it airs. This includes free-to-air broadcast TV and cable/satellite TV. It is the opposite of on-demand streaming, where viewers watch whenever they want. Linear TV viewership has dropped as streaming has grown.',
    relatedTerms: ['ott', 'fast', 'live-streaming', 'cord-cutting'],
    category: 'business',
  },
  {
    slug: 'vod',
    term: 'VOD',
    shortDefinition: 'Video on Demand - the ability to watch content at any time of your choosing.',
    longExplanation:
      'VOD (Video on Demand) is the general term for technology that lets viewers pick and watch video content at any time, instead of at a scheduled broadcast time. VOD covers SVOD (subscription), AVOD (ad-supported), TVOD (transactional), and PVOD (premium) models. All major streaming services are built on VOD.',
    relatedTerms: ['svod', 'avod', 'tvod', 'pvod', 'linear-tv'],
    category: 'streaming',
  },
  {
    slug: 'live-streaming',
    term: 'Live Streaming',
    shortDefinition: 'Real-time streaming of events over the internet as they happen.',
    longExplanation:
      'Live streaming is the transmission of live video over the internet in real time. For streaming services, this covers sports events, news, concerts, and special events. YouTube Live, Twitch, and Amazon Live offer live streaming alongside on-demand content. Live streaming has its own technical challenges, especially around latency.',
    relatedTerms: ['latency', 'linear-tv', 'ott', 'cdn', 'buffering'],
    category: 'streaming',
  },
  {
    slug: 'multiscreen',
    term: 'Multiscreen',
    shortDefinition: 'The ability to watch streaming content across multiple devices simultaneously.',
    longExplanation:
      'Multiscreen is the ability to stream content on multiple devices at the same time using a single subscription. Most streaming services allow 2-4 simultaneous streams depending on the plan. This matters for households sharing a subscription across TVs, tablets, phones, and laptops.',
    relatedTerms: ['svod', 'simultaneous-streams'],
    category: 'streaming',
  },
  {
    slug: 'simultaneous-streams',
    term: 'Simultaneous Streams',
    shortDefinition: 'The number of devices that can stream at the same time on one account.',
    longExplanation:
      'Simultaneous streams is the number of devices that can actively stream content from a single subscription account at the same time. Netflix allows 2 streams on Standard and 4 on Premium. Disney+ allows 4 streams on all plans. Services limit simultaneous streams to discourage password sharing.',
    relatedTerms: ['multiscreen', 'svod'],
    category: 'streaming',
  },
  {
    slug: 'download-offline',
    term: 'Offline Download',
    shortDefinition: 'Saving streaming content to a device for watching without internet.',
    longExplanation:
      'Offline download (or offline viewing) lets subscribers save streaming content to their device to watch later without an internet connection. This is useful for travelers and commuters. Netflix, Disney+, Amazon Prime Video, and Apple TV+ all offer offline downloads. Downloaded content uses DRM to prevent redistribution.',
    relatedTerms: ['drm', 'svod'],
    category: 'streaming',
  },
  {
    slug: 'free-tier',
    term: 'Free Tier',
    shortDefinition: 'A no-cost streaming plan, typically ad-supported with content limitations.',
    longExplanation:
      'A free tier is a no-cost streaming plan that pays for itself through advertising (AVOD/FAST). Free tiers usually have smaller content libraries, lower video quality, or other restrictions compared to paid tiers. Peacock, Tubi, Pluto TV, and Crunchyroll all offer free tiers. Some services like Netflix have also introduced ad-supported tiers at a lower price.',
    relatedTerms: ['avod', 'fast', 'freemium', 'svod'],
    category: 'business',
  },
  {
    slug: 'freemium',
    term: 'Freemium',
    shortDefinition: 'A model offering both free (ad-supported) and premium paid streaming tiers.',
    longExplanation:
      'Freemium is a business model that combines a free (usually ad-supported) tier with paid tiers that offer extras like ad-free viewing, higher quality, and offline downloads. Crunchyroll, YouTube, and Peacock use freemium models. The idea is to get free users to become paying subscribers over time.',
    relatedTerms: ['free-tier', 'avod', 'svod', 'subscription-fatigue'],
    category: 'business',
  },
  {
    slug: 'paywall',
    term: 'Paywall',
    shortDefinition: 'A restriction requiring payment or subscription to access premium content.',
    longExplanation:
      'A paywall is a system that blocks access to content unless you pay or subscribe. In streaming, some content may be locked behind a higher subscription tier (like 4K streaming) or require an add-on channel subscription. The term comes from digital news publishing but applies to any gated digital content.',
    relatedTerms: ['svod', 'freemium', 'free-tier'],
    category: 'business',
  },
  {
    slug: 'subscription-fatigue',
    term: 'Subscription Fatigue',
    shortDefinition: 'Consumer exhaustion from managing and paying for multiple streaming subscriptions.',
    longExplanation:
      'Subscription fatigue is when consumers get tired of adding more streaming subscriptions as the number of services keeps growing. With content spread across dozens of platforms, people end up managing multiple subscriptions and often cancel and resubscribe seasonally. This has increased demand for bundles and aggregators.',
    relatedTerms: ['svod', 'cord-cutting', 'freemium', 'paywall'],
    category: 'business',
  },
  {
    slug: 'smart-dns',
    term: 'Smart DNS',
    shortDefinition: 'A DNS-based geo-unblocking service that reroutes only location-identifying traffic without encrypting the full connection.',
    longExplanation:
      'Smart DNS works by intercepting the DNS queries and specific network traffic that streaming services use to figure out a user\'s location, then rerouting those requests through proxy servers in the target country. Unlike a VPN, Smart DNS does not encrypt the full connection, so speeds are faster and latency is lower. This makes it popular for streaming 4K content where VPN overhead can hurt performance, but it offers no privacy or security benefits beyond geo-unblocking.',
    relatedTerms: ['vpn', 'geo-blocking', 'geo-restriction', 'geo-spoofing', 'residential-ip'],
    category: 'technology',
    faqs: [
      {
        question: 'What is the difference between Smart DNS and a VPN?',
        answer: 'Smart DNS only reroutes location-identifying traffic to bypass geo-blocks, without encrypting your connection. A VPN encrypts all your traffic and routes it through a server in another country. Smart DNS is faster but provides no security or privacy; VPNs are slower but protect your data.',
      },
    ],
  },
  {
    slug: 'residential-ip',
    term: 'Residential IP',
    shortDefinition: 'An IP address assigned to a real home internet connection, as opposed to a data centre server.',
    longExplanation:
      'Residential IP addresses are assigned by internet service providers (ISPs) to home broadband customers. Because they look like they belong to real households, streaming services have a much harder time detecting and blocking them compared to data centre IPs used by commercial VPNs. Some VPN and proxy services offer residential IP pools specifically to get around streaming service VPN detection. Streaming platforms are spending more on identifying and blocking residential IPs suspected of being part of proxy networks.',
    relatedTerms: ['vpn', 'smart-dns', 'geo-spoofing', 'geo-blocking'],
    category: 'technology',
  },
  {
    slug: 'geo-spoofing',
    term: 'Geo-spoofing',
    shortDefinition: 'Making your internet connection appear to originate from a different country than your actual location.',
    longExplanation:
      'Geo-spoofing means disguising your real location online by routing your connection through servers in another country, usually with a VPN or Smart DNS service. For streaming, geo-spoofing lets users access content libraries from other regions that are blocked in their country because of licensing agreements. Streaming platforms fight geo-spoofing by detecting and blocking known VPN and proxy IP address ranges.',
    relatedTerms: ['vpn', 'smart-dns', 'geo-blocking', 'geo-restriction', 'residential-ip'],
    category: 'rights',
    faqs: [
      {
        question: 'Is geo-spoofing illegal?',
        answer: 'Geo-spoofing using a VPN may be allowed in some countries and restricted in others. It typically violates streaming services\' terms of service, which may result in blocked playback or account action. Some countries restrict or prohibit VPN use entirely.',
      },
    ],
  },
  {
    slug: 'streaming-token',
    term: 'Streaming Token',
    shortDefinition: 'A short-lived authentication credential issued by a streaming service that authorizes playback of specific content.',
    longExplanation:
      'A streaming token is a cryptographic credential generated by a streaming platform\'s server when a user starts playback. It contains information like the user\'s account tier, geographic region, device, and the specific content being played. Streaming tokens expire quickly (usually minutes to hours) to prevent sharing and enforce DRM. If a VPN changes a user\'s apparent location mid-session, the token may become invalid and cause playback errors.',
    relatedTerms: ['drm', 'geo-blocking', 'vpn', 'hdcp'],
    category: 'technology',
  },
  {
    slug: 'hdcp',
    term: 'HDCP',
    shortDefinition: 'High-bandwidth Digital Content Protection - copy protection that secures the connection between streaming devices and displays.',
    longExplanation:
      'HDCP (High-bandwidth Digital Content Protection) is a form of DRM that protects digital video and audio as it travels between devices, for example between a streaming stick and a TV over HDMI. Streaming services require HDCP-compliant connections to play HD and 4K content. If a non-HDCP device is in the chain (like an HDMI splitter or an older monitor), playback may be blocked or dropped to SD resolution.',
    relatedTerms: ['drm', 'streaming-token', '4k-uhd', 'hd'],
    category: 'technology',
  },
  {
    slug: 'hls',
    term: 'HLS',
    shortDefinition: 'HTTP Live Streaming - Apple\'s adaptive bitrate streaming protocol widely used across streaming platforms.',
    longExplanation:
      'HLS (HTTP Live Streaming) is a streaming protocol developed by Apple that breaks video into small segments and delivers them over standard HTTP connections. It supports adaptive bitrate streaming, so players can switch between quality levels based on available bandwidth. Although Apple created it, HLS is now used across the industry by Netflix, YouTube, Hulu, and most other streaming platforms alongside the competing MPEG-DASH standard.',
    relatedTerms: ['adaptive-bitrate', 'cdn', 'buffering', 'transcoding', 'bitrate-ladder'],
    category: 'technology',
  },
  {
    slug: 'bitrate-ladder',
    term: 'Bitrate Ladder',
    shortDefinition: 'The set of video encoding profiles a streaming service prepares for each title to support different network speeds.',
    longExplanation:
      'A bitrate ladder is the set of video quality levels (resolution and bitrate combinations) that a streaming service encodes for each piece of content. For example, Netflix may encode a single film at 10+ quality levels ranging from 240p at 300 Kbps to 4K at 25+ Mbps. The adaptive bitrate player picks the best rung of the ladder based on the viewer\'s current network speed, switching on the fly to keep playback smooth.',
    relatedTerms: ['adaptive-bitrate', 'hls', 'transcoding', 'resolution', '4k-uhd', 'cdn'],
    category: 'technology',
  },
  {
    slug: 'content-id',
    term: 'Content ID',
    shortDefinition: 'YouTube\'s automated system for detecting and managing copyrighted content uploaded to the platform.',
    longExplanation:
      'Content ID is YouTube\'s copyright management system that automatically scans uploaded videos and compares them against a database of copyrighted audio and video submitted by rights holders. When a match is found, rights holders can block the content, monetize it (taking the ad revenue), or track its viewership. Content ID has processed billions of videos and is the main way YouTube manages sports highlights, music, and film clips on the platform.',
    relatedTerms: ['drm', 'streaming-rights', 'licensed-content', 'geo-blocking'],
    category: 'business',
  },
  {
    slug: 'holdback',
    term: 'Holdback',
    shortDefinition: 'A contractual restriction preventing content from appearing on certain platforms or in certain regions for a set period.',
    longExplanation:
      'A holdback is a licensing clause that stops content from appearing on specific platforms, in certain regions, or during set time periods. For example, a studio\'s output deal with Netflix might include holdbacks that keep the same films off a competitor\'s platform. Holdbacks also protect theatrical releases by blocking digital availability during the theatrical window.',
    relatedTerms: ['exclusivity-window', 'windowing', 'theatrical-window', 'output-deal', 'streaming-rights'],
    category: 'business',
  },
  {
    slug: 'exclusivity-window',
    term: 'Exclusivity Window',
    shortDefinition: 'A defined period during which content is available only on one platform before other services can license it.',
    longExplanation:
      'An exclusivity window is a contract that gives one streaming platform the sole right to distribute specific content for a fixed time period. Netflix and other streamers pay large premiums for exclusive windows on popular titles, keeping competitors from offering the same content. After the exclusivity window expires, rights can be licensed to other platforms.',
    relatedTerms: ['holdback', 'windowing', 'output-deal', 'streaming-rights', 'licensed-content'],
    category: 'business',
  },
  {
    slug: 'theatrical-window',
    term: 'Theatrical Window',
    shortDefinition: 'The period between a film\'s cinema release and its availability on home video, streaming, or digital platforms.',
    longExplanation:
      'The theatrical window is the period during which a film can only be seen in cinemas before it becomes available on home video or streaming. This window was traditionally 90-180 days. During COVID-19, studios shortened it sharply or skipped it altogether with day-and-date releases. After the pandemic, the standard settled at roughly 45-90 days before digital release.',
    relatedTerms: ['windowing', 'pvod', 'day-and-date-release', 'holdback', 'tvod'],
    category: 'business',
    faqs: [
      {
        question: 'How long does it take for a movie to appear on streaming after theaters?',
        answer: 'The typical theatrical window is now 45-90 days. Most major studio films appear on PVOD (digital rental) around 45-60 days after theatrical release, and on SVOD platforms like Netflix or Max around 90-180 days after theaters.',
      },
    ],
  },
  {
    slug: 'output-deal',
    term: 'Output Deal',
    shortDefinition: 'An agreement giving a streaming service first rights to license a studio\'s upcoming content as it is released.',
    longExplanation:
      'An output deal is a licensing agreement where a streaming platform gets the rights to all (or most of) a studio\'s future films and shows as they come out. Instead of negotiating title by title, the streamer pays an upfront fee for access to the studio\'s output over a set period. Netflix, Amazon, and Apple have all used output deals to lock in large amounts of content from major studios.',
    relatedTerms: ['licensed-content', 'streaming-rights', 'exclusivity-window', 'holdback', 'content-library'],
    category: 'business',
  },
  {
    slug: 'co-production',
    term: 'Co-production',
    shortDefinition: 'A production financed and produced jointly by multiple studios, broadcasters, or streaming platforms, often across countries.',
    longExplanation:
      'A co-production is a film or series produced and financed jointly by two or more parties, usually a streaming platform and a local broadcaster or studio in another country. Co-productions help streaming services lower costs, tap into local production talent, and qualify for regional tax incentives. Both parties typically get distribution rights in their own territories. Series like Squid Game and Money Heist started as broadcaster-streamer co-productions.',
    relatedTerms: ['original-content', 'streaming-rights', 'licensed-content', 'geo-blocking'],
    category: 'content',
  },
  {
    slug: 'household-verification',
    term: 'Household Verification',
    shortDefinition: 'A process used by streaming services to confirm that multiple devices accessing an account are located in the same household.',
    longExplanation:
      'Household verification is how streaming services check whether devices on a shared account are in the same physical household. Methods include IP address checking, periodic device verification prompts, and Wi-Fi network confirmation. Netflix started enforcing household verification in 2023 as part of its password-sharing crackdown, requiring users to confirm their primary location and limiting use from different networks.',
    relatedTerms: ['password-sharing-crackdown', 'simultaneous-streams', 'svod', 'vpn'],
    category: 'streaming',
    faqs: [
      {
        question: 'How does Netflix verify household membership?',
        answer: 'Netflix uses your home Wi-Fi network as the primary household identifier. Devices must connect to the home network periodically to remain verified. Devices that only connect from other networks may be flagged as outside the household.',
      },
    ],
  },
  {
    slug: 'password-sharing-crackdown',
    term: 'Password Sharing Crackdown',
    shortDefinition: 'Policy changes by streaming services to restrict or monetize account access from outside the account holder\'s household.',
    longExplanation:
      'Password sharing crackdown is the industry-wide move by streaming services to enforce account policies that limit use to members of the same household. Netflix started this in 2023, adding household verification and charging extra for accounts used outside the primary household. Many expected it to hurt subscriber numbers, but it actually led to subscriber growth as password-sharing users signed up for their own accounts.',
    relatedTerms: ['household-verification', 'simultaneous-streams', 'svod', 'subscription-fatigue'],
    category: 'streaming',
  },
  {
    slug: 'simulcast-global',
    term: 'Global Simulcast',
    shortDefinition: 'The simultaneous release of content across multiple countries or platforms at exactly the same time.',
    longExplanation:
      'A global simulcast is when content is released or transmitted across multiple countries or platforms at exactly the same time. Streaming platforms use global simulcasts more often now for major original series premieres, releasing episodes worldwide at once to reduce piracy and build buzz. This is different from traditional broadcast windowing, where content reached different territories weeks or months apart.',
    relatedTerms: ['simulcast', 'linear-tv', 'live-streaming', 'ott', 'windowing'],
    category: 'content',
  },
  {
    slug: 'multi-territory-license',
    term: 'Multi-Territory License',
    shortDefinition: 'A single content deal granting streaming rights across more than one country or region.',
    longExplanation:
      'A multi-territory license is a content rights agreement that covers two or more countries under a single contract. Streaming platforms negotiate these deals to simplify distribution - rather than signing a separate agreement for each market, they secure a bloc of countries at once. Netflix and Amazon Prime Video commonly use multi-territory licenses for European Union deals (treated as a single market) and LATAM regional packages. Multi-territory licenses are typically cheaper per-country than individual deals but may exclude the highest-value markets (the US, UK, and Germany often negotiate separately). The alternative is a global license, which covers all territories worldwide - rare due to existing rights fragmentation.',
    relatedTerms: ['exclusive-distribution-rights', 'territorial-waterfall', 'streaming-rights', 'geo-restriction'],
    category: 'rights',
    faqs: [
      { question: 'What is a multi-territory streaming license?', answer: 'A multi-territory license grants a streaming platform rights to distribute content in multiple countries under a single agreement, rather than negotiating country-by-country.' },
      { question: 'How do multi-territory licenses affect what I can watch?', answer: 'Multi-territory licenses determine which streaming service carries a title in your country. If Netflix holds a multi-territory EU license for a show, all EU residents can watch it on Netflix. Without that license, the show may appear on a different platform or be unavailable in your country.' },
    ],
  },
  {
    slug: 'exclusive-distribution-rights',
    term: 'Exclusive Distribution Rights',
    shortDefinition: 'A content deal that prevents any other platform from streaming the same title in a given territory.',
    longExplanation:
      'Exclusive distribution rights give a single platform the sole legal authority to stream a title in a specified territory during the contract period. Exclusivity is the most valuable - and most expensive - type of content deal. Disney+ holds exclusive streaming rights to Marvel and Star Wars content globally. Peacock holds exclusive US streaming rights to The Office. These exclusivity windows create the fragmentation that forces subscribers to maintain multiple services. Exclusive deals typically run 2-5 years before rights revert or are renegotiated. When exclusivity expires, content may move to a new platform, become available on multiple services, or return to the rights holder for a direct-to-consumer offering.',
    relatedTerms: ['multi-territory-license', 'windowing', 'streaming-rights', 'geo-restriction'],
    category: 'rights',
    faqs: [
      { question: 'Why is some content exclusive to one streaming service?', answer: 'Streaming platforms pay premiums for exclusive rights because exclusivity drives subscriptions. Viewers who want The Office must subscribe to Peacock; those who want The Mandalorian must subscribe to Disney+. Exclusivity is the primary mechanism platforms use to differentiate their content libraries.' },
    ],
  },
  {
    slug: 'territorial-waterfall',
    term: 'Territorial Waterfall',
    shortDefinition: 'The sequential licensing of content across different territories, each at different times and price points.',
    longExplanation:
      'A territorial waterfall describes the staged release of content rights across countries in a priority sequence. High-value markets (US, UK, Germany, France, Japan, Australia) are licensed first at the highest rates, followed by secondary markets (Canada, Spain, Italy, South Korea), then emerging markets (Brazil, India, Mexico) at progressively lower rates. This mirrors the theatrical windowing model applied to digital distribution. The waterfall creates situations where a show available on Netflix US is carried by a local broadcaster in Germany for another 18 months before Netflix Germany can acquire it. Studios use territorial waterfalls to maximize total rights revenue rather than accepting a single discounted global deal.',
    relatedTerms: ['windowing', 'multi-territory-license', 'exclusive-distribution-rights', 'streaming-rights'],
    category: 'rights',
    faqs: [
      { question: 'What is territorial waterfall in streaming?', answer: 'Territorial waterfall is the practice of licensing content to different countries in a sequential priority order - major markets first at the highest prices, smaller markets later at lower rates. This explains why the same show appears on different platforms in different countries.' },
    ],
  },
  {
    slug: 'revenue-share-agreement',
    term: 'Revenue Share Agreement',
    shortDefinition: 'A streaming deal where the platform and rights holder split subscription or advertising revenue rather than paying a fixed license fee.',
    longExplanation:
      'A revenue share agreement in streaming is a contract where the platform pays no upfront license fee and instead shares a percentage of subscription or advertising revenue with the content rights holder. This model is common for independent film distributors, smaller content studios, and regional content partners who prefer ongoing income over a one-time payment. Apple TV Channels and Amazon Prime Video Channels use revenue share with add-on channel partners. YouTube\'s monetization model is a revenue share (55% to creators for ad revenue). Revenue share deals shift risk to the rights holder - if content underperforms on the platform, earnings are low - but also preserve upside if a title becomes a hit. They are less common for major studio content, where fixed licensing fees in the hundreds of millions are standard.',
    relatedTerms: ['svod', 'avod', 'content-library', 'streaming-rights'],
    category: 'business',
    faqs: [
      { question: 'What is a revenue share deal in streaming?', answer: 'A revenue share deal means the streaming platform splits its subscription or advertising revenue with the content owner rather than paying a fixed license fee. The content owner earns more if the title performs well and less if it underperforms.' },
    ],
  },
  {
    slug: 'static-ip-address',
    term: 'Static IP Address',
    shortDefinition: 'A fixed internet address that does not change between sessions, used by businesses and some home internet plans.',
    longExplanation:
      'A static IP address is an internet address (IPv4 or IPv6) permanently assigned to a device or connection that remains constant across sessions. Most residential internet connections use dynamic IP addresses that change periodically. Static IPs are standard for businesses and are available as a paid add-on from many residential ISPs. In the context of streaming, static IPs are relevant for geo-restriction: a static IP from a specific country guarantees consistent geo-location results, whereas a dynamic IP may occasionally be reassigned to a different geographic block. VPN services that offer dedicated IP addresses provide a form of static IP - useful for accessing streaming services that block shared VPN IP ranges.',
    relatedTerms: ['ip-geolocation', 'vpn', 'geo-blocking', 'dns-leak'],
    category: 'technology',
    faqs: [
      { question: 'What is a static IP address?', answer: 'A static IP address is a fixed internet address that stays the same every time you connect. Unlike dynamic IPs that change periodically, a static IP always points to the same location.' },
      { question: 'Do I need a static IP for streaming?', answer: 'No. Standard streaming works fine with a dynamic IP. Static IPs become relevant for advanced use cases like running a media server or using a dedicated VPN IP that streaming services do not flag as a proxy.' },
    ],
  },
  {
    slug: 'split-tunneling',
    term: 'Split Tunneling',
    shortDefinition: 'A VPN feature that routes only selected traffic through the VPN while letting the rest use the regular internet connection.',
    longExplanation:
      'Split tunneling is a VPN configuration option that divides internet traffic into two streams: one routed through the encrypted VPN tunnel, and one going directly through the user\'s regular internet connection. This allows a user to stream a geo-restricted service through the VPN while simultaneously using local banking apps, domestic streaming services, or other traffic that should appear from the home IP address. Split tunneling reduces VPN bandwidth overhead and avoids speed penalties on traffic that does not need encryption. Most major VPN services (ExpressVPN, NordVPN, Surfshark) offer app-level split tunneling - the user specifies which apps use the VPN and which bypass it. Inverse split tunneling (VPN bypass mode) routes all traffic through the VPN except specified apps.',
    relatedTerms: ['vpn', 'static-ip-address', 'dns-leak', 'geo-blocking'],
    category: 'technology',
    faqs: [
      { question: 'What is split tunneling in a VPN?', answer: 'Split tunneling lets you choose which apps or websites go through the VPN and which connect normally. For example, you can stream a geo-restricted service through the VPN while your local banking app uses your regular internet connection.' },
      { question: 'Is split tunneling safe?', answer: 'Split tunneling is safe for its intended purpose. Traffic not routed through the VPN is not encrypted by the VPN, so it receives the same privacy protection as a regular internet connection. Use split tunneling selectively - route only the specific services needing geo-access through the VPN.' },
    ],
  },
  {
    slug: 'blackout-restriction',
    term: 'Blackout Restriction',
    shortDefinition: 'A broadcast rule that prevents a sports event from being streamed in the local market to protect in-person attendance or local broadcast deals.',
    longExplanation:
      'A blackout restriction is a broadcasting rule - enforced by sports leagues or content rights holders - that prevents a game or event from being shown on certain platforms in specific geographic markets. Sports blackouts were created to protect local TV station deals and encourage in-person game attendance. NFL games not sold out 72 hours before kickoff were subject to local TV blackouts until the league suspended the policy in 2015. MLB still enforces streaming blackouts through MLB.TV - games involving local teams are blacked out in that team\'s home market to protect regional sports network (RSN) deals. Streaming services enforce blackouts through IP geolocation, blocking viewers in the defined blackout zone from accessing the streamed content.',
    relatedTerms: ['sports-broadcasting-rights', 'regional-sports-network', 'geo-restriction', 'geo-blocking'],
    category: 'rights',
    faqs: [
      { question: 'Why is a game blacked out on my streaming service?', answer: 'Sports leagues enforce local blackout rules to protect regional TV broadcast deals. If you are in the home market of one of the teams playing, the game may be blacked out on streaming to keep it exclusive to local TV channels (or to encourage attendance).' },
      { question: 'How can I watch a blacked-out game?', answer: 'Blackouts only apply to streaming platforms subject to the restriction. The game is almost always available on the local broadcast station (CBS, NBC, Fox, ABC, ESPN, regional sports networks) that holds the local TV rights.' },
    ],
  },
  {
    slug: 'sports-broadcasting-rights',
    term: 'Sports Broadcasting Rights',
    shortDefinition: 'Legal agreements that determine which TV channels and streaming services can show specific sporting events in each country.',
    longExplanation:
      'Sports broadcasting rights are contracts between sports leagues, governing bodies, or event organizers and broadcasters or streaming platforms that determine who can legally show sporting events to viewers. Rights are typically sold by territory, by medium (broadcast TV, pay TV, streaming), and by package (all games vs. selected games). Rights deals are the most expensive content category in media. Rights fragmentation is intentional: leagues maximize revenue by selling different packages to different platforms. This is why the same sport requires different subscriptions depending on which country you are in.',
    relatedTerms: ['blackout-restriction', 'regional-sports-network', 'geo-restriction', 'streaming-rights'],
    category: 'rights',
    faqs: [
      { question: 'What are sports broadcasting rights?', answer: 'Sports broadcasting rights are legal contracts that give a TV channel or streaming service the exclusive permission to show specific sporting events in specific territories. They explain why watching the same sport requires different services in different countries.' },
      { question: 'Who sells sports broadcasting rights?', answer: 'Sports leagues, governing bodies (UEFA, FIFA, NFL, NBA), and event organizers sell broadcasting rights. They typically auction packages to the highest bidder in each territory, with deals running 2-6 years.' },
    ],
  },
  {
    slug: 'regional-sports-network',
    term: 'Regional Sports Network (RSN)',
    shortDefinition: 'A cable TV channel carrying local professional sports team games for a specific geographic market.',
    longExplanation:
      'A Regional Sports Network (RSN) is a cable television channel that holds exclusive local broadcast rights for professional sports teams in a specific metropolitan area or region. RSNs are the primary way most US professional sports team games have been shown to local audiences for decades. Examples include Bally Sports (formerly Fox Sports Regional Networks, which held RSN rights for over 40 teams across MLB, NBA, and NHL), NESN (New England, covering Red Sox and Bruins), SportsNet NY (New York Mets), and MSG (New York Knicks and Rangers). The RSN model is under severe financial pressure - Diamond Sports Group (Bally Sports parent) filed for bankruptcy in 2023, and leagues have been reclaiming rights and moving toward direct-to-consumer streaming. RSNs are why local MLB, NBA, and NHL games are blacked out on MLB.TV, NBA League Pass, and NHL.tv in the home market.',
    relatedTerms: ['blackout-restriction', 'sports-broadcasting-rights', 'cord-cutting', 'geo-restriction'],
    category: 'streaming',
    faqs: [
      { question: 'What is a Regional Sports Network?', answer: 'A Regional Sports Network (RSN) is a cable TV channel that broadcasts local professional sports team games in a specific area. RSNs like Bally Sports, NESN, and MSG hold exclusive local rights for MLB, NBA, and NHL teams.' },
      { question: 'Why can\'t I watch my local team on streaming-', answer: 'Your local team\'s games are likely controlled by a Regional Sports Network (RSN) that has exclusive local broadcast rights. Streaming services (MLB.TV, NBA League Pass) must blackout those games in your local market to comply with RSN contracts.' },
    ],
  },
  {
    slug: 'svod-bundle',
    term: 'SVOD Bundle',
    shortDefinition: 'A discounted package combining two or more streaming subscription services from the same company or partners.',
    longExplanation:
      'An SVOD bundle is a package deal combining multiple streaming services - usually from the same parent company - at a discounted total price compared to individual subscriptions. The Disney Bundle (Disney+, Hulu, ESPN+) at $7.99-$13.99/month versus $40+ if subscribed separately is the most prominent example. Verizon offers Netflix + Max bundles for its wireless customers at $10/month. Apple One bundles Apple TV+, Apple Music, Apple Arcade, and iCloud storage. SVOD bundles increase subscriber retention - bundled subscribers cancel at significantly lower rates than single-service subscribers. They also create cross-platform discovery: a Disney Bundle subscriber introduced to ESPN+ or Hulu is more likely to consider them valuable. Bundle economics benefit platforms even at lower per-subscriber revenue by reducing churn and customer acquisition costs.',
    relatedTerms: ['svod', 'cord-cutting', 'content-library'],
    category: 'business',
    faqs: [
      { question: 'What is an SVOD bundle?', answer: 'An SVOD bundle packages multiple streaming services together at a discount. The Disney Bundle (Disney+, Hulu, ESPN+) and Verizon\'s Netflix + Max bundle are the most common examples in the US.' },
      { question: 'Are streaming bundles worth it?', answer: 'Bundles are worth it if you use at least two of the included services regularly. The Disney Bundle\'s with-ads tier at $7.99/month costs less than Disney+ alone ad-free, making it excellent value for anyone who watches Disney+ content.' },
    ],
  },
  {
    slug: 'casting-protocol',
    term: 'Casting Protocol',
    shortDefinition: 'A wireless standard that allows a phone, tablet, or computer to send video to a TV or streaming device.',
    longExplanation:
      'A casting protocol is a wireless communication standard that enables a source device (phone, tablet, laptop) to send video and audio to a display device (smart TV, Chromecast, streaming stick) over a local Wi-Fi network. Google Cast (used in Chromecast, Chromecast built-in TVs, and compatible speakers) is the most widely supported casting protocol across streaming apps. Apple AirPlay 2 enables casting from iPhone, iPad, and Mac to Apple TV and AirPlay 2-compatible smart TVs. Miracast is an open standard used by Android devices and Windows computers to cast to compatible displays without Wi-Fi routing. The key difference from screen mirroring: casting offloads streaming to the receiving device (the TV fetches the stream itself), while mirroring duplicates the source screen. Casting produces better video quality and lower battery drain on the source device.',
    relatedTerms: ['streaming-stick', 'smart-tv-platform', 'hdmi-arc', 'ott'],
    category: 'technology',
    faqs: [
      { question: 'What is casting in streaming?', answer: 'Casting sends a video stream from your phone or computer to your TV wirelessly. The TV fetches the stream directly once casting starts, so you can use your phone normally while the video plays.' },
      { question: 'What is the difference between casting and screen mirroring?', answer: 'Casting offloads playback to the TV (the TV streams the video itself). Screen mirroring duplicates your device screen onto the TV in real time. Casting produces better quality and uses less phone battery.' },
    ],
  },
  {
    slug: 'content-aggregator',
    term: 'Content Aggregator',
    shortDefinition: 'A platform that brings together content from multiple streaming services into a single browsable interface.',
    longExplanation:
      'A content aggregator is a platform, app, or device interface that collects and presents content from multiple streaming services in a unified search and browsing experience - without the viewer needing to switch between individual apps. Apple TV\'s universal search searches across Netflix, Disney+, Amazon Prime Video, Apple TV+, and dozens of other services simultaneously. Amazon Fire TV\'s home screen aggregates content from all installed apps. The Roku home screen offers cross-service search. JustWatch is a dedicated aggregator app (not a streaming service itself) used by 40 million monthly users to find which service carries any given title. Content aggregators do not host content - they link to the original service for playback. Aggregators reduce subscriber churn by making it easier to find content across services rather than canceling a service when a specific show ends.',
    relatedTerms: ['ott', 'svod', 'streaming-stick', 'smart-tv-platform'],
    category: 'streaming',
    faqs: [
      { question: 'What is a streaming content aggregator?', answer: 'A content aggregator brings content from multiple streaming services into one searchable interface. Apple TV, Amazon Fire TV, and the app JustWatch are all aggregators - they help you find what you want to watch across Netflix, Disney+, Prime Video, and other services without switching apps.' },
    ],
  },
  {
    slug: 'ip-geolocation',
    term: 'IP Geolocation',
    shortDefinition: 'The process of determining a device\'s geographic location based on its IP address.',
    longExplanation:
      'IP geolocation is the technique of determining a user\'s approximate geographic location (country, region, city) from their public IP address. Every device connected to the internet is assigned an IP address by its internet service provider (ISP). IP address blocks are registered to specific organizations and geographic regions through the Internet Assigned Numbers Authority (IANA) and regional registries. Streaming services use IP geolocation databases (MaxMind, IP2Location, and proprietary databases) to enforce territorial content licenses - if your IP address is assigned to Germany, you see the German content catalog. IP geolocation is not perfectly accurate: database errors, new IP assignments, and ISP routing choices can cause mismatches. Accuracy is approximately 95% at the country level and 80% at the city level according to MaxMind\'s published benchmarks.',
    relatedTerms: ['geo-blocking', 'geo-restriction', 'vpn', 'static-ip-address', 'dns-leak'],
    category: 'technology',
    faqs: [
      { question: 'How do streaming services know which country I am in?', answer: 'Streaming services use IP geolocation - they look up your IP address in databases that map addresses to geographic locations. Your IP address is assigned by your internet provider and typically reflects your physical location.' },
      { question: 'Is IP geolocation always accurate?', answer: 'IP geolocation is approximately 95% accurate at the country level. Errors occur when ISPs reassign address blocks, use routing through different countries, or when users are on mobile data networks that route traffic through different regions.' },
    ],
  },
  {
    slug: 'dns-leak',
    term: 'DNS Leak',
    shortDefinition: 'When DNS queries bypass a VPN tunnel and expose a user\'s real location to their ISP or streaming services.',
    longExplanation:
      'A DNS leak occurs when a device using a VPN sends Domain Name System (DNS) queries - the requests that translate website names like netflix.com into IP addresses - outside the VPN tunnel to the user\'s regular ISP DNS server instead of the VPN provider\'s DNS server. This exposes the user\'s real IP address and physical location even when their traffic is otherwise routed through a VPN. Streaming services increasingly use DNS-based geolocation checks alongside IP geolocation. A DNS leak means the streaming service sees queries coming from the user\'s real ISP location even if the traffic IP appears to be in a VPN server location. Quality VPN services route all DNS queries through their own encrypted DNS servers to prevent leaks. DNS leak testing tools (dnsleaktest.com, ipleak.net) allow users to verify whether their VPN is properly protecting DNS requests.',
    relatedTerms: ['vpn', 'ip-geolocation', 'static-ip-address', 'split-tunneling', 'geo-blocking'],
    category: 'technology',
    faqs: [
      { question: 'What is a DNS leak?', answer: 'A DNS leak happens when your internet requests bypass your VPN and go directly to your regular internet provider\'s servers, revealing your real location even when you think you\'re protected by the VPN.' },
      { question: 'How do I check for DNS leaks?', answer: 'Visit dnsleaktest.com or ipleak.net while connected to your VPN. If the results show your VPN provider\'s DNS servers, you are protected. If they show your ISP\'s servers, you have a DNS leak and should enable DNS leak protection in your VPN settings.' },
    ],
  },
  {
    slug: 'streaming-index',
    term: 'Streaming Index',
    shortDefinition: 'A ranking or report that measures streaming service performance, catalog size, viewership, or market share.',
    longExplanation:
      'A streaming index is a report, database, or ranking system that measures and compares streaming services across defined metrics. Several organizations publish regular streaming indexes: Nielsen\'s The Gauge (monthly US streaming share report showing Netflix, YouTube, Prime Video, Disney+ and others\' share of total TV viewing time), Parrot Analytics\' Demand Expressions (global content demand across platforms), JustWatch\'s Streaming Charts (daily trending content by country), and FlixPatrol\'s Platform Rankings (daily top-10 charts across 167 countries). Industry analysts Ampere Analysis and Digital TV Research publish subscription and revenue indexes. Streaming indexes are used by media executives, content buyers, and investors to understand competitive positioning. For viewers, streaming indexes like JustWatch\'s Trending and FlixPatrol\'s Top-10 surface what content is popular across services in any given country.',
    relatedTerms: ['svod', 'content-library', 'ott', 'avod'],
    category: 'streaming',
    faqs: [
      { question: 'What is a streaming index?', answer: 'A streaming index is a report that ranks or measures streaming services by metrics like viewership, catalog size, or subscriber count. Nielsen\'s The Gauge tracks monthly US streaming viewership share; JustWatch Streaming Charts tracks daily trending content.' },
    ],
  },
  {
    slug: 'streaming-stick',
    term: 'Streaming Stick',
    shortDefinition: 'A compact HDMI device that plugs into a TV and runs streaming apps without a set-top box.',
    longExplanation:
      'A streaming stick is a compact dongle that plugs directly into a TV\'s HDMI port and runs a full streaming operating system, eliminating the need for a cable or satellite set-top box. Streaming sticks receive power through a USB port (on the TV or a separate adapter) and connect to the internet via Wi-Fi. The Amazon Fire TV Stick, Roku Streaming Stick, and Google Chromecast with Google TV are the leading streaming stick products globally. Streaming sticks differ from streaming boxes (Apple TV, Nvidia Shield) in form factor only - they run equivalent operating systems and apps. The primary advantages: low cost ($30-$60), portability (fits in a travel bag), and compatibility with virtually any TV with an HDMI port. The primary limitations: lower processing power than dedicated streaming boxes, no Ethernet port on most models (requiring Wi-Fi), and limited local storage.',
    relatedTerms: ['casting-protocol', 'smart-tv-platform', 'hdmi-arc', 'content-aggregator'],
    category: 'technology',
    faqs: [
      { question: 'What is a streaming stick?', answer: 'A streaming stick is a small device that plugs into your TV\'s HDMI port and lets you stream Netflix, Disney+, and other services without a cable box. Examples include the Amazon Fire TV Stick and Roku Streaming Stick.' },
      { question: 'Do streaming sticks work in all countries?', answer: 'Most streaming sticks work physically in any country with an HDMI TV and internet. However, the app store and available streaming channels vary by region. Amazon Fire TV and Apple TV 4K have the best international app availability; Roku is primarily US/UK/Canada/Mexico/Brazil.' },
    ],
  },
  {
    slug: 'hdmi-arc',
    term: 'HDMI ARC',
    shortDefinition: 'An HDMI standard that sends audio from a TV back to a soundbar or AV receiver through the same cable.',
    longExplanation:
      'HDMI ARC (Audio Return Channel) is a feature of HDMI 1.4 and later specifications that allows a single HDMI cable to carry audio in both directions - video from a source device to the TV, and audio from the TV back to a soundbar or AV receiver. Before ARC, connecting a soundbar to a TV required a separate optical (TOSLINK) or analog audio cable in addition to HDMI for video. HDMI ARC simplifies home theater setups: the TV\'s built-in streaming apps (Netflix, Disney+) send their audio through the ARC connection to the soundbar automatically. HDMI eARC (Enhanced Audio Return Channel), introduced with HDMI 2.1, supports uncompressed audio formats (Dolby TrueHD, DTS-HD Master Audio, Dolby Atmos object audio) that standard ARC cannot carry. For streaming in Dolby Atmos from apps like Netflix or Disney+, HDMI eARC is required to pass the full Atmos signal to a compatible soundbar or AV receiver.',
    relatedTerms: ['streaming-stick', 'smart-tv-platform', 'casting-protocol'],
    category: 'technology',
    faqs: [
      { question: 'What is HDMI ARC?', answer: 'HDMI ARC lets audio travel back through an HDMI cable from your TV to a soundbar. It means you only need one cable to connect a soundbar to your TV instead of a separate audio cable.' },
      { question: 'Do I need HDMI eARC for Dolby Atmos streaming?', answer: 'Yes, for the full Dolby Atmos experience from streaming apps. Standard HDMI ARC can only carry compressed audio formats. HDMI eARC (on HDMI 2.1 ports) carries the full uncompressed Atmos signal needed for object-based spatial audio.' },
    ],
  },
  {
    slug: 'smart-tv-platform',
    term: 'Smart TV Platform',
    shortDefinition: 'The built-in operating system on a connected TV that runs streaming apps natively without an external device.',
    longExplanation:
      'A Smart TV platform is the integrated operating system and app ecosystem built into internet-connected televisions, allowing viewers to stream content without a separate device like a Roku stick or Apple TV. The major Smart TV platforms are Samsung Tizen OS (the most widely sold Smart TV platform globally), LG webOS, Sony Google TV (Android TV-based), Vizio SmartCast, and TCL Roku TV (Roku OS built in). Smart TV platforms vary significantly in app availability, performance, and update longevity. Samsung Tizen and LG webOS have the broadest global streaming app support - Netflix, Disney+, Amazon Prime Video, Apple TV+, and YouTube are available on both in most markets. Older Smart TV platforms (pre-2018) may lose support for new streaming apps or updates, making them effectively incompatible with current services despite being technically internet-connected.',
    relatedTerms: ['streaming-stick', 'hdmi-arc', 'casting-protocol', 'content-aggregator', 'ott'],
    category: 'technology',
    faqs: [
      { question: 'What is a Smart TV platform?', answer: 'A Smart TV platform is the operating system built into your TV that runs streaming apps like Netflix and Disney+ directly, without needing a separate streaming device.' },
      { question: 'Which Smart TV platform is best?', answer: 'Samsung Tizen and LG webOS have the broadest app support and most regular updates globally. Sony Google TV is best for Android app compatibility and Asian streaming services. Vizio SmartCast and older platforms have more limited app ecosystems.' },
    ],
  },
  {
    slug: 'streaming-passthrough',
    term: 'Streaming Passthrough',
    shortDefinition: 'When an AV receiver or soundbar sends an audio or video signal directly to the TV without processing it.',
    longExplanation:
      'Streaming passthrough refers to an AV receiver, soundbar, or switch sending an audio or video signal through to its final destination (the TV or speakers) without decoding, processing, or altering it. HDMI passthrough is the most common form - an AV receiver accepts HDMI input from a streaming device and passes the video signal to the TV while routing the audio to its own speakers. Audio passthrough occurs when a device forwards a compressed audio bitstream (Dolby Digital, DTS, Dolby Atmos) to a downstream decoder (AV receiver or soundbar) rather than decoding it internally. For streaming, passthrough matters when using a streaming stick connected through an AV receiver: the receiver must support HDMI passthrough at the source\'s output resolution (4K HDR, Dolby Vision) or the video quality will be downgraded. Modern AV receivers support 4K/120Hz and Dolby Vision passthrough; older receivers may cap at 1080p or HDR10 only.',
    relatedTerms: ['hdmi-arc', 'smart-tv-platform', 'streaming-stick', 'casting-protocol'],
    category: 'technology',
    faqs: [
      { question: 'What does HDMI passthrough mean for streaming?', answer: 'HDMI passthrough means your AV receiver or soundbar forwards the video signal from your streaming device to the TV without changing it. This ensures 4K HDR or Dolby Vision quality is preserved when your streaming stick connects through an AV receiver.' },
    ],
  },
  {
    slug: 'first-run-syndication',
    term: 'First-Run Syndication',
    shortDefinition: 'TV programming produced specifically for syndication to multiple stations or platforms, bypassing the traditional network model.',
    longExplanation:
      'First-run syndication is a television distribution model where content is produced specifically for direct sale to individual TV stations or streaming platforms rather than airing first on a major broadcast network. Traditional examples include game shows (Wheel of Fortune, Jeopardy!), court shows (Judge Judy), and talk shows (Dr. Phil) - produced independently and licensed directly to local stations in each market. In the streaming era, first-run syndication has evolved: Netflix, Amazon, and Apple TV+ function as first-run outlets, acquiring shows before any traditional broadcast. The term is also used to describe shows that premiere on a streaming platform in one country while simultaneously premiering on a traditional broadcaster in another - an adapted form of syndication for the global streaming market. First-run syndication rights are distinct from off-network syndication rights (reruns of network shows).',
    relatedTerms: ['streaming-rights', 'windowing', 'svod', 'exclusive-distribution-rights'],
    category: 'rights',
    faqs: [
      { question: 'What is first-run syndication?', answer: 'First-run syndication is when TV content is produced specifically to be sold directly to multiple TV stations or streaming platforms without first airing on a traditional broadcast network. Game shows and talk shows are classic examples.' },
      { question: 'How does first-run syndication relate to streaming?', answer: 'Streaming platforms like Netflix and Amazon function similarly to first-run syndicators - they acquire or produce content before it appears anywhere else, making themselves the first outlet. The difference is scale: traditional syndication sold to hundreds of local stations; streaming delivers globally to millions of subscribers simultaneously.' },
    ],
  },
  {
    slug: 'bundle',
    term: 'Bundle',
    shortDefinition: 'A combination package of multiple streaming services sold together, typically at a discount.',
    longExplanation:
      'A bundle is a commercial package that combines two or more streaming services under a single subscription price, usually at a lower total cost than subscribing to each separately. Bundles emerged as a response to subscription fatigue - they let companies keep subscribers who might cancel one service by tying it to others they value. Disney\'s bundle of Disney+, Hulu, and ESPN+ is the defining example: at $7.99/month with ads, it costs less than Disney+ alone on a higher-tier plan, yet delivers three distinct services. Bundles also reduce churn - subscribers who use multiple services in a bundle cancel at much lower rates than single-service subscribers. For consumers, the calculus is simple: if you regularly use two of the three included services, the bundle is almost always cheaper. Apple One (Apple TV+, Music, Arcade, and iCloud+) takes the bundle concept beyond video into a broader subscription ecosystem.',
    relatedTerms: ['svod-bundle', 'subscription-fatigue', 'svod', 'streaming-bundle'],
    category: 'business',
    faqs: [
      { question: 'What is a streaming bundle?', answer: 'A streaming bundle packages multiple services together at one price, typically cheaper than subscribing to each individually. The Disney Bundle (Disney+, Hulu, ESPN+) is the most prominent US example.' },
    ],
  },
  {
    slug: 'churn-rate',
    term: 'Churn Rate',
    shortDefinition: 'The percentage of subscribers who cancel a streaming service in a given period, typically per month.',
    longExplanation:
      'Churn rate measures how many subscribers cancel a streaming service within a defined period, expressed as a percentage of total subscribers. Monthly churn is the most commonly reported metric. A 2% monthly churn rate means 2 out of every 100 subscribers cancel each month - which compounds to roughly 22% annual turnover. Streaming services treat churn as one of their most important business metrics because acquiring a new subscriber costs significantly more than retaining an existing one. Industry average monthly churn for SVOD services runs 3-6%, with HBO Max historically among the lowest (around 2%) and Paramount+ among the higher-churn services. High churn typically follows the end of a marquee original series. Services combat churn through content spacing (releasing tent-pole content regularly rather than all at once), bundles (which lower churn substantially), and annual subscription discounts.',
    relatedTerms: ['svod', 'serial-churner', 'subscription-fatigue', 'bundle', 'svod-bundle'],
    category: 'business',
    faqs: [
      { question: 'What is churn rate in streaming?', answer: 'Churn rate is the percentage of subscribers who cancel a streaming service each month. A 3% monthly churn means 3 out of 100 subscribers leave per month.' },
    ],
  },
  {
    slug: 'serial-churner',
    term: 'Serial Churner',
    shortDefinition: 'A subscriber who repeatedly signs up for a streaming service, watches specific content, then cancels - often cycling back later.',
    longExplanation:
      'A serial churner is a viewer who treats streaming subscriptions transactionally: subscribing to watch a specific series or movie, then canceling once they\'ve finished, often rejoining months later for the next must-watch title. This behavior became widespread as streaming catalogs fragmented - instead of maintaining multiple subscriptions year-round, serial churners rotate through services based on what\'s currently airing. Studies estimate 25-30% of US streaming subscribers have canceled and resubscribed to the same service at least once. Netflix\'s password-sharing crackdown in 2023 inadvertently created more serial churners by forcing former password-sharers to subscribe under their own accounts - they joined but also became more likely to cancel after finishing their target content. Streaming services respond by spacing out major releases to reduce the opportunity for a single binge-cancel cycle.',
    relatedTerms: ['churn-rate', 'subscription-fatigue', 'svod', 'binge-watching'],
    category: 'business',
    faqs: [
      { question: 'What is a serial churner?', answer: 'A serial churner subscribes to a streaming service to watch a specific show, cancels after finishing, and repeats the cycle for the next big release. It is a deliberate cost-saving strategy for managing multiple streaming services.' },
    ],
  },
  {
    slug: 'arpu',
    term: 'ARPU',
    shortDefinition: 'Average Revenue Per User - the mean revenue a streaming service earns per subscriber per month.',
    longExplanation:
      'ARPU (Average Revenue Per User) is a financial metric calculated by dividing total subscription and advertising revenue by the number of subscribers over a given period. For streaming services, ARPU is a core indicator of monetization efficiency. Netflix US ARPU was approximately $17 in 2024 - significantly higher than its international ARPU of around $8, which reflects lower subscription prices in price-sensitive markets. The introduction of ad-supported tiers complicated ARPU calculations: a subscriber paying $7/month on an ad-supported plan may generate higher total ARPU than a $15 ad-free subscriber if ad revenue per user is high enough. Services with high ARPU can invest more in content per subscriber. ARPU is also used to compare streaming services - a service with 50 million subscribers and $15 ARPU generates more revenue than a service with 80 million subscribers and $6 ARPU.',
    relatedTerms: ['svod', 'avod', 'ad-tier', 'churn-rate', 'content-spend'],
    category: 'business',
    faqs: [
      { question: 'What does ARPU mean in streaming?', answer: 'ARPU stands for Average Revenue Per User. It is the average monthly revenue a streaming service earns per subscriber, calculated by dividing total revenue by subscriber count.' },
    ],
  },
  {
    slug: 'content-spend',
    term: 'Content Spend',
    shortDefinition: 'The total annual budget a streaming service allocates to producing and licensing films and TV series.',
    longExplanation:
      'Content spend is the total amount a streaming service invests annually in acquiring and producing content - covering both licensing fees for third-party titles and production budgets for original programming. Netflix\'s content spend reached approximately $17 billion in 2023, Amazon Video approximately $7 billion, and Disney (across Disney+, Hulu, and ESPN+) over $30 billion. Content spend is the largest cost item for major streaming services and the primary driver of subscriber growth and retention. It is also the metric most closely watched by financial analysts when evaluating whether streamers can achieve profitability. The streaming industry\'s collective shift toward profitability in 2022-2024 was largely achieved by cutting content spend after years of aggressive expansion. Cuts are measured against slate size and title quality rather than raw dollar amounts.',
    relatedTerms: ['original-content', 'licensed-content', 'svod', 'arpu'],
    category: 'business',
    faqs: [
      { question: 'How much do streaming services spend on content?', answer: 'Netflix spends roughly $17 billion per year on content. Disney spends over $30 billion across all its platforms. Amazon spends around $7 billion. These figures cover both original productions and licensing fees for third-party content.' },
    ],
  },
  {
    slug: 'ad-tier',
    term: 'Ad Tier',
    shortDefinition: 'A lower-priced streaming subscription plan that includes advertisements in exchange for reduced monthly cost.',
    longExplanation:
      'An ad tier is a subscription plan that lets viewers access a streaming service at a lower monthly price in exchange for watching advertisements during and between content. Netflix launched its ad-supported tier at $6.99/month in November 2022; Disney+ followed with its own ad tier. Ad tiers blend the SVOD and AVOD models - subscribers pay some fee (reducing churn compared to fully free services) while the platform generates additional ad revenue per user. Ad loads are typically 4-5 minutes per hour, lower than traditional TV. Streaming ad tiers allow advertisers to target specific demographics with precision not available on linear TV, which is why CPMs (cost per thousand impressions) for streaming ads are considerably higher than broadcast. Services that launched ad tiers saw subscriber growth as price-sensitive viewers who had been avoiding the service chose the cheaper option.',
    relatedTerms: ['avod', 'svod', 'arpu', 'freemium', 'free-tier'],
    category: 'business',
    faqs: [
      { question: 'What is an ad tier on streaming?', answer: 'An ad tier is a cheaper subscription plan that includes commercials. Netflix\'s ad-supported plan at $6.99/month and Disney+\'s equivalent are examples - you pay less but watch ads during content.' },
    ],
  },
  {
    slug: 'anchor-service',
    term: 'Anchor Service',
    shortDefinition: 'A streaming service a subscriber keeps year-round because it consistently delivers content they want, as opposed to services they rotate in and out.',
    longExplanation:
      'An anchor service is a streaming subscription that a viewer maintains continuously rather than subscribing and canceling seasonally. For most households, Netflix occupies the anchor position - it has enough breadth of content (movies, TV, originals across genres) that viewers find reasons to watch it year-round. Disney+ is an anchor for households with children or Marvel and Star Wars fans. In contrast, services like Paramount+, Peacock, or AMC+ are more likely to be treated as seasonal subscriptions - subscribed for a specific series and canceled afterward. The anchor service concept shapes how streaming services think about content strategy: anchor services need consistent programming across months, not just one or two major titles per year. Services trying to become anchors invest in catalog depth and regular release schedules rather than single tent-pole releases.',
    relatedTerms: ['svod', 'churn-rate', 'serial-churner', 'subscription-fatigue', 'bundle'],
    category: 'business',
  },
  {
    slug: 'streaming-bundle',
    term: 'Streaming Bundle',
    shortDefinition: 'Multiple streaming services packaged and sold together under a single subscription price.',
    longExplanation:
      'A streaming bundle is a commercial arrangement where multiple streaming services are sold as a single package, typically at a combined price lower than each service individually. Streaming bundles are distinct from single-service bundles (like Netflix\'s internal plan tiers) - they cross service boundaries. The Disney Bundle (Disney+, Hulu, ESPN+) is the most prominent example in the US market. Verizon offers a Netflix + Max bundle for wireless customers. Apple One packages Apple TV+ with Apple Music, Apple Arcade, and iCloud+. Streaming bundles reduce subscriber churn across all included services and make the combined offering more competitive against individual alternatives. They are also a strategic response to subscription fatigue - rather than forcing consumers to choose between services, bundles let consumers access multiple libraries at an accessible price point.',
    relatedTerms: ['bundle', 'svod-bundle', 'svod', 'subscription-fatigue', 'anchor-service'],
    category: 'business',
    faqs: [
      { question: 'What is the difference between a bundle and a streaming bundle?', answer: 'They are the same concept. A streaming bundle (or SVOD bundle) packages multiple streaming services together at one price - like the Disney Bundle combining Disney+, Hulu, and ESPN+.' },
    ],
  },
  {
    slug: 'eu-portability-regulation',
    term: 'EU Portability Regulation',
    shortDefinition: 'EU law requiring streaming services to give subscribers access to their home-country content library when traveling within the EU.',
    longExplanation:
      'The EU Portability Regulation (EU Regulation 2017/1128) came into force in April 2018 and requires streaming services operating in the European Union to provide subscribers with access to their home-country content library when they are temporarily in another EU member state. Before the regulation, a Netflix UK subscriber traveling to France would see the French Netflix catalog instead of the UK one, losing access to UK-exclusive titles. Under portability rules, the service must treat the traveler as if they were still at home - verifying their home country through payment method or billing address, then serving the home catalog. The regulation applies to paid SVOD services and does not extend to free tiers. It covers content the service holds rights to in the home country; EU studios and rights holders are required to grant portability permissions when licenses are renewed.',
    relatedTerms: ['geo-blocking', 'streaming-rights', 'multi-territory-license', 'vpn'],
    category: 'rights',
    faqs: [
      { question: 'What is the EU Portability Regulation for streaming?', answer: 'EU Regulation 2017/1128 requires paid streaming services to give EU subscribers access to their home-country content library when traveling within the EU. A UK subscriber on holiday in Spain still sees the UK Netflix catalog, not the Spanish one.' },
    ],
  },
  {
    slug: 'first-run-rights',
    term: 'First-Run Rights',
    shortDefinition: 'The rights to premiere content before any other distributor or platform in a given territory.',
    longExplanation:
      'First-run rights grant a broadcaster or streaming platform the exclusive right to be the first to show a film or TV series in a particular territory. Holding first-run rights means no other platform can legally stream or broadcast the content before you. In the streaming era, first-run rights for major films are aggressively contested: Netflix, Amazon, and Apple regularly outbid traditional studios and broadcasters for the rights to premiere anticipated films. The value of first-run rights comes from audience attention - viewers subscribe specifically to see a highly anticipated premiere. First-run rights differ from exclusivity windows: first-run rights refer to premiering content; exclusivity windows cover a defined period of sole distribution after the premiere. After a first-run deal expires, subsequent distribution rights (TVOD, AVOD, library SVOD) are typically sold separately.',
    relatedTerms: ['streaming-rights', 'exclusivity-window', 'windowing', 'licensed-content', 'output-deal'],
    category: 'rights',
    faqs: [
      { question: 'What are first-run rights in streaming?', answer: 'First-run rights give a streaming platform the exclusive right to premiere content before any other distributor. Netflix paid for first-run rights to films like "The Irishman" and "Don\'t Look Up," making Netflix their world premiere platform.' },
    ],
  },
  {
    slug: 'catch-up-tv',
    term: 'Catch-Up TV',
    shortDefinition: 'An on-demand service letting viewers watch recently broadcast TV episodes they missed, typically free and available for a limited window.',
    longExplanation:
      'Catch-up TV is an on-demand service provided by broadcasters that allows viewers to watch TV programs after their original air date, typically for 7-30 days after broadcast. BBC iPlayer is the defining example - it makes almost all BBC programs available on-demand for 30 days after broadcast, free to UK viewers. ITV\'s ITVX, Channel 4\'s All4, and Channel 5\'s My5 operate similar models. Unlike SVOD services, catch-up TV is free, funded by either the license fee (BBC) or advertising (commercial broadcasters). Catch-up TV serves as a gateway to a broadcaster\'s streaming platform - viewers who use the catch-up service regularly are more likely to explore the full library. In the US, the network streaming apps (NBC\'s Peacock, CBS on Paramount+, ABC on Hulu) perform a similar catch-up function, though often requiring a subscription or ad viewing.',
    relatedTerms: ['vod', 'avod', 'linear-tv', 'ott', 'free-tier'],
    category: 'rights',
    faqs: [
      { question: 'What is catch-up TV?', answer: 'Catch-up TV lets you watch recently broadcast programs on-demand after they aired. BBC iPlayer, ITVX, and All4 are catch-up services - they make programs available free for a window after broadcast so you don\'t have to watch live.' },
    ],
  },
  {
    slug: 'sports-rights-cycle',
    term: 'Sports Rights Cycle',
    shortDefinition: 'The recurring process of sports leagues auctioning broadcast and streaming rights, typically on 3-7 year deals.',
    longExplanation:
      'The sports rights cycle refers to the regular auction process through which sports leagues sell broadcast and streaming rights to television networks and streaming platforms. Rights deals typically run 3-7 years, after which the rights go back to market and leagues auction them again - usually at higher prices as demand from streaming platforms has expanded the bidder pool. Sports rights cycles matter to streaming because each new cycle represents a potential shift in where viewers need to subscribe. Amazon secured exclusive UK rights to some Premier League matches in 2019 - fans who had never used Prime Video subscribed specifically for football.',
    relatedTerms: ['sports-broadcasting-rights', 'blackout-restriction', 'streaming-rights', 'regional-sports-network'],
    category: 'rights',
    faqs: [
      { question: 'What is a sports rights cycle?', answer: 'A sports rights cycle is the recurring process of leagues auctioning broadcast and streaming rights contracts, typically every 3-7 years. Each cycle represents a potential reshuffling of which channels and streaming services carry which sports.' },
    ],
  },
  {
    slug: 'sub-licensing',
    term: 'Sub-Licensing',
    shortDefinition: 'When a streaming service or rights holder that holds a content license grants distribution rights to a third party.',
    longExplanation:
      'Sub-licensing occurs when a primary rights holder or licensee grants a portion of their content distribution rights to another party. In streaming, sub-licensing typically happens in two scenarios. First, a studio licenses a film to Netflix globally, but Netflix sub-licenses the streaming rights in specific territories to a local broadcaster or streaming service it doesn\'t operate in. Second, a channel partner arrangement (like Amazon Prime Video Channels or Apple TV Channels) functions as sub-licensing - the primary streaming platform passes rights access to the add-on channel at a revenue share. Sub-licensing agreements require explicit authorization from the original rights owner - a licensee cannot sub-license without permission. Sub-licensing is also how sports leagues function at a regional level: the league sells national rights to a broadcaster, which then sub-licenses to regional partners.',
    relatedTerms: ['streaming-rights', 'licensed-content', 'multi-territory-license', 'revenue-share-agreement'],
    category: 'rights',
    faqs: [
      { question: 'What is sub-licensing in streaming?', answer: 'Sub-licensing is when a company that holds content rights grants some of those rights to another party. For example, a streaming service holding global rights might sub-license specific territories to local broadcasters it doesn\'t operate in.' },
    ],
  },
  {
    slug: 'webrtc-leak',
    term: 'WebRTC Leak',
    shortDefinition: 'A browser vulnerability where WebRTC reveals a user\'s real IP address even when using a VPN.',
    longExplanation:
      'WebRTC (Web Real-Time Communication) is a browser technology that enables peer-to-peer audio, video, and data sharing - used by services like Google Meet, Discord, and browser-based video calls. To establish direct connections, WebRTC makes STUN (Session Traversal Utilities for NAT) requests that can reveal the device\'s local and public IP addresses, bypassing VPN tunnels entirely. This is a WebRTC leak. When a user on a VPN visits a site that uses WebRTC, the site can use JavaScript to trigger STUN requests that expose the real IP address, not the VPN IP. Streaming platforms and anti-proxy systems can use this to detect VPN use and enforce geo-restrictions. Browsers like Firefox allow users to disable WebRTC in settings. Chromium-based browsers (Chrome, Edge, Brave) require an extension or VPN with built-in WebRTC leak protection. Most quality VPN apps bundle browser extensions specifically to block WebRTC leaks.',
    relatedTerms: ['vpn', 'dns-leak', 'ip-geolocation', 'geo-blocking', 'split-tunneling'],
    category: 'technology',
    faqs: [
      { question: 'What is a WebRTC leak?', answer: 'A WebRTC leak happens when your browser\'s WebRTC feature reveals your real IP address to websites even while you\'re connected to a VPN. It bypasses the VPN tunnel using direct peer-to-peer connection requests.' },
      { question: 'How do I prevent WebRTC leaks?', answer: 'In Firefox, disable WebRTC in about:config. In Chrome or Edge, install a WebRTC leak prevention extension. Many VPN apps include built-in browser extensions that block WebRTC leaks automatically.' },
    ],
  },
  {
    slug: 'ip-blacklist',
    term: 'IP Blacklist',
    shortDefinition: 'A database of known VPN, proxy, and data center IP addresses that streaming services use to block non-residential access.',
    longExplanation:
      'An IP blacklist is a database of IP address ranges associated with VPN services, proxy servers, Tor exit nodes, and data center infrastructure. Streaming services and anti-proxy companies (MaxMind, IPQualityScore, IPAPI) maintain these databases and update them continuously. When a viewer\'s IP address matches a blacklisted range, the streaming service blocks access or serves an error message. Netflix, BBC iPlayer, and Disney+ use IP blacklists as a core geo-enforcement mechanism. The arms race between VPN services and streaming platforms centers on IP blacklists: VPN providers continuously rotate IP address ranges to stay ahead of blacklisting; streaming services continuously update blacklists to catch new VPN IPs. Residential IP services emerged specifically to defeat blacklists by using IP addresses assigned to real home internet connections, which are not blacklisted. Commercial data center IPs are the easiest to blacklist; residential IPs are the hardest.',
    relatedTerms: ['vpn', 'residential-ip', 'ip-geolocation', 'geo-blocking', 'webrtc-leak'],
    category: 'technology',
    faqs: [
      { question: 'What is an IP blacklist in streaming?', answer: 'An IP blacklist is a database of VPN and proxy IP addresses that streaming services use to block access from non-residential connections. If your IP is on the list, the service refuses to play content.' },
    ],
  },
  {
    slug: 'obfuscation',
    term: 'Obfuscation',
    shortDefinition: 'A VPN technique that disguises VPN traffic as ordinary HTTPS web traffic to bypass VPN detection and deep packet inspection.',
    longExplanation:
      'Obfuscation (also called stealth mode or traffic masking) is a technology used by some VPN services to disguise VPN protocol traffic so it looks like regular HTTPS web browsing to network inspection systems. Standard VPN protocols (OpenVPN, WireGuard) have identifiable traffic signatures that deep packet inspection (DPI) tools - used by streaming services, ISPs, and governments - can detect and block. Obfuscated VPN protocols scramble those signatures, making the traffic indistinguishable from ordinary HTTPS. ExpressVPN\'s Lightway protocol and NordVPN\'s Obfuscated Servers use this approach. Obfuscation is particularly important for users in countries with VPN restrictions (China, Russia, UAE) and for bypassing streaming service VPN detection that goes beyond IP blacklisting. The tradeoff is speed - obfuscation adds processing overhead that reduces throughput compared to non-obfuscated VPN connections.',
    relatedTerms: ['vpn', 'ip-blacklist', 'geo-blocking', 'split-tunneling', 'webrtc-leak'],
    category: 'technology',
    faqs: [
      { question: 'What is VPN obfuscation?', answer: 'VPN obfuscation disguises your VPN traffic so it looks like regular internet traffic. This helps bypass streaming service VPN detection systems and network firewalls that can identify and block standard VPN protocols.' },
    ],
  },
  {
    slug: 'av1-codec',
    term: 'AV1 Codec',
    shortDefinition: 'An open, royalty-free video codec developed by the Alliance for Open Media, offering better compression than H.264 and H.265.',
    longExplanation:
      'AV1 is a video compression standard developed by the Alliance for Open Media (AOM) - a consortium including Google, Netflix, Amazon, Apple, Microsoft, and major chip manufacturers - and released in 2018. AV1 achieves roughly 30-50% better compression than H.264 (AVC) and 20-30% better than H.265 (HEVC) at equivalent visual quality, meaning a 4K stream requires significantly less bandwidth. Netflix began using AV1 on Android devices in 2020 and expanded to TVs and browsers by 2022. YouTube uses AV1 for 4K and higher resolution playback on supported devices. The codec\'s main advantage for streaming services is bandwidth cost reduction - serving the same quality at lower bitrates directly cuts CDN costs at scale. The main limitation is encoding time and hardware decoding support - older devices lack AV1 hardware decoders and must use slower software decoding, which drains battery and causes heat.',
    relatedTerms: ['hevc-h265', 'transcoding', 'adaptive-bitrate', 'cdn', 'bitrate-ladder'],
    category: 'technology',
    faqs: [
      { question: 'What is AV1 in streaming?', answer: 'AV1 is a video compression format that delivers the same picture quality at a lower data rate than older formats like H.264 or H.265. Netflix and YouTube use AV1 to reduce bandwidth costs while maintaining quality.' },
    ],
  },
  {
    slug: 'hevc-h265',
    term: 'HEVC / H.265',
    shortDefinition: 'High Efficiency Video Coding - a video compression standard that delivers roughly twice the compression efficiency of H.264 at the same quality.',
    longExplanation:
      'HEVC (High Efficiency Video Coding), also called H.265, is a video compression standard finalized in 2013 that roughly doubles the compression efficiency of its predecessor H.264/AVC. At the same visual quality, HEVC requires approximately half the bitrate, making it well-suited for 4K UHD streaming. Netflix, Amazon Prime Video, and Apple TV+ use HEVC for 4K HDR content delivery. Hardware decoding support is broad on devices released after 2015 - modern smartphones, streaming sticks, and smart TVs all decode HEVC efficiently. HEVC\'s main commercial disadvantage is licensing: unlike AV1, HEVC is patent-encumbered, requiring royalty payments to a fragmented pool of patent holders (HEVC Advance, MPEG LA, Velos Media). This royalty structure was a primary motivation for the industry forming the AOM to develop AV1 as a royalty-free alternative.',
    relatedTerms: ['av1-codec', 'transcoding', '4k-uhd', 'adaptive-bitrate', 'hdr'],
    category: 'technology',
    faqs: [
      { question: 'What is HEVC / H.265 in streaming?', answer: 'HEVC (H.265) is a video compression standard that delivers 4K content at roughly half the data rate of H.264. Most streaming services use HEVC for 4K HDR video. Your device needs hardware HEVC decoding support to play it efficiently.' },
    ],
  },
  {
    slug: 'manifest-file',
    term: 'Manifest File',
    shortDefinition: 'A playlist file that tells a streaming player where to find each video segment and which quality levels are available.',
    longExplanation:
      'A manifest file is a structured text document that a streaming player fetches at the start of playback to understand the structure of the video stream. It lists the available quality levels (bitrate ladder), the URLs of each video segment, segment duration, subtitle and audio tracks, and DRM information. For HLS streams, the manifest is an .m3u8 file. For MPEG-DASH streams, it is an .mpd (Media Presentation Description) file. When you press play on Netflix, the app first fetches a manifest file, then begins downloading the video segments it describes. The manifest also enables adaptive bitrate switching - it contains pointers to segments at all available quality levels, and the player chooses which to download based on current network speed. Manifest files are small text files but are security-critical: streaming services generate signed, short-lived manifests tied to the user\'s streaming token to prevent sharing or tampering.',
    relatedTerms: ['hls', 'adaptive-bitrate', 'streaming-token', 'transcoding', 'bitrate-ladder'],
    category: 'technology',
    faqs: [
      { question: 'What is a streaming manifest file?', answer: 'A manifest file is a playlist that tells your streaming app where to find each piece of the video and what quality options are available. It is the first thing the player fetches when you press play, before any video data loads.' },
    ],
  },
  {
    slug: 'edge-server',
    term: 'Edge Server',
    shortDefinition: 'A CDN server positioned geographically close to end users to deliver streaming content with lower latency.',
    longExplanation:
      'An edge server is a CDN (Content Delivery Network) server deployed at the geographic edge of the network - close to the end user rather than in a central data center. Streaming services store cached copies of popular content on edge servers distributed across cities and regions worldwide. When a user in London starts streaming a Netflix film, the content is served from an edge server in or near London rather than from a data center in the United States. This reduces latency, cuts bandwidth costs across long-distance network links, and improves resilience - if one edge location has issues, the player falls back to a nearby location. Netflix\'s Open Connect program takes the edge concept further: Netflix ships its own edge appliances directly to large ISPs, storing the most popular titles directly on hardware inside the ISP\'s network. This dramatically reduces bandwidth costs for both Netflix and the ISP.',
    relatedTerms: ['cdn', 'latency', 'buffering', 'adaptive-bitrate', 'manifest-file'],
    category: 'technology',
    faqs: [
      { question: 'What is an edge server in streaming?', answer: 'An edge server is a CDN server placed close to viewers geographically. Instead of your stream travelling from a central data center across the world, it comes from a nearby server - reducing buffering and loading times.' },
    ],
  },
  {
    slug: 'playback-session',
    term: 'Playback Session',
    shortDefinition: 'A single continuous streaming session from the moment a user starts playing content to when they stop.',
    longExplanation:
      'A playback session is a defined streaming event starting when a user initiates content playback and ending when they stop, exit the app, or the session times out. Playback sessions are one of the most important engagement metrics streaming services track - total sessions, average session duration, and completion rate all indicate how effectively a platform retains viewer attention. Streaming services generate a unique streaming token at the start of each playback session to authorize content delivery and enforce DRM. Session data feeds recommendation algorithms: what you watched, for how long, where you stopped, and whether you completed it all inform the next suggestion. Platforms like Netflix internally track "take rate" (how often a recommended title is clicked and played) and "completion rate" (what percentage of viewers who start a title finish it) as quality signals, using these to inform future content investments.',
    relatedTerms: ['streaming-token', 'drm', 'adaptive-bitrate', 'manifest-file'],
    category: 'technology',
    faqs: [
      { question: 'What is a playback session in streaming?', answer: 'A playback session is a single viewing event - from when you press play to when you stop. Streaming services track session data like duration and completion rate to improve recommendations and measure content performance.' },
    ],
  },
  {
    slug: 'prestige-tv',
    term: 'Prestige TV',
    shortDefinition: 'High-budget, cinematically crafted television prioritizing narrative complexity and production quality over broad appeal.',
    longExplanation:
      'Prestige TV describes a category of television production characterized by cinematic production values, complex long-form narratives, acclaimed casts, and serious thematic ambition - the kind of content that competes with feature films for critical attention and industry awards. The term emerged in the late 1990s with HBO\'s The Sopranos, which demonstrated that TV could achieve the depth and craft of literary fiction. The prestige TV model spread from HBO to AMC (Breaking Bad, Mad Men), then to streaming platforms - Netflix (Ozark, Squid Game), Amazon (The Boys, Succession rights via rebranding), Apple TV+ (Severance, The Morning Show), and HBO Max (Succession, The White Lotus). Prestige TV is strategically important for streaming services because award recognition drives subscriptions and justifies premium pricing. A single prestige hit like Succession or The Last of Us can meaningfully move subscriber numbers and reduce churn.',
    relatedTerms: ['original-content', 'svod', 'content-spend', 'limited-series'],
    category: 'content',
    faqs: [
      { question: 'What is prestige TV?', answer: 'Prestige TV refers to high-budget, critically ambitious television with cinematic production quality - like The Sopranos, Breaking Bad, Succession, or Severance. These shows aim for artistic recognition alongside commercial success.' },
    ],
  },
  {
    slug: 'showrunner',
    term: 'Showrunner',
    shortDefinition: 'The person with combined creative and production authority over a TV series - typically the head writer and executive producer.',
    longExplanation:
      'A showrunner is the individual who holds both the head writer and executive producer roles on a scripted TV series simultaneously. This dual authority - over the creative direction and the day-to-day production - is a television-specific role without a direct equivalent in film production. The showrunner writes or oversees every script, hires the writers\' room, manages the production budget, and has final say on every creative decision. Showrunners like Vince Gilligan (Breaking Bad, Better Call Saul), David Chase (The Sopranos), and Jesse Armstrong (Succession) became as recognizable to audiences as the shows themselves. In the streaming era, showrunner reputation became a marketing asset - Netflix, Apple, and Amazon sign overall deals with sought-after showrunners, paying them to develop projects exclusively for the platform. These "overall deals" are worth tens of millions of dollars and are a key part of how streaming platforms compete for premium content.',
    relatedTerms: ['original-content', 'prestige-tv', 'co-production'],
    category: 'content',
    faqs: [
      { question: 'What is a showrunner?', answer: 'A showrunner is the person who runs a TV show - they are both the head writer and executive producer, making all creative and production decisions. Vince Gilligan on Breaking Bad and Jesse Armstrong on Succession are well-known examples.' },
    ],
  },
  {
    slug: 'anthology-series',
    term: 'Anthology Series',
    shortDefinition: 'A TV series where each season tells a completely new story with a different cast or setting, unconnected to previous seasons.',
    longExplanation:
      'An anthology series is a television format where each season (or sometimes each episode) presents a self-contained story with a new cast, setting, and narrative - with no continuity between seasons. This contrasts with serialized dramas where characters and storylines carry forward. American Horror Story, True Detective, Black Mirror, and Fargo are prominent anthology series. The format has strategic advantages for streaming: viewers can start any season without watching prior ones, making the full catalog accessible; seasons can star major film actors willing to commit to a limited run but not an open-ended series; and each season generates its own marketing moment. Netflix and HBO have used anthology formats to attract A-list talent for limited commitments. The format also enables the platform to continue a successful brand even if the original showrunner or cast cannot return.',
    relatedTerms: ['limited-series', 'prestige-tv', 'original-content', 'showrunner'],
    category: 'content',
    faqs: [
      { question: 'What is an anthology series?', answer: 'An anthology series starts fresh each season with a new story, setting, and cast. Black Mirror, American Horror Story, and True Detective are anthology series - you can watch any season without having seen the others.' },
    ],
  },
  {
    slug: 'limited-series',
    term: 'Limited Series',
    shortDefinition: 'A TV series planned from the outset to run for a finite number of episodes, with a complete narrative arc and no ongoing seasons.',
    longExplanation:
      'A limited series (also called a miniseries) is a TV production designed from the start to tell a complete story over a fixed number of episodes - typically 4-10 - with no intention of continuing. Unlike ongoing series where each season ends on a cliffhanger or open storyline, a limited series has a definitive conclusion. HBO\'s Chernobyl (5 episodes), Netflix\'s The Queen\'s Gambit (7 episodes), and Hulu\'s Under the Banner of Heaven are limited series. The format has been reinvented by streaming - it allows services to attract major film directors and actors for a defined commitment, produce high-quality content with feature film budgets per episode, and compete directly for Emmy and Golden Globe recognition in the limited series category. Streaming services frequently rename ongoing shows as "limited series" when first announced, then reverse course and order additional seasons if the title performs well (The Queen\'s Gambit being a notable holdout that genuinely stayed limited despite pressure).',
    relatedTerms: ['anthology-series', 'prestige-tv', 'original-content', 'content-spend'],
    category: 'content',
    faqs: [
      { question: 'What is a limited series?', answer: 'A limited series is a TV show designed to tell one complete story over a set number of episodes, with no planned continuation. Chernobyl (5 episodes) and The Queen\'s Gambit (7 episodes) are limited series.' },
    ],
  },
  {
    slug: 'docuseries',
    term: 'Docuseries',
    shortDefinition: 'A multi-episode documentary series exploring a single subject, story, or theme across several installments.',
    longExplanation:
      'A docuseries is a non-fiction series that applies documentary filmmaking techniques across multiple episodes, giving a subject more depth and time than a single feature documentary allows. Netflix popularized the format with True Crime docuseries like Making a Murderer (2015) and Tiger King (2020), both of which became cultural phenomena that drove significant subscriber growth. The format has since expanded beyond true crime to cover sports (The Last Dance, Formula 1: Drive to Survive), nature (Our Planet), business (WeWork: Or the Making and Breaking of a $47 Billion Unicorn), and pop culture. Docuseries are strategically valuable for streaming platforms because they are cheaper to produce than scripted originals but generate equivalent or greater buzz. Formula 1: Drive to Survive is credited with substantially growing Formula 1\'s audience in the United States - an outcome that demonstrates how docuseries can have commercial impact beyond entertainment.',
    relatedTerms: ['original-content', 'content-spend', 'svod', 'prestige-tv'],
    category: 'content',
    faqs: [
      { question: 'What is a docuseries?', answer: 'A docuseries is a multi-episode documentary on a single subject. Netflix\'s Making a Murderer, Tiger King, and Formula 1: Drive to Survive are docuseries - they use documentary techniques spread across multiple episodes rather than a single film.' },
    ],
  },
];

export function getGlossaryTermBySlug(slug: string): GlossaryTerm | undefined {
  return glossaryTerms.find(t => t.slug === slug);
}

export function getGlossaryTermsByCategory(category: GlossaryTerm['category']): GlossaryTerm[] {
  return glossaryTerms.filter(t => t.category === category);
}
