'use client';
import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react';
import { ElementCategory, StoryStatus } from '@prisma/client';
import { useAuth } from '@clerk/nextjs';  // Clerk hook to detect logged-in user
import type { OnboardingSession, MyWorldElement } from '@prisma/client';
import { toast } from 'sonner'; // Import toast from sonner

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
    selectedElements: MyWorldElement[];
    uploadedElements: MyWorldElement[];  // all uploaded elements (selected or not)
    visualStyle?: VisualStyle;
    themePrompt: string;
    themeSuggestions: { title: string; text: string; imageUrl?: string }[];
    togglePrimaryElement: (id: string) => void; // Add this
    currentStep: number;
    // New: Add primaryCharacterId
    primaryCharacterId: string | null;
    // Loading states
    isInitializing: boolean; // New: Add initial loading state
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
    addElement: (el: MyWorldElement) => void;
    removeElement: (id: string) => void;
    clearAllElements: () => void;
    addUploadedImage: (file: File, category: ElementCategory) => Promise<MyWorldElement | undefined>;
    updateElementName: (id: string, name: string) => void;
    updateElementDescription: (id: string, description: string) => void;
    setVisualStyle: (style: VisualStyle) => void;
    setThemePrompt: (prompt: string) => void;
    setPrimaryCharacterId: (id: string | null) => void; // New: Add this function
    generateThemeSuggestions: () => Promise<void>;
    createStory: () => Promise<{ id: string; status: string } | undefined>;
    goToNextStep: () => void;
    goToPrevStep: () => void;
    goToStep: (step: number) => void; // New: Add direct step navigation
    resetOnboarding: () => void; // New: Add reset functionality
    // Error handling
    setGenerationError: (error: string | null) => void;
}


const debounce = <F extends (...args: any[]) => any>(
    func: F,
    wait: number
): ((...args: Parameters<F>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function(...args: Parameters<F>) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), wait);
    };
};

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
    const MAX_STEPS = 11;          // Total steps: 0-11 in the wizard

    // Determine or generate a tempId for guest sessions only
    const [tempId, setTempId] = useState<string | null>(null);
    const [shouldResetAfterInit, setShouldResetAfterInit] = useState(false);
    const [isResetting, setIsResetting] = useState(false); // Add flag to track reset state
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

    // Load onboarding data for logged in users
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasResetParam = urlParams.get('reset') === 'true';
        const stepParam = urlParams.get('step');
        
        // If reset parameter is present, mark for reset after initialization
        if (hasResetParam) {
            console.log('Reset parameter detected, will reset after initialization');
            // Remove the reset parameter from URL immediately
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('reset');
            newUrl.searchParams.set('step', '1');
            window.history.replaceState({ step: 1 }, '', newUrl.toString());
            
            // Mark for reset after initialization
            setShouldResetAfterInit(true);
            _setCurrentStep(1); // Set initial step
            setIsInitializing(false);
            return;
        }
        
        if (!userId) {
            // Check URL for step parameter on initial load
            if (stepParam) {
                const step = parseInt(stepParam, 10);
                if (!isNaN(step) && step >= 0 && step < MAX_STEPS) {
                    console.log('Setting step from URL (guest):', step);
                    _setCurrentStep(step);
                }
            }
            setIsInitializing(false); // No user, no need to load from server
            return;
        }
        (async () => {
            try {
                const res = await fetch('/api/onboarding/fetch');
                if (!res.ok) throw new Error('Failed to load onboarding data');
                const data = await res.json();
                console.log('Loaded onboarding data:', data);
                
                if (data.storyGoal) _setStoryGoal(data.storyGoal);
                if (data.tone) _setTone(data.tone);
                
                // If URL has step parameter, use it instead of saved step
                if (stepParam) {
                    const step = parseInt(stepParam, 10);
                    if (!isNaN(step) && step >= 0 && step < MAX_STEPS) {
                        console.log('Overriding with URL step:', step);
                        _setCurrentStep(step);
                    }
                } else if (data.currentStep !== undefined) {
                    console.log('Saved currentStep from server:', data.currentStep);
                    
                    // Don't restore step 10 unless we have a completed story with images
                    if (data.currentStep === 10 && (!data.storyId || !generatedStoryId)) {
                        console.log('Preventing restore to step 10 without completed story');
                        _setCurrentStep(0); // Reset to start
                    } else if (data.currentStep === 9 && !data.storyId) {
                        console.log('Preventing restore to step 9 without story');
                        _setCurrentStep(8); // Go back to generation
                    } else if (data.currentStep <= 8) {
                        console.log('Restoring saved step:', data.currentStep);
                        _setCurrentStep(data.currentStep);
                    } else {
                        // For steps 9-10, only restore if we have the story ID
                        _setCurrentStep(0);
                    }
                } else {
                    console.log('No valid step to restore, starting fresh');
                    _setCurrentStep(0);
                }
            } catch (err) {
                console.error('Onboarding fetch error:', err);
            } finally {
                setIsInitializing(false);
            }
        })();
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
    const [primaryCharacterId, _setPrimaryCharacterId] = useState<string | null>(null); // New: Add state for primaryCharacterId
    const [isInitializing, setIsInitializing] = useState(true); // New: Loading state

    // Loading flags
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const [generatedStoryId, setGeneratedStoryId] = useState<string | undefined>();

    // Story generation tracking
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Persist onboarding preferences for signed-in users
    const debouncedSave = useCallback(
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
    // Hydrate state from localStorage on initial render (for returning guest)
    useEffect(() => {
        if (userId) return;
        try {
            const saved = localStorage.getItem('magicstory_onboarding');
            if (saved) {
                const data = JSON.parse(saved);
                console.log('Loading from localStorage:', data);
                
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
                if (data.currentStep !== undefined) {
                    // Validate step is within bounds AND not jumping to finish
                    const step = Math.max(0, Math.min(data.currentStep, MAX_STEPS - 1));
                    
                    // Don't restore step 10 if there's no completed story
                    if (step === 10 && !data.generatedStoryId) {
                        console.log('Preventing restore to step 10 without completed story');
                        _setCurrentStep(0); // Reset to start
                    } else if (step === 9 && !data.generatedStoryId) {
                        console.log('Preventing restore to step 9 without story ID');
                        _setCurrentStep(8); // Go back to generation
                    } else {
                        _setCurrentStep(step);
                    }
                }
                if (data.primaryCharacterId !== undefined) _setPrimaryCharacterId(data.primaryCharacterId);
                if (data.generatedStoryId) setGeneratedStoryId(data.generatedStoryId);
            }
        } catch (err) {
            console.warn('Failed to parse saved onboarding data:', err);
        } finally {
            if (!userId) setIsInitializing(false); // Done loading for guest users
        }
    }, [userId]);

    // Persist state to localStorage whenever it changes (for guest persistence)
    useEffect(() => {
        if (!userId) {
            const saveToLocalStorage = debounce(() => {
                const data = {
                    storyGoal,
                    tone,
                    selectedElements,
                    uploadedElements,
                    visualStyle,
                    themePrompt,
                    themeSuggestions,
                    currentStep,
                    primaryCharacterId, // New: Add primaryCharacterId
                };
                try {
                    localStorage.setItem('magicstory_onboarding', JSON.stringify(data));
                } catch (err) {
                    console.error('Failed to save onboarding state:', err);
                }
            }, 500); // 500ms debounce for localStorage

            saveToLocalStorage();

            // Clean up
            return () => {
                // The debounce function handles its own cleanup
            };
        }
    }, [storyGoal, tone, selectedElements, uploadedElements, visualStyle, themePrompt, themeSuggestions, currentStep, primaryCharacterId, userId]); // Add primaryCharacterId to dependencies

    // Context action: set story goal
    const setStoryGoal = useCallback((goals: string[]) => {
        if (JSON.stringify(goals) === JSON.stringify(storyGoal)) return; // Skip if unchanged
        _setStoryGoal(goals);
        saveOnboardingPrefs({ storyGoal: goals });
    }, [storyGoal, saveOnboardingPrefs]);

    const setTone = useCallback((tones: string[]) => {
        if (JSON.stringify(tones) === JSON.stringify(tone)) return; // Skip if unchanged
        _setTone(tones);
        saveOnboardingPrefs({ tone: tones });
    }, [tone, saveOnboardingPrefs]);

    // Set primary character ID
    const setPrimaryCharacterId = useCallback((id: string | null) => {
        _setPrimaryCharacterId(id);
        // You can save this to database if needed
        // saveOnboardingPrefs({ primaryCharacterId: id });
    }, []);

    // Add a MyWorld element to the selected list
    const addElement = useCallback((element: MyWorldElement) => {
        setSelectedElements(curr => {
            // Avoid duplicates
            if (curr.find(el => el.id === element.id)) return curr;
            return [...curr, element];
        });
    }, []);

    // Remove an element from selection
    const removeElement = useCallback((id: string) => {
        setSelectedElements(curr => curr.filter(el => el.id !== id));
    }, []);

    // Clear all selected elements
    const clearAllElements = useCallback(() => {
        setSelectedElements([]);
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
        // Don't navigate during reset
        if (isResetting) {
            console.log('Navigation blocked during reset');
            return;
        }
        
        const next = Math.min(currentStep + 1, MAX_STEPS - 1);
        console.log(`goToNextStep called: current=${currentStep}, next=${next}`);
        
        // Special check: Can only go to step 10 from step 9
        if (next === 10 && currentStep !== 9) {
            console.error(`BLOCKED: Attempting to jump to step 10 from step ${currentStep}. Must go through step 9 first!`);
            // Don't force navigation during this edge case
            return;
            
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('step', '9');
                window.history.pushState({ step: 9 }, '', url.toString());
            }, 0);
            
            return;
        }
        
        if (next !== currentStep) {
            _setCurrentStep(next);
            
            // Defer URL update to avoid React warning
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('step', next.toString());
                window.history.pushState({ step: next }, '', url.toString());
            }, 0);
            
            // Save immediately without debouncing for step changes
            if (userId) {
                fetch('/api/onboarding/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentStep: next }),
                }).catch(console.error);
            }
        }
    }, [currentStep, userId, isResetting]);

    const goToPrevStep = useCallback(() => {
        // Use browser back for better history management
        if (window.history.length > 1) {
            window.history.back();
        } else {
            _setCurrentStep(curr => {
                const prev = Math.max(curr - 1, 0);
                if (prev !== curr) {
                    // Defer URL update to avoid React warning
                    setTimeout(() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('step', prev.toString());
                        window.history.replaceState({ step: prev }, '', url.toString());
                    }, 0);
                    
                    // Save immediately without debouncing for step changes
                    if (userId) {
                        fetch('/api/onboarding/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ currentStep: prev }),
                        }).catch(console.error);
                    }
                }
                return prev;
            });
        }
    }, [userId]);

    // New: Direct step navigation
    const goToStep = useCallback((step: number) => {
        const validStep = Math.max(0, Math.min(step, MAX_STEPS - 1));
        console.log(`goToStep called: current=${currentStep}, requested=${step}, valid=${validStep}`);
        
        // Prevent invalid jumps
        if (validStep === 10 && currentStep < 9) {
            console.error('Cannot jump to finish step without going through review!');
            return;
        }
        
        if (validStep !== currentStep) {
            _setCurrentStep(validStep);
            
            // Defer URL update to avoid React warning
            setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('step', validStep.toString());
                window.history.pushState({ step: validStep }, '', url.toString());
            }, 0);
            
            // Save immediately without debouncing for step changes
            if (userId) {
                fetch('/api/onboarding/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentStep: validStep }),
                }).catch(console.error);
            }
        }
    }, [currentStep, userId]);

    // Browser history management
    useEffect(() => {
        // Only update URL if it doesn't already have the correct step
        const currentUrl = new URL(window.location.href);
        const currentStepParam = currentUrl.searchParams.get('step');
        if (currentStepParam !== currentStep.toString()) {
            currentUrl.searchParams.set('step', currentStep.toString());
            // Use replaceState to avoid creating duplicate entries
            window.history.replaceState({ step: currentStep }, '', currentUrl.toString());
        }

        // Handle browser back/forward navigation
        const handlePopState = (event: PopStateEvent) => {
            console.log('PopState event:', event.state);
            const state = event.state;
            if (state && typeof state.step === 'number') {
                goToStep(state.step);
            } else {
                // Try to get step from URL if state is missing
                const urlParams = new URLSearchParams(window.location.search);
                const stepParam = urlParams.get('step');
                console.log('Step from URL:', stepParam);
                if (stepParam) {
                    const step = parseInt(stepParam, 10);
                    if (!isNaN(step)) {
                        goToStep(step);
                    }
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [currentStep, goToStep]);

    // Toggle primary status of an element
    const togglePrimaryElement = useCallback((id: string) => {
        setSelectedElements(curr =>
            curr.map(el => ({
                ...el,
                isPrimary: el.id === id // Make the selected one primary, all others not primary
            }))
        );

        // Update the primaryCharacterId state
        _setPrimaryCharacterId(id);

        // Also update in uploadedElements list if needed
        setUploadedElements(curr =>
            curr.map(el => el.id === id ? { ...el, isPrimary: true } : { ...el, isPrimary: false })
        );
    }, []);

    // Upload a new image (character/pet/location/object) and analyze it via AI
    const addUploadedImage = async (file: File, category: ElementCategory = 'CHARACTER') => {
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
            const newElement: MyWorldElement = {
                id: data.elementId,
                name: data.name || `My ${category.toLowerCase()}`,
                description: '',
                imageUrl: data.url,
                category: category,
                publicId: data.public_id,
                isDetectedInStory: false,
                isDefault: false,
                isPrimary: false,
                userId: userId || null,
                tempId: userId ? null : tempId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

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
                const updatedElement: MyWorldElement = {
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
    };

    // Generate theme suggestions for the story prompt based on selected elements and style
    const generateThemeSuggestions = useCallback(async () => {
        if (!visualStyle) return;

        try {
            setIsLoadingSuggestions(true);

            // Check if user is logged in
            if (!userId) {
                // For guest users, generate client-side suggestions based on the style
                // This helps avoid authentication errors with the API
                const visualStyleName = visualStyle.name;

                // Look for a primary character
                const primaryChar = selectedElements.find(el => el.id === primaryCharacterId);
                const mainCharacterName = primaryChar?.name ||
                    (selectedElements.length > 0 ?
                        selectedElements.filter(el => el.category === 'CHARACTER')[0]?.name || 'our hero' :
                        'our hero');

                const suggestions = [
                    {
                        title: "Adventure",
                        text: `An exciting ${visualStyleName} adventure where ${mainCharacterName} discovers hidden treasures.`
                    },
                    {
                        title: "Friendship",
                        text: `A heartwarming ${visualStyleName} tale about ${mainCharacterName} making new friends.`
                    },
                    {
                        title: "Discovery",
                        text: `A curious ${visualStyleName} journey where ${mainCharacterName} explores new wonders.`
                    },
                    {
                        title: "Magic",
                        text: `A magical ${visualStyleName} story where ${mainCharacterName} experiences wonderful surprises.`
                    }
                ];

                // Add a small delay to simulate API call
                await new Promise(resolve => setTimeout(resolve, 300));
                setThemeSuggestions(suggestions);
                return;
            }

            // For authenticated users, use the API
            const res = await fetch('/api/story/theme-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedElements,
                    visualStyle,
                    tone,
                    primaryCharacterId // Pass primaryCharacterId to API
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMessage = errorData.error || `Failed to fetch theme suggestions: ${res.status}`;
                throw new Error(errorMessage);
            }

            const { suggestions } = await res.json();
            setThemeSuggestions(suggestions || []);
        } catch (error) {
            console.error('Error getting theme suggestions:', error);
            // Provide some fallback suggestions
            const mainCharacterName = selectedElements.length > 0 ?
                selectedElements.filter(el => el.category === 'CHARACTER')[0]?.name || 'our hero' :
                'our hero';

            setThemeSuggestions([
                { title: "Adventure", text: `An exciting ${visualStyle.name} adventure with ${mainCharacterName}.` },
                { title: "Friendship", text: `A heartwarming ${visualStyle.name} tale about friendship and teamwork.` },
                { title: "Discovery", text: `A curious ${visualStyle.name} journey full of discoveries and surprises.` }
            ]);

            toast.error('Failed to get theme suggestions', {
                description: 'Using default suggestions instead'
            });
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [visualStyle, selectedElements, tone, userId, primaryCharacterId]); // Add primaryCharacterId to dependencies

    // Reset all onboarding data to start fresh
    const resetOnboarding = useCallback(async () => {
        console.log('resetOnboarding called');
        
        // Prevent multiple resets
        if (isResetting) {
            console.log('Reset already in progress, skipping');
            return;
        }
        
        setIsResetting(true);
        
        // Clear localStorage FIRST for all users
        localStorage.removeItem('magicstory_onboarding');
        localStorage.removeItem('magicstory_tempId');
        
        // Clear database for logged-in users
        if (userId) {
            try {
                const response = await fetch('/api/onboarding/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                
                if (!response.ok) {
                    console.error('Failed to reset onboarding in database');
                } else {
                    const data = await response.json();
                    console.log('Onboarding reset successful:', data);
                }
            } catch (error) {
                console.error('Error resetting onboarding in database:', error);
            }
        }
        
        // Reset all state immediately
        _setStoryGoal([]);
        _setTone([]);
        setSelectedElements([]);
        setUploadedElements([]);
        _setVisualStyle(undefined);
        _setThemePrompt('');
        setThemeSuggestions([]);
        _setCurrentStep(1); // Start at step 1 (skip welcome)
        _setPrimaryCharacterId(null);
        setGeneratedStoryId(undefined);
        setGenerationError(null);
        setGenerationProgress(0);
        setIsGenerating(false);
        setIsGeneratingStory(false);
        setIsLoadingSuggestions(false);
        setIsAnalyzingImage(false);
        setIsInitializing(false);

        // Update URL to step 1 without reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('step', '1');
        newUrl.searchParams.delete('reset');
        window.history.replaceState({ step: 1 }, '', newUrl.toString());
        
        // Reset complete
        setTimeout(() => {
            setIsResetting(false);
        }, 100);
    }, [userId, isResetting]);

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
                    lengthInPages: 5, // Using 5 pages as requested
                    primaryCharacterId: primaryCharacterId || null
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

                    // Update progress based on pages created
                    const pagesCreated = storyData.pages?.length || 0;
                    const targetPages = 5;
                    
                    console.log('Story polling update:', {
                        storyId: generatedStoryId,
                        status: storyData.status,
                        pagesCreated,
                        targetPages,
                        currentProgress: generationProgress
                    });
                    
                    if (storyData.status === StoryStatus.CANCELLED) {
                        setGenerationError('Story generation was cancelled');
                        setIsGeneratingStory(false);
                        if (pollInterval !== null) clearInterval(pollInterval);
                    } else if (pagesCreated >= targetPages) {
                        // All pages created, set to 100% and stop generating
                        console.log('All pages created, setting progress to 100%');
                        setGenerationProgress(100);
                        setIsGeneratingStory(false);
                        if (pollInterval !== null) clearInterval(pollInterval);
                        // Don't automatically go to next step - let GeneratingStep handle navigation
                    } else {
                        // Still creating pages
                        const newProgress = Math.min(90, 25 + (pagesCreated / targetPages * 65));
                        setGenerationProgress(newProgress);
                    }
                } catch (error) {
                    console.error('Error polling story status:', error);
                }
            }, 1000); // Poll every 1 second for faster updates
        }

        return () => {
            if (pollInterval !== null) clearInterval(pollInterval);
        };
    }, [generatedStoryId, generationProgress]);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo<OnboardingState>(() => ({
        storyGoal,
        tone,
        tempId,
        selectedElements,
        uploadedElements,
        visualStyle,
        themePrompt,
        themeSuggestions,
        currentStep,
        primaryCharacterId, // NEW: Add to context value
        isInitializing, // NEW: Add loading state
        isLoadingSuggestions,
        isAnalyzingImage,
        isGeneratingStory,
        generatedStoryId,
        isGenerating,
        generationProgress,
        generationError,
        setGeneratedStoryId,
        setGenerationError,
        togglePrimaryElement,
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
        setPrimaryCharacterId, // NEW: Add to context value
        generateThemeSuggestions,
        createStory,
        goToNextStep,
        goToPrevStep,
        goToStep, // NEW: Add direct navigation
        resetOnboarding, // NEW: Add reset functionality
    }), [
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
        isInitializing,
        isLoadingSuggestions,
        isAnalyzingImage,
        isGeneratingStory,
        generatedStoryId,
        isGenerating,
        generationProgress,
        generationError,
        setGeneratedStoryId,
        setGenerationError,
        togglePrimaryElement,
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
        setPrimaryCharacterId,
        generateThemeSuggestions,
        createStory,
        goToNextStep,
        goToPrevStep,
        goToStep,
        resetOnboarding,
    ]);

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
    }, [userId, tempId, generatedStoryId, storyGoal, tone]);

    // Handle reset after initialization
    useEffect(() => {
        if (shouldResetAfterInit && !isInitializing) {
            console.log('Executing reset after initialization');
            setShouldResetAfterInit(false); // Prevent multiple resets
            resetOnboarding();
        }
    }, [shouldResetAfterInit, isInitializing, resetOnboarding]);

    return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}