'use client';

import React, { useState, useEffect } from 'react';
import { MyStoriesManager } from '@/components/dashboard/my-stories-manager';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function MyStoriesPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle auth loading
  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" message="Loading..." />
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">My Stories</h1>
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-gray-600">
              Manage your stories, toggle privacy settings, and share your creations with the world.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MyStoriesManager />
      </div>
    </div>
  );
}