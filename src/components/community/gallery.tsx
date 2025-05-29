'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StoryCard } from './story-card';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Filter, TrendingUp, Clock, Heart, Sparkles, Star, Droplet, Wand2, BookMarked, Camera, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Story {
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
}

const STYLES = [
  { value: 'all', label: 'All Styles', icon: Sparkles, gradient: 'from-gray-500 to-gray-600' },
  { value: 'cartoonish', label: 'Cartoonish', icon: Star, gradient: 'from-pink-500 to-purple-600' },
  { value: 'pixar', label: 'Pixar-Style', icon: Sparkles, gradient: 'from-blue-500 to-cyan-500' },
  { value: 'watercolor', label: 'Watercolor', icon: Droplet, gradient: 'from-teal-400 to-emerald-400' },
  { value: 'storybook', label: 'Storybook', icon: BookMarked, gradient: 'from-amber-500 to-orange-500' },
  { value: 'whimsical', label: 'Whimsical', icon: Wand2, gradient: 'from-purple-500 to-violet-600' },
  { value: 'realistic', label: 'Realistic', icon: Camera, gradient: 'from-green-600 to-emerald-600' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Latest', icon: Clock },
  { value: 'likes', label: 'Most Liked', icon: Heart },
  { value: 'views', label: 'Most Viewed', icon: TrendingUp },
];

export function CommunityGallery() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('createdAt');
  const [styleFilter, setStyleFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);

  const fetchStories = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12',
        sortBy,
        sortOrder: 'desc',
        ...(styleFilter !== 'all' && { style: styleFilter })
      });
      
      const response = await fetch(`/api/stories/public?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data || !data.stories) {
        console.error('Invalid API response:', data);
        throw new Error('Invalid response format');
      }
      
      if (reset) {
        setStories(data.stories || []);
      } else {
        setStories(prev => [...prev, ...(data.stories || [])]);
      }
      
      // Safe access with defaults
      setTotalCount(data.pagination?.totalCount || 0);
      setHasMore(data.pagination ? pageNum < data.pagination.totalPages : false);
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast.error('Failed to load stories');
      // Set defaults on error
      if (reset) {
        setStories([]);
      }
      setTotalCount(0);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sortBy, styleFilter]);

  // Initial load and filter/sort changes
  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchStories(1, true);
  }, [fetchStories]);

  // Load more
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStories(nextPage);
  };
  
  // Handle like toggle
  const handleLikeToggle = (storyId: string, isLiked: boolean) => {
    setStories(prevStories => 
      prevStories.map(story => {
        if (story.id === storyId) {
          return {
            ...story,
            isLikedByUser: isLiked,
            likesCount: isLiked ? story.likesCount + 1 : story.likesCount - 1
          };
        }
        return story;
      })
    );
  };

  // Track views when story is opened
  useEffect(() => {
    const trackView = async (storyId: string) => {
      try {
        await fetch(`/api/stories/${storyId}/view`, { method: 'POST' });
      } catch (error) {
        // Silently fail - view tracking is not critical
      }
    };

    // Listen for story view events
    const handleStoryView = (event: CustomEvent) => {
      trackView(event.detail.storyId);
    };

    window.addEventListener('story-view' as any, handleStoryView as any);
    return () => window.removeEventListener('story-view' as any, handleStoryView as any);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div id="community">
      {/* Filters and Sort */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Style Filter */}
          <Select value={styleFilter} onValueChange={setStyleFilter}>
            <SelectTrigger className="w-[180px]">
              {(() => {
                const selectedStyle = STYLES.find(s => s.value === styleFilter);
                if (!selectedStyle) return <SelectValue placeholder="Filter by style" />;
                const Icon = selectedStyle.icon;
                return (
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r text-white",
                      selectedStyle.gradient
                    )}>
                      <Icon className="w-3 h-3" />
                    </span>
                    <span>{selectedStyle.label}</span>
                  </div>
                );
              })()}
            </SelectTrigger>
            <SelectContent>
              {STYLES.map(style => {
                const Icon = style.icon;
                return (
                  <SelectItem key={style.value} value={style.value}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r text-white",
                        style.gradient
                      )}>
                        <Icon className="w-3 h-3" />
                      </span>
                      {style.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Sort Options */}
          <div className="flex gap-2">
            {SORT_OPTIONS.map(option => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(option.value)}
                  className={cn(
                    "transition-all",
                    sortBy === option.value && "bg-purple-600 hover:bg-purple-700"
                  )}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Story Count */}
        <div className="text-sm text-gray-600">
          {totalCount > 0 && (
            <span>{totalCount} {totalCount === 1 ? 'story' : 'stories'} found</span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading magical stories...</p>
          </div>
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No stories found</h3>
          <p className="text-gray-500">Be the first to create a story with this style!</p>
        </div>
      ) : (
        <>
          {/* Story Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {stories.map((story) => (
                <motion.div
                  key={story.id}
                  variants={itemVariants}
                  layout
                >
                  <StoryCard story={story} onLikeToggle={handleLikeToggle} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-12 text-center">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  'Load More Stories'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}