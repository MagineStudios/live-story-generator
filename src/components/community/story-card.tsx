'use client';

import React, { useState, useOptimistic, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Eye, BookOpen, Share2, Clock, Sparkles, Droplet, Wand2, BookMarked, Star, Camera, Zap, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/format-date';
import { toast } from 'sonner';
import { useAuth, useClerk } from '@clerk/nextjs';

interface StoryCardProps {
  story: {
    id: string;
    title: string;
    theme: string;
    visualStyle: string;
    styleName: string;
    coverImage: string | null;
    excerpt: string;
    likesCount: number;
    viewsCount: number;
    pageCount: number;
    isLikedByUser: boolean;
    authorId: string | null;
    createdAt: string;
  };
  onLikeToggle?: (storyId: string, liked: boolean) => void;
}

// Style badge color mappings with vibrant gradients
const getStyleBadgeClasses = (style: string): string => {
  const styleMap: Record<string, string> = {
    // Bright pink to purple for fun cartoonish style
    'cartoonish': 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-pink-400/50',
    // Ocean blue gradient for Pixar's polished look
    'pixar': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-400/50',
    'pixar-style': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-400/50',
    // Soft teal to aqua for watercolor's gentle feel
    'watercolor': 'bg-gradient-to-r from-teal-400 to-emerald-400 text-white shadow-teal-400/50',
    // Warm amber to orange for classic storybook charm
    'storybook': 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-400/50',
    // Purple to violet for magical whimsical style
    'whimsical': 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-purple-400/50',
    // Deep green to emerald for realistic style
    'realistic': 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-400/50',
    // Sleek gray gradient for minimalist
    'minimalist': 'bg-gradient-to-r from-gray-600 to-slate-700 text-white shadow-gray-400/50',
    // Red to pink for anime style
    'anime': 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-400/50',
    // Yellow to red for comic book style
    'comic': 'bg-gradient-to-r from-yellow-400 to-red-500 text-white shadow-yellow-400/50',
  };
  
  return styleMap[style.toLowerCase()] || 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-400/50';
};

// Get icon for each style
const getStyleIcon = (style: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'cartoonish': Star,
    'pixar': Sparkles,
    'pixar-style': Sparkles,
    'watercolor': Droplet,
    'storybook': BookMarked,
    'whimsical': Wand2,
    'realistic': Camera,
    'minimalist': Palette,
    'anime': Zap,
    'comic': Zap,
  };
  
  return iconMap[style.toLowerCase()] || Sparkles;
};

export function StoryCard({ story, onLikeToggle }: StoryCardProps) {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [isPending, startTransition] = useTransition();
  
  // Use optimistic updates for immediate UI feedback
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    { count: story.likesCount, isLiked: story.isLikedByUser },
    (state, liked: boolean) => ({
      count: liked ? state.count + 1 : state.count - 1,
      isLiked: liked
    })
  );

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    
    if (!isSignedIn) {
      openSignIn({
        afterSignInUrl: window.location.href,
        afterSignUpUrl: window.location.href,
      });
      return;
    }
    
    if (isPending) return;
    
    const newLikedState = !optimisticLikes.isLiked;
    
    // Wrap optimistic update in startTransition
    startTransition(async () => {
      // Optimistic update
      setOptimisticLikes(newLikedState);
      
      try {
        const response = await fetch(`/api/stories/${story.id}/like`, {
          method: newLikedState ? 'POST' : 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Like API error:', errorData);
          
          // If it's "already liked", that means our state is out of sync but the action succeeded
          if (errorData.error === 'Already liked this story' && newLikedState) {
            // Update parent component state
            onLikeToggle?.(story.id, true);
            return; // Don't throw error or revert
          }
          if (errorData.error === 'Story not liked' && !newLikedState) {
            // Update parent component state
            onLikeToggle?.(story.id, false);
            return; // Don't throw error or revert
          }
          
          throw new Error(errorData.error || 'Failed to update like');
        }
        
        const data = await response.json();
        onLikeToggle?.(story.id, data.liked);
      } catch (error) {
        // Revert optimistic update on error
        setOptimisticLikes(!newLikedState);
        console.error('Like error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update like');
      }
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    const url = `${window.location.origin}/story/${story.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: story.title,
          text: story.excerpt,
          url: url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Link href={`/story/${story.id}`}>
        <article className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Cover Image */}
          <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
            {story.coverImage ? (
              <Image
                src={story.coverImage}
                alt={story.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-purple-300" />
              </div>
            )}
            
            {/* Style Badge with enhanced visibility */}
            <div className="absolute top-3 left-3">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold",
                "shadow-lg backdrop-blur-sm border border-white/20",
                "transition-all duration-200 hover:scale-110 hover:shadow-xl",
                "animate-in fade-in-50 zoom-in-95 duration-300",
                getStyleBadgeClasses(story.visualStyle)
              )}>
                {(() => {
                  const Icon = getStyleIcon(story.visualStyle);
                  return <Icon className="w-3.5 h-3.5 drop-shadow-sm" />;
                })()}
                <span className="drop-shadow-sm">{story.styleName}</span>
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleShare}
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors cursor-pointer"
                aria-label="Share story"
              >
                <Share2 className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 group-hover:text-purple-600 transition-colors">
              {story.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
              {story.excerpt}
            </p>
            
            {/* Stats */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                {/* Like Button */}
                <button
                  onClick={handleLike}
                  disabled={isPending}
                  className={cn(
                    "flex items-center gap-1 transition-all cursor-pointer",
                    isSignedIn 
                      ? optimisticLikes.isLiked 
                        ? "text-red-500" 
                        : "text-gray-500 hover:text-red-500"
                      : "text-gray-400 hover:text-gray-600"
                  )}
                  aria-label={
                    !isSignedIn 
                      ? "Sign in to like" 
                      : optimisticLikes.isLiked 
                        ? "Unlike story" 
                        : "Like story"
                  }
                  title={!isSignedIn ? "Sign in to like stories" : undefined}
                >
                  <Heart 
                    className={cn(
                      "w-4 h-4 transition-all",
                      isSignedIn && optimisticLikes.isLiked && "fill-current",
                      isPending && "animate-pulse"
                    )} 
                  />
                  <span className="text-sm font-medium">{optimisticLikes.count}</span>
                </button>
                
                {/* Views */}
                <div className="flex items-center gap-1 text-gray-500">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{story.viewsCount}</span>
                </div>
                
                {/* Pages */}
                <div className="flex items-center gap-1 text-gray-500">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">{story.pageCount}</span>
                </div>
              </div>
              
              {/* Time */}
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(story.createdAt)}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}