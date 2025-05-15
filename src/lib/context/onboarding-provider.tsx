'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ElementCategory, StoryStatus } from '@prisma/client';
import { useAuth } from '@clerk/nextjs';
import type { OnboardingSession, MyWorldElement } from '@prisma/client';
import { toast } from 'sonner';

// Add isPrimary to our internal element type
type EnhancedMyWorldElement = MyWorldElement & {
    isPrimary?: boolean | null;
};

type VisualStyle = {
    id: string;
    name: string;
    imageUrl: string;
    // UI-only properties (not saved to database)
    color?: string;
    textColor?: string;
    description?: string;
};

// Context state shape
interface OnboardingState {
    // Onboarding answers
    storyGoal: string[];
    tone: string[];
    tempId: string | null;
    selectedElements: EnhancedMyWorldElement[];
    uploadedElements: EnhancedMyWorldElement[];
    visualStyle?: VisualStyle;
    themePrompt: string;
    themeSuggestions: { title: string; text: string; imageUrl?: string }[];
    currentStep: number;
    primaryCharacterId: string | null;
    // Loading/generation flags
    isLoadingSuggestions: boolean;
    isAnalyzingImage: boolean;
    isGeneratingStory: boolean;
    generatedStoryId: string | undefined;
    // Generation status tracking
    isGenerating: boolean;
    generationProgress: number;
    generationError: string | null;
    // Actions
    setGeneratedStoryId: (id: string | undefined) => void;
    setStoryGoal: (goals: string[]) => void;
    setTone: (tones: string[]) => void;
    addElement: (el: EnhancedMyWorldElement) => void;
    removeElement: (id: string) => void;
    clearAllElements: () => void;
    addUploadedImage: (file: File, category: ElementCategory) => Promise<EnhancedMyWorldElement | undefined>;
    updateElementName: (id: string, name: string) => void;
    updateElementDescription: (id: string, description: string) => void;
    setPrimaryCharacter: (id: string | null) => void;
    setVisualStyle: (style: VisualStyle) => void;
    setThemePrompt: (prompt: string) => void;
    generateThemeSuggestions: () => Promise<void>;
    createStory: () => Promise<{ id: string; status: string } | undefined>;
    goToNextStep: () => void;
    goToPrevStep: () => void;
    // Error handling
    setGenerationError: (error: string | null) => void;
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
    const { userId } = useAuth();
    const MAX_STEPS = 11;

    // Determine or generate a tempId for guest sessions only
    const [tempId, setTempId] = useState<string | null>(null);
    useEffect(() => {
        if (userId) {
            // If user logs in, clear tempId and local storage
            setTempId(null);
            localStorage.removeItem('magicstory_tempId');
            localStorage.removeItem('magicstory_onboarding');
        } else {
            // Guest user: use or create tempId
            let storedTemp = localStorage.getItem('magicstory_tempId');
            if (!storedTemp) {
                storedTemp = `temp_${crypto.randomUUID()}`;
                localStorage.setItem('magicstory_tempId', storedTemp);
            }
            setTempId(storedTemp);
        }
    }, [userId]);

    // Onboarding state variables
    const [storyGoal, _setStoryGoal] = useState<string[]>([]);
    const [tone, _setTone] = useState<string[]>([]);
    const [selectedElements, setSelectedElements] = useState<EnhancedMyWorldElement[]>([]);
    const [uploadedElements, setUploadedElements] = useState<EnhancedMyWorldElement[]>([]);
    const [visualStyle, _setVisualStyle] = useState<VisualStyle | undefined>();
    const [themePrompt, _setThemePrompt] = useState<string>('');
    const [themeSuggestions, setThemeSuggestions] = useState<Array<{ title: string; text: string; imageUrl?: string }>>([]);
    const [currentStep, _setCurrentStep] = useState<number>(0);
    const [primaryCharacterId, _setPrimaryCharacterId] = useState<string | null>(null);

    // Loading flags
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const [generatedStoryId, setGeneratedStoryId] = useState<string | undefined>();

    // Story generation tracking
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Set primary character (new function)
    const setPrimaryCharacter = useCallback((id: string | null) => {
        _setPrimaryCharacterId(id);

        // Update isPrimary flag on all elements
        setSelectedElements(prev =>
            prev.map(element => ({
                ...element,
                isPrimary: element.id === id
            }))
        );

        // Also update in uploadedElements
        setUploadedElements(prev =>
            prev.map(element => ({
                ...element,
                isPrimary: element.id === id
            }))
        );
    }, []);

    // Load onboarding data for logged in users
    useEffect(() => {
        if (!userId) return;
        (async () => {
            try {
                const res = await fetch('/api/onboarding/fetch');
                if (!res.ok) throw new Error('Failed to load onboarding data');
                const data = await res.json();
                if (data.storyGoal) _setStoryGoal(data.storyGoal);
                if (data.tone) _setTone(data.tone);
                if (data.currentStep !== undefined) _setCurrentStep(data.currentStep);
            } catch (err) {
                console.error('Onboarding fetch error:', err);
            }
        })();
    }, [userId]);

    // Context action: set story goal
    const setStoryGoal = useCallback((goals: string[]) => {
        _setStoryGoal(goals);
        saveOnboardingPrefs({ storyGoal: goals });
    }, [storyGoal, saveOnboardingPrefs]);

    // Context action: set tone
    const setTone = useCallback((tones: string[]) => {
        _setTone(tones);
        saveOnboardingPrefs({ tone: tones });
    }, [tone, saveOnboardingPrefs]);

    // Add a MyWorld element to the selected list
    const addElement = useCallback((element: EnhancedMyWorldElement) => {
        setSelectedElements(curr => {
            // Avoid duplicates
            if (curr.find(el => el.id === element.id)) return curr;

            // If this is the first character added, make it primary by default
            if (curr.length === 0 && !primaryCharacterId &&
                (element.category === 'CHARACTER' || element.category === 'PET')) {
                setPrimaryCharacter(element.id);
                // Include isPrimary flag directly
                return [...curr, {...element, isPrimary: true}];
            }

            return [...curr, element];
        });
    }, []);

    // Remove an element from selection
    const removeElement = useCallback((id: string) => {
        // Check if we're removing the primary character
        const isPrimaryElement = primaryCharacterId === id;

        setSelectedElements(curr => {
            const filtered = curr.filter(el => el.id !== id);

            // If we removed the primary character, set the first available character as primary
            if (isPrimaryElement && filtered.length > 0) {
                const firstCharacter = filtered.find(
                    el => el.category === 'CHARACTER' || el.category === 'PET'
                );
                if (firstCharacter) {
                    setPrimaryCharacter(firstCharacter.id);
                }
            }

            return filtered;
        });

        // If we removed the primary character and have no more elements, clear primaryCharacterId
        if (isPrimaryElement) {
            const remainingElements = selectedElements.filter(el => el.id !== id);
            const hasEligibleElements = remainingElements.some(
                el => el.category === 'CHARACTER' || el.category === 'PET'
            );

            if (!hasEligibleElements) {
                setPrimaryCharacter(null);
            }
        }
    }, []);

    // Clear all selected elements
    const clearAllElements = useCallback(() => {
        setSelectedElements([]);
        setPrimaryCharacter(null);
    }, []);

    // Update element name in selected (e.g., after editing)
    const updateElementName = useCallback((id: string, name: string) => {
        setSelectedElements(curr =>
            curr.map(el => (el.id === id ? { ...el, name } : el))
        );
        // Also update in uploadedElements list
        setUploadedElements(curr =>
            curr.map(el => (el.id === id ? { ...el, name } : el))
        );
    }, []);

    // Update element description in selected list
    const updateElementDescription = useCallback((id: string, description: string) => {
        setSelectedElements(curr =>
            curr.map(el => (el.id === id ? { ...el, description } : el))
        );
        // Update in uploadedElements as well
        setUploadedElements(curr =>
            curr.map(el => (el.id === id ? { ...el, description } : el))
        );
    }, []);

    // Set visual style (selected art style for the story)
    const setVisualStyle = useCallback((style: VisualStyle) => {
        _setVisualStyle(style);
        // Clear any existing theme suggestions when style changes
        setThemeSuggestions([]);
        _setThemePrompt('');

        // Save the style ID to the database for logged-in users
        if (userId) {
            saveOnboardingPrefs({ visualStyleId: style.id });
        }
    }, [userId, saveOnboardingPrefs]);

    // Set custom story prompt text
    const setThemePrompt = useCallback((prompt: string) => {
        _setThemePrompt(prompt);
    }, []);

    // Navigation: go to the next step
    const goToNextStep = useCallback(() => {
        _setCurrentStep(curr => {
            const next = Math.min(curr + 1, MAX_STEPS - 1);
            saveOnboardingPrefs({ currentStep: next });
            return next;
        });
    }, [saveOnboardingPrefs]);

    // Navigation: go to previous step
    const goToPrevStep = useCallback(() => {
        _setCurrentStep(curr => {
            const prev = Math.max(curr - 1, 0);
            saveOnboardingPrefs({ currentStep: prev });
            return prev;
        });
    }, [saveOnboardingPrefs]);

    // Persist onboarding preferences for signed-in users
    const debouncedSave = React.useCallback(
        debounce((prefs: Partial<OnboardingSession>) => {
            if (!userId) return;

            fetch('/api/onboarding/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs),
            }).catch(console.error);
        }, 1000), // 1 second debounce
        [userId]
    );

    function saveOnboardingPrefs(prefs: Partial<OnboardingSession>) {
        if (!userId) return;
        debouncedSave(prefs);
    }

    // Upload a new image (character/pet/location/object) and analyze it via AI
    const addUploadedImage = useCallback(async (file: File, category: ElementCategory = 'CHARACTER') => {
        setIsAnalyzingImage(true);

        try {
            // Create form data for the upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category); // Pass the detected category

            // Add tempId if the user is not logged in (guest mode)
            if (!userId && tempId) {
                formData.append('tempId', tempId);
            }

            // Upload the file with the detected category
            const response = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();

            // Create an element object from the upload response
            const newElement: EnhancedMyWorldElement = {
                id: data.elementId,
                name: data.name || `My ${category.toLowerCase()}`,
                description: '',
                imageUrl: data.url,
                category: category,
                publicId: data.public_id,
                isDetectedInStory: false,
                isDefault: false,
                userId: userId || null,
                tempId: userId ? null : tempId,
                createdAt: new Date(),
                updatedAt: new Date(),
                isPrimary: false, // Default to not primary
            };

            // If this is the first element and it's a character or pet, make it primary
            if (selectedElements.length === 0 &&
                (category === 'CHARACTER' || category === 'PET')) {
                newElement.isPrimary = true;
                _setPrimaryCharacterId(newElement.id);
            }

            // Add the new element to the state
            setUploadedElements(prev => [...prev, newElement]);

            // Analyze the image to get detailed attributes
            const analysisResponse = await fetch('/api/images/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageUrl: data.url,
                    category: category,
                    elementId: data.elementId,
                }),
            });

            if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();

                // Update element with analysis data
                const updatedElement: EnhancedMyWorldElement = {
                    ...newElement,
                    name: analysisData.suggestedName || newElement.name,
                    description: analysisData.description || '',
                };

                // Update the element in state
                setUploadedElements(prev =>
                    prev.map(el => el.id === newElement.id ? updatedElement : el)
                );

                return updatedElement;
            }

            return newElement;
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Upload failed', {
                description: 'Failed to upload and analyze the image.'
            });
            throw error;
        } finally {
            setIsAnalyzingImage(false);
        }
    }, [tempId, userId, selectedElements]);

    // Generate theme suggestions
    const generateThemeSuggestions = useCallback(async () => {
        if (!visualStyle) return;

        try {
            setIsLoadingSuggestions(true);
            const res = await fetch('/api/story/theme-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedElements,
                    visualStyle,
                    tone,
                    primaryCharacterId
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

            toast.error('Failed to get theme suggestions', {
                description: 'Using default suggestions instead'
            });
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [visualStyle, selectedElements, tone, primaryCharacterId]);

    // Create/generate the story based on current selections
    const createStory = useCallback(async (): Promise<{ id: string; status: string } | undefined> => {
        setIsGenerating(true);
        setGenerationError(null);
        setGenerationProgress(0);
        setIsGeneratingStory(true);

        try {
            if (!visualStyle || !themePrompt) {
                throw new Error('Missing required story information');
            }

            // Log the request data for debugging
            console.log('Creating story with:', {
                prompt: themePrompt,
                styleId: visualStyle.id,
                styleName: visualStyle.name,
                tone,
                primaryCharacterId
            });

            const response = await fetch('/api/story/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: themePrompt,
                    styleId: visualStyle.id,
                    styleName: visualStyle.name,
                    tone: tone || [],
                    primaryCharacterId,
                    lengthInPages: 5
                }),
            });

            // Check for non-200 responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || `Server error: ${response.status}`;
                console.error('Story creation failed:', errorMessage);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Story creation response:', data);

            if (!data.id) {
                throw new Error('No story ID received from server');
            }

            // Set the generated story ID and return success
            setGeneratedStoryId(data.id);
            setGenerationProgress(25); // Initial progress after creation

            return { id: data.id, status: data.status };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error creating story';
            console.error('Story creation error:', errorMessage);
            setGenerationError(errorMessage);
            toast.error('Story creation failed', {
                description: errorMessage
            });
            return undefined;
        } finally {
            setIsGenerating(false);
            // Note: We don't set isGeneratingStory to false here because
            // we still need to track the story generation progress via polling
        }
    }, [visualStyle, themePrompt, tone, primaryCharacterId]);

    // Update progress when story is being generated
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        if (generatedStoryId && generationProgress < 100) {
            pollInterval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/story/${generatedStoryId}`);
                    if (!response.ok) return;

                    const storyData = await response.json();

                    // Update progress based on status
                    if (storyData.status === StoryStatus.READY) {
                        setGenerationProgress(100);
                        setIsGeneratingStory(false);
                        if (pollInterval !== null) clearInterval(pollInterval);
                    } else if (storyData.status === StoryStatus.GENERATING) {
                        // Calculate progress based on pages
                        const pagesCreated = storyData.pages?.length || 0;
                        const targetPages = 5;
                        const newProgress = Math.min(90, 25 + (pagesCreated / targetPages * 65));
                        setGenerationProgress(newProgress);
                    } else if (storyData.status === StoryStatus.CANCELLED) {
                        setGenerationError('Story generation was cancelled');
                        setIsGeneratingStory(false);
                        if (pollInterval !== null) clearInterval(pollInterval);
                    }
                } catch (error) {
                    console.error('Error polling story status:', error);
                }
            }, 2000);
        }

        return () => {
            if (pollInterval !== null) clearInterval(pollInterval);
        };
    }, [generatedStoryId, generationProgress]);

    // Hydrate state from localStorage on initial render (for returning guest)
    useEffect(() => {
        if (userId) return;
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
                if (data.primaryCharacterId) _setPrimaryCharacterId(data.primaryCharacterId);
            }
        } catch (err) {
            console.warn('Failed to parse saved onboarding data:', err);
        }
    }, [userId]);

    // Persist state to localStorage whenever it changes (for guest persistence)
    useEffect(() => {
        if (!userId) {
            const data = {
                storyGoal,
                tone,
                selectedElements,
                uploadedElements,
                visualStyle,
                themePrompt,
                themeSuggestions,
                currentStep,
                primaryCharacterId
            };
            try {
                localStorage.setItem('magicstory_onboarding', JSON.stringify(data));
            } catch (err) {
                console.error('Failed to save onboarding state:', err);
            }
        }
    }, [storyGoal, tone, selectedElements, uploadedElements, visualStyle, themePrompt, themeSuggestions, currentStep, primaryCharacterId, userId]);

    // Provide the context value to children
    const value: OnboardingState = {
        storyGoal,
        tone,
        tempId,
        selectedElements,
        uploadedElements,
        visualStyle,
        themePrompt,
        themeSuggestions,
        currentStep,
        primaryCharacterId,
        isLoadingSuggestions,
        isAnalyzingImage,
        isGeneratingStory,
        generatedStoryId,
        isGenerating,
        generationProgress,
        generationError,
        setGeneratedStoryId,
        setGenerationError,
        setStoryGoal,
        setTone,
        addElement,
        removeElement,
        clearAllElements,
        addUploadedImage,
        updateElementName,
        updateElementDescription,
        setPrimaryCharacter,
        setVisualStyle,
        setThemePrompt,
        generateThemeSuggestions,
        createStory,
        goToNextStep,
        goToPrevStep,
    };

    // Migration after signup: if the user has just signed up (userId now exists), we have guest data, and a story has been generated, trigger migration.
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
    }, [userId, tempId, generatedStoryId, storyGoal, tone]);

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

// Utility function for debouncing
function debounce<F extends (...args: any[]) => any>(
    func: F,
    wait: number
): ((...args: Parameters<F>) => void) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function(...args: Parameters<F>) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), wait);
    };
}