/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-lg active:scale-95 active:shadow-sm',
        destructive:
          'bg-error text-error-foreground hover:bg-error/90 hover:shadow-lg active:scale-95 active:shadow-sm',
        outline:
          'border border-border bg-background hover:bg-background-muted hover:text-foreground hover:shadow-sm active:scale-95',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary-hover hover:shadow-md active:scale-95 active:shadow-sm',
        ghost: 'hover:bg-background-muted hover:text-foreground hover:shadow-sm active:scale-95',
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary/80 active:scale-95',
        gradient:
          'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 hover:shadow-lg active:scale-95 active:shadow-sm before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-10 rounded-full px-3',
        lg: 'h-12 rounded-full px-8',
        icon: 'h-11 w-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const classes = cn(
      buttonVariants({ variant, size, className }),
      loading && 'relative overflow-hidden',
      (loading || disabled) && 'cursor-not-allowed'
    );

    if (_asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      const isUnavailable = disabled || loading;

      return React.cloneElement(children as React.ReactElement<any>, {
        ...props,
        className: cn(child.props.className, classes, isUnavailable && 'pointer-events-none opacity-50'),
        ref,
        tabIndex: isUnavailable ? -1 : child.props.tabIndex,
        'aria-disabled': isUnavailable || undefined,
        children: loading ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
            <span className="relative z-10 opacity-70 pointer-events-none">{child.props.children}</span>
          </>
        ) : child.props.children,
      });
    }

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        {...props as any}
      >
        {loading && (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
            <span className="relative z-10 opacity-70 pointer-events-none">{children}</span>
          </>
        )}
        {!loading && children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
