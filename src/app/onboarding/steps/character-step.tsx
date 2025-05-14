'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding } from '@/lib/context/onboarding-provider';
import { Button } from '@/components/ui/button';
import { SpeechBubble } from './speech-bubble';
import { User, Upload, Pencil, Plus, CheckCircle, Crown, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AttributesEditor } from '@/components/character/attributes-editor';
import { useAuth } from '@clerk/nextjs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ElementCategory } from '@prisma/client';

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
    collar?: string;
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
        updateElementDescription,
        addElement
    } = useOnboarding();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [displayedText, setDisplayedText] = useState('');
    const isFirstEntryRef = useRef(true);
    const animationRef = useRef<NodeJS.Timeout | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Selected character tracking (max 3)
    const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
    const [primaryCharacterId, setPrimaryCharacterId] = useState<string | null>(null);

    // State for attributes editor
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
    const [currentElementId, setCurrentElementId] = useState<string | null>(null);
    const [attributesData, setAttributesData] = useState<CharacterAttributes | null>(null);
    const [lastUploadedElement, setLastUploadedElement] = useState<any | null>(null);

    // Character limit
    const MAX_CHARACTERS = 3;

    // Dynamic speech bubble text
    const baseText = "Who should be in your story? Select up to 3 characters to join the adventure!";
    const uploadingText = "Analyzing your image... The magic is happening! ✨";
    const categoryDetectionText = "Hmm, let me see what we have here...";
    const loadingText = "Loading your cast of characters...";
    const maxCharactersText = "Amazing! You've selected all 3 characters for your story!";

    // Dynamic speech messages that incorporate names and types
    const getSpeechForUploadedElement = (element: any) => {
        switch (element.category) {
            case 'PET':
                return `Awesome! I've added ${element.name}, your adorable pet, to the story.`;
            case 'OBJECT':
                return `Cool! I've added ${element.name}, a special object, to your story.`;
            case 'LOCATION':
                return `Beautiful! I've added ${element.name}, a special place, to your story.`;
            default:
                return `Great! I've added ${element.name} to your story.`;
        }
    };

    const getSpeechForPrimaryChange = (name: string) => {
        const messages = [
            `${name} is now the star of your story! Everyone else will play supporting roles.`,
            `${name} takes center stage! They'll be the main focus of your adventure.`,
            `${name} is ready to lead this story! They'll be the primary character.`,
            `The spotlight is now on ${name}! They'll be the hero of your tale.`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    };

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
                const existingCharacters = uploadedElements.filter(el =>
                    el.category === 'CHARACTER' ||
                    el.category === 'PET' ||
                    el.category === 'OBJECT'
                );

                // If we already have characters in context, use those
                if (existingCharacters.length > 0) {
                    // Add existing characters to selected elements if not already there
                    existingCharacters.forEach(character => {
                        addElement(character);
                    });
                    animateText("Welcome back! Your cast of characters is ready for a new adventure!");
                } else if (userId) {
                    // Only fetch from API if user is logged in and we don't have characters
                    const response = await fetch('/api/my-world/elements?categories=CHARACTER,PET,OBJECT');
                    if (response.ok) {
                        const { elements } = await response.json();

                        if (elements && elements.length > 0) {
                            // Add these elements to the selected elements
                            elements.forEach((element: any) => {
                                addElement(element);
                            });

                            animateText("Welcome back! Who should star in today's story?");
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
        }
    }, [isAnalyzingImage]);

    // Set primary character
    const setPrimaryCharacter = (characterId: string) => {
        if (characterId === primaryCharacterId) return;

        // Find the character by ID
        const character = selectedElements.find(el => el.id === characterId);
        const characterName = character ? character.name : "This character";

        // Set new primary
        setPrimaryCharacterId(characterId);

        // Ensure the primary character is selected
        if (!selectedCharacters.includes(characterId)) {
            // If we're at max capacity, remove the last selected character
            if (selectedCharacters.length >= MAX_CHARACTERS) {
                const charactersToKeep = selectedCharacters.slice(0, MAX_CHARACTERS - 1);
                setSelectedCharacters([...charactersToKeep, characterId]);
            } else {
                setSelectedCharacters([...selectedCharacters, characterId]);
            }
        }

        animateText(getSpeechForPrimaryChange(characterName));
    };

    // Handle file selection trigger
    const triggerFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Handle file selection and category detection before uploading
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            animateText(categoryDetectionText);

            // First detect the category using Vision API
            const categoryFormData = new FormData();
            categoryFormData.append('file', file);

            const categoryResponse = await fetch('/api/images/detect-category', {
                method: 'POST',
                body: categoryFormData
            });

            if (!categoryResponse.ok) {
                throw new Error('Failed to detect image category');
            }

            const { category, explanation } = await categoryResponse.json();

            // Display what we detected
            let detectionText = "";
            switch (category) {
                case 'PET':
                    detectionText = "I see a pet! Uploading now...";
                    break;
                case 'OBJECT':
                    detectionText = "That looks like a toy or object! Uploading now...";
                    break;
                case 'LOCATION':
                    detectionText = "That's a beautiful place! Uploading now...";
                    break;
                default:
                    detectionText = "I see a character! Uploading now...";
            }
            animateText(detectionText);

            // Now upload with the detected category
            const newElement = await addUploadedImage(file, category);

            if (newElement) {
                setLastUploadedElement(newElement);

                // Set as primary character if it's the first one
                if (!primaryCharacterId) {
                    setPrimaryCharacterId(newElement.id);
                }

                // Add to selected characters
                setSelectedCharacters(prev => {
                    // Check if we're at max capacity
                    if (prev.length >= MAX_CHARACTERS) {
                        return prev;
                    }
                    return [...prev, newElement.id];
                });

                // Show confirmation based on category
                animateText(getSpeechForUploadedElement(newElement));

                // After a delay, open the attributes editor
                setTimeout(() => {
                    handleEditAttributes(newElement.id);
                }, 1000);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error("Upload Failed", {
                description: "There was an error uploading your image."
            });
            animateText("Oops! Something went wrong with the upload. Please try again.");
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEditAttributes = async (elementId: string) => {
        setCurrentElementId(elementId);
        setIsEditorOpen(true);
        setIsLoadingAttributes(true);

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
        } catch (error) {
            console.error('Error fetching character attributes:', error);
            // Still set initial data
            setAttributesData({ elementId });
        } finally {
            setIsLoadingAttributes(false);
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
                const character = selectedElements.find(el => el.id === currentElementId);

                toast.success("Success!", {
                    description: "Details saved successfully."
                });

                // Update the displayed text to confirm success
                animateText(`Great! ${character?.name}'s details have been saved. Looking good!`);
            } else {
                throw new Error('Failed to save attributes');
            }
        } catch (error) {
            console.error('Error saving attributes:', error);
            toast.error("Save Failed", {
                description: "There was an error saving your details."
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
                description: "Name has been updated successfully."
            });
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error("Update Failed", {
                description: "There was an error updating the name."
            });
        }
    };

    // Filter characters, pets, and objects for display
    const characterCount = selectedElements.filter(el =>
        el.category === 'CHARACTER' ||
        el.category === 'PET' ||
        el.category === 'OBJECT'
    ).length;

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
        }
    }, [lastUploadedElement, isAnalyzingImage]);

    // Check if we can proceed (at least one character selected)
    const canProceed = selectedCharacters.length > 0;

    // Helper to get character icon/emoji based on category
    const getCharacterIcon = (character: any) => {
        switch(character.category) {
            case 'PET':
                return <span className="text-xl">🐾</span>;
            case 'OBJECT':
                return <span className="text-xl">🧸</span>;
            default:
                return <User className="w-6 h-6 text-gray-500" />;
        }
    };

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            {/* Hidden file input element */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isAnalyzingImage || isLoading}
                style={{ display: 'none' }}
                id="character-upload-input"
            />

            <div className="mb-6">
                <SpeechBubble
                    message={displayedText}
                    animateIn={false}
                    heightClass="min-h-[60px]"
                    position="left"
                    // textClassName="text-sm" // Make text smaller to fit more content
                />
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Characters</h2>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center text-sm text-gray-500 cursor-pointer">
                                <Info size={16} className="mr-1" />
                                About Characters
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="mb-2">Select up to 3 characters for your story. These can be humans, pets, toys, or other objects!</p>
                            <p className="mb-2">The <span className="font-medium">Primary</span> character (marked with a crown) will be the main focus of your story.</p>
                            <p>Click the crown icon on any character to make them primary.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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
                                            : 'People, pets, toys - JPG, PNG or WebP, max 5MB'}
                                </p>
                            </div>
                        </button>
                    </motion.div>
                )}

                {/* Display characters with selection capability */}
                <AnimatePresence>
                    {selectedElements
                        .filter(el =>
                            el.category === 'CHARACTER' ||
                            el.category === 'PET' ||
                            el.category === 'OBJECT'
                        )
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
                                    {/* Primary character crown */}
                                    {character.id === primaryCharacterId && (
                                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                                            <Crown className="w-3 h-3 text-white" />
                                        </div>
                                    )}

                                    <div className="w-14 h-14 rounded-md overflow-hidden mr-3 flex-shrink-0">
                                        {character.imageUrl ? (
                                            <img
                                                src={character.imageUrl}
                                                alt={character.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                {getCharacterIcon(character)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <h4 className="font-medium text-gray-800">
                                                {character.name}
                                            </h4>
                                            {character.id !== primaryCharacterId && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPrimaryCharacter(character.id)}
                                                    className="ml-2 p-1 text-amber-400 hover:text-amber-500 transition-colors"
                                                    title="Set as primary character"
                                                >
                                                    <Crown className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-1">
                                            {character.category === 'PET' && <span className="mr-1">🐾</span>}
                                            {character.category === 'OBJECT' && <span className="mr-1">🧸</span>}
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

                {/* "Add another character" button */}
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

            {/* Character attributes editor with proper category handling */}
            {currentElement && (
                <AttributesEditor
                    isOpen={isEditorOpen}
                    onClose={() => setIsEditorOpen(false)}
                    elementId={currentElement.id}
                    elementName={currentElement.name}
                    imageUrl={currentElement.imageUrl}
                    category={currentElement.category as ElementCategory}
                    initialAttributes={attributesData || undefined}
                    onSave={handleSaveAttributes}
                    onNameChange={handleNameChange}
                    isLoading={isLoadingAttributes}
                />
            )}
        </div>
    );
}