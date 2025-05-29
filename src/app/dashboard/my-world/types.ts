export type ElementCategory = 'CHARACTER' | 'PET' | 'LOCATION' | 'OBJECT';

export interface CharacterAttributes {
  age?: string;
  gender?: string;
  skinColor?: string;
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  ethnicity?: string;
  outfit?: string;
  accessories?: string;
}

export interface PetAttributes {
  age?: string;
  gender?: string;
  breed?: string;
  furColor?: string;
  furStyle?: string;
  markings?: string;
  eyeColor?: string;
  collar?: string;
  outfit?: string;
  accessories?: string;
}

export interface ObjectAttributes {
  material?: string;
  primaryColor?: string;
  secondaryColor?: string;
  details?: string;
  accessories?: string;
}

export interface LocationAttributes {
  locationType?: string;
  setting?: string;
  timeOfDay?: string;
  weather?: string;
  notable?: string;
}

export interface MyWorldElement {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  publicId?: string;
  category: ElementCategory;
  isDefault: boolean;
  isDetectedInStory: boolean;
  isPrimary?: boolean;
  userId?: string;
  tempId?: string;
  createdAt: string;
  updatedAt: string;
  characterAttributes?: CharacterAttributes;
  petAttributes?: PetAttributes;
  objectAttributes?: ObjectAttributes;
  locationAttributes?: LocationAttributes;
}

export const ELEMENT_CATEGORIES = [
  { value: 'CHARACTER' as ElementCategory, label: 'Characters', icon: '👤' },
  { value: 'PET' as ElementCategory, label: 'Pets', icon: '🐾' },
  { value: 'LOCATION' as ElementCategory, label: 'Locations', icon: '📍' },
  { value: 'OBJECT' as ElementCategory, label: 'Objects', icon: '📦' },
] as const;