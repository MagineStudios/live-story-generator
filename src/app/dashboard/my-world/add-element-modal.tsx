'use client';

import React, { useState, useRef } from 'react';
import { Upload, Camera, X, Loader2, Plus, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ElementCategory } from './types';

interface AddElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onElementAdded: (element: any) => void;
  category: ElementCategory;
}

const CATEGORY_LABELS: Record<ElementCategory, string> = {
  CHARACTER: 'Character',
  PET: 'Pet',
  LOCATION: 'Location',
  OBJECT: 'Object',
};

const CATEGORY_DESCRIPTIONS: Record<ElementCategory, string> = {
  CHARACTER: 'Upload a photo of a person to create a character',
  PET: 'Upload a photo of your pet or favorite animal',
  LOCATION: 'Upload a photo of a place or setting',
  OBJECT: 'Upload a photo of an object or item',
};

export function AddElementModal({ isOpen, onClose, onElementAdded, category }: AddElementModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(20);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);

      // Upload the file
      setUploadProgress(40);
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      setUploadProgress(60);
      const uploadData = await response.json();
      
      // Analyze the image
      setIsAnalyzing(true);
      setUploadProgress(80);
      
      const analysisResponse = await fetch('/api/images/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadData.url,
          category: category,
          elementId: uploadData.elementId,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze image');
      }

      setUploadProgress(100);
      const analysisData = await analysisResponse.json();

      // Fetch the complete element with attributes
      const elementResponse = await fetch(`/api/my-world/elements/${uploadData.elementId}`);
      if (!elementResponse.ok) {
        throw new Error('Failed to fetch element details');
      }
      
      const { element: newElement } = await elementResponse.json();

      onElementAdded(newElement);
      toast.success(`${CATEGORY_LABELS[category]} added successfully!`);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add New {CATEGORY_LABELS[category]}
            <Badge variant="outline">{category}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            {CATEGORY_DESCRIPTIONS[category]}
          </p>

          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                "hover:border-purple-400 hover:bg-purple-50/50",
                "border-gray-300 bg-gray-50/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                Click to upload image
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
                {!isUploading && (
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {(isUploading || isAnalyzing) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {isAnalyzing ? 'Analyzing image...' : 'Uploading...'}
                    </span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-purple-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  {isAnalyzing && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI is detecting attributes and details...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isAnalyzing ? 'Analyzing...' : 'Uploading...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add {CATEGORY_LABELS[category]}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}