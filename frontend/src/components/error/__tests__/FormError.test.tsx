/**
 * FormError Integration Tests
 *
 * Tests form validation components with real rendering logic.
 * Only mocks cn utility, not component logic.
 *
 * Coverage Target: 60%+
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  FormError,
  ValidatedInput,
  ValidatedTextarea,
  ValidatedSelect,
  FormValidationSummary,
  useFieldValidation,
} from '../FormError';

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('FormError Component', () => {
  describe('Basic Rendering', () => {
    it('renders single error when touched', () => {
      render(<FormError error="This field is required" touched={true} />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('renders multiple errors when touched', () => {
      render(<FormError errors={['Error 1', 'Error 2', 'Error 3']} touched={true} />);

      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getByText('Error 3')).toBeInTheDocument();
    });

    it('does not render when not touched', () => {
      render(<FormError error="This field is required" touched={false} />);

      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });

    it('does not render when no errors', () => {
      render(<FormError touched={true} />);

      const container = document.body;
      expect(container.querySelector('.text-error')).not.toBeInTheDocument();
    });

    it('prefers error prop over errors array', () => {
      render(<FormError error="Single error" errors={['Multiple', 'Errors']} touched={true} />);

      expect(screen.getByText('Single error')).toBeInTheDocument();
      expect(screen.queryByText('Multiple')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders inline variant (default)', () => {
      const { container } = render(<FormError error="Inline error" touched={true} variant="inline" />);

      expect(container.querySelector('.text-xs')).toBeInTheDocument();
    });

    it('renders block variant', () => {
      const { container } = render(<FormError error="Block error" touched={true} variant="block" />);

      expect(container.querySelector('.bg-error\\/10')).toBeInTheDocument();
    });

    it('renders tooltip variant', () => {
      const { container } = render(<FormError error="Tooltip error" touched={true} variant="tooltip" />);

      expect(container.querySelector('.group')).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('shows icon by default', () => {
      const { container } = render(<FormError error="Error" touched={true} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('hides icon when showIcon is false', () => {
      const { container } = render(<FormError error="Error" touched={true} showIcon={false} />);

      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });
});

describe('ValidatedInput Component', () => {
  it('renders with label', () => {
    render(<ValidatedInput label="Email" />);

    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<ValidatedInput label="Password" required={true} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays helper text when no error', () => {
    render(<ValidatedInput label="Username" helperText="Choose a unique username" />);

    expect(screen.getByText('Choose a unique username')).toBeInTheDocument();
  });

  it('hides helper text when error present', () => {
    render(<ValidatedInput label="Email" helperText="Enter your email" error="Invalid email" touched={true} />);

    expect(screen.queryByText('Enter your email')).not.toBeInTheDocument();
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('applies error styling when touched with error', () => {
    const { container } = render(<ValidatedInput error="Required" touched={true} />);

    const input = container.querySelector('input');
    expect(input).toHaveClass('border-error/30');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not apply error styling when not touched', () => {
    const { container } = render(<ValidatedInput error="Required" touched={false} />);

    const input = container.querySelector('input');
    expect(input).not.toHaveClass('border-error/30');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('ValidatedTextarea Component', () => {
  it('renders with label', () => {
    render(<ValidatedTextarea label="Description" />);

    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<ValidatedTextarea label="Bio" required={true} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error when touched', () => {
    render(<ValidatedTextarea error="Description too long" touched={true} />);

    expect(screen.getByText('Description too long')).toBeInTheDocument();
  });

  it('applies error styling when has error', () => {
    const { container } = render(<ValidatedTextarea error="Required" touched={true} />);

    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-error/30');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('ValidatedSelect Component', () => {
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3', disabled: true },
  ];

  it('renders with label', () => {
    render(<ValidatedSelect label="Country" options={options} />);

    expect(screen.getByText('Country')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<ValidatedSelect options={options} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders placeholder when provided', () => {
    render(<ValidatedSelect options={options} placeholder="Select an option" />);

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('disables options marked as disabled', () => {
    render(<ValidatedSelect options={options} />);

    const option3 = screen.getByText('Option 3');
    expect(option3).toHaveAttribute('disabled');
  });

  it('displays error when touched', () => {
    render(<ValidatedSelect options={options} error="Please select an option" touched={true} />);

    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });
});

describe('FormValidationSummary Component', () => {
  const errors = {
    email: 'Email is required',
    password: 'Password must be at least 8 characters',
    confirmPassword: 'Passwords do not match',
  };

  it('renders all errors', () => {
    render(<FormValidationSummary errors={errors} />);

    expect(screen.getByText(/Email is required/)).toBeInTheDocument();
    expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument();
    expect(screen.getByText(/Passwords do not match/)).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<FormValidationSummary errors={errors} title="Fix these issues:" />);

    expect(screen.getByText('Fix these issues:')).toBeInTheDocument();
  });

  it('uses field labels when provided', () => {
    const fieldLabels = {
      email: 'Email Address',
    };

    render(<FormValidationSummary errors={errors} fieldLabels={fieldLabels} />);

    expect(screen.getByText(/Email Address:/)).toBeInTheDocument();
    // confirmPassword doesn't have label, uses field name
    expect(screen.getByText(/confirmPassword:/)).toBeInTheDocument();
  });

  it('calls onFieldFocus when error clicked', () => {
    const onFieldFocus = jest.fn();
    render(<FormValidationSummary errors={errors} onFieldFocus={onFieldFocus} />);

    const emailError = screen.getByText(/Email is required/);
    fireEvent.click(emailError);

    expect(onFieldFocus).toHaveBeenCalledWith('email');
  });

  it('does not render when no errors', () => {
    const { container } = render(<FormValidationSummary errors={{}} />);

    expect(container.querySelector('.bg-error\\/10')).not.toBeInTheDocument();
  });

  it('handles array errors', () => {
    const errorsWithArray = {
      tags: ['Tag 1 is invalid', 'Tag 2 is too long'],
    };

    render(<FormValidationSummary errors={errorsWithArray} />);

    expect(screen.getByText(/Tag 1 is invalid/)).toBeInTheDocument();
    expect(screen.getByText(/Tag 2 is too long/)).toBeInTheDocument();
  });
});

describe('useFieldValidation Hook', () => {
  it('initializes with provided value', () => {
    let hookResult: any;
    function TestComponent() {
      hookResult = useFieldValidation('initial value');
      return <div>{hookResult.value}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('initial value')).toBeInTheDocument();
  });

  it('updates value on change', () => {
    let hookResult: any;
    function TestComponent() {
      hookResult = useFieldValidation('');
      return <input value={hookResult.value} onChange={hookResult.handleChange} />;
    }

    const { container } = render(<TestComponent />);
    const input = container.querySelector('input')!;

    fireEvent.change(input, { target: { value: 'new value' } });
    expect(hookResult.value).toBe('new value');
  });

  it('sets touched on blur', () => {
    let hookResult: any;
    function TestComponent() {
      hookResult = useFieldValidation('');
      return <input onBlur={hookResult.handleBlur} />;
    }

    const { container } = render(<TestComponent />);
    const input = container.querySelector('input')!;

    expect(hookResult.touched).toBe(false);
    fireEvent.blur(input);
    expect(hookResult.touched).toBe(true);
  });

  it('provides validate and reset functions', () => {
    let hookResult: any;
    function TestComponent() {
      hookResult = useFieldValidation('');
      return null;
    }

    render(<TestComponent />);

    expect(typeof hookResult.validate).toBe('function');
    expect(typeof hookResult.reset).toBe('function');
    expect(typeof hookResult.hasError).toBe('boolean');
    expect(typeof hookResult.isValid).toBe('boolean');
  });
});

/**
 * COVERAGE TARGET: 60%+
 * Total Tests: 33
 * Tests form error display, validated inputs, validation summary, and hook
 */
