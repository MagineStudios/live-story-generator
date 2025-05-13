'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ElementCategory } from '@prisma/client';
import { useAuth } from '@clerk/nextjs';  // Clerk hook to detect logged-in user
import type { OnboardingSession } from '@prisma/client';

// Types for MyWorld elements and visual styles
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
    tempId?: string;
    isSelected?: boolean;
};
type VisualStyle = { id: string; name: string; imageUrl: string };

// Context state shape
interface OnboardingState {
    // Onboarding answers
    storyGoal: string[];
    tone: string[];
    selectedElements: MyWorldElement[];
    uploadedElements: MyWorldElement[];  // all uploaded elements (selected or not)
    visualStyle?: VisualStyle;
    themePrompt: string;
    themeSuggestions: { title: string; text: string; imageUrl?: string }[];
    currentStep: number;
    // Loading/generation flags
    isLoadingSuggestions: boolean;
    isAnalyzingImage: boolean;
    isGeneratingStory: boolean;
    generatedStoryId?: string;
    // Actions
    setStoryGoal: (goals: string[]) => void;
    setTone: (tones: string[]) => void;
    addElement: (el: MyWorldElement) => void;
    removeElement: (id: string) => void;
    clearAllElements: () => void;
    addUploadedImage: (file: File, category: ElementCategory) => Promise<MyWorldElement | undefined>;
    updateElementName: (id: string, name: string) => void;
    updateElementDescription: (id: string, description: string) => void;
    setVisualStyle: (style: VisualStyle) => void;
    setThemePrompt: (prompt: string) => void;
    generateThemeSuggestions: () => Promise<void>;
    createStory: () => Promise<string | undefined>;
    goToNextStep: () => void;
    goToPrevStep: () => void;
}

// Create context
const OnboardingContext = createContext<OnboardingState | undefined>(undefined);

// Custom hook to use the context
export function useOnboarding() {
    const ctx = useContext(OnboardingContext);
    if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
    return ctx;
}

// OnboardingProvider component
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const { userId } = useAuth();  // Clerk user ID (if logged in)
    const MAX_STEPS = 8;          // Total steps: 0-7 in the wizard

    // Determine or generate a tempId for guest sessions only
    const [tempId, setTempId] = useState<string | null>(null);
    useEffect(() => {
        if (!userId) {
            let storedTemp = localStorage.getItem('magicstory_tempId');
            if (!storedTemp) {
                storedTemp = `temp_${crypto.randomUUID()}`;  // generate unique tempId
                localStorage.setItem('magicstory_tempId', storedTemp);
            }
            setTempId(storedTemp);
        }
    }, [userId]);

    // Onboarding state variables
    const [storyGoal, _setStoryGoal] = useState<string[]>([]);
    const [tone, _setTone] = useState<string[]>([]);
    const [selectedElements, setSelectedElements] = useState<MyWorldElement[]>([]);
    const [uploadedElements, setUploadedElements] = useState<MyWorldElement[]>([]);
    const [visualStyle, _setVisualStyle] = useState<VisualStyle | undefined>();
    const [themePrompt, _setThemePrompt] = useState<string>('');
    const [themeSuggestions, setThemeSuggestions] = useState<Array<{ title: string; text: string; imageUrl?: string }>>([]);
    const [currentStep, _setCurrentStep] = useState<number>(0);
    // Loading flags
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const [generatedStoryId, setGeneratedStoryId] = useState<string | undefined>();

    // Persist onboarding preferences for signed-in users
    function saveOnboardingPrefs(prefs: Partial<OnboardingSession>) {
      if (!userId) return;
      fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      }).catch(console.error);
    }

    // Hydrate state from localStorage on initial render (for returning guest)
    useEffect(() => {
        try {
            const saved = localStorage.getItem('magicstory_onboarding');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.storyGoal) {
                    if (Array.isArray(data.storyGoal)) {
                        _setStoryGoal(data.storyGoal);
                    } else if (typeof data.storyGoal === 'string') {
                        _setStoryGoal([data.storyGoal]);
                    }
                }
                if (data.tone) {
                    if (Array.isArray(data.tone)) {
                        _setTone(data.tone);
                    } else if (typeof data.tone === 'string') {
                        _setTone([data.tone]);
                    }
                }
                if (data.selectedElements) setSelectedElements(data.selectedElements);
                if (data.uploadedElements) setUploadedElements(data.uploadedElements);
                if (data.visualStyle) _setVisualStyle(data.visualStyle);
                if (data.themePrompt) _setThemePrompt(data.themePrompt);
                if (data.themeSuggestions) setThemeSuggestions(data.themeSuggestions);
                if (data.currentStep !== undefined) _setCurrentStep(data.currentStep);
            }
        } catch (err) {
            console.warn('Failed to parse saved onboarding data:', err);
        }
    }, []);

    // Persist state to localStorage whenever it changes (for guest persistence)
    useEffect(() => {
        const data = {
            storyGoal,
            tone,
            selectedElements,
            uploadedElements,
            visualStyle,
            themePrompt,
            themeSuggestions,
            currentStep,
        };
        try {
            localStorage.setItem('magicstory_onboarding', JSON.stringify(data));
        } catch (err) {
            console.error('Failed to save onboarding state:', err);
        }
    }, [storyGoal, tone, selectedElements, uploadedElements, visualStyle, themePrompt, themeSuggestions, currentStep]);

    // Context action: set story goal
    const setStoryGoal = (goals: string[]) => {
        _setStoryGoal(goals);
        saveOnboardingPrefs({ storyGoal: goals });
    };
    // Context action: set tone
    const setTone = (tones: string[]) => {
        _setTone(tones);
        saveOnboardingPrefs({ tone: tones });
    };

    // Add a MyWorld element to the selected list
    const addElement = (element: MyWorldElement) => {
        setSelectedElements(curr => {
            // Avoid duplicates
            if (curr.find(el => el.id === element.id)) return curr;
            return [...curr, element];
        });
    };

    // Remove an element from selection
    const removeElement = (id: string) => {
        setSelectedElements(curr => curr.filter(el => el.id !== id));
    };

    // Clear all selected elements
    const clearAllElements = () => {
        setSelectedElements([]);
    };

    // Update element name in selected (e.g., after editing)
    const updateElementName = (id: string, name: string) => {
        setSelectedElements(curr =>
            curr.map(el => (el.id === id ? { ...el, name } : el))
        );
        // Also update in uploadedElements list
        setUploadedElements(curr =>
            curr.map(el => (el.id === id ? { ...el, name } : el))
        );
    };

    // Update element description in selected list
    const updateElementDescription = (id: string, description: string) => {
        setSelectedElements(curr =>
            curr.map(el => (el.id === id ? { ...el, description } : el))
        );
        // Update in uploadedElements as well
        setUploadedElements(curr =>
            curr.map(el => (el.id === id ? { ...el, description } : el))
        );
    };

    // Set visual style (selected art style for the story)
    const setVisualStyle = (style: VisualStyle) => {
        _setVisualStyle(style);
        // Clear any existing theme suggestions when style changes
        setThemeSuggestions([]);
        _setThemePrompt('');
    };

    // Set custom story prompt text
    const setThemePrompt = (prompt: string) => {
        _setThemePrompt(prompt);
    };

    // Navigation: go to the next step
    const goToNextStep = () => {
        _setCurrentStep(curr => Math.min(curr + 1, MAX_STEPS - 1));
    };
    // Navigation: go to previous step
    const goToPrevStep = () => {
        _setCurrentStep(curr => Math.max(curr - 1, 0));
    };

    // Upload a new image (character/pet/location/object) and analyze it via AI
    const addUploadedImage = async (file: File, category: ElementCategory): Promise<MyWorldElement | undefined> => {
        if (!file) return undefined;
        try {
            setIsAnalyzingImage(true);
            // Prepare form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            if (tempId) {
                formData.append('tempId', tempId);
            }

            // 1. Upload image to Cloudinary and create a MyWorldElement (guest if no userId)
            const uploadRes = await fetch('/api/images/upload', { method: 'POST', body: formData });
            if (!uploadRes.ok) throw new Error('Image upload failed');
            const { url, publicId, elementId } = await uploadRes.json();
            console.log('Uploaded image. Element ID:', elementId);

            // 2. Analyze image with AI (e.g., GPT Vision) to get description (and suggested name)
            const analyzeRes = await fetch('/api/images/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url, category, elementId })
            });
            if (!analyzeRes.ok) throw new Error('Image analysis failed');
            const { description, suggestedName, recognizedElementId } = await analyzeRes.json();
            console.log('Image analyzed. Description:', description, 'Suggested name:', suggestedName, 'Recognized ID:', recognizedElementId);

            // If the uploaded image matches a known default character and was recognized (e.g., user uploaded an existing character),
            // we will not create a duplicate. Instead, we can handle that separately (not common in onboarding, so skip for now).

            // 3. Fetch the updated element from backend (with description filled in). For guest users, this may be unauthorized,
            // so we'll handle via the fallback if fetch fails.
            let newElement: MyWorldElement | null = null;
            try {
                const elementRes = await fetch(`/api/my-world/elements/${elementId}`);
                if (elementRes.ok) {
                    const data = await elementRes.json();
                    newElement = data.element || data;
                }
            } catch (err) {
                console.warn('Unable to fetch element details (likely guest mode). Using local data.');
            }
            if (!newElement) {
                // Construct element object manually as fallback
                newElement = {
                    id: elementId,
                    name: suggestedName || `My ${category.toLowerCase()}`,
                    description: description || '',
                    imageUrl: url,
                    publicId: publicId,
                    category: category,
                    isDefault: false,
                    userId: userId || undefined,
                    tempId: userId ? undefined : tempId || undefined,
                };
            }
            // Add to state: mark as selected and add to library
            newElement.isSelected = true;
            addElement(newElement);
            setUploadedElements(prev => [...prev, newElement as MyWorldElement]);
            return newElement;
        } catch (error) {
            console.error('Upload and analysis error:', error);
            // (Optionally) display an error toast to the user
            return undefined;
        } finally {
            setIsAnalyzingImage(false);
        }
    };

    // Generate theme suggestions for the story prompt based on selected elements and style
    const generateThemeSuggestions = async () => {
        if (!visualStyle) return;
        try {
            setIsLoadingSuggestions(true);
            const res = await fetch('/api/story/theme-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedElements,
                    visualStyle,
                    tone // you could include tone to tailor suggestions
                }),
            });
            if (!res.ok) throw new Error('Failed to fetch theme suggestions');
            const { suggestions } = await res.json();
            setThemeSuggestions(suggestions || []);
        } catch (error) {
            console.error('Error getting theme suggestions:', error);
            // Provide some fallback suggestions
            setThemeSuggestions([
                { title: "Adventure", text: `An exciting ${visualStyle.name} adventure that sparks imagination.` },
                { title: "Friendship", text: `A heartwarming ${visualStyle.name} tale about friendship and teamwork.` },
                { title: "Discovery", text: `A curious ${visualStyle.name} journey full of discoveries and surprises.` }
            ]);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    // Create/generate the story based on current selections (returns a story ID if successful)
    const createStory = async (): Promise<string | undefined> => {
        if (!visualStyle || !themePrompt.trim()) return undefined;
        try {
            setIsGeneratingStory(true);
            const response = await fetch('/api/story/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: themePrompt,
                    styleId: visualStyle.id,
                    styleName: visualStyle.name,
                    // Include optional context parameters (goal, tone, selected element IDs) to guide generation
                    tone: tone || undefined,
                    // We can pass character names or descriptions as part of prompt if needed, but skip for now
                    tempId: userId ? undefined : tempId  // include tempId for guest story
                })
            });
            if (!response.ok) throw new Error('Story creation failed');
            const data = await response.json();
            const newStoryId = data.storyId || data.id;  // API might return storyId or id
            setGeneratedStoryId(newStoryId);
            console.log('Story created with ID:', newStoryId);
            return newStoryId;
        } catch (error) {
            console.error('Error creating story:', error);
            // Handle error (e.g., show notification)
            return undefined;
        } finally {
            setIsGeneratingStory(false);
        }
    };

    // Provide the context value to children
    const value: OnboardingState = {
        storyGoal,
        tone,
        selectedElements,
        uploadedElements,
        visualStyle,
        themePrompt,
        themeSuggestions,
        currentStep,
        isLoadingSuggestions,
        isAnalyzingImage,
        isGeneratingStory,
        generatedStoryId,
        setStoryGoal,
        setTone,
        addElement,
        removeElement,
        clearAllElements,
        addUploadedImage,
        updateElementName,
        updateElementDescription,
        setVisualStyle,
        setThemePrompt,
        generateThemeSuggestions,
        createStory,
        goToNextStep,
        goToPrevStep,
    };

    // **Migration after signup**: if the user has just signed up (userId now exists), we have guest data, and a story has been generated, trigger migration.
    useEffect(() => {
        if (userId && tempId && generatedStoryId) {
            // When a guest signs up, migrate their onboarding data to their new account
            const migrateData = async () => {
                try {
                    const res = await fetch('/api/onboarding/migrate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tempId,
                            storyId: generatedStoryId,
                            storyGoal,
                            tone
                        })
                    });
                    if (!res.ok) {
                        const text = await res.text();
                        console.error('Migration failed:', text);
                        return;
                    }
                    console.log('Onboarding data migrated to user account.');
                    // Clear temp data from localStorage after successful migration
                    localStorage.removeItem('magicstory_onboarding');
                    localStorage.removeItem('magicstory_tempId');
                } catch (err) {
                    console.error('Error migrating onboarding data:', err);
                }
            };
            migrateData();
        }
    }, [userId, tempId, generatedStoryId]);

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}