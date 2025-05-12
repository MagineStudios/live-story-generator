'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useStoryBuilder } from '@/lib/context/story-builder-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Info, Loader2, Pencil, Check, Trash2 } from 'lucide-react';
import { ElementCategory } from '@prisma/client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
    description?: string;
    imageUrl: string;
    category: ElementCategory;
    isDefault?: boolean;
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
        updateElementDescription,
        updateElementName,
    } = useStoryBuilder();

    const [activeCategory, setActiveCategory] = useState<ElementCategory>(ElementCategory.CHARACTER);
    const [defaultElements, setDefaultElements] = useState<Record<ElementCategory, DefaultElement[]>>({
        [ElementCategory.CHARACTER]: [],
        [ElementCategory.PET]: [],
        [ElementCategory.LOCATION]: [],
        [ElementCategory.OBJECT]: [],
    });

    // Track all uploaded elements, including those not in selectedElements
    const [uploadedElements, setUploadedElements] = useState<DefaultElement[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [detailElement, setDetailElement] = useState<(DefaultElement & {isSelected?: boolean}) | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [elementToDelete, setElementToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const nameInputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

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
                        elementsByCategory[el.category].push({...el, isDefault: true});
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

        // Fetch user's uploaded elements when component mounts
        fetchUserElements();
    }, []);

    // Fetch user's uploaded elements
    const fetchUserElements = async () => {
        try {
            const response = await fetch('/api/my-world/elements/user');
            if (response.ok) {
                const { elements } = await response.json();
                if (elements) {
                    setUploadedElements(elements);
                }
            }
        } catch (error) {
            console.error('Failed to fetch user elements:', error);
        }
    };

    // Focus input when editing starts
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, [isEditingName]);

    useEffect(() => {
        if (isEditingDescription && descriptionInputRef.current) {
            descriptionInputRef.current.focus();
        }
    }, [isEditingDescription]);

    const getCategoryLabel = (category: ElementCategory) => {
        switch (category) {
            case ElementCategory.CHARACTER: return 'Characters';
            case ElementCategory.PET: return 'Pets';
            case ElementCategory.LOCATION: return 'Places';
            case ElementCategory.OBJECT: return 'Objects';
            default: return 'Objects';
        }
    };

    // Get all elements for the current category, marking which ones are selected
    const getAllCategoryElements = () => {
        const defaultCategoryElements = defaultElements[activeCategory] || [];
        const userUploadedCategoryElements = uploadedElements.filter(el => el.category === activeCategory);

        // Create a map of selected elements for quick lookup
        const selectedElementsById = new Map();
        selectedElements.forEach(el => {
            selectedElementsById.set(el.id, el);
        });

        // Combine all elements, avoiding duplicates and preserving updated name/description from selected elements
        const allElementIds = new Set();
        const combinedElements = [];

        // First add default elements
        for (const element of defaultCategoryElements) {
            const selectedElement = selectedElementsById.get(element.id);
            const isSelected = !!selectedElement;

            combinedElements.push({
                ...element,
                // If selected, use the potentially updated name and description
                name: isSelected ? selectedElement.name : element.name,
                description: isSelected ? selectedElement.description : element.description,
                isSelected
            });
            allElementIds.add(element.id);
        }

        // Then add user-uploaded elements
        for (const element of userUploadedCategoryElements) {
            if (!allElementIds.has(element.id)) {
                const selectedElement = selectedElementsById.get(element.id);
                const isSelected = !!selectedElement;

                combinedElements.push({
                    ...element,
                    name: isSelected ? selectedElement.name : element.name,
                    description: isSelected ? selectedElement.description : element.description,
                    isSelected
                });
                allElementIds.add(element.id);
            }
        }

        return combinedElements;
    };

    // Toggle selection state of an element
    const toggle = (el: any) => {
        const isSelected = selectedElements.some(e => e.id === el.id);
        if (isSelected) {
            removeElement(el.id);
        } else {
            addElement({...el, isSelected: true});
        }
    };

    // Handle edit button click to show detail view
    const handleShowDetails = (element: DefaultElement & {isSelected?: boolean}, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent the click from triggering toggle/selection
        setDetailElement(element);
        setEditName(element.name);
        setEditDescription(element.description || "");
        setIsEditingName(false);
        setIsEditingDescription(false);
    };

    // Save element name changes
    const saveElementName = async () => {
        if (!detailElement || editName === detailElement.name) {
            setIsEditingName(false);
            return;
        }

        setIsSaving(true);

        try {
            // Call API to update the name
            const response = await fetch(`/api/my-world/elements/${detailElement.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: editName }),
            });

            if (!response.ok) {
                throw new Error('Failed to save name');
            }

            // Update UI state for selected elements
            if (detailElement.isSelected) {
                updateElementName(detailElement.id, editName);
            }

            // Update the detail element
            setDetailElement(prev => prev ? {...prev, name: editName} : null);

            // Update default elements if this was a default element
            if (detailElement.isDefault) {
                setDefaultElements(prev => {
                    const category = detailElement.category;
                    return {
                        ...prev,
                        [category]: prev[category].map(el =>
                            el.id === detailElement.id ? {...el, name: editName} : el
                        )
                    };
                });
            }
            // Update uploaded elements if this was a user uploaded element
            else {
                setUploadedElements(prev =>
                    prev.map(el => el.id === detailElement.id ? {...el, name: editName} : el)
                );
            }

            toast.success("Name updated successfully");
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error("Failed to update name");
        } finally {
            setIsSaving(false);
            setIsEditingName(false);
        }
    };

    // Save element description changes
    const saveElementDescription = async () => {
        if (!detailElement || editDescription === detailElement.description) {
            setIsEditingDescription(false);
            return;
        }

        setIsSaving(true);

        try {
            // Call API to update the description
            const response = await fetch(`/api/my-world/elements/${detailElement.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ description: editDescription }),
            });

            if (!response.ok) {
                throw new Error('Failed to save description');
            }

            // Update UI state for selected elements
            if (detailElement.isSelected) {
                updateElementDescription(detailElement.id, editDescription);
            }

            // Update the detail element
            setDetailElement(prev => prev ? {...prev, description: editDescription} : null);

            // Update default elements if this was a default element
            if (detailElement.isDefault) {
                setDefaultElements(prev => {
                    const category = detailElement.category;
                    return {
                        ...prev,
                        [category]: prev[category].map(el =>
                            el.id === detailElement.id ? {...el, description: editDescription} : el
                        )
                    };
                });
            }
            // Update uploaded elements if this was a user uploaded element
            else {
                setUploadedElements(prev =>
                    prev.map(el => el.id === detailElement.id ? {...el, description: editDescription} : el)
                );
            }

            toast.success("Description updated successfully");
        } catch (error) {
            console.error('Error updating description:', error);
            toast.error("Failed to update description");
        } finally {
            setIsSaving(false);
            setIsEditingDescription(false);
        }
    };

    // Handle remove from world (permanent delete) request
    const handleRemoveFromStory = (id: string) => {
        setElementToDelete(id);
    };

    // Confirm permanent deletion
    const confirmPermanentDelete = async () => {
        if (!elementToDelete) return;
        setIsDeleting(true);
        try {
            // Call API to delete the element
            const response = await fetch(`/api/my-world/elements/${elementToDelete}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to delete element');
            }

            // Remove element from selected elements if it was selected
            if (selectedElements.some(el => el.id === elementToDelete)) {
                removeElement(elementToDelete);
            }

            // Remove element from default elements if it was a default element
            setDefaultElements(prev => {
                const newElementsByCategory = { ...prev };
                Object.keys(newElementsByCategory).forEach(category => {
                    newElementsByCategory[category as ElementCategory] =
                        newElementsByCategory[category as ElementCategory]
                            .filter(el => el.id !== elementToDelete);
                });
                return newElementsByCategory;
            });

            // Remove from uploaded elements
            setUploadedElements(prev => prev.filter(el => el.id !== elementToDelete));

            // Close the dialog if the deleted element was the one being viewed
            if (detailElement && detailElement.id === elementToDelete) {
                setDetailElement(null);
            }

            toast.success("Element permanently deleted");
        } catch (error) {
            console.error('Error deleting element:', error);
            toast.error("Failed to delete element");
        } finally {
            setIsDeleting(false);
            setElementToDelete(null);
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // This function adds the uploaded image to selectedElements after processing
            const newElement = await addUploadedImage(file, activeCategory);
            if (newElement) {
                // Also add to our local uploaded elements state so it remains visible if deselected
                setUploadedElements(prev => [...prev, newElement]);
            }
        } catch (error) {
            console.error("Upload and analysis failed:", error);
        }
    };

    const handleAddRecognizedCharacter = () => {
        if (recognizedCharacter) {
            fetch(`/api/my-world/elements?id=${recognizedCharacter.id}`)
                .then(res => res.json())
                .then(({ element }) => {
                    if (element) {
                        addElement({...element, isSelected: true});
                        // Also add to uploaded elements if it's not already there
                        setUploadedElements(prev => {
                            if (!prev.some(el => el.id === element.id)) {
                                return [...prev, element];
                            }
                            return prev;
                        });
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
            <h1 className="text-3xl font-bold mb-2">Build Your World</h1>
            <p className="text-gray-600 mb-6">
                Choose characters, pets, places, and objects to bring your story to life.
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

            {/* Grid of Items - Combined single list with selection state */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {getAllCategoryElements().map(item => {
                    return (
                        <div
                            key={item.id}
                            onClick={() => toggle(item)}
                            className={cn(
                                "aspect-square bg-gray-100 rounded-lg cursor-pointer overflow-hidden relative group",
                                item.isSelected
                                    ? "ring-4 ring-blue-500 shadow-lg"
                                    : "hover:ring-2 hover:ring-gray-300"
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
                                    "absolute inset-0 bg-gradient-to-t from-black/60 to-transparent",
                                    item.isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-70",
                                    "transition-opacity"
                                )}></div>
                                <span className="absolute bottom-2 left-2 text-white font-medium text-sm truncate max-w-[80%]">
                                    {item.name}
                                </span>
                            </div>

                            <div
                                className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full shadow-md opacity-0 group-hover:opacity-100 hover:bg-white transition-all"
                                onClick={(e) => handleShowDetails(item, e)}
                            >
                                <Pencil className="h-4 w-4 text-blue-600" />
                            </div>
                        </div>
                    );
                })}
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
                isAnalyzingImage ? "opacity-90 cursor-wait relative overflow-hidden" : ""
            )}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                    disabled={isAnalyzingImage}
                />
                <span className={cn(
                    "text-lg font-medium flex items-center justify-center",
                    isAnalyzingImage && "relative z-10"
                )}>
                {isAnalyzingImage ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing Image...
                    </>
                ) : (
                    'Upload New Photos'
                )}
                </span>

                {/* Animated background for analyzing state */}
                {isAnalyzingImage && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100 animate-gradient-x" />
                )}
            </label>

            {/* Continue Button - Black button with white text */}
            <Button
                onClick={goToNextStep}
                disabled={isAnalyzingImage}
                className="w-full py-6 bg-[#212121] text-white rounded-lg text-lg font-medium hover:bg-black/90 transition-colors"
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

            {/* Element Detail Dialog */}
            {detailElement && (
                <Dialog open={!!detailElement} onOpenChange={(open) => !open && setDetailElement(null)}>
                    <DialogContent className="sm:max-w-[90vw] w-full max-h-[80vh] overflow-y-auto bg-slate-50">
                        <DialogHeader>
                            <DialogTitle className="text-slate-800">Element Details</DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Image container */}
                            <div className="relative w-full sm:w-1/2 aspect-square rounded-lg overflow-hidden">
                                <Image
                                    src={detailElement.imageUrl}
                                    alt={detailElement.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Element details */}
                            <div className="flex flex-col space-y-4 w-full sm:w-1/2">
                                {/* Name with edit button */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800">Name</h3>
                                        <button
                                            onClick={() => setIsEditingName(!isEditingName)}
                                            className="p-1 rounded-full hover:bg-slate-200 transition-colors"
                                        >
                                            <Pencil className="h-4 w-4 text-blue-600" />
                                        </button>
                                    </div>

                                    {isEditingName ? (
                                        <div className="flex items-center space-x-2">
                                            <Input
                                                ref={nameInputRef}
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="border-slate-300 focus:border-blue-500 bg-white flex-1"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveElementName();
                                                }}
                                            />
                                            <button
                                                onClick={saveElementName}
                                                disabled={isSaving}
                                                className={cn(
                                                    "p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors",
                                                    isSaving && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                                                ) : (
                                                    <Check className="h-4 w-4 text-white" />
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-slate-900">{editName}</p>
                                    )}
                                </div>

                                {/* Description with edit button */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800">Description</h3>
                                        <button
                                            onClick={() => setIsEditingDescription(!isEditingDescription)}
                                            className="p-1 rounded-full hover:bg-slate-200 transition-colors"
                                        >
                                            <Pencil className="h-4 w-4 text-blue-600" />
                                        </button>
                                    </div>

                                    {isEditingDescription ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                ref={descriptionInputRef}
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                className="border-slate-300 focus:border-blue-500 min-h-[120px] bg-white"
                                                placeholder="Provide a concise visual description (under 50 words)"
                                                maxLength={350}
                                            />
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500">
                                                    {editDescription.length}/250 characters
                                                </span>
                                                <button
                                                    onClick={saveElementDescription}
                                                    disabled={isSaving}
                                                    className={cn(
                                                        "px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors",
                                                        isSaving && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    {isSaving ? "Saving..." : "Save description"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-900">{editDescription || "No description available."}</p>
                                    )}
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-slate-800">Category</h3>
                                    <p className="text-slate-900">{getCategoryLabel(detailElement.category)}</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex justify-end space-x-3 mt-4">
                            {/* Delete from My World permanently button */}
                            <Button
                                variant="destructive"
                                onClick={() => handleRemoveFromStory(detailElement.id)}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <Trash2 className="h-5 w-5 mr-2" />
                                Remove from World
                            </Button>

                            <DialogClose asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    Close
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Remove from World Confirmation Dialog (for permanent delete) */}
            <AlertDialog open={isDeleting || !!elementToDelete} onOpenChange={(open) => !open && setElementToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete this element from your My World collection? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPermanentDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete permanently"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}