'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Home,
  Search,
  History,
  Bookmark,
  Settings,
  User,
  Crown,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Shield,
  TrendingUp,
  Bell,
  Globe,
  LayoutDashboard,
  Info,
  Compass,
  Map,
  Sparkles,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useKeyboardNavigation, useFocusManagement } from '@/hooks/useKeyboardNavigation';
import { useAnnouncements } from '@/components/accessibility/LiveRegion';

interface NavChild {
  label: string;
  href: string;
}

interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTooltip?: string;
  requiresAuth?: boolean;
  adminOnly?: boolean;
  children?: NavChild[];
}

interface UserMenuProps {
  user: { firstName?: string; lastName?: string; email?: string } | null;
  logout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const UserMenu = ({ user, logout, isOpen, onClose }: UserMenuProps) => {
  const pathname = usePathname();

  const userMenuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/settings/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard/subscriptions', label: 'My Streaming Services', icon: Globe },
    { href: '/dashboard/history', label: 'Search History', icon: History },
    { href: '/dashboard/watchlist', label: 'Watchlist', icon: Bookmark },
  ];

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl z-[1000] animate-in slide-in-from-top duration-200">
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm transition-colors duration-200 hover:text-primary">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="py-2">
        {userMenuItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm transition-all duration-200 group hover:bg-muted hover:translate-x-1 ${
                isActive ? 'bg-muted text-primary shadow-sm' : 'text-foreground'
              }`}
            >
              <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t p-2">
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-destructive hover:bg-destructive/10 w-full rounded-full transition-all duration-200 group hover:shadow-sm hover:translate-x-1"
        >
          <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

const EXPLORE_CHILDREN: NavChild[] = [
  { label: 'Browse by Country', href: '/countries' },
  { label: 'Compare Services', href: '/compare' },
  { label: 'Product Features', href: '/features' },
  { label: 'Blog', href: '/blog' },
  { label: 'Streaming Guides', href: '/guides' },
  { label: 'Genre Guides', href: '/genres' },
  { label: 'Sports Streaming', href: '/sports' },
  { label: 'Unblock Streaming', href: '/unblock' },
  { label: 'How to Watch', href: '/how-to-watch' },
];

export default function MainNavigation() {
  const { user, isAuthenticated, isLoading: authLoading, logout, hasPermission } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isExploreMenuOpen, setIsExploreMenuOpen] = useState(false);
  const [isMobileExploreOpen, setIsMobileExploreOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true); // UX Fix: Show skeleton while loading
  const { announce } = useAnnouncements();
  const { containerRef, trapFocus } = useFocusManagement();

  useEffect(() => {
    // Close menus when pathname changes
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsExploreMenuOpen(false);
    setIsMobileExploreOpen(false);
  }, [pathname]);

  // UX Fix: Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Store current scroll position and lock body
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll position when menu closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) {
          return;
        }
        try {
          window.scrollTo(0, scrollY);
        } catch {
          // jsdom does not implement scrollTo; browsers do.
        }
      };
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    // Load notifications count for authenticated users
    if (isAuthenticated) {
      loadNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true); // UX Fix: Start loading
      // SECURITY: Use credentials: 'include' for cookie-based auth instead of localStorage tokens
      // Auth status is determined by isAuthenticated prop, not localStorage
      if (!isAuthenticated) {
        setNotificationsLoading(false);
        return;
      }

      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { count } = await response.json();
        setNotifications(count);
      }
    } catch (err) {
      logger.error('Failed to load notifications count', { error: err });
    } finally {
      setNotificationsLoading(false); // UX Fix: End loading
    }
  };

    const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: Home,
    },
    {
      id: 'search',
      label: 'Search',
      href: '/search',
      icon: Search,
      badge: 'Popular',
    },
    {
      id: 'platforms',
      label: 'Platforms',
      href: '/platforms',
      icon: Compass,
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Map,
      children: EXPLORE_CHILDREN,
    },
    {
      id: 'features',
      label: 'Features',
      href: '/features',
      icon: Sparkles,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard, // UX Fix: Use distinct icon from Home
      requiresAuth: true,
    },
    {
      id: 'trending',
      label: 'Trending',
      href: '/dashboard/trending',
      icon: TrendingUp,
      requiresAuth: true,
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      href: '/dashboard/subscriptions',
      icon: Globe,
      requiresAuth: true,
      badge: 'VPN',
      badgeTooltip: 'Get VPN recommendations for global streaming access', // UX Fix: Explain VPN badge
    },
    {
      id: 'pricing',
      label: 'Pricing',
      href: '/pricing',
      icon: Crown,
    },
    {
      id: 'admin',
      label: 'Admin',
      href: '/admin',
      icon: Shield,
      requiresAuth: true,
      adminOnly: true,
    },
  ];

  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.adminOnly && !hasPermission?.('admin:read')) return false;
    return true;
  });

  const handleMobileMenuToggle = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    announce(newState ? 'Mobile menu opened' : 'Mobile menu closed');
  };

  const handleUserMenuToggle = () => {
    const newState = !isUserMenuOpen;
    setIsUserMenuOpen(newState);
    announce(newState ? 'User menu opened' : 'User menu closed');
  };

  const handleExploreMenuToggle = () => {
    const newState = !isExploreMenuOpen;
    setIsExploreMenuOpen(newState);
    announce(newState ? 'Explore menu opened' : 'Explore menu closed');
  };

  // Keyboard navigation for menus
  useKeyboardNavigation({
    onEscape: () => {
      if (isUserMenuOpen) {
        setIsUserMenuOpen(false);
        announce('User menu closed');
      } else if (isExploreMenuOpen) {
        setIsExploreMenuOpen(false);
        announce('Explore menu closed');
      } else if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        announce('Mobile menu closed');
      }
    },
    enabled: isUserMenuOpen || isExploreMenuOpen || isMobileMenuOpen,
  });

  // Close menus when clicking outside (fixed memory leak)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setIsUserMenuOpen(false);
      }
      if (!target.closest('[data-explore-menu]')) {
        setIsExploreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []); // Empty deps - runs once only

  return (
    <header
      className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm"
      style={{ zIndex: isMobileMenuOpen ? 60 : 40 }}
    >
      <nav className="container mx-auto px-4" role="navigation" aria-label="Main navigation" ref={containerRef}>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <Image
                src="/logo-transparent.png"
                alt="GeoLeap Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain transition-all duration-300 group-hover:scale-105"
                priority
              />
              <span className="text-xl font-bold text-foreground hidden sm:inline transition-colors duration-300 group-hover:text-primary">
                GeoLeap
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <TooltipProvider delayDuration={300}>
              {filteredNavigationItems.map(item => {
                const Icon = item.icon;

                // Explore dropdown
                if (item.children) {
                  const isActive = item.children.some(
                    child => pathname === child.href || pathname.startsWith(child.href + '/')
                  );
                  return (
                    <div key={item.id} className="relative" data-explore-menu>
                      <button
                        onClick={handleExploreMenuToggle}
                        aria-expanded={isExploreMenuOpen}
                        aria-haspopup="menu"
                        className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 relative ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-foreground hover:bg-muted hover:shadow-sm hover:scale-105'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                        <ChevronDown
                          className={`h-3 w-3 transition-transform duration-200 ${isExploreMenuOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isExploreMenuOpen && (
                        <div className="absolute left-0 top-full mt-2 w-52 bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl z-[1000] animate-in slide-in-from-top duration-200">
                          <div className="py-2">
                            {item.children.map(child => {
                              const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setIsExploreMenuOpen(false)}
                                  className={`flex items-center px-4 py-2.5 text-sm transition-all duration-200 hover:bg-muted hover:translate-x-1 ${
                                    isChildActive ? 'bg-muted text-primary font-medium' : 'text-foreground'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Standard nav link
                const isActive = pathname === item.href || (item.href !== '/' && item.href !== undefined && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.id}
                    href={item.href!}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 relative ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-foreground hover:bg-muted hover:shadow-sm hover:scale-105'
                    }`}
                  >
                    <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    {item.label}
                    {item.badge && (
                      item.badgeTooltip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="secondary"
                              className="text-xs ml-1 transition-all duration-200 hover:scale-110 cursor-help"
                            >
                              {item.badge}
                              <Info className="h-3 w-3 ml-0.5 opacity-60" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[200px] text-center">
                            <p>{item.badgeTooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-xs ml-1 transition-all duration-200 group-hover:scale-110"
                        >
                          {item.badge}
                        </Badge>
                      )
                    )}
                  </Link>
                );
              })}
            </TooltipProvider>
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Show skeleton while auth is loading to prevent flash */}
            {authLoading ? (
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>
            ) : isAuthenticated ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative min-h-[44px] min-w-[44px] p-3" asChild>
                  <Link href="/dashboard/notifications">
                    <Bell className="h-5 w-5" />
                    {notificationsLoading ? (
                      // UX Fix: Show skeleton while loading notification count
                      <Skeleton className="absolute -top-2 -right-2 h-5 w-5 rounded-full" />
                    ) : notifications > 0 ? (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-in zoom-in-50 duration-200">
                        {notifications > 9 ? '9+' : notifications}
                      </Badge>
                    ) : null}
                  </Link>
                </Button>

                {/* User Menu */}
                <div className="relative" data-user-menu>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUserMenuToggle}
                    className="flex items-center gap-2 min-h-[44px] p-3"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    aria-label="User menu"
                  >
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">{user?.firstName || 'User'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>

                  <UserMenu
                    user={user}
                    logout={logout}
                    isOpen={isUserMenuOpen}
                    onClose={() => setIsUserMenuOpen(false)}
                  />
                </div>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="min-h-[44px]">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="min-h-[44px]">
                  <Link href="/auth/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          {/* BUG FIX: Added relative z-[70] when menu is open to ensure button is above backdrop (z-[45]) */}
          <div className="md:hidden relative" style={{ zIndex: isMobileMenuOpen ? 70 : 'auto' }}>
            <button
              onClick={handleMobileMenuToggle}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-3 text-sm font-medium text-foreground transition-all duration-200 hover:bg-background-muted hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {/* UX Fix: Smooth hamburger-to-X transition animation */}
              <div className="relative w-5 h-5">
                <Menu className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
                <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            {/* UX Fix: Backdrop overlay for mobile menu */}
            {/* BUG FIX: Changed z-index from z-40 to z-[45] to be above header (z-40) but below mobile menu (z-50) */}
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden z-[45] animate-in fade-in duration-200"
              onClick={() => { setIsMobileMenuOpen(false); setIsMobileExploreOpen(false); }}
              aria-hidden="true"
            />
            <div
              className="fixed left-0 right-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t bg-background px-4 animate-in slide-in-from-top duration-300 md:hidden"
              id="mobile-menu"
              role="menu"
              onKeyDown={trapFocus}
            >
            <div className="py-4 space-y-2">
              {filteredNavigationItems.map(item => {
                const Icon = item.icon;

                // Explore collapsible section for mobile
                if (item.children) {
                  const isActive = item.children.some(
                    child => pathname === child.href || pathname.startsWith(child.href + '/')
                  );
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setIsMobileExploreOpen(prev => !prev)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium w-full transition-all duration-200 ${
                          isActive
                            ? 'rounded-full bg-primary/10 text-primary shadow-sm'
                            : 'rounded-full text-foreground hover:bg-muted hover:shadow-sm'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                        <ChevronDown
                          className={`h-4 w-4 ml-auto transition-transform duration-200 ${isMobileExploreOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isMobileExploreOpen && (
                        <div className="bg-muted/30 border-l-2 border-primary/20 ml-4">
                          {item.children.map(child => {
                            const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setIsMobileExploreOpen(false);
                                }}
                                className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                                  isChildActive ? 'text-primary font-medium' : 'text-foreground hover:text-primary'
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Standard mobile nav link
                const isActive = pathname === item.href || (item.href !== '/' && item.href !== undefined && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.id}
                    href={item.href!}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex flex-col gap-1 px-4 py-3 text-sm font-medium transition-all duration-200 group rounded-full ${
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-foreground hover:bg-muted hover:shadow-sm hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                      {item.label}
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="text-xs ml-auto transition-transform duration-200 group-hover:scale-110"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {/* UX Fix: Show badge tooltip inline on mobile */}
                    {item.badgeTooltip && (
                      <span className="text-xs text-muted-foreground ml-8">{item.badgeTooltip}</span>
                    )}
                  </Link>
                );
              })}

              {/* Mobile User Actions */}
              {/* Show skeleton while auth is loading to prevent flash */}
              {authLoading ? (
                <div className="border-t pt-4 mt-4 px-4">
                  <Skeleton className="h-10 w-full rounded-md mb-2" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ) : isAuthenticated ? (
                <>
                  <div className="border-t pt-4 mt-4">
                    <div className="px-4 py-2 text-sm text-muted-foreground">
                      Signed in as {user?.firstName} {user?.lastName}
                    </div>
                  </div>

                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-foreground hover:bg-muted transition-colors rounded-full"
                  >
                    <Bell className="h-5 w-5" />
                    Notifications
                    {notificationsLoading ? (
                      // UX Fix: Show skeleton while loading notification count
                      <Skeleton className="ml-auto h-5 w-5 rounded-full" />
                    ) : notifications > 0 ? (
                      <Badge className="ml-auto animate-in zoom-in-50 duration-200">{notifications > 9 ? '9+' : notifications}</Badge>
                    ) : null}
                  </Link>

                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left rounded-full"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="border-t pt-4 mt-4 space-y-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-foreground hover:bg-muted transition-colors rounded-full"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium bg-primary text-primary-foreground rounded-full mx-4"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
            </div>
          </>
        )}
      </nav>
    </header>
  );
}
