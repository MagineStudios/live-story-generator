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
    addUploadedImage: (file: File, category: ElementCategory) => Promise<void>;
    updateElementDescription: (id: string, description: string) => void;
    setVisualStyle: (style: VisualStyle) => void;
    setThemePrompt: (prompt: string) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;
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

    // Image uploading and analysis
    const addUploadedImage = async (file: File, category: ElementCategory) => {
        try {
            setIsAnalyzingImage(true);

            // First upload the image
            const uploadForm = new FormData();
            uploadForm.append('file', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadForm
            });

            if (!uploadRes.ok) throw new Error('Failed to upload image');
            const { url, publicId } = await uploadRes.json();

            // Then analyze with GPT Vision
            const analyzeRes = await fetch('/api/analyze-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url, category }),
            });

            if (!analyzeRes.ok) throw new Error('Failed to analyze image');
            const { description, recognizedElementId, suggestedName } = await analyzeRes.json();

            // If this is a recognized character, set the recognition flag
            if (recognizedElementId && category === ElementCategory.CHARACTER) {
                // Get the recognized element details
                const response = await fetch(`/api/my-world/elements?id=${recognizedElementId}`);
                if (response.ok) {
                    const { element } = await response.json();
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
            }

            // Generate a temporary ID for client-side use
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Create the new element with GPT-generated description
            const newElement: MyWorldElement = {
                id: tempId,
                name: suggestedName || file.name.split('.')[0],
                description: description || 'A custom element',
                imageUrl: url,
                publicId,
                category,
                isDefault: false,
            };

            // Add to selected elements
            addElement(newElement);

            // Also save to database
            await saveElementToDatabase(newElement);

            return newElement;
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
            const response = await fetch(`/api/story/reroll-image/${pageId}`, {
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
            const response = await fetch(`/api/story/remix-page/${pageId}`, {
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
            const response = await fetch(`/api/story/edit-text/${pageId}`, {
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
            const response = await fetch(`/api/story/save-to-my-world/${pageId}`, {
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
            const response = await fetch(`/api/story/finalize/${generatedStoryId}`, {
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