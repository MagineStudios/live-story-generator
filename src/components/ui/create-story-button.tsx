'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateStoryButtonProps {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}

export function CreateStoryButton({
  variant = 'default',
  size = 'default',
  className,
  children = 'Create New Story',
  showIcon = true,
}: CreateStoryButtonProps) {
  const router = useRouter();
  
  const handleCreateStory = () => {
    // Navigate to onboarding with reset parameter to ensure clean start
    router.push('/onboarding?reset=true&step=1');
  };
  
  return (
    <Button
      onClick={handleCreateStory}
      variant={variant}
      size={size}
      className={cn(
        'transition-all duration-200',
        'hover:scale-105 hover:shadow-lg',
        'active:scale-95',
        'cursor-pointer',
        className
      )}
    >
      {showIcon && <Plus className="mr-2 h-4 w-4" />}
      {children}
    </Button>
  );
}