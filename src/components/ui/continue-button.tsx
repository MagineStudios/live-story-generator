import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ContinueButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  children?: React.ReactNode;
}

export function ContinueButton({
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  className,
  children = 'Continue',
}: ContinueButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant={variant}
      className={cn(
        'min-h-[48px] min-w-[120px] text-base font-medium px-6',
        'transition-all duration-200',
        'hover:scale-105 hover:shadow-lg',
        'active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
        'disabled:hover:scale-100 disabled:hover:shadow-none',
        'cursor-pointer disabled:cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  );
}