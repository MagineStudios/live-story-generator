'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Upload, User, Dog, MapPin, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ElementCategory } from './types';

interface EmptyStateProps {
  category: ElementCategory;
  onAdd: () => void;
}

const CATEGORY_INFO: Record<ElementCategory, {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
}> = {
  CHARACTER: {
    icon: <User className="w-16 h-16" />,
    title: 'No Characters Yet',
    description: 'Upload photos of people to create characters for your stories',
    actionLabel: 'Add Your First Character',
  },
  PET: {
    icon: <Dog className="w-16 h-16" />,
    title: 'No Pets Yet',
    description: 'Upload photos of pets or animals to include them in your adventures',
    actionLabel: 'Add Your First Pet',
  },
  LOCATION: {
    icon: <MapPin className="w-16 h-16" />,
    title: 'No Locations Yet',
    description: 'Upload photos of places to use as settings in your stories',
    actionLabel: 'Add Your First Location',
  },
  OBJECT: {
    icon: <Package className="w-16 h-16" />,
    title: 'No Objects Yet',
    description: 'Upload photos of special items to feature in your tales',
    actionLabel: 'Add Your First Object',
  },
};

export function EmptyState({ category, onAdd }: EmptyStateProps) {
  const info = CATEGORY_INFO[category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <div className="text-gray-400">
          {info.icon}
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {info.title}
      </h3>
      
      <p className="text-gray-600 text-center max-w-md mb-8">
        {info.description}
      </p>

      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={onAdd}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Upload className="w-5 h-5 mr-2" />
          {info.actionLabel}
        </Button>

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>AI-powered analysis</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span>Automatic attribute detection</span>
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">1</div>
          <div className="text-xs text-gray-600 mt-1">Upload Photo</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">2</div>
          <div className="text-xs text-gray-600 mt-1">AI Analysis</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">3</div>
          <div className="text-xs text-gray-600 mt-1">Edit Details</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">4</div>
          <div className="text-xs text-gray-600 mt-1">Use in Stories</div>
        </div>
      </div>
    </motion.div>
  );
}