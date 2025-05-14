'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { User, Upload, Pencil, Plus, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AttributesEditor } from '@/components/character/attributes-editor';
import { useAuth } from '@clerk/nextjs';

interface CharacterAttributes {
    id?: string;
    elementId: string;
    age?: string;
    gender?: string;
    skinColor?: string;
    hairColor?: string;
    hairStyle?: string;
    eyeColor?: string;
    ethnicity?: string;
    furColor?: string;
    furStyle?: string;
    markings?: string;
    breed?: string;
    outfit?: string;
    accessories?: string;
}

export function CharactersStep() {
    const { userId } = useAuth();
    const {
        selectedElements,
        uploadedElements,
        addUploadedImage,
        isAnalyzingImage,
        goToNextStep,
        updateElementName,
        addElement
    } = useOnboarding();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // State for attributes editor
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [currentElementId, setCurrentElementId] = useState<string | null>(null);
    const [attributesData, setAttributesData] = useState<CharacterAttributes | null>(null);
    const [lastUploadedElement, setLastUploadedElement] = useState<any | null>(null);

    const baseText = "Who should be in your story? Add some characters!";
    const uploadingText = "Analyzing your character... This will just take a moment!";
    const completedText = "Perfect! Your character has been added.";
    const loadingText = "Loading your characters...";

    const animateText = (text: string) => {
        if (animationRef.current) clearInterval(animationRef.current);
        setDisplayedText('');
        let idx = 0;
        animationRef.current = setInterval(() => {
            setDisplayedText(text.slice(0, idx + 1));
            idx++;
            if (idx >= text.length && animationRef.current) clearInterval(animationRef.current);
        }, 20);
    };

    // Load existing My World elements on component mount
    useEffect(() => {
        const loadMyWorldElements = async () => {
            setIsLoading(true);

            try {
                // Check for existing characters in uploadedElements first
                const existingCharacters = uploadedElements.filter(el => el.category === 'CHARACTER');

                // If we already have characters in context, use those
                if (existingCharacters.length > 0) {
                    // Add existing characters to selected elements if not already there
                    existingCharacters.forEach(character => {
                        addElement(character);
                    });
                    animateText("Welcome back! Here are your characters.");
                } else if (userId) {
                    // Only fetch from API if user is logged in and we don't have characters
                    const response = await fetch('/api/my-world/elements?category=CHARACTER');
                    if (response.ok) {
                        const { elements } = await response.json();

                        if (elements && elements.length > 0) {
                            // Add these elements to the selected elements
                            elements.forEach((element: any) => {
                                addElement(element);
                            });

                            animateText("Welcome back! Here are your characters.");
                        } else {
                            animateText(baseText);
                        }
                    } else {
                        animateText(baseText);
                    }
                } else {
                    // For guest users with no existing characters
                    animateText(baseText);
                }
            } catch (error) {
                console.error('Error loading My World elements:', error);
                animateText(baseText);
            } finally {
                setIsLoading(false);
            }
        };

        if (isFirstEntryRef.current) {
            animateText(loadingText);
            loadMyWorldElements();
            isFirstEntryRef.current = false;
        }
    }, [addElement, uploadedElements, userId]);

    // Update text when analyzing image
    useEffect(() => {
        if (isAnalyzingImage) {
            animateText(uploadingText);
        } else if (lastUploadedElement) {
            animateText(completedText);
        }
    }, [isAnalyzingImage, lastUploadedElement]);

    // Fixed file input trigger function
    const triggerFileSelect = () => {
        console.log("Triggering file selection");
        // Ensure we have a reference to the input
        if (fileInputRef.current) {
            console.log("File input reference exists, clicking...");
            // Create and dispatch a click event - this can help ensure the click works
            const event = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
            });
            fileInputRef.current.dispatchEvent(event);
        } else {
            console.error("File input reference is null");
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("File selected", e.target.files);
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const newElement = await addUploadedImage(file, 'CHARACTER');
            if (newElement) {
                setLastUploadedElement(newElement);

                // After a delay, open the attributes editor
                setTimeout(() => {
                    handleEditAttributes(newElement.id);
                }, 1000);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error("Upload Failed", {
                description: "There was an error uploading your character image."
            });
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEditAttributes = async (elementId: string) => {
        setCurrentElementId(elementId);

        try {
            // Fetch attributes if they exist
            const response = await fetch(`/api/my-world/elements/${elementId}/attributes`);

            if (response.ok) {
                const data = await response.json();
                setAttributesData(data.attributes);
            } else {
                // If no attributes yet, initialize with element ID
                setAttributesData({ elementId });
            }

            // Open the editor
            setIsEditorOpen(true);
        } catch (error) {
            console.error('Error fetching character attributes:', error);
            // Still open the editor with initial data
            setAttributesData({ elementId });
            setIsEditorOpen(true);
        }
    };

    const handleSaveAttributes = async (attributes: CharacterAttributes) => {
        if (!currentElementId) return;

        try {
            const response = await fetch(`/api/my-world/elements/${currentElementId}/attributes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attributes),
            });

            if (response.ok) {
                toast.success("Success!", {
                    description: "Character details saved successfully."
                });

                // Update the displayed text to confirm success
                animateText("Great! Your character details have been saved.");
            } else {
                throw new Error('Failed to save attributes');
            }
        } catch (error) {
            console.error('Error saving attributes:', error);
            toast.error("Save Failed", {
                description: "There was an error saving your character details."
            });
        }
    };

    const handleNameChange = async (newName: string) => {
        if (!currentElementId) return;

        try {
            // Update name in API
            const response = await fetch(`/api/my-world/elements/${currentElementId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    description: currentElement?.description || ''
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update name');
            }

            // Update name in local state
            updateElementName(currentElementId, newName);

            toast.success("Name Updated", {
                description: "Character name has been updated successfully."
            });
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error("Update Failed", {
                description: "There was an error updating the character name."
            });
        }
    };

    const characterCount = selectedElements.filter(el => el.category === 'CHARACTER').length;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.4 }
        }
    };

    // Get current element if editing
    const currentElement = currentElementId
        ? selectedElements.find(el => el.id === currentElementId)
        : null;

    // Find active element to check if we should show editor automatically
    useEffect(() => {
        // Auto-show editor for newly uploaded elements
        if (lastUploadedElement && !isAnalyzingImage) {
            handleEditAttributes(lastUploadedElement.id);
            // Don't set to null, so we know this is a new upload
        }
    }, [lastUploadedElement, isAnalyzingImage]);

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            {/* Hidden file input element - placed at the top level */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isAnalyzingImage || isLoading}
                style={{ display: 'none' }}
            />

            <div className="mb-6">
                <SpeechBubble
                    message={displayedText}
                    animateIn={false}
                    heightClass="min-h-[60px]"
                    position="left"
                />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mb-8"
            >
                {/* Show upload area when no characters or actively uploading */}
                {(characterCount === 0 || isAnalyzingImage) && (
                    <motion.div variants={itemVariants} className="mb-4">
                        <button
                            type="button"
                            onClick={triggerFileSelect}
                            disabled={isAnalyzingImage || isLoading}
                            className={`w-full flex items-center justify-center p-6 rounded-xl border-2 border-dashed transition-colors ${
                                isAnalyzingImage || isLoading
                                    ? 'border-gray-300 bg-gray-50 cursor-wait'
                                    : 'border-[#4CAF50] hover:bg-[#4CAF50]/5 cursor-pointer'
                            }`}
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mb-3">
                                    {isAnalyzingImage || isLoading ? (
                                        <div className="w-6 h-6 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Upload className="w-6 h-6 text-[#4CAF50]" />
                                    )}
                                </div>
                                <p className="font-medium text-gray-700 mb-1">
                                    {isAnalyzingImage
                                        ? 'Analyzing Image...'
                                        : isLoading
                                            ? 'Loading characters...'
                                            : 'Upload a character image'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {isAnalyzingImage
                                        ? 'Please wait while we process your image'
                                        : isLoading
                                            ? 'Please wait...'
                                            : 'JPG, PNG or WebP, max 5MB'
                                    }
                                </p>
                            </div>
                        </button>
                    </motion.div>
                )}

                {/* Display characters */}
                <AnimatePresence>
                    {selectedElements
                        .filter(el => el.category === 'CHARACTER')
                        .map((character) => (
                            <motion.div
                                key={character.id}
                                variants={itemVariants}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="mb-3"
                            >
                                <div className="flex items-center p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-[#4CAF50] transition-colors">
                                    <div className="w-14 h-14 rounded-md overflow-hidden mr-3 flex-shrink-0">
                                        {character.imageUrl ? (
                                            <img
                                                src={character.imageUrl}
                                                alt={character.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                <User className="w-6 h-6 text-gray-500" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-800">{character.name}</h4>
                                        <p className="text-sm text-gray-500 line-clamp-1">
                                            {character.description || 'No description'}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleEditAttributes(character.id)}
                                        className="ml-2 p-2 text-gray-500 hover:text-[#4CAF50] hover:bg-[#4CAF50]/10 rounded-full transition-colors cursor-pointer"
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                </AnimatePresence>

                {/* "Add another character" button - Completely reimplemented */}
                {characterCount > 0 && !isAnalyzingImage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-2"
                    >
                        <button
                            type="button"
                            onClick={triggerFileSelect}
                            disabled={isAnalyzingImage || isLoading}
                            className="flex items-center justify-center w-full p-3 rounded-lg border border-gray-200 text-gray-600 hover:text-[#4CAF50] hover:border-[#4CAF50]/50 hover:bg-[#4CAF50]/5 transition-colors cursor-pointer"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            <span>Add another character</span>
                        </button>
                    </motion.div>
                )}
            </motion.div>

            {/* Continue button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <Button
                    onClick={goToNextStep}
                    disabled={isAnalyzingImage || isLoading}
                    className="w-full py-6 text-lg font-medium rounded-full bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                >
                    {characterCount > 0 ? (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Continue
                        </>
                    ) : 'Skip for now'}
                </Button>
            </motion.div>

            {/* Character attributes editor */}
            {currentElement && (
                <AttributesEditor
                    isOpen={isEditorOpen}
                    onClose={() => setIsEditorOpen(false)}
                    elementId={currentElement.id}
                    elementName={currentElement.name}
                    imageUrl={currentElement.imageUrl}
                    isCharacter={true}
                    initialAttributes={attributesData || undefined}
                    onSave={handleSaveAttributes}
                    onNameChange={handleNameChange}
                />
            )}
        </div>
    );
}