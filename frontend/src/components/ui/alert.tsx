import * as React from'react';
import { cva, type VariantProps } from'class-variance-authority';
import { cn } from'@/lib/utils';

const alertVariants = cva('relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default:'bg-background text-foreground',
        destructive:'border-error/50 text-error  [&>svg]:text-error',
        warning:'border-warning/50 text-warning  [&>svg]:text-warning bg-warning/5',
        success:'border-success/50 text-success  [&>svg]:text-success bg-success/5',
        info:'border-info/50 text-info  [&>svg]:text-info bg-info/5',
      },
    },
    defaultVariants: {
      variant:'default',
    },
  }
);

type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  )
);
Alert.displayName ='Alert';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  )
);
AlertDescription.displayName ='AlertDescription';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  )
);
AlertTitle.displayName ='AlertTitle';

export { Alert, AlertDescription, AlertTitle };
