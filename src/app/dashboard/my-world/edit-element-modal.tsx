'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import Image from 'next/image';
import { AttributesForm } from './attributes-form';
import type { MyWorldElement, ElementCategory } from './types';

interface EditElementModalProps {
  element: MyWorldElement | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (element: MyWorldElement) => void;
}

export function EditElementModal({ element, isOpen, onClose, onSave }: EditElementModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrimary: false,
  });
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  useEffect(() => {
    if (element) {
      setFormData({
        name: element.name,
        description: element.description || '',
        isPrimary: element.isPrimary || false,
      });
      
      // Load existing attributes based on category
      const attributeKey = `${element.category.toLowerCase()}Attributes` as keyof MyWorldElement;
      const elementAttributes = element[attributeKey] as Record<string, any> | undefined;
      if (elementAttributes) {
        // Remove system fields like id, elementId, createdAt, updatedAt
        const { id, elementId, createdAt, updatedAt, ...cleanAttributes } = elementAttributes;
        setAttributes(cleanAttributes);
      } else {
        setAttributes({});
      }
    }
  }, [element]);

  const handleSave = async () => {
    if (!element) return;
    
    setIsSaving(true);
    try {
      // Update element details
      const response = await fetch(`/api/my-world/elements/${element.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          isPrimary: formData.isPrimary,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to update element:', errorData);
        throw new Error(errorData.error || 'Failed to update element');
      }

      // Update attributes
      const attributesResponse = await fetch(`/api/my-world/elements/${element.id}/attributes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attributes),
      });

      if (!attributesResponse.ok) {
        const errorData = await attributesResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to update attributes:', errorData);
        throw new Error(errorData.error || 'Failed to update attributes');
      }

      const { element: updatedElement } = await response.json();
      
      // Merge with attributes for the callback
      const attributeKey = `${element.category.toLowerCase()}Attributes` as keyof MyWorldElement;
      onSave({
        ...updatedElement,
        [attributeKey]: attributes,
      });
      
      toast.success('Element updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving element:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!element) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit {element.name}
            <Badge>{element.category}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Element Image */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
              {element.imageUrl ? (
                <Image
                  src={element.imageUrl}
                  alt={element.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
                className="mt-1"
              />
            </div>

            {element.category === 'CHARACTER' && (
              <div className="flex items-center justify-between">
                <Label htmlFor="primary">Primary Character</Label>
                <Switch
                  id="primary"
                  checked={formData.isPrimary}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
                />
              </div>
            )}
          </div>

          {/* Attributes Editor */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Attributes</h3>
            <AttributesForm
              category={element.category}
              attributes={attributes}
              onChange={setAttributes}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}