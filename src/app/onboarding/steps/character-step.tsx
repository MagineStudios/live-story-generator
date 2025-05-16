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
    console.log("CharacterStep rendering");
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
    const [showAnalyzingUI, setShowAnalyzingUI] = useState(false);
    const [isProcessingComplete, setIsProcessingComplete] = useState(true);
    const [pendingCharacters, setPendingCharacters] = useState<string[]>([]);

    // Selected character tracking (max 3)
    const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
    const [primaryCharacterId, setPrimaryCharacterId] = useState<string | null>(null);

    // State for attributes editor
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
    const [currentElementId, setCurrentElementId] = useState<string | null>(null);
    const [attributesData, setAttributesData] = useState<CharacterAttributes | null>(null);
    const [lastUploadedElement, setLastUploadedElement] = useState<any | null>(null);

    // Local storage for characters to ensure they persist
    const [localCharacters, setLocalCharacters] = useState<any[]>([]);

    // Character limit
    const MAX_CHARACTERS = 3;

    // Dynamic speech bubble text
    const baseText = "Who should be in your story? Select up to 3 characters to join the adventure!";
    const uploadingText = "Analyzing your image... The magic is happening! ✨";
    const categoryDetectionText = "Hmm, let me see what we have here...";
    const loadingText = "Loading your cast of characters...";
    const maxCharactersText = "Amazing! You've selected all 3 characters for your story!";
    const confirmTraitsText = "Your character is ready! Let's add some details to bring them to life!";

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
            console.log("Loading my world elements...");
            setIsLoading(true);

            try {
                // Check for existing characters in uploadedElements first
                const existingCharacters = uploadedElements.filter(el =>
                    el.category === 'CHARACTER' ||
                    el.category === 'PET' ||
                    el.category === 'OBJECT'
                );

                console.log("Existing characters from uploadedElements:", existingCharacters);

                // If we already have characters in context, use those
                if (existingCharacters.length > 0) {
                    console.log('Found existing characters:', existingCharacters);

                    // Store in local state too
                    setLocalCharacters(existingCharacters);

                    // Add existing characters to selected elements if not already there
                    existingCharacters.forEach(character => {
                        addElement(character);
                    });

                    animateText("Welcome back! Your cast of characters is ready for a new adventure!");

                    // Set first character as primary if none is set
                    if (existingCharacters.length > 0 && !primaryCharacterId) {
                        setPrimaryCharacterId(existingCharacters[0].id);
                        console.log("Set primary character:", existingCharacters[0].id);
                    }

                    // Initialize selected characters
                    const initialSelected = existingCharacters.slice(0, MAX_CHARACTERS).map(c => c.id);
                    setSelectedCharacters(initialSelected);
                    console.log("Set selected characters:", initialSelected);
                } else if (userId) {
                    console.log("Fetching characters from API for user:", userId);
                    // Only fetch from API if user is logged in and we don't have characters
                    const response = await fetch('/api/my-world/elements?categories=CHARACTER,PET,OBJECT');
                    if (response.ok) {
                        const { elements } = await response.json();
                        console.log("API returned elements:", elements);

                        if (elements && elements.length > 0) {
                            console.log('Loaded characters from API:', elements);

                            // Add these elements to the selected elements
                            elements.forEach((element: any) => {
                                addElement(element);
                            });

                            // Store in local state too
                            setLocalCharacters(elements);

                            // Set first character as primary if none is set
                            if (elements.length > 0 && !primaryCharacterId) {
                                setPrimaryCharacterId(elements[0].id);
                                console.log("Set primary character:", elements[0].id);
                            }

                            // Initialize selected characters
                            const initialSelected = elements.slice(0, MAX_CHARACTERS).map((e: any) => e.id);
                            setSelectedCharacters(initialSelected);
                            console.log("Set selected characters:", initialSelected);

                            animateText("Welcome back! Who should star in today's story?");
                        } else {
                            animateText(baseText);
                        }
                    } else {
                        console.log("API returned error");
                        animateText(baseText);
                    }
                } else {
                    console.log("No user ID and no existing characters");
                    // For guest users with no existing characters
                    animateText(baseText);
                }
            } catch (error) {
                console.error('Error loading My World elements:', error);
                animateText(baseText);
            } finally {
                setIsLoading(false);
                console.log("Finished loading characters");
            }
        };

        if (isFirstEntryRef.current) {
            console.log("First entry, loading characters...");
            animateText(loadingText);
            loadMyWorldElements();
            isFirstEntryRef.current = false;
        }
    }, [addElement, uploadedElements, userId, primaryCharacterId]);

    // Update text and UI when analyzing image
    useEffect(() => {
        if (isAnalyzingImage) {
            animateText(uploadingText);
            setShowAnalyzingUI(true);
            setIsProcessingComplete(false);
        } else if (!isProcessingComplete) {
            // When analysis is complete but we're still in processing stage
            // Don't hide the analyzing UI yet until full process is complete
        } else {
            // Only hide analyzing UI when the entire process is complete
            setShowAnalyzingUI(false);
        }
    }, [isAnalyzingImage, isProcessingComplete]);

    // Update text when max characters are selected
    useEffect(() => {
        if (selectedCharacters.length === MAX_CHARACTERS) {
            animateText(maxCharactersText);
        }
    }, [selectedCharacters]);

    // Track whenever the primary character changes
    useEffect(() => {
        console.log("Primary character ID changed:", primaryCharacterId);
    }, [primaryCharacterId]);

    // Toggle character selection
    const toggleCharacterSelection = (characterId: string) => {
        console.log("Toggle selection for:", characterId);
        if (selectedCharacters.includes(characterId)) {
            // Remove from selection (allow unselection of primary character)
            setSelectedCharacters(selectedCharacters.filter(id => id !== characterId));
            console.log("Removed from selected characters");

            // If this was the primary character, clear primary status
            if (characterId === primaryCharacterId) {
                setPrimaryCharacterId(null);
                console.log("Cleared primary character");
            }
        } else {
            // Check if we've reached the max before adding
            if (selectedCharacters.length >= MAX_CHARACTERS) {
                toast.error("Maximum Characters", {
                    description: `You can only select up to ${MAX_CHARACTERS} characters.`
                });
                return;
            }

            // Add to selection
            setSelectedCharacters([...selectedCharacters, characterId]);
            console.log("Added to selected characters");
        }
    };

    // Set primary character
    const setPrimaryCharacter = (characterId: string) => {
        console.log("Setting primary character:", characterId);
        // Toggle primary status
        if (characterId === primaryCharacterId) {
            setPrimaryCharacterId(null);
            console.log("Cleared primary character");
            return;
        }

        // Find the character by ID
        const character = selectedElements.find(el => el.id === characterId) ||
            localCharacters.find(el => el.id === characterId);

        const characterName = character ? character.name : "This character";
        console.log("Found character:", characterName);

        // Set new primary
        setPrimaryCharacterId(characterId);

        // Ensure the primary character is selected
        if (!selectedCharacters.includes(characterId)) {
            console.log("Adding primary character to selections");
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

        // Immediately show analyzing UI and text
        setShowAnalyzingUI(true);
        setIsProcessingComplete(false);
        animateText(uploadingText);

        try {
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
            console.log('New element uploaded:', newElement);

            if (newElement) {
                setLastUploadedElement(newElement);

                // Add to local characters but keep analyzing UI visible
                setLocalCharacters(prev => [...prev, newElement]);

                // Set as primary character if it's the first one
                if (!primaryCharacterId) {
                    setPrimaryCharacterId(newElement.id);
                    console.log("Set primary character (new upload):", newElement.id);
                }

                // Add to pending characters instead of selected characters immediately
                setPendingCharacters(prev => [...prev, newElement.id]);

                // Show confirmation based on category
                animateText(confirmTraitsText);

                // After a short delay, open the attributes editor
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
            setIsProcessingComplete(true);
            setShowAnalyzingUI(false);
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
                const character = selectedElements.find(el => el.id === currentElementId) ||
                    localCharacters.find(el => el.id === currentElementId);

                toast.success("Success!", {
                    description: "Details saved successfully."
                });

                // Only now hide the analyzing UI if it was still showing
                setShowAnalyzingUI(false);
                setIsProcessingComplete(true);

                // If this character was pending, now officially add it to selected
                if (pendingCharacters.includes(currentElementId)) {
                    setPendingCharacters(prev => prev.filter(id => id !== currentElementId));
                    setSelectedCharacters(prev => {
                        // Check if we're at max capacity
                        if (prev.length >= MAX_CHARACTERS) {
                            return prev;
                        }
                        return [...prev, currentElementId];
                    });
                    console.log("Moved from pending to selected characters");
                }

                // Update the displayed text to confirm success
                animateText(getSpeechForUploadedElement(character));
            } else {
                throw new Error('Failed to save attributes');
            }
        } catch (error) {
            console.error('Error saving attributes:', error);
            toast.error("Save Failed", {
                description: "There was an error saving your details."
            });
            // Hide analyzing UI on error
            setShowAnalyzingUI(false);
            setIsProcessingComplete(true);

            // Also move from pending to selected even on error
            // so the character still appears
            if (pendingCharacters.includes(currentElementId)) {
                setPendingCharacters(prev => prev.filter(id => id !== currentElementId));
                setSelectedCharacters(prev => {
                    if (prev.length >= MAX_CHARACTERS) {
                        return prev;
                    }
                    return [...prev, currentElementId];
                });
            }
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

            // Also update in our local characters array
            setLocalCharacters(prev =>
                prev.map(char =>
                    char.id === currentElementId ? {...char, name: newName} : char
                )
            );

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

    // Handle updating character description
    const handleDescriptionChange = async (newDescription: string) => {
        if (!currentElementId) return;

        try {
            // Get current element
            const character = selectedElements.find(el => el.id === currentElementId) ||
                localCharacters.find(el => el.id === currentElementId);

            if (!character) throw new Error('Character not found');

            // Update description in API
            const response = await fetch(`/api/my-world/elements/${currentElementId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: character.name,
                    description: newDescription
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update description');
            }

            // Update description in local state
            updateElementDescription(currentElementId, newDescription);

            // Also update in our local characters array
            setLocalCharacters(prev =>
                prev.map(char =>
                    char.id === currentElementId ? {...char, description: newDescription} : char
                )
            );

            toast.success("Description Updated", {
                description: "Description has been updated successfully."
            });

            return true;
        } catch (error) {
            console.error('Error updating description:', error);
            toast.error("Update Failed", {
                description: "There was an error updating the description."
            });
            return false;
        }
    };

    // Merge characters from all sources for display, prioritizing local state
    const getCharactersForDisplay = () => {
        // Start with local characters
        let characters = [...localCharacters];

        // Add any from selectedElements that aren't in local
        const localIds = characters.map(c => c.id);
        selectedElements.forEach(el => {
            if (
                (el.category === 'CHARACTER' || el.category === 'PET' || el.category === 'OBJECT') &&
                !localIds.includes(el.id)
            ) {
                characters.push(el);
                localIds.push(el.id);
            }
        });

        // Filter out any characters that are still pending
        characters = characters.filter(char => !pendingCharacters.includes(char.id));

        console.log(`Characters for display: ${characters.length}`);
        return characters;
    };

    // Get characters for display
    const charactersForDisplay = getCharactersForDisplay();
    const characterCount = charactersForDisplay.length;

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
        ? selectedElements.find(el => el.id === currentElementId) ||
        localCharacters.find(el => el.id === currentElementId)
        : null;

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

    // Handle editor close
    const handleEditorClose = () => {
        setIsEditorOpen(false);

        // When the editor is closed after upload, make sure analyzing UI is hidden
        if (lastUploadedElement && lastUploadedElement.id === currentElementId) {
            setShowAnalyzingUI(false);
            setIsProcessingComplete(true);

            // Move the character from pending to selected if it hasn't been done yet
            if (currentElementId && pendingCharacters.includes(currentElementId)) {
                setPendingCharacters(prev => prev.filter(id => id !== currentElementId));
                setSelectedCharacters(prev => {
                    if (prev.length >= MAX_CHARACTERS) {
                        return prev;
                    }
                    return [...prev, currentElementId];
                });
                console.log("Moved from pending to selected on editor close");
            }
        }
    };

    // Let's save the selected characters and primary character to localStorage
    // This is a minimal addition to ensure selections persist
    useEffect(() => {
        if (!userId) { // Only for guest users
            try {
                localStorage.setItem('magicstory_selected_characters', JSON.stringify({
                    selectedCharacters,
                    primaryCharacterId
                }));
                console.log("Saved selections to localStorage:", selectedCharacters);
            } catch (err) {
                console.error("Failed to save selections:", err);
            }
        }
    }, [selectedCharacters, primaryCharacterId, userId]);

    // Load saved selections on first load
    useEffect(() => {
        if (!userId && isFirstEntryRef.current) {
            try {
                const savedSelections = localStorage.getItem('magicstory_selected_characters');
                if (savedSelections) {
                    const data = JSON.parse(savedSelections);
                    if (data.selectedCharacters?.length > 0) {
                        setSelectedCharacters(data.selectedCharacters);
                        console.log("Loaded saved selections:", data.selectedCharacters);
                    }
                    if (data.primaryCharacterId) {
                        setPrimaryCharacterId(data.primaryCharacterId);
                        console.log("Loaded saved primary character:", data.primaryCharacterId);
                    }
                }
            } catch (err) {
                console.error("Failed to load saved selections:", err);
            }
        }
    }, [userId]);

    // Store primaryCharacterId in the story creation process
    const handleContinue = () => {
        // First save the primary character to localStorage
        // This ensures it's available for story creation
        if (primaryCharacterId) {
            try {
                localStorage.setItem('magicstory_primary_character', primaryCharacterId);
                console.log("Saved primary character for story:", primaryCharacterId);
            } catch (err) {
                console.error("Failed to save primary character for story:", err);
            }
        }

        // Then proceed to next step
        goToNextStep();
    };

    return (
        <div className="flex flex-col px-6 pb-8 justify-center">
            {/* Hidden file input element */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isAnalyzingImage || isLoading || showAnalyzingUI}
                style={{ display: 'none' }}
                id="character-upload-input"
            />

            <div className="mb-6">
                <SpeechBubble
                    message={displayedText}
                    animateIn={true}
                    heightClass="min-h-[60px]"
                    position="left"
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
                {/* Show analyzing UI when processing an image */}
                {showAnalyzingUI && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6"
                    >
                        <div className="p-6 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-[#4CAF50]/5 flex items-center justify-center mb-4">
                                <div className="w-8 h-8 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-700">Analyzing Image...</h3>
                            <p className="text-gray-500 mt-2">Please wait while we process your image</p>
                        </div>
                    </motion.div>
                )}

                {/* Display characters - ALWAYS shown, regardless of analyzing state */}
                <AnimatePresence>
                    {charactersForDisplay.map((character) => {
                        const isSelected = selectedCharacters.includes(character.id);
                        const isPrimary = character.id === primaryCharacterId;
                        const isSelectable = isSelected || selectedCharacters.length < MAX_CHARACTERS;

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
                                    onClick={() => {
                                        if (!showAnalyzingUI && (isSelectable || isSelected)) {
                                            toggleCharacterSelection(character.id);
                                        }
                                    }}
                                    className={`relative flex items-center p-3 bg-white rounded-xl border-2 ${
                                        isSelected
                                            ? 'border-[#4CAF50] shadow-md'
                                            : 'border-gray-200 shadow-sm'
                                    } ${
                                        !showAnalyzingUI && (isSelectable || isSelected)
                                            ? 'hover:bg-gray-100 cursor-pointer'
                                            : showAnalyzingUI ? 'opacity-50' : 'opacity-70 cursor-not-allowed'
                                    } transition-all`}
                                >
                                    {/* Crown icon in top left with tooltip */}
                                    <div className="absolute -top-2 -left-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!showAnalyzingUI) {
                                                                setPrimaryCharacter(character.id);
                                                            }
                                                        }}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                                                            isPrimary
                                                                ? 'bg-amber-400'
                                                                : 'bg-gray-300 hover:bg-gray-400'
                                                        } ${showAnalyzingUI ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        disabled={showAnalyzingUI}
                                                    >
                                                        <Crown className="w-3.5 h-3.5 text-white" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {isPrimary ? 'Primary character' : 'Set as primary character'}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    <div className="relative w-14 h-14 rounded-md overflow-hidden mr-3 flex-shrink-0">
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

                                        {isSelected && (
                                            <div className="absolute bottom-0 left-0 right-0 h-2 bg-[#4CAF50]"></div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <h4 className="font-medium text-gray-800">
                                                {character.name}
                                            </h4>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-1">
                                            {character.category === 'PET' && <span className="mr-1">🐾</span>}
                                            {character.category === 'OBJECT' && <span className="mr-1">🧸</span>}
                                            {character.description || 'No description'}
                                        </p>
                                    </div>

                                    {/* Edit button - moved to the right */}
                                    <div className="flex items-center">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!showAnalyzingUI) {
                                                    handleEditAttributes(character.id);
                                                }
                                            }}
                                            className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors ${showAnalyzingUI ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            disabled={showAnalyzingUI}
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Show empty state upload area only when no characters exist */}
                {characterCount === 0 && !showAnalyzingUI && (
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

                {/* "Add another character" button - always show when characters exist and not analyzing */}
                {characterCount > 0 && !showAnalyzingUI && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-4"
                    >
                        <button
                            type="button"
                            onClick={triggerFileSelect}
                            disabled={isAnalyzingImage || isLoading || showAnalyzingUI}
                            className={`flex items-center justify-center w-full p-3 rounded-lg border-2 border-gray-200 
                                ${characterCount >= MAX_CHARACTERS || isAnalyzingImage || isLoading || showAnalyzingUI
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-600 hover:bg-gray-100 hover:border-gray-300 cursor-pointer'
                            } transition-colors`}
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            <span>
                                {showAnalyzingUI
                                    ? 'Processing image...'
                                    : characterCount >= MAX_CHARACTERS
                                        ? 'Add (max reached)'
                                        : 'Add another character'
                                }
                            </span>
                        </button>
                    </motion.div>
                )}

                {/* Character count indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 text-center text-sm text-gray-500"
                >
                    <span className={selectedCharacters.length === MAX_CHARACTERS ? 'text-[#4CAF50] font-medium' : ''}>
                        {selectedCharacters.length} / {MAX_CHARACTERS} characters selected
                    </span>
                </motion.div>
            </motion.div>

            {/* Continue button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <Button
                    onClick={handleContinue}
                    disabled={!canProceed || isAnalyzingImage || isLoading || showAnalyzingUI || pendingCharacters.length > 0}
                    className={`w-full py-6 text-lg font-medium rounded-full ${
                        canProceed && !showAnalyzingUI && pendingCharacters.length === 0
                            ? 'bg-[#4CAF50] hover:bg-[#43a047] text-white cursor-pointer shadow-md hover:shadow-lg'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    } transition-all duration-300`}
                >
                    {canProceed ? (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Continue
                        </>
                    ) : 'Select at least one character'}
                </Button>
            </motion.div>

            {/* Character attributes editor with proper category handling */}
            {currentElement && (
                <AttributesEditor
                    isOpen={isEditorOpen}
                    onClose={handleEditorClose}
                    elementId={currentElement.id}
                    elementName={currentElement.name}
                    imageUrl={currentElement.imageUrl}
                    category={currentElement.category as ElementCategory}
                    initialAttributes={attributesData || undefined}
                    onSave={handleSaveAttributes}
                    onNameChange={handleNameChange}
                    isLoading={isLoadingAttributes}
                    isPrimary={currentElement.id === primaryCharacterId}
                    onSetPrimary={setPrimaryCharacter}
                    description={currentElement.description || ''}
                    showToasts={false} // Don't show toasts in the component
                    onDescriptionChange={handleDescriptionChange as (description: string) => Promise<void>}
                />
            )}
        </div>
    );
}