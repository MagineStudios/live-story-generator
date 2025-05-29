'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Star, User, Dog, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MyWorldElement, ElementCategory } from './types';

interface ElementCardProps {
  element: MyWorldElement;
  onEdit: (element: MyWorldElement) => void;
  onDelete: (elementId: string) => void;
}

const CATEGORY_ICONS: Record<ElementCategory, React.ReactNode> = {
  CHARACTER: <User className="w-4 h-4" />,
  PET: <Dog className="w-4 h-4" />,
  LOCATION: <MapPin className="w-4 h-4" />,
  OBJECT: <Package className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<ElementCategory, string> = {
  CHARACTER: 'border-purple-200 bg-purple-50',
  PET: 'border-amber-200 bg-amber-50',
  LOCATION: 'border-green-200 bg-green-50',
  OBJECT: 'border-blue-200 bg-blue-50',
};

export function ElementCard({ element, onEdit, onDelete }: ElementCardProps) {
  // Get attributes based on category
  const getAttributes = () => {
    const attributeKey = `${element.category.toLowerCase()}Attributes` as keyof MyWorldElement;
    const attributes = element[attributeKey] as Record<string, any> | undefined;
    
    if (!attributes) return [];
    
    return Object.entries(attributes)
      .filter(([_, value]) => value && value !== '')
      .slice(0, 3)
      .map(([key, value]) => ({
        key: key.replace(/([A-Z])/g, ' $1').trim(),
        value: String(value),
      }));
  };

  const attributes = getAttributes();

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        "group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border-2",
        CATEGORY_COLORS[element.category]
      )}>
        {/* Image Section */}
        <div className="relative aspect-[4/3] bg-gray-100">
          {element.imageUrl ? (
            <Image
              src={element.imageUrl}
              alt={element.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              {CATEGORY_ICONS[element.category]}
            </div>
          )}
          
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
              {CATEGORY_ICONS[element.category]}
              <span className="ml-1 capitalize">{element.category.toLowerCase()}</span>
            </Badge>
          </div>

          {/* Primary Badge */}
          {element.isPrimary && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-yellow-500 text-white">
                <Star className="w-3 h-3 mr-1" />
                Primary
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white"
              onClick={() => onEdit(element)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white"
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${element.name}"?`)) {
                  onDelete(element.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1">{element.name}</h3>
          
          {element.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {element.description}
            </p>
          )}

          {/* Attributes */}
          {attributes.length > 0 && (
            <div className="space-y-1">
              {attributes.map((attr, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-500 capitalize">{attr.key}:</span>
                  <span className="font-medium text-gray-700">{attr.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions for mobile */}
          <div className="flex gap-2 mt-4 sm:hidden">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onEdit(element)}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-700"
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${element.name}"?`)) {
                  onDelete(element.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}