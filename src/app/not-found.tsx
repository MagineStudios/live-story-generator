import Link from 'next/link';
import { BookOpen, Home, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
      <div className="text-center px-4">
        <div className="w-32 h-32 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-16 h-16 text-purple-600" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h1>
        
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Oops! It looks like this page wandered off into a magical forest. 
          Let&apos;s help you find your way back!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button variant="outline" size="lg">
              <Home className="w-5 h-5 mr-2" />
              Browse Stories
            </Button>
          </Link>
          
          <Link href="/onboarding">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Story
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}