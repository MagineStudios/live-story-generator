'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPicker } from '@/components/character/color-picker';
import type { ElementCategory, CharacterAttributes, PetAttributes, ObjectAttributes, LocationAttributes } from './types';

interface AttributesFormProps {
  category: ElementCategory;
  attributes: Record<string, any>;
  onChange: (attributes: Record<string, any>) => void;
}

const CHARACTER_FIELDS = [
  { key: 'age', label: 'Age', type: 'text', placeholder: 'e.g., 5, Adult, Young' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Non-binary', 'Other'] },
  { key: 'skinColor', label: 'Skin Color', type: 'color' },
  { key: 'hairColor', label: 'Hair Color', type: 'color' },
  { key: 'hairStyle', label: 'Hair Style', type: 'text', placeholder: 'e.g., Curly, Straight, Braided' },
  { key: 'eyeColor', label: 'Eye Color', type: 'color' },
  { key: 'ethnicity', label: 'Ethnicity', type: 'text', placeholder: 'e.g., Asian, Hispanic, African' },
  { key: 'outfit', label: 'Outfit', type: 'text', placeholder: 'Describe clothing' },
  { key: 'accessories', label: 'Accessories', type: 'text', placeholder: 'e.g., Glasses, Hat' },
];

const PET_FIELDS = [
  { key: 'age', label: 'Age', type: 'text', placeholder: 'e.g., Puppy, Adult, Senior' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
  { key: 'breed', label: 'Breed', type: 'text', placeholder: 'e.g., Labrador, Persian' },
  { key: 'furColor', label: 'Fur Color', type: 'color' },
  { key: 'furStyle', label: 'Fur Style', type: 'text', placeholder: 'e.g., Short, Long, Curly' },
  { key: 'markings', label: 'Markings', type: 'text', placeholder: 'e.g., Spots, Stripes' },
  { key: 'eyeColor', label: 'Eye Color', type: 'color' },
  { key: 'collar', label: 'Collar', type: 'text', placeholder: 'Describe collar' },
  { key: 'accessories', label: 'Accessories', type: 'text', placeholder: 'e.g., Bandana, Tag' },
];

const OBJECT_FIELDS = [
  { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g., Wood, Metal, Plastic' },
  { key: 'primaryColor', label: 'Primary Color', type: 'color' },
  { key: 'secondaryColor', label: 'Secondary Color', type: 'color' },
  { key: 'details', label: 'Details', type: 'text', placeholder: 'Special features or markings' },
  { key: 'accessories', label: 'Accessories', type: 'text', placeholder: 'Additional items' },
];

const LOCATION_FIELDS = [
  { key: 'locationType', label: 'Type', type: 'text', placeholder: 'e.g., Park, Beach, Forest' },
  { key: 'setting', label: 'Setting', type: 'text', placeholder: 'e.g., Urban, Rural, Fantasy' },
  { key: 'timeOfDay', label: 'Time of Day', type: 'select', options: ['Morning', 'Afternoon', 'Evening', 'Night'] },
  { key: 'weather', label: 'Weather', type: 'select', options: ['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Foggy'] },
  { key: 'notable', label: 'Notable Features', type: 'text', placeholder: 'Landmarks or special features' },
];

const FIELD_SETS: Record<ElementCategory, typeof CHARACTER_FIELDS> = {
  CHARACTER: CHARACTER_FIELDS,
  PET: PET_FIELDS,
  OBJECT: OBJECT_FIELDS,
  LOCATION: LOCATION_FIELDS,
};

export function AttributesForm({ category, attributes, onChange }: AttributesFormProps) {
  const fields = FIELD_SETS[category];

  const handleChange = (key: string, value: string) => {
    onChange({ ...attributes, [key]: value });
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <Label htmlFor={field.key}>{field.label}</Label>
          
          {field.type === 'text' && (
            <Input
              id={field.key}
              value={attributes[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="mt-1"
            />
          )}
          
          {field.type === 'select' && field.options && (
            <Select
              value={attributes[field.key] || ''}
              onValueChange={(value) => handleChange(field.key, value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {field.type === 'color' && (
            <div className="mt-1">
              <ColorPicker
                initialColor={attributes[field.key] || '#000000'}
                onChange={(color) => handleChange(field.key, color)}
                label={field.label}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}