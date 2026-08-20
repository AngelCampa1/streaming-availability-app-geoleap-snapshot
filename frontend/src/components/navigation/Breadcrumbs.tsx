'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
  isActive: boolean;
}

interface BreadcrumbsProps {
  className?: string;
  items?: BreadcrumbItem[];
}

// Path mapping for better display names
const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  search: 'Search',
  settings: 'Settings',
  profile: 'Profile',
  security: 'Security',
  history: 'Search History',
  watchlist: 'Watchlist',
  trending: 'Trending',
  notifications: 'Notifications',
  billing: 'Billing',
  admin: 'Admin',
  users: 'Users',
  roles: 'Roles',
  'audit-logs': 'Audit Logs',
  pricing: 'Pricing',
  auth: 'Authentication',
  login: 'Sign In',
  register: 'Sign Up',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  callback: 'OAuth Callback',
  onboarding: 'Onboarding',
  account: 'Account',
  faq: 'FAQ',
  help: 'Help Center',
  about: 'About',
  support: 'Support',
  blog: 'Blog',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
};

export default function Breadcrumbs({ className = '', items }: BreadcrumbsProps) {
  const pathname = usePathname();

  // If custom items are provided, use them
  if (items) {
    return (
      <nav aria-label="Breadcrumb" className={`flex items-center space-x-1 text-sm ${className}`}>
        <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
          <span className="sr-only">Home</span>
        </Link>

        {items.map((item) => (
          <div key={item.href} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            {item.isActive ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </nav>
    );
  }

  // Auto-generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on home page
  if (pathSegments.length === 0) {
    return null;
  }

  // Don't show breadcrumbs for simple auth pages
  if (pathSegments.length === 2 && pathSegments[0] === 'auth') {
    return null;
  }

  const breadcrumbItems: BreadcrumbItem[] = [];
  let currentPath = '';

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    breadcrumbItems.push({
      label,
      href: currentPath,
      isActive: isLast,
    });
  });

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center space-x-1 text-sm ${className}`}>
      <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>

      {breadcrumbItems.map((item) => (
        <div key={item.href} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
          {item.isActive ? (
            <span className="font-medium text-foreground" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
