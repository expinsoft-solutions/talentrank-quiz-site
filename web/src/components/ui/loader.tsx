import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 20,
  md: 32,
  lg: 40,
};

export function Loader({ className, size = 'md' }: LoaderProps) {
  const pixelSize = sizeMap[size];
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('flex items-center justify-center text-violet-600 dark:text-violet-400', className)}
    >
      <Brain
        size={pixelSize}
        strokeWidth={2}
        className="animate-pulse"
        aria-hidden
      />
    </div>
  );
}
