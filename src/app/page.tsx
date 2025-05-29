// app/page.tsx
import React from 'react';
import { CommunityGallery } from '@/components/community/gallery';
import { HeroSection } from '@/components/community/hero-section';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Community Gallery */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Community Stories
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover magical stories created by our community. Get inspired and share your own!
            </p>
          </div>
          
          <Suspense fallback={
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="md" message="Loading amazing stories..." />
            </div>
          }>
            <CommunityGallery />
          </Suspense>
        </div>
      </section>
    </div>
  );
}