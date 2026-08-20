interface SocialShareLinksProps {
  title: string;
  url: string;
}

export function SocialShareLinks({ title, url }: SocialShareLinksProps) {
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const links = [
    { label: 'Twitter', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: 'Reddit', href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}` },
  ];

  return (
    <div className="mt-10 flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Share this guide:</span>
      {links.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
          aria-label={`Share on ${label}`}
        >
          {label}
        </a>
      ))}
    </div>
  );
}
