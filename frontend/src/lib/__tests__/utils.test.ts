import { cn } from '../utils';

describe('cn utility', () => {
  describe('basic functionality', () => {
    it('merges class names correctly', () => {
      expect(cn('base', 'extra')).toBe('base extra');
    });

    it('handles single class name', () => {
      expect(cn('single')).toBe('single');
    });

    it('handles empty input', () => {
      expect(cn()).toBe('');
    });

    it('merges multiple class names', () => {
      expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3');
    });
  });

  describe('conditional classes', () => {
    it('handles false conditions', () => {
      expect(cn('base', false && 'hidden', 'show')).toBe('base show');
    });

    it('handles true conditions', () => {
      expect(cn('base', true && 'visible', 'show')).toBe('base visible show');
    });

    it('handles multiple conditional classes', () => {
      const isActive = true;
      const isHidden = false;
      expect(cn('base', isActive && 'active', isHidden && 'hidden')).toBe('base active');
    });

    it('handles ternary expressions', () => {
      const isActive = true;
      expect(cn('base', isActive ? 'active' : 'inactive')).toBe('base active');
    });
  });

  describe('null and undefined handling', () => {
    it('handles null values', () => {
      expect(cn('base', null, 'extra')).toBe('base extra');
    });

    it('handles undefined values', () => {
      expect(cn('base', undefined, 'extra')).toBe('base extra');
    });

    it('handles mixed null, undefined, and valid classes', () => {
      expect(cn('base', null, undefined, 'extra', false, 'final')).toBe('base extra final');
    });
  });

  describe('Tailwind merge functionality', () => {
    it('merges conflicting Tailwind classes correctly', () => {
      // twMerge should keep the last conflicting class
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('merges multiple conflicting Tailwind classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('keeps non-conflicting Tailwind classes', () => {
      const result = cn('px-4', 'py-2', 'text-red-500');
      expect(result).toContain('px-4');
      expect(result).toContain('py-2');
      expect(result).toContain('text-red-500');
    });

    it('handles complex Tailwind merge scenarios', () => {
      expect(cn('p-4', 'px-2')).toBe('p-4 px-2');
    });
  });

  describe('array and object inputs', () => {
    it('handles array of classes', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    it('handles object with conditional classes', () => {
      expect(cn({ active: true, disabled: false, error: true })).toBe('active error');
    });

    it('handles mixed arrays and strings', () => {
      expect(cn('base', ['extra', 'more'], 'final')).toBe('base extra more final');
    });

    it('handles nested arrays', () => {
      expect(cn('base', ['level1', ['level2', 'level2b']], 'final')).toBe('base level1 level2 level2b final');
    });
  });

  describe('edge cases', () => {
    it('handles empty strings', () => {
      expect(cn('', 'valid', '')).toBe('valid');
    });

    it('handles whitespace strings', () => {
      expect(cn('  ', 'valid', '   ')).toBe('valid');
    });

    it('preserves duplicate non-Tailwind classes', () => {
      // cn() doesn't deduplicate arbitrary classes, only Tailwind conflicts
      expect(cn('duplicate', 'duplicate', 'unique')).toBe('duplicate duplicate unique');
    });

    it('handles very long class name lists', () => {
      const classes = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      const result = cn(...classes);
      expect(result).toContain('class-0');
      expect(result).toContain('class-99');
    });
  });

  describe('real-world usage patterns', () => {
    it('handles button variant pattern', () => {
      const variant = 'primary' as 'primary' | 'secondary';
      const size = 'lg' as 'sm' | 'lg';
      const result = cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg'
      );
      expect(result).toBe('btn btn-primary btn-lg');
    });

    it('handles dynamic state classes', () => {
      const isLoading = false;
      const hasError = true;
      const isDisabled = false;

      const result = cn(
        'input',
        isLoading && 'cursor-wait opacity-50',
        hasError && 'border-red-500 text-red-900',
        isDisabled && 'opacity-50 cursor-not-allowed'
      );

      expect(result).toContain('input');
      expect(result).toContain('border-red-500');
      expect(result).toContain('text-red-900');
      expect(result).not.toContain('cursor-wait');
      expect(result).not.toContain('cursor-not-allowed');
    });

    it('handles responsive and state modifiers', () => {
      const result = cn(
        'text-base',
        'md:text-lg',
        'hover:text-blue-500',
        'focus:outline-none'
      );

      expect(result).toContain('text-base');
      expect(result).toContain('md:text-lg');
      expect(result).toContain('hover:text-blue-500');
      expect(result).toContain('focus:outline-none');
    });
  });
});
