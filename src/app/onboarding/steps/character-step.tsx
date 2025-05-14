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

    const baseText = "Who should be in your story? Select up to 3 characters!";
    const uploadingText = "Analyzing your character... This will just take a moment!";
    const completedText = "Perfect! Your character has been added.";
    const loadingText = "Loading your characters...";
    const selectMoreText = "Your character has been selected as primary. You can select up to 2 more characters.";
    const maxCharactersText = "You've selected 3 characters. Perfect!";
    const primaryChangedText = "Primary character has been updated. This will be the main focus of your story.";

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

                            animateText("Welcome back! Select characters for your story.");
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

        animateText(primaryChangedText);
    };

    // Helper function to toggle character selection
    const toggleCharacterSelection = (characterId: string) => {
        setSelectedCharacters(prev => {
            // If already selected, remove it unless it's the primary
            if (prev.includes(characterId)) {
                // Cannot deselect primary character
                if (characterId === primaryCharacterId) {
                    animateText("The primary character cannot be deselected. You can change who is primary by clicking the crown icon on a different character.");
                    return prev;
                }

                const updatedSelection = prev.filter(id => id !== characterId);

                // Update instruction text
                if (updatedSelection.length === 0) {
                    animateText("Select at least one character for your story.");
                } else {
                    animateText(`${updatedSelection.length} character${updatedSelection.length > 1 ? 's' : ''} selected. You can select up to ${MAX_CHARACTERS - updatedSelection.length} more.`);
                }

                return updatedSelection;
            }
            // If not selected and under limit, add it
            else if (prev.length < MAX_CHARACTERS) {
                const updatedSelection = [...prev, characterId];

                // Update instruction text based on selection count
                if (updatedSelection.length === MAX_CHARACTERS) {
                    animateText(maxCharactersText);
                } else {
                    animateText(`${updatedSelection.length} character${updatedSelection.length > 1 ? 's' : ''} selected. You can select up to ${MAX_CHARACTERS - updatedSelection.length} more.`);
                }

                return updatedSelection;
            }
            // Already at max selection
            else {
                animateText(`You can select up to ${MAX_CHARACTERS} characters. Deselect a character first before selecting a new one.`);
                return prev;
            }
        });
    };

    // Handle file upload trigger with label
    const triggerFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const newElement = await addUploadedImage(file, 'CHARACTER');
            if (newElement) {
                setLastUploadedElement(newElement);

                // Set as primary character
                setPrimaryCharacter(newElement.id);

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
        }
    }, [lastUploadedElement, isAnalyzingImage]);

    // Check if we can proceed (at least one character selected)
    const canProceed = selectedCharacters.length > 0;

    // Check if a character card should be disabled (when at max and not already selected)
    const isCharacterDisabled = (characterId: string) => {
        return (
            selectedCharacters.length >= MAX_CHARACTERS &&
            !selectedCharacters.includes(characterId)
        );
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
                />
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Characters</h2>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center text-sm text-gray-500">
                                <Info size={16} className="mr-1" />
                                About Character Selection
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="mb-2">Select up to 3 characters for your story.</p>
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
                        <label
                            htmlFor="character-upload-input"
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
                                            : 'JPG, PNG or WebP, max 5MB'}
                                </p>
                            </div>
                        </label>
                    </motion.div>
                )}

                {/* Display characters with selection capability */}
                <AnimatePresence>
                    {selectedElements
                        .filter(el => el.category === 'CHARACTER')
                        .map((character) => {
                            const isSelected = selectedCharacters.includes(character.id);
                            const isPrimary = character.id === primaryCharacterId;
                            const isDisabled = isCharacterDisabled(character.id);

                            return (
                                <motion.div
                                    key={character.id}
                                    variants={itemVariants}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="mb-3"
                                >
                                    <div
                                        className={`flex items-center p-3 bg-white rounded-xl border relative
                                            ${isSelected
                                            ? 'border-[#4CAF50] shadow-md ring-1 ring-[#4CAF50]/30'
                                            : isDisabled
                                                ? 'border-gray-200 shadow-sm opacity-50 cursor-not-allowed'
                                                : 'border-gray-200 shadow-sm hover:border-gray-300 cursor-pointer'
                                        } 
                                            ${isPrimary ? 'bg-[#4CAF50]/5' : ''}
                                            transition-all`}
                                        onClick={() => {
                                            if (!isDisabled) {
                                                toggleCharacterSelection(character.id);
                                            } else {
                                                animateText(`You've already selected ${MAX_CHARACTERS} characters. Deselect one first to select this character.`);
                                            }
                                        }}
                                    >
                                        {/* Primary character indicator and controller */}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center
                                                            ${isPrimary
                                                            ? 'bg-[#4CAF50] text-white'
                                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPrimaryCharacter(character.id);
                                                        }}
                                                    >
                                                        <Crown size={14} />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {isPrimary
                                                        ? "This is the primary character in your story"
                                                        : "Click to make this the primary character"}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        {/* Selection indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-10 w-5 h-5 bg-[#4CAF50] text-white rounded-full flex items-center justify-center">
                                                <CheckCircle size={12} />
                                            </div>
                                        )}

                                        <div className="w-14 h-14 rounded-md overflow-hidden mr-3 flex-shrink-0 ml-6">
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
                                            <h4 className={`font-medium ${isPrimary ? 'text-[#4CAF50]' : 'text-gray-800'}`}>
                                                {character.name}
                                                {isPrimary && <span className="text-xs ml-2">(Primary)</span>}
                                            </h4>
                                            <p className="text-sm text-gray-500 line-clamp-1">
                                                {character.description || 'No description'}
                                            </p>
                                        </div>

                                        {/* Edit button - stop propagation to prevent selection toggle */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditAttributes(character.id);
                                            }}
                                            className="ml-2 p-2 text-gray-500 hover:text-[#4CAF50] hover:bg-[#4CAF50]/10 rounded-full transition-colors cursor-pointer"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                </AnimatePresence>

                {/* Selection counter */}
                {characterCount > 0 && selectedCharacters.length > 0 && (
                    <div className="mt-2 mb-3 text-sm text-center">
                        <span className="font-medium">
                            {selectedCharacters.length}/{MAX_CHARACTERS}
                        </span> characters selected
                    </div>
                )}

                {/* "Add another character" button */}
                {characterCount > 0 && !isAnalyzingImage && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-2"
                    >
                        <label
                            htmlFor="character-upload-input"
                            className="flex items-center justify-center w-full p-3 rounded-lg border border-gray-200 text-gray-600 hover:text-[#4CAF50] hover:border-[#4CAF50]/50 hover:bg-[#4CAF50]/5 transition-colors cursor-pointer"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            <span>Add another character</span>
                        </label>
                    </motion.div>
                )}
            </motion.div>

            {/* Continue button - only active when at least one character is selected */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <Button
                    onClick={goToNextStep}
                    disabled={!canProceed || isAnalyzingImage || isLoading}
                    className={`w-full py-6 text-lg font-medium rounded-full ${
                        canProceed
                            ? 'bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer shadow-md hover:shadow-lg'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } transition-all duration-300`}
                >
                    {canProceed ? (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Continue with {selectedCharacters.length} character{selectedCharacters.length !== 1 ? 's' : ''}
                        </>
                    ) : 'Select at least one character'}
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
                    isLoading={isLoadingAttributes}
                    isPrimary={currentElement.id === primaryCharacterId}
                    onSetPrimary={() => setPrimaryCharacter(currentElement.id)}
                />
            )}
        </div>
    );
}