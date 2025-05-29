'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StoryListItem } from './story-list-item';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from 'next/link';

interface Story {
  id: string;
  title: string;
  theme: string;
  visualStyle: string;
  styleName: string;
  status: string;
  isPublic: boolean;
  coverImage: string | null;
  likesCount: number;
  viewsCount: number;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export function MyStoriesManager() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchStories = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
      });
      
      const response = await fetch(`/api/stories/my-stories?${params}`);
      const data = await response.json();
      
      if (reset) {
        setStories(data.stories);
      } else {
        setStories(prev => [...prev, ...data.stories]);
      }
      
      setHasMore(pageNum < data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStories(1, true);
  }, [fetchStories]);

  // Filter stories based on search and status
  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.theme.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'public' && story.isPublic) ||
                         (statusFilter === 'private' && !story.isPublic) ||
                         (statusFilter === story.status);
    return matchesSearch && matchesStatus;
  });

  // Load more
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStories(nextPage);
  };

  // Handle privacy toggle
  const handlePrivacyToggle = async (storyId: string, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/stories/${storyId}/privacy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic }),
      });

      if (!response.ok) {
        throw new Error('Failed to update privacy');
      }

      // Update local state
      setStories(prev =>
        prev.map(story =>
          story.id === storyId ? { ...story, isPublic } : story
        )
      );
    } catch (error) {
      console.error('Error updating privacy:', error);
    }
  };

  return (
    <div>
      {/* Controls */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stories</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="READY">Completed</SelectItem>
            <SelectItem value="GENERATING">Generating</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Link href="/onboarding">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Create New Story
          </Button>
        </Link>
      </div>

      {/* Stories List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your stories...</p>
          </div>
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No stories found' : 'No stories yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Create your first magical story today!'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Link href="/onboarding">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Story
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <AnimatePresence>
              {filteredStories.map((story) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <StoryListItem
                    story={story}
                    onPrivacyToggle={handlePrivacyToggle}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Load More */}
          {hasMore && filteredStories.length === stories.length && (
            <div className="mt-8 text-center">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}