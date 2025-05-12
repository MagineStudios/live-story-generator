'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ElementCategory } from '@prisma/client';

export type MyWorldElement = {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    publicId?: string;
    category: ElementCategory;
    isDefault: boolean;
    isDetectedInStory?: boolean;
    userId?: string;
    isSelected?: boolean; // UI state only, not in DB
};

export type VisualStyle = {
    id: string;
    name: string;
    imageUrl: string;
};

export type ThemeSuggestion = {
    title: string;
    text: string;
    imageUrl?: string; // Optional image for enhanced theme suggestion
};

interface StoryBuilderState {
    // State
    selectedElements: MyWorldElement[];
    currentStep: number;
    visualStyle?: VisualStyle;
    themePrompt: string;
    themeSuggestions: ThemeSuggestion[];
    isAnalyzingImage: boolean;
    isGeneratingStory: boolean;
    isLoadingSuggestions: boolean;
    generatedStoryId?: string;
    recognizedCharacter?: { id: string; name: string; imageUrl: string };
    detectedElements: MyWorldElement[]; // Elements detected in the story

    // Actions/Methods
    addElement: (el: MyWorldElement) => void;
    removeElement: (id: string) => void;
    clearAllElements: () => void;
    addUploadedImage: (file: File, category: ElementCategory) => Promise<MyWorldElement | undefined>;    updateElementDescription: (id: string, description: string) => void;
    setVisualStyle: (style: VisualStyle) => void;
    setThemePrompt: (prompt: string) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;
    updateElementName: (id: string, name: string) => void;
    setCurrentStep: (step: number) => void;
    generateThemeSuggestions: () => Promise<void>;
    createStory: () => Promise<string | undefined>;
    acknowledgeRecognizedCharacter: () => void;
    saveDetectedElement: (element: MyWorldElement) => Promise<void>;
    rerollImage: (pageId: string) => Promise<void>;
    remixStoryPage: (pageId: string, prompt: string) => Promise<void>;
    editStoryText: (pageId: string, text: string) => Promise<void>;
    saveImageToMyWorld: (pageId: string) => Promise<void>;
    finalizeStory: () => Promise<void>; // For printing or final save
    getElementsByCategory: (category: ElementCategory) => MyWorldElement[];
}

const StoryBuilderContext = createContext<StoryBuilderState | undefined>(undefined);

const MAX_STEPS = 5; // Total number of steps in the wizard

export function StoryBuilderProvider({ children }: { children: ReactNode }) {
    // Core wizard state
    const [selectedElements, setSelectedElements] = useState<MyWorldElement[]>([]);
    const [visualStyle, _setVisualStyle] = useState<VisualStyle>();
    const [themePrompt, _setThemePrompt] = useState<string>('');
    const [themeSuggestions, setThemeSuggestions] = useState<ThemeSuggestion[]>([]);
    const [currentStep, _setCurrentStep] = useState<number>(0);

    // Processing state
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    // Result state
    const [generatedStoryId, setGeneratedStoryId] = useState<string>();
    const [recognizedCharacter, setRecognizedCharacter] = useState<{id: string; name: string; imageUrl: string}>();
    const [detectedElements, setDetectedElements] = useState<MyWorldElement[]>([]);

    // Element management functions
    const addElement = (el: MyWorldElement) => setSelectedElements(curr => {
        if (curr.find(e => e.id === el.id)) return curr;
        return [...curr, {...el, isSelected: true}];
    });

    const removeElement = (id: string) => {
        setSelectedElements(curr => curr.filter(e => e.id !== id));
    };

    const clearAllElements = () => {
        setSelectedElements([]);
    };

    const updateElementDescription = (id: string, description: string) => {
        setSelectedElements(curr =>
            curr.map(el => el.id === id ? {...el, description} : el)
        );
    };

    const updateElementName = (id: string, name: string) => {
        setSelectedElements(curr =>
            curr.map(el => el.id === id ? {...el, name} : el)
        );
    };

    // Image uploading and analysis
    const addUploadedImage = async (file: File, category: ElementCategory) => {
        try {
            setIsAnalyzingImage(true);

            // First upload the image
            const uploadForm = new FormData();
            uploadForm.append('file', file);
            uploadForm.append('category', category);

            const uploadRes = await fetch('/api/images/upload', {
                method: 'POST',
                body: uploadForm
            });

            if (!uploadRes.ok) throw new Error('Failed to upload image');
            const { url, publicId, elementId } = await uploadRes.json();
            console.log("Uploaded element ID:", elementId);

            // Then analyze with GPT Vision
            const analyzeRes = await fetch('/api/images/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: url,
                    category,
                    elementId // Pass the element ID for updating
                }),
            });

            if (!analyzeRes.ok) throw new Error('Failed to analyze image');
            const { description, recognizedElementId, suggestedName } = await analyzeRes.json();
            console.log("Image analyzed, description:", description);

            // If this is a recognized character, set the recognition flag
            if (recognizedElementId && category === ElementCategory.CHARACTER) {
                try {
                    // Get the recognized element details
                    const response = await fetch(`/api/my-world/elements/${recognizedElementId}`);
                    if (response.ok) {
                        const data = await response.json();
                        // Handle both response formats
                        const element = data.element || data;

                        if (element) {
                            setRecognizedCharacter({
                                id: element.id,
                                name: element.name,
                                imageUrl: element.imageUrl
                            });
                            // We return early, not adding a new element
                            return;
                        }
                    }
                } catch (error) {
                    console.error("Error fetching recognized character:", error);
                    // Continue with the rest of the function in case of error
                }
            }

            try {
                console.log("Fetching element with ID:", elementId);
                // Now fetch the complete element that has been updated with the description
                const elementRes = await fetch(`/api/my-world/elements/${elementId}`);
                console.log("Element response status:", elementRes.status);

                if (elementRes.ok) {
                    const data = await elementRes.json();
                    console.log("Element response data:", data);

                    // Handle both response formats
                    const element = data.element || data;

                    if (element) {
                        console.log("Adding element to selected elements:", element);
                        // Add the updated element to the selected elements
                        addElement({
                            ...element,
                            isSelected: true
                        });
                        return element;
                    } else {
                        console.error("Element data is missing or invalid:", data);
                        throw new Error("Invalid element data received");
                    }
                } else {
                    throw new Error(`Failed to get updated element: ${elementRes.status}`);
                }
            } catch (error) {
                console.error("Error fetching updated element:", error);

                // Fallback - create a basic element with what we know
                console.log("Creating fallback element with description:", description);
                const fallbackElement = {
                    id: elementId,
                    name: suggestedName || `My ${category.toLowerCase()}`,
                    description: description || '',
                    imageUrl: url,
                    publicId: publicId,
                    category: category,
                    isDefault: false,
                    isSelected: true
                };

                console.log("Using fallback element:", fallbackElement);
                addElement(fallbackElement);
                return fallbackElement;
            }
        } catch (error) {
            console.error("Failed to process uploaded image:", error);
            throw error;
        } finally {
            setIsAnalyzingImage(false);
        }
    };

    const saveElementToDatabase = async (element: MyWorldElement) => {
        try {
            const response = await fetch('/api/my-world/elements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: element.name,
                    description: element.description,
                    imageUrl: element.imageUrl,
                    publicId: element.publicId,
                    category: element.category,
                    isDetectedInStory: element.isDetectedInStory || false
                }),
            });

            if (!response.ok) throw new Error('Failed to save element');

            const savedElement = await response.json();
            return savedElement;
        } catch (error) {
            console.error('Error saving element:', error);
            throw error;
        }
    };

    const saveDetectedElement = async (element: MyWorldElement) => {
        try {
            const savedElement = await saveElementToDatabase(element);
            // Add to detected elements if it was detected in a story
            if (element.isDetectedInStory) {
                setDetectedElements(curr => [...curr, savedElement]);
            }
            return savedElement;
        } catch (error) {
            console.error('Error saving detected element:', error);
            throw error;
        }
    };

    const acknowledgeRecognizedCharacter = () => {
        setRecognizedCharacter(undefined);
    };

    // Basic setters and navigation
    const setVisualStyle = (style: VisualStyle) => _setVisualStyle(style);
    const setThemePrompt = (prompt: string) => _setThemePrompt(prompt);
    const setCurrentStep = (step: number) => _setCurrentStep(step);

    const goToNextStep = () => {
        _setCurrentStep(current => Math.min(current + 1, MAX_STEPS - 1));
    };

    const goToPrevStep = () => {
        _setCurrentStep(current => Math.max(current - 1, 0));
    };

    // Theme and story generation
    const generateThemeSuggestions = async () => {
        if (!visualStyle) return;

        try {
            setIsLoadingSuggestions(true);

            const response = await fetch('/api/story/theme-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedElements,
                    visualStyle
                }),
            });

            if (!response.ok) throw new Error('Failed to get theme suggestions');

            const { suggestions } = await response.json();
            setThemeSuggestions(suggestions || []);
        } catch (error) {
            console.error('Error generating theme suggestions:', error);
            // Set some fallback suggestions
            setThemeSuggestions([
                {
                    title: "Adventure",
                    text: `An exciting ${visualStyle.name} adventure that will captivate young minds.`
                },
                {
                    title: "Friendship",
                    text: `A heartwarming ${visualStyle.name} story about making friends and working together.`
                },
                {
                    title: "Discovery",
                    text: `A journey of discovery in ${visualStyle.name} style with unexpected surprises.`
                }
            ]);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const createStory = async () => {
        if (!visualStyle || !themePrompt) return;

        try {
            setIsGeneratingStory(true);

            const response = await fetch('/api/story/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedElements,
                    visualStyle,
                    themePrompt
                }),
            });

            if (!response.ok) throw new Error('Failed to create story');

            const { storyId } = await response.json();
            setGeneratedStoryId(storyId);
            return storyId;
        } catch (error) {
            console.error('Error creating story:', error);
        } finally {
            setIsGeneratingStory(false);
        }
    };

    // Story editing functions
    const rerollImage = async (pageId: string) => {
        try {
            // API call to regenerate the image for a specific page
            const response = await fetch(`/api/story/pages/${pageId}/reroll`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to regenerate image');

            // You might want to update local state here if applicable
        } catch (error) {
            console.error('Error regenerating image:', error);
        }
    };

    const remixStoryPage = async (pageId: string, prompt: string) => {
        try {
            // API call to remix/update a page with additional prompting
            const response = await fetch(`/api/story/pages/${pageId}/remix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) throw new Error('Failed to remix page');

            // You might want to update local state here if applicable
        } catch (error) {
            console.error('Error remixing page:', error);
        }
    };

    const editStoryText = async (pageId: string, text: string) => {
        try {
            // API call to edit the text of a specific page
            const response = await fetch(`/api/story/pages/${pageId}/edit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error('Failed to update text');

            // You might want to update local state here if applicable
        } catch (error) {
            console.error('Error updating text:', error);
        }
    };

    const saveImageToMyWorld = async (pageId: string) => {
        try {
            // API call to save an image from a story page to My World
            const response = await fetch(`/api/story/pages/${pageId}/save-to-my-world`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to save to My World');

            const { element } = await response.json();

            // Add to detected elements
            setDetectedElements(curr => [...curr, element]);
        } catch (error) {
            console.error('Error saving to My World:', error);
        }
    };

    const finalizeStory = async () => {
        try {
            // API call to finalize the story (e.g., generate PDF, prepare for print)
            const response = await fetch(`/api/story/${generatedStoryId}/finalize`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to finalize story');

            const { pdfUrl } = await response.json();

            // You might want to handle the PDF URL here (e.g., open in new tab)
            window.open(pdfUrl, '_blank');
        } catch (error) {
            console.error('Error finalizing story:', error);
        }
    };

    // Utility functions
    const getElementsByCategory = (category: ElementCategory) =>
        selectedElements.filter(el => el.category === category);

    return (
        <StoryBuilderContext.Provider
            value={{
                selectedElements,
                visualStyle,
                themePrompt,
                themeSuggestions,
                currentStep,
                isAnalyzingImage,
                isGeneratingStory,
                isLoadingSuggestions,
                generatedStoryId,
                recognizedCharacter,
                detectedElements,
                updateElementName,
                addElement,
                removeElement,
                clearAllElements,
                addUploadedImage,
                updateElementDescription,
                setVisualStyle,
                setThemePrompt,
                goToNextStep,
                goToPrevStep,
                setCurrentStep,
                generateThemeSuggestions,
                createStory,
                acknowledgeRecognizedCharacter,
                saveDetectedElement,
                rerollImage,
                remixStoryPage,
                editStoryText,
                saveImageToMyWorld,
                finalizeStory,
                getElementsByCategory,
            }}>
            {children}
        </StoryBuilderContext.Provider>
    );
}

export function useStoryBuilder() {
    const ctx = useContext(StoryBuilderContext);
    if (!ctx) throw new Error('useStoryBuilder must be inside provider');
    return ctx;
}