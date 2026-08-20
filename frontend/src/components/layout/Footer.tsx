import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background-muted/30 safe-area-bottom">
      <div className="container-mobile py-10 sm:py-12">
        <div className="grid gap-6 sm:gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
          <div>
            <h3 className="text-mobile-sm sm:text-sm font-semibold text-foreground">Browse</h3>
            <ul className="mt-3 sm:mt-4 space-y-2">
              <li>
                <Link
                  href="/platforms"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Streaming Platforms
                </Link>
              </li>
              <li>
                <Link
                  href="/countries"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Browse by Country
                </Link>
              </li>
              <li>
                <Link
                  href="/compare"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Compare Services
                </Link>
              </li>
              <li>
                <Link
                  href="/sports"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Sports Streaming
                </Link>
              </li>
              <li>
                <Link
                  href="/unblock"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Unblock Streaming
                </Link>
              </li>
              <li>
                <Link
                  href="/how-to-watch"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  How to Watch
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-mobile-sm sm:text-sm font-semibold text-foreground">Learn</h3>
            <ul className="mt-3 sm:mt-4 space-y-2">
              <li>
                <Link
                  href="/blog"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/genres"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Genre Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/glossary"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Streaming Glossary
                </Link>
              </li>
              <li>
                <Link
                  href="/vpn-guidance"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  VPN Guidance
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-mobile-sm sm:text-sm font-semibold text-foreground">Product</h3>
            <ul className="mt-3 sm:mt-4 space-y-2">
              <li>
                <Link
                  href="/features"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Search
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-mobile-sm sm:text-sm font-semibold text-foreground">Company</h3>
            <ul className="mt-3 sm:mt-4 space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/about/authors"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Our Team
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-mobile-sm sm:text-sm font-semibold text-foreground">Legal</h3>
            <ul className="mt-3 sm:mt-4 space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-mobile-sm sm:text-sm font-semibold text-foreground">Support</h3>
            <ul className="mt-3 sm:mt-4 space-y-2">
              <li>
                <Link
                  href="/faq"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Support
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@example.com"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-mobile-sm sm:text-sm font-semibold text-foreground">Connect</h3>
            <ul className="mt-3 sm:mt-4 space-y-2">
              <li>
                <a
                  href="https://twitter.com/geoleapapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mobile-sm sm:text-sm text-foreground-muted hover:text-foreground touch-target block py-1"
                >
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 border-t pt-6 sm:pt-8">
          <p className="text-center text-mobile-sm sm:text-sm text-foreground-muted">
            © {new Date().getFullYear()} GeoLeap. All rights reserved. Built with privacy and performance in mind.
          </p>
        </div>
      </div>
    </footer>
  );
}
