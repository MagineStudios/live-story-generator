'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Eye, 
  Heart, 
  Globe, 
  Lock, 
  Share2, 
  Edit, 
  MoreVertical,
  Calendar,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StoryListItemProps {
  story: {
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
  };
  onPrivacyToggle: (storyId: string, isPublic: boolean) => void;
}

export function StoryListItem({ story, onPrivacyToggle }: StoryListItemProps) {
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

  const handlePrivacyToggle = async () => {
    if (story.status !== 'READY') {
      toast.error('Only completed stories can be made public');
      return;
    }

    setIsUpdatingPrivacy(true);
    try {
      await onPrivacyToggle(story.id, !story.isPublic);
      toast.success(story.isPublic ? 'Story is now private' : 'Story is now public!');
    } catch (error) {
      toast.error('Failed to update privacy settings');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/story/${story.id}`;
    
    if (!story.isPublic) {
      toast.error('Make your story public first to share it');
      return;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: story.title,
          text: `Check out my story: ${story.title}`,
          url: url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const getStatusBadge = () => {
    switch (story.status) {
      case 'READY':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'GENERATING':
        return <Badge className="bg-blue-100 text-blue-800">Generating</Badge>;
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Cover Image */}
        <Link href={`/story/${story.id}`} className="flex-shrink-0">
          <div className="relative w-full sm:w-32 h-48 sm:h-40 rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 group">
            {story.coverImage ? (
              <Image
                src={story.coverImage}
                alt={story.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, 128px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-purple-300" />
              </div>
            )}
          </div>
        </Link>

        {/* Story Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link href={`/story/${story.id}`}>
                <h3 className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors truncate">
                  {story.title}
                </h3>
              </Link>
              
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {story.theme}
              </p>

              <div className="flex items-center gap-4 mt-3">
                {getStatusBadge()}
                <Badge variant="outline">{story.styleName}</Badge>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{story.likesCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{story.viewsCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">{story.pageCount} pages</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Privacy Toggle */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "transition-opacity",
                  story.status !== 'READY' && "opacity-50"
                )}>
                  {story.isPublic ? (
                    <Globe className="w-4 h-4 text-green-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <Switch
                  checked={story.isPublic}
                  onCheckedChange={handlePrivacyToggle}
                  disabled={story.status !== 'READY' || isUpdatingPrivacy}
                  className="data-[state=checked]:bg-green-600"
                />
                {isUpdatingPrivacy && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                )}
              </div>

              {/* More Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/story/${story.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Story
                    </Link>
                  </DropdownMenuItem>
                  {story.status === 'READY' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={`/story/${story.id}/edit`}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Story
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}