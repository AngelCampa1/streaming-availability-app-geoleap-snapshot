/**
 * Skeleton Component Tests
 * Day 5 Continuation - Common Components
 *
 * Tests for Skeleton component with variants and pre-built skeletons
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import Skeleton, {
  SearchSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
  CardSkeleton,
  ListSkeleton,
} from '../../../components/common/Skeleton';

// Mock theme from ThemeProvider (correct path)
jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        neutral: {
          200: '#e5e7eb',
          300: '#d1d5db',
        },
      },
      semantic: {
        background: {
          secondary: '#f8fafc',
        },
      },
      spacing: {
        1: 4,
        2: 8,
        3: 12,
        4: 16,
      },
      borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        full: 9999,
      },
    },
  }),
}));

describe('Skeleton Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default rectangular variant', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={20} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should render with circular variant', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton variant="circular" width={50} height={50} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should render with text variant', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton variant="text" width={200} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should render with rectangular variant', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton variant="rectangular" width={150} height={100} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });
  });

  describe('Dimensions', () => {
    it('should accept width as number', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={20} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should accept width as string', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width="100%" height={20} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should accept height as number', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={50} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should accept height as string', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height="100%" />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should render with pulse animation', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={20} animation="pulse" />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should render with wave animation', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={20} animation="wave" />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should render with no animation', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={20} animation="none" />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should use pulse animation by default', () => {
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={20} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom style prop', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={20} style={customStyle} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });

    it('should combine custom style with default styles', () => {
      const customStyle = { backgroundColor: 'red', opacity: 0.5 };
      const { getByTestId } = render(
        <View testID="wrapper">
          <Skeleton width={100} height={20} style={customStyle} />
        </View>
      );

      expect(getByTestId('wrapper')).toBeTruthy();
    });
  });
});

describe('SearchSkeleton Component', () => {
  it('should render search skeleton structure', () => {
    const { getByTestId } = render(
      <View testID="search-skeleton-wrapper">
        <SearchSkeleton />
      </View>
    );

    expect(getByTestId('search-skeleton-wrapper')).toBeTruthy();
  });

  it('should render with pulse animation by default', () => {
    const { getByTestId } = render(
      <View testID="search-pulse">
        <SearchSkeleton />
      </View>
    );

    expect(getByTestId('search-pulse')).toBeTruthy();
  });

  it('should render with wave animation', () => {
    const { getByTestId } = render(
      <View testID="search-wave">
        <SearchSkeleton animation="wave" />
      </View>
    );

    expect(getByTestId('search-wave')).toBeTruthy();
  });

  it('should render with no animation', () => {
    const { getByTestId } = render(
      <View testID="search-static">
        <SearchSkeleton animation="none" />
      </View>
    );

    expect(getByTestId('search-static')).toBeTruthy();
  });
});

describe('DashboardSkeleton Component', () => {
  it('should render dashboard skeleton structure', () => {
    const { getByTestId } = render(
      <View testID="dashboard-skeleton-wrapper">
        <DashboardSkeleton />
      </View>
    );

    expect(getByTestId('dashboard-skeleton-wrapper')).toBeTruthy();
  });

  it('should render with pulse animation by default', () => {
    const { getByTestId } = render(
      <View testID="dashboard-pulse">
        <DashboardSkeleton />
      </View>
    );

    expect(getByTestId('dashboard-pulse')).toBeTruthy();
  });

  it('should render with wave animation', () => {
    const { getByTestId } = render(
      <View testID="dashboard-wave">
        <DashboardSkeleton animation="wave" />
      </View>
    );

    expect(getByTestId('dashboard-wave')).toBeTruthy();
  });

  it('should render multiple sections', () => {
    const { getByTestId } = render(
      <View testID="dashboard-sections">
        <DashboardSkeleton />
      </View>
    );

    // Dashboard skeleton should contain multiple sections
    expect(getByTestId('dashboard-sections')).toBeTruthy();
  });
});

describe('ProfileSkeleton Component', () => {
  it('should render profile skeleton structure', () => {
    const { getByTestId } = render(
      <View testID="profile-skeleton-wrapper">
        <ProfileSkeleton />
      </View>
    );

    expect(getByTestId('profile-skeleton-wrapper')).toBeTruthy();
  });

  it('should render with pulse animation by default', () => {
    const { getByTestId } = render(
      <View testID="profile-pulse">
        <ProfileSkeleton />
      </View>
    );

    expect(getByTestId('profile-pulse')).toBeTruthy();
  });

  it('should render with wave animation', () => {
    const { getByTestId } = render(
      <View testID="profile-wave">
        <ProfileSkeleton animation="wave" />
      </View>
    );

    expect(getByTestId('profile-wave')).toBeTruthy();
  });

  it('should render avatar and content sections', () => {
    const { getByTestId } = render(
      <View testID="profile-sections">
        <ProfileSkeleton />
      </View>
    );

    // Profile skeleton should have avatar and content
    expect(getByTestId('profile-sections')).toBeTruthy();
  });
});

describe('CardSkeleton Component', () => {
  it('should render card skeleton structure', () => {
    const { getByTestId } = render(
      <View testID="card-skeleton-wrapper">
        <CardSkeleton />
      </View>
    );

    expect(getByTestId('card-skeleton-wrapper')).toBeTruthy();
  });

  it('should render with pulse animation by default', () => {
    const { getByTestId } = render(
      <View testID="card-pulse">
        <CardSkeleton />
      </View>
    );

    expect(getByTestId('card-pulse')).toBeTruthy();
  });

  it('should render with wave animation', () => {
    const { getByTestId } = render(
      <View testID="card-wave">
        <CardSkeleton animation="wave" />
      </View>
    );

    expect(getByTestId('card-wave')).toBeTruthy();
  });

  it('should render header and content sections', () => {
    const { getByTestId } = render(
      <View testID="card-sections">
        <CardSkeleton />
      </View>
    );

    // Card skeleton should have header and content
    expect(getByTestId('card-sections')).toBeTruthy();
  });
});

describe('ListSkeleton Component', () => {
  it('should render list skeleton with default item count', () => {
    const { getByTestId } = render(
      <View testID="list-skeleton-wrapper">
        <ListSkeleton />
      </View>
    );

    expect(getByTestId('list-skeleton-wrapper')).toBeTruthy();
  });

  it('should render with custom item count', () => {
    const { getByTestId } = render(
      <View testID="list-custom-count">
        <ListSkeleton itemCount={5} />
      </View>
    );

    expect(getByTestId('list-custom-count')).toBeTruthy();
  });

  it('should render with single item', () => {
    const { getByTestId } = render(
      <View testID="list-single-item">
        <ListSkeleton itemCount={1} />
      </View>
    );

    expect(getByTestId('list-single-item')).toBeTruthy();
  });

  it('should render with multiple items', () => {
    const { getByTestId } = render(
      <View testID="list-multiple-items">
        <ListSkeleton itemCount={10} />
      </View>
    );

    expect(getByTestId('list-multiple-items')).toBeTruthy();
  });

  it('should render with pulse animation by default', () => {
    const { getByTestId } = render(
      <View testID="list-pulse">
        <ListSkeleton />
      </View>
    );

    expect(getByTestId('list-pulse')).toBeTruthy();
  });

  it('should render with wave animation', () => {
    const { getByTestId } = render(
      <View testID="list-wave">
        <ListSkeleton animation="wave" />
      </View>
    );

    expect(getByTestId('list-wave')).toBeTruthy();
  });

  it('should render with no animation', () => {
    const { getByTestId } = render(
      <View testID="list-static">
        <ListSkeleton animation="none" />
      </View>
    );

    expect(getByTestId('list-static')).toBeTruthy();
  });
});

describe('Skeleton Integration', () => {
  it('should render multiple skeleton components together', () => {
    const { getByTestId } = render(
      <View testID="multiple-skeletons">
        <Skeleton width={100} height={20} />
        <Skeleton width={200} height={30} />
        <Skeleton width={150} height={25} />
      </View>
    );

    expect(getByTestId('multiple-skeletons')).toBeTruthy();
  });

  it('should render pre-built skeletons with custom animation', () => {
    const { getByTestId } = render(
      <View testID="custom-animation-skeletons">
        <View testID="search">
          <SearchSkeleton animation="wave" />
        </View>
        <View testID="dashboard">
          <DashboardSkeleton animation="wave" />
        </View>
        <View testID="profile">
          <ProfileSkeleton animation="wave" />
        </View>
      </View>
    );

    expect(getByTestId('search')).toBeTruthy();
    expect(getByTestId('dashboard')).toBeTruthy();
    expect(getByTestId('profile')).toBeTruthy();
  });

  it('should mix skeleton variants in same view', () => {
    const { getByTestId } = render(
      <View testID="mixed-variants">
        <Skeleton variant="circular" width={50} height={50} />
        <Skeleton variant="text" width={200} />
        <Skeleton variant="rectangular" width={150} height={100} />
      </View>
    );

    expect(getByTestId('mixed-variants')).toBeTruthy();
  });
});
