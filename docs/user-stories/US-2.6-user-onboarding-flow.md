# User Story US-2.6: User Onboarding Flow

**Epic:** Authentication & User Management  
**Priority:** P0 (Must-Have)  
**Story Points:** 5  
**Sprint:** 3-4  

## User Story
**As a** new user  
**I want** a guided onboarding experience  
**So that** I can quickly understand and start using the platform effectively

## Acceptance Criteria
- [ ] New users see a welcome screen after first login
- [ ] User can select their streaming service subscriptions during onboarding
- [ ] User can set their primary countries/regions of interest
- [ ] User can choose their preferred content types (movies, TV shows, both)
- [ ] User can skip onboarding and complete it later from settings
- [ ] Onboarding progress is saved if user exits early
- [ ] User can access onboarding tutorial from help section after completion
- [ ] Onboarding preferences are used to personalize initial search results
- [ ] Mobile web experience provides equivalent onboarding functionality

## Definition of Done
- [ ] Onboarding flow is intuitive and informative without being overwhelming
- [ ] User preferences are correctly captured and stored
- [ ] Users can complete or skip onboarding as desired
- [ ] Onboarding data personalizes the user experience immediately
- [ ] Analytics track onboarding completion rates and drop-off points
- [ ] Mobile interface provides touch-friendly onboarding experience
- [ ] Accessibility features support users with disabilities
- [ ] Integration with RBAC ensures appropriate feature access

## Implementation Tasks

### Backend Implementation
- [ ] Create user onboarding preferences endpoints
- [ ] Implement onboarding progress tracking
- [ ] Add streaming service selection storage
- [ ] Create country/region preferences management
- [ ] Implement content type preferences
- [ ] Add onboarding analytics tracking
- [ ] Create personalization data integration
- [ ] Build onboarding completion status tracking

### Database Schema
```sql
CREATE TABLE UserOnboarding (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    IsCompleted BIT DEFAULT 0,
    CurrentStep INT DEFAULT 1,
    CompletedAt DATETIME2 NULL,
    SkippedAt DATETIME2 NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE TABLE UserStreamingServices (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    ServiceName NVARCHAR(100) NOT NULL, -- 'Netflix', 'Disney+', etc.
    IsActive BIT DEFAULT 1,
    AddedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE TABLE UserRegionPreferences (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    CountryCode NVARCHAR(2) NOT NULL, -- ISO country codes
    IsPrimary BIT DEFAULT 0,
    Priority INT DEFAULT 0,
    AddedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE TABLE UserContentPreferences (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    ContentType NVARCHAR(50) NOT NULL, -- 'movie', 'tv_show', 'documentary'
    IsEnabled BIT DEFAULT 1,
    Priority INT DEFAULT 0,
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);
```

### Frontend Implementation
- [ ] Create welcome screen with value proposition
- [ ] Build step-by-step onboarding wizard
- [ ] Implement streaming service selection interface
- [ ] Add country/region selection with search functionality
- [ ] Create content type preference selection
- [ ] Build progress indicator and navigation
- [ ] Add skip functionality with confirmation
- [ ] Implement mobile-responsive onboarding design
- [ ] Create onboarding completion celebration screen
- [ ] Add accessibility features (ARIA, keyboard navigation)

## Onboarding Flow Steps

### Step 1: Welcome & Value Proposition
```typescript
interface WelcomeStep {
  title: "Welcome to GeoLeap!";
  subtitle: "Find where any movie or TV show is streaming globally";
  features: [
    "Search across all countries and services",
    "No more manual country switching",
    "Perfect for VPN users"
  ];
  cta: "Get Started";
}
```

### Step 2: Streaming Services Selection
```typescript
interface StreamingService {
  id: string;
  name: string;
  logo: string;
  isPopular: boolean;
  description: string;
}

const popularServices = [
  'Netflix', 'Disney+', 'Amazon Prime Video', 'Hulu', 
  'HBO Max', 'Apple TV+', 'Paramount+', 'Peacock'
];
```

### Step 3: Region Preferences
- Primary country (where user is located)
- Additional countries of interest
- Popular VPN server locations
- Auto-suggest based on user's IP location

### Step 4: Content Preferences
- Movies vs TV Shows preference
- Genres of interest (optional)
- Content rating preferences
- Language preferences

### Step 5: Completion & Personalization
- Summary of selections
- Explanation of how preferences improve experience
- First personalized search suggestions
- Call-to-action for first search

## Personalization Integration

### Search Result Personalization
```typescript
interface PersonalizedSearchParams {
  userServices: string[]; // Filter to user's subscribed services
  preferredRegions: string[]; // Prioritize user's preferred countries
  contentTypes: string[]; // Filter by user's content preferences
  hidePaywalledResults: boolean; // Based on subscription status
}
```

### Onboarding Analytics
- Step completion rates
- Time spent on each step
- Most popular service selections
- Common drop-off points
- Skip rate and reasons
- Correlation between onboarding completion and user engagement

## Mobile Considerations
- Touch-friendly service selection with large tap targets
- Swipe navigation between onboarding steps
- Mobile-optimized country selection with search
- Progress indicator adapted for mobile screens
- **Future React Native:** Native onboarding with platform-specific UX

## User Experience Principles

### Progressive Disclosure
- Start with essential information only
- Allow users to add more details later
- Don't overwhelm with too many options initially

### Value-First Approach
- Explain benefit before asking for information
- Show immediate value from each preference
- Demonstrate personalization in real-time

### Flexible Completion
```typescript
interface OnboardingState {
  canSkip: boolean;
  canGoBack: boolean;
  progress: number; // 0-100
  currentStep: number;
  totalSteps: number;
  timeEstimate: string; // "2 minutes remaining"
}
```

## A/B Testing Opportunities
- Number of onboarding steps (3 vs 4 vs 5)
- Service selection UI (grid vs list)
- Progress indicator style
- Skip button placement and wording
- Welcome screen messaging

## Accessibility Features
- Screen reader support for all onboarding content
- Keyboard navigation between steps
- High contrast mode support
- Focus management for step transitions
- Alternative text for all images and icons
- Clear, simple language throughout

## Testing Strategy
- [ ] User experience testing with new users
- [ ] A/B testing of different onboarding flows
- [ ] Analytics testing of completion tracking
- [ ] Accessibility testing with screen readers
- [ ] Mobile usability testing
- [ ] Performance testing of onboarding API calls
- [ ] Integration testing with personalization features

## Dependencies
- User registration system (US-2.1)
- User profile management (US-2.4)
- Analytics infrastructure for tracking
- Content metadata for service and genre lists

## Success Metrics
- **Onboarding completion rate:** > 70% of new users complete onboarding
- **Step completion rates:** > 85% progress from each step to the next
- **Time to complete:** < 3 minutes average completion time
- **User engagement:** Users who complete onboarding have 40% higher engagement
- **Personalization effectiveness:** 60% of post-onboarding searches use personalized filters

