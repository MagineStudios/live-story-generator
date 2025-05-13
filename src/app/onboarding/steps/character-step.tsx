'use client';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { ElementCategory, MyWorldElement } from '@prisma/client';
import { Info, Loader2, Pencil } from 'lucide-react';

// UI type for display (with optional fields and selection flag)
type UIElement = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  publicId?: string | null;
  category: ElementCategory;
  isDefault: boolean;
  isDetectedInStory?: boolean;
  userId?: string | null;
  tempId?: string | null;
  isSelected: boolean;
};

function categoryLabel(category: ElementCategory): string {
    switch (category) {
        case ElementCategory.CHARACTER: return 'Character';
        case ElementCategory.PET: return 'Pet';
        case ElementCategory.LOCATION: return 'Location';
        case ElementCategory.OBJECT: return 'Object';
        default: return 'Element';
    }
}

export function CharactersStep() {
    const {
        selectedElements, uploadedElements,
        addElement, removeElement, clearAllElements,
        addUploadedImage, updateElementName, updateElementDescription,
        isAnalyzingImage,
        goToNextStep
    } = useOnboarding();

    // Local UI state
    const [activeCategory, setActiveCategory] = useState<ElementCategory>(ElementCategory.CHARACTER);
    const [defaultElements, setDefaultElements] = useState<Record<ElementCategory, MyWorldElement[]>>({
        [ElementCategory.CHARACTER]: [],
        [ElementCategory.PET]: [],
        [ElementCategory.LOCATION]: [],
        [ElementCategory.OBJECT]: [],
    });
    const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
    const [detailElement, setDetailElement] = useState<MyWorldElement | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);

    const nameInputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

    // Fetch default elements (system-provided examples) on mount
    useEffect(() => {
        async function fetchDefaults() {
            try {
                const res = await fetch('/api/my-world/defaults');
                if (!res.ok) throw new Error('Failed to fetch default elements');
                const { elements } = await res.json();
                // Organize by category
                const byCategory: Record<ElementCategory, MyWorldElement[]> = {
                    [ElementCategory.CHARACTER]: [],
                    [ElementCategory.PET]: [],
                    [ElementCategory.LOCATION]: [],
                    [ElementCategory.OBJECT]: [],
                };
                for (const el of elements) {
                    byCategory[el.category as ElementCategory].push(el);
                }
                setDefaultElements(byCategory);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoadingDefaults(false);
            }
        }
        fetchDefaults();
    }, []);

    // Combine default and uploaded elements for the active category
    const allCategoryElements: UIElement[] = [
      ...defaultElements[activeCategory],
      ...uploadedElements.filter(e => e.category === activeCategory)
    ].map(el => ({
      id: el.id,
      name: el.name,
      description: el.description,
      imageUrl: el.imageUrl,
      publicId: el.publicId,
      category: el.category,
      isDefault: el.isDefault,
      isDetectedInStory: el.isDetectedInStory,
      userId: el.userId,
      tempId: el.tempId,
      isSelected: selectedElements.some(sel => sel.id === el.id),
    }));

    // Toggle selection of an element
    const toggleElement = (item: UIElement) => {
      if (item.isSelected) {
        removeElement(item.id);
      } else {
        // Find the original MyWorldElement from default or uploaded lists
        const original = uploadedElements.find(e => e.id === item.id)
          || defaultElements[item.category].find(e => e.id === item.id);
        if (original) {
          addElement(original as any);
        }
      }
    };

    // Handle file upload selection
    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const newElement = await addUploadedImage(file, activeCategory);
            // If an element was successfully added, it's already in uploadedElements & selectedElements via context
            // (We maintain uploadedElements in context, so no need to update local state here)
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    // Show detail dialog for editing name/description
    const openDetailModal = (el: any) => {
        setDetailElement(el);
        setEditName(el.name);
        setEditDescription(el.description);
        setIsEditingName(false);
        setIsEditingDescription(false);
    };
    const saveEdits = () => {
        if (detailElement) {
            updateElementName(detailElement.id, editName);
            updateElementDescription(detailElement.id, editDescription);
            setDetailElement(null);
        }
    };

    if (isLoadingDefaults) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 px-4 pb-6">
            <h1 className="text-2xl font-bold mb-2">Build Your World</h1>
            <p className="text-gray-600 mb-4">
                Choose characters, pets, places, and objects to bring your story to life.
                You can also upload photos to add new elements.
            </p>

            {/* Category Tabs */}
            <div className="flex space-x-2 mb-4 overflow-x-auto pb-1">
                {Object.values(ElementCategory).map(category => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap 
              ${activeCategory === category ? 'bg-[#212121] text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    >
                        {categoryLabel(category)}s
                    </button>
                ))}
            </div>

            {/* Actions Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="text-base font-medium">Add {categoryLabel(activeCategory)}</div>
                <button onClick={clearAllElements} className="text-sm text-gray-600 hover:text-gray-900">
                    Clear All
                </button>
            </div>

            {/* Elements Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {allCategoryElements.map(item => (
                    <div
                        key={item.id}
                        onClick={() => toggleElement(item)}
                        className={`aspect-square bg-gray-100 rounded-lg cursor-pointer overflow-hidden relative group
              ${item.isSelected ? 'ring-4 ring-blue-500' : 'hover:ring-2 hover:ring-gray-300'}`}
                    >
                        <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover object-center"
                        />
                        {/* Overlay & name */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent 
                ${item.isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-75'} transition-opacity`} />
                        <span className="absolute bottom-2 left-2 text-white text-sm font-medium truncate max-w-[80%]">
              {item.name}
            </span>
                        {/* Edit button (pencil icon) */}
                        {!item.isDefault && (
                            <button
                                onClick={(e) => { e.stopPropagation(); openDetailModal(item); }}
                                className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full shadow opacity-0 group-hover:opacity-100"
                            >
                                <Pencil className="h-4 w-4 text-blue-600" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Upload prompt */}
            <div className="flex items-start space-x-2 mb-4">
                <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                <p className="text-gray-500 text-sm">
                    Missing someone or something? Upload a photo to add your own {categoryLabel(activeCategory).toLowerCase()}.
                </p>
            </div>
            {/* Upload button */}
            <label className={`flex items-center justify-center py-3 bg-white border border-gray-300 rounded-lg cursor-pointer mb-6 
          ${isAnalyzingImage ? 'opacity-70 pointer-events-none' : 'hover:bg-gray-50'}`}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                    disabled={isAnalyzingImage}
                />
                <span className="text-base font-medium flex items-center">
          {isAnalyzingImage ? (
              <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing image...
              </>
          ) : (
              'Upload Photo'
          )}
        </span>
            </label>

            {/* Continue button */}
            <button
                onClick={goToNextStep}
                disabled={isAnalyzingImage}
                className="w-full py-3 bg-[#212121] text-white rounded-lg text-lg font-medium hover:bg-black disabled:opacity-50"
            >
                {isAnalyzingImage ? 'Please wait...' : 'Next'}
            </button>

            {/* (Optional) Detail Modal for editing element name/description */}
            {detailElement && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-4 w-10/12 max-w-sm">
                        <h2 className="text-lg font-medium mb-2">Edit {detailElement.name}</h2>
                        <input
                            ref={nameInputRef}
                            className="w-full border border-gray-300 rounded mb-2 px-3 py-2"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                        />
                        <textarea
                            ref={descriptionInputRef}
                            className="w-full border border-gray-300 rounded mb-2 px-3 py-2"
                            rows={3}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                            <button
                                onClick={() => setDetailElement(null)}
                                className="px-4 py-2 text-sm rounded border"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdits}
                                className="px-4 py-2 text-sm rounded bg-blue-600 text-white"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}