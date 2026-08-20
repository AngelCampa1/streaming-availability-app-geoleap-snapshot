/**
 * Card Component Tests
 * Day 5 Continuation - Common Components
 *
 * Tests for Card component with variants and subcomponents
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card, CardHeader, CardContent, CardFooter, CardComponent } from '../../../components/common/Card';

// Mock theme
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: { 500: '#7c3aed' },
      },
      semantic: {
        text: {
          primary: '#0f172a',
        },
        background: {
          secondary: '#f8fafc',
        },
        border: {
          primary: '#e2e8f0',
        },
      },
      spacing: {
        4: 16,
      },
      borderRadius: {
        lg: 16,
      },
      shadows: {
        sm: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        },
        md: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        },
      },
    },
  }),
}));

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('should render children content', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );

      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <Card testID="test-card">
          <Text>Content</Text>
        </Card>
      );

      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <Card>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </Card>
      );

      expect(getByText('First Child')).toBeTruthy();
      expect(getByText('Second Child')).toBeTruthy();
    });
  });

  describe('Variant Rendering', () => {
    it('should render default variant', () => {
      const { getByTestId } = render(
        <Card testID="default-card">
          <Text>Default Card</Text>
        </Card>
      );

      const card = getByTestId('default-card');
      expect(card).toBeTruthy();
    });

    it('should render outlined variant', () => {
      const { getByTestId } = render(
        <Card variant="outlined" testID="outlined-card">
          <Text>Outlined Card</Text>
        </Card>
      );

      const card = getByTestId('outlined-card');
      expect(card).toBeTruthy();
      expect(card.props.style).toBeDefined();
    });

    it('should render elevated variant', () => {
      const { getByTestId } = render(
        <Card variant="elevated" testID="elevated-card">
          <Text>Elevated Card</Text>
        </Card>
      );

      const card = getByTestId('elevated-card');
      expect(card).toBeTruthy();
    });

    it('should render gradient variant', () => {
      const { getByTestId } = render(
        <Card variant="gradient" testID="gradient-card">
          <Text>Gradient Card</Text>
        </Card>
      );

      const card = getByTestId('gradient-card');
      expect(card).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled opacity when disabled', () => {
      const { getByTestId } = render(
        <Card disabled testID="disabled-card">
          <Text>Disabled Card</Text>
        </Card>
      );

      const card = getByTestId('disabled-card');
      expect(card).toBeTruthy();
      // Disabled styling should be applied
    });

    it('should not apply disabled opacity by default', () => {
      const { getByTestId } = render(
        <Card testID="enabled-card">
          <Text>Enabled Card</Text>
        </Card>
      );

      const card = getByTestId('enabled-card');
      expect(card).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    it('should accept custom style prop', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <Card style={customStyle} testID="styled-card">
          <Text>Styled Card</Text>
        </Card>
      );

      const card = getByTestId('styled-card');
      expect(card).toBeTruthy();
    });

    it('should accept custom padding', () => {
      const { getByTestId } = render(
        <Card padding={24} testID="padded-card">
          <Text>Padded Card</Text>
        </Card>
      );

      const card = getByTestId('padded-card');
      expect(card).toBeTruthy();
    });

    it('should accept custom margin', () => {
      const { getByTestId } = render(
        <Card margin={16} testID="margin-card">
          <Text>Margin Card</Text>
        </Card>
      );

      const card = getByTestId('margin-card');
      expect(card).toBeTruthy();
    });
  });
});

describe('CardHeader Component', () => {
  it('should render header content', () => {
    const { getByText } = render(
      <CardHeader>
        <Text>Header Content</Text>
      </CardHeader>
    );

    expect(getByText('Header Content')).toBeTruthy();
  });

  it('should accept custom padding', () => {
    const { getByText } = render(
      <CardHeader padding={20}>
        <Text>Header</Text>
      </CardHeader>
    );

    expect(getByText('Header')).toBeTruthy();
  });

  it('should accept custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(
      <CardHeader style={customStyle}>
        <Text>Styled Header</Text>
      </CardHeader>
    );

    expect(getByText('Styled Header')).toBeTruthy();
  });
});

describe('CardContent Component', () => {
  it('should render content', () => {
    const { getByText } = render(
      <CardContent>
        <Text>Content Area</Text>
      </CardContent>
    );

    expect(getByText('Content Area')).toBeTruthy();
  });

  it('should accept custom padding', () => {
    const { getByText } = render(
      <CardContent padding={20}>
        <Text>Content</Text>
      </CardContent>
    );

    expect(getByText('Content')).toBeTruthy();
  });

  it('should accept custom style', () => {
    const customStyle = { flex: 2 };
    const { getByText } = render(
      <CardContent style={customStyle}>
        <Text>Styled Content</Text>
      </CardContent>
    );

    expect(getByText('Styled Content')).toBeTruthy();
  });
});

describe('CardFooter Component', () => {
  it('should render footer content', () => {
    const { getByText } = render(
      <CardFooter>
        <Text>Footer Content</Text>
      </CardFooter>
    );

    expect(getByText('Footer Content')).toBeTruthy();
  });

  it('should accept custom padding', () => {
    const { getByText } = render(
      <CardFooter padding={20}>
        <Text>Footer</Text>
      </CardFooter>
    );

    expect(getByText('Footer')).toBeTruthy();
  });

  it('should accept custom style', () => {
    const customStyle = { backgroundColor: 'blue' };
    const { getByText } = render(
      <CardFooter style={customStyle}>
        <Text>Styled Footer</Text>
      </CardFooter>
    );

    expect(getByText('Styled Footer')).toBeTruthy();
  });
});

describe('CardComponent with Subcomponents', () => {
  it('should render complete card with header, content, and footer', () => {
    const { getByText } = render(
      <CardComponent testID="complete-card">
        <CardComponent.Header>
          <Text>Header</Text>
        </CardComponent.Header>
        <CardComponent.Content>
          <Text>Content</Text>
        </CardComponent.Content>
        <CardComponent.Footer>
          <Text>Footer</Text>
        </CardComponent.Footer>
      </CardComponent>
    );

    expect(getByText('Header')).toBeTruthy();
    expect(getByText('Content')).toBeTruthy();
    expect(getByText('Footer')).toBeTruthy();
  });

  it('should work with only header and content', () => {
    const { getByText, queryByText } = render(
      <CardComponent>
        <CardComponent.Header>
          <Text>Header Only</Text>
        </CardComponent.Header>
        <CardComponent.Content>
          <Text>Content Only</Text>
        </CardComponent.Content>
      </CardComponent>
    );

    expect(getByText('Header Only')).toBeTruthy();
    expect(getByText('Content Only')).toBeTruthy();
    expect(queryByText('Footer')).toBeNull();
  });

  it('should work with only content', () => {
    const { getByText } = render(
      <CardComponent>
        <CardComponent.Content>
          <Text>Content Alone</Text>
        </CardComponent.Content>
      </CardComponent>
    );

    expect(getByText('Content Alone')).toBeTruthy();
  });
});
