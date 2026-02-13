import { cn } from '@/lib/utils';

interface LoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function Loader({ className, size = 'md' }: LoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'rounded-full border-muted-foreground/30 border-t-indigo-500 animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
}
