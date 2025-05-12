'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Info, Loader2, X, AlertTriangle } from 'lucide-react';
import { ElementCategory } from '@prisma/client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Type for default elements returned by the API
type DefaultElement = {
    id: string;
    name: string;
    imageUrl: string;
    category: ElementCategory;
};

export default function StorySet() {
    const {
        selectedElements,
        addElement,
        removeElement,
        addUploadedImage,
        clearAllElements,
        goToNextStep,
        isAnalyzingImage,
        acknowledgeRecognizedCharacter,
        recognizedCharacter,
    } = useStoryBuilder();

    const [activeCategory, setActiveCategory] = useState<ElementCategory>(ElementCategory.CHARACTER);
    const [defaultElements, setDefaultElements] = useState<Record<ElementCategory, DefaultElement[]>>({
        [ElementCategory.CHARACTER]: [],
        [ElementCategory.PET]: [],
        [ElementCategory.LOCATION]: [],
        [ElementCategory.OBJECT]: [],
    });

    const [isLoading, setIsLoading] = useState(true);
    const [elementToDelete, setElementToDelete] = useState<string | null>(null);
    const [hoveredElement, setHoveredElement] = useState<string | null>(null);

    // Fetch default elements on component mount
    useEffect(() => {
        async function fetchDefaultElements() {
            try {
                const response = await fetch('/api/my-world/defaults');
                if (response.ok) {
                    const json = (await response.json()) as { elements: DefaultElement[] };

                    // Organize elements by category
                    const elementsByCategory: Record<ElementCategory, DefaultElement[]> = {
                        [ElementCategory.CHARACTER]: [],
                        [ElementCategory.PET]: [],
                        [ElementCategory.LOCATION]: [],
                        [ElementCategory.OBJECT]: [],
                    };

                    json.elements.forEach((el) => {
                        elementsByCategory[el.category].push(el);
                    });

                    setDefaultElements(elementsByCategory);
                }
            } catch (error) {
                console.error('Failed to fetch default elements:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchDefaultElements();
    }, []);

    const getCategoryLabel = (category: ElementCategory) => {
        switch (category) {
            case ElementCategory.CHARACTER: return 'Characters';
            case ElementCategory.PET: return 'Pets';
            case ElementCategory.LOCATION: return 'Locations';
            case ElementCategory.OBJECT: return 'Objects';
            default: return 'Objects';
        }
    };

    const getCategoryItems = () => {
        return defaultElements[activeCategory] || [];
    };

    const toggle = (el: any) => {
        const isSelected = selectedElements.find(e => e.id === el.id);
        if (isSelected) {
            setElementToDelete(el.id);
        } else {
            addElement({...el, isSelected: true});
        }
    };

    const handleDelete = (id: string) => {
        setElementToDelete(id);
    };

    const confirmDelete = () => {
        if (elementToDelete) {
            removeElement(elementToDelete);
            setElementToDelete(null);
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await addUploadedImage(file, activeCategory);
        } catch (error) {
            console.error("Upload and analysis failed:", error);
        }
    };

    const handleAddRecognizedCharacter = () => {
        if (recognizedCharacter) {
            fetch(`/api/my-world/elements/${recognizedCharacter.id}`)
                .then(res => res.json())
                .then(({ element }) => {
                    if (element) {
                        addElement({...element, isSelected: true});
                    }
                    acknowledgeRecognizedCharacter();
                })
                .catch(err => {
                    console.error('Error fetching recognized character:', err);
                    acknowledgeRecognizedCharacter();
                });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 px-4 pb-6">
            <h1 className="text-3xl font-bold mb-2">Build your Story Set</h1>
            <p className="text-gray-600 mb-6">
                Choose characters, pets, locations, and objects to bring your story to life.
                You can also upload photos to add new elements.
            </p>

            {/* Category Tabs - Pill style buttons */}
            <div className="flex space-x-2 mb-6 overflow-x-auto pb-1">
                {Object.values(ElementCategory).map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                            "px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                            activeCategory === category
                                ? "bg-[#212121] text-white shadow-md"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        )}
                    >
                        {getCategoryLabel(category)}
                    </button>
                ))}
            </div>

            {/* Action Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-medium">Add {getCategoryLabel(activeCategory)}</div>
                <button
                    onClick={clearAllElements}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                    Clear All
                </button>
            </div>

            {/* Grid of Items */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {getCategoryItems().map(item => {
                    const isSelected = selectedElements.some(el => el.id === item.id);
                    return (
                        <div
                            key={item.id}
                            onClick={() => toggle(item)}
                            onMouseEnter={() => isSelected && setHoveredElement(item.id)}
                            onMouseLeave={() => setHoveredElement(null)}
                            className={cn(
                                "aspect-square bg-gray-100 rounded-lg cursor-pointer overflow-hidden relative group",
                                isSelected ? "ring-2 ring-blue-500 shadow-md" : "hover:ring-2 hover:ring-gray-300"
                            )}
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    sizes="(max-width: 768px) 33vw, 20vw"
                                    className="object-cover object-center"
                                />
                                <div className={cn(
                                    "absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity",
                                    isSelected ? "opacity-100" : "group-hover:opacity-70"
                                )}></div>
                                <span className="absolute bottom-2 left-2 text-white font-medium text-sm truncate max-w-[80%]">
                                    {item.name}
                                </span>
                            </div>

                            {isSelected && (
                                <div
                                    className="absolute top-2 right-2 p-1 bg-white/80 rounded-full shadow-md opacity-0 group-hover:opacity-100 hover:bg-white transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(item.id);
                                    }}
                                >
                                    <X className="h-4 w-4 text-gray-700" />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Also show selected user-uploaded elements for this category */}
                {selectedElements
                    .filter(el => el.category === activeCategory && !el.isDefault)
                    .map(item => (
                        <div
                            key={item.id}
                            onMouseEnter={() => setHoveredElement(item.id)}
                            onMouseLeave={() => setHoveredElement(null)}
                            className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden group ring-2 ring-blue-500 shadow-md"
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    sizes="(max-width: 768px) 33vw, 20vw"
                                    className="object-cover object-center"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <span className="absolute bottom-2 left-2 text-white font-medium text-sm truncate max-w-[80%]">
                                    {item.name}
                                </span>
                            </div>

                            <div
                                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full shadow-md opacity-0 group-hover:opacity-100 hover:bg-white transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(item.id);
                                }}
                            >
                                <X className="h-4 w-4 text-gray-700" />
                            </div>
                        </div>
                    ))}
            </div>

            {/* Upload Prompt */}
            <div className="flex items-start space-x-3 mb-5">
                <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                <p className="text-gray-500 text-sm">
                    Missing someone or something? Upload a photo...
                </p>
            </div>

            {/* Upload Button */}
            <label className={cn(
                "flex items-center justify-center py-4 bg-white border border-gray-300 rounded-lg cursor-pointer mb-8 hover:bg-gray-50 transition-colors",
                isAnalyzingImage && "opacity-50 cursor-wait"
            )}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                    disabled={isAnalyzingImage}
                />
                <span className="text-lg font-medium">
                    {isAnalyzingImage ? 'Analyzing Image...' : 'Upload New Photos'}
                </span>
            </label>

            {/* Continue Button - Black button with white text */}
            <Button
                onClick={goToNextStep}
                disabled={isAnalyzingImage}
                className="w-full py-5 bg-[#212121] text-white rounded-lg text-lg font-medium hover:bg-black/90 transition-colors"
            >
                Add and continue
            </Button>

            {/* Character Recognition Dialog */}
            {recognizedCharacter && (
                <Dialog open={!!recognizedCharacter} onOpenChange={() => acknowledgeRecognizedCharacter()}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Recognized Character</DialogTitle>
                            <DialogDescription>
                                This looks like {recognizedCharacter.name} from your My World collection.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center space-x-4 py-4">
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                                <Image
                                    src={recognizedCharacter.imageUrl}
                                    alt={recognizedCharacter.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <h4 className="font-medium mb-1">{recognizedCharacter.name}</h4>
                                <p className="text-sm text-gray-500">Would you like to add this character to your story?</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={acknowledgeRecognizedCharacter}>
                                Skip
                            </Button>
                            <Button onClick={handleAddRecognizedCharacter}>
                                Add to Story
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!elementToDelete} onOpenChange={(open) => !open && setElementToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove from story?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this element from your story? This action won't delete it from your library.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}