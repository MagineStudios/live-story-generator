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
        'min-h-[52px] min-w-[140px] text-base font-semibold px-8',
        'rounded-full', // More rounded
        'bg-[#4CAF50] hover:bg-[#43a047] text-white', // Green by default
        'transition-all duration-200',
        'hover:scale-105 hover:shadow-lg',
        'active:scale-95 active:bg-[#3d943f]',
        'focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/30',
        'disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:scale-100 disabled:hover:shadow-none',
        'cursor-pointer disabled:cursor-not-allowed',
        'shadow-md', // Add default shadow
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