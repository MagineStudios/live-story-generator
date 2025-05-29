'use client';

import React, { useState, useOptimistic } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Eye, BookOpen, Share2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

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

export function StoryCard({ story, onLikeToggle }: StoryCardProps) {
  const { isSignedIn } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  
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
      toast.error('Please sign in to like stories');
      return;
    }
    
    if (isLiking) return;
    
    setIsLiking(true);
    const newLikedState = !optimisticLikes.isLiked;
    
    // Optimistic update
    setOptimisticLikes(newLikedState);
    
    try {
      const response = await fetch(`/api/stories/${story.id}/like`, {
        method: newLikedState ? 'POST' : 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update like');
      }
      
      const data = await response.json();
      onLikeToggle?.(story.id, data.liked);
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticLikes(!newLikedState);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
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
            
            {/* Style Badge */}
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-purple-700 shadow-sm">
                {story.styleName}
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleShare}
                className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
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
                  disabled={isLiking}
                  className={cn(
                    "flex items-center gap-1 transition-all",
                    optimisticLikes.isLiked 
                      ? "text-red-500" 
                      : "text-gray-500 hover:text-red-500"
                  )}
                  aria-label={optimisticLikes.isLiked ? "Unlike story" : "Like story"}
                >
                  <Heart 
                    className={cn(
                      "w-4 h-4 transition-all",
                      optimisticLikes.isLiked && "fill-current",
                      isLiking && "animate-pulse"
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
                <span>{formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}