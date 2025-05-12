import React, { createContext, useContext, useState, ReactNode } from 'react';

type Element = { id: string; label: string; iconUrl: string; category?: 'CHARACTER' | 'PET' | 'LOCATION' | 'OBJECT' };

interface StoryBuilderState {
    selectedElements: Element[];
    uploadedImages: { url: string }[];
    visualStyle?: string;
    themePrompt?: string;
    addElement: (el: Element) => void;
    removeElement: (id: string) => void;
    addUploadedImage: (url: string) => void;
    setVisualStyle: (style: string) => void;
    setThemePrompt: (prompt: string) => void;
}

const StoryBuilderContext = createContext<StoryBuilderState | undefined>(undefined);

export function StoryBuilderProvider({ children }: { children: ReactNode }) {
    const [selectedElements, setSelectedElements] = useState<Element[]>([]);
    const [uploadedImages, setUploadedImages] = useState<{url:string}[]>([]);
    const [visualStyle, _setVisualStyle] = useState<string>();
    const [themePrompt, _setThemePrompt] = useState<string>();

    const addElement = (el: Element) => setSelectedElements(curr => {
        if (curr.find(e => e.id === el.id)) return curr;
        return [...curr, el];
    });
    const removeElement = (id: string) => setSelectedElements(curr => curr.filter(e => e.id !== id));
    const addUploadedImage = (url: string) => setUploadedImages(curr => [...curr, {url}]);
    const setVisualStyle = (style: string) => _setVisualStyle(style);
    const setThemePrompt = (prompt: string) => _setThemePrompt(prompt);

    return (
        <StoryBuilderContext.Provider
            value={{ selectedElements, uploadedImages, visualStyle, themePrompt,
                addElement, removeElement, addUploadedImage, setVisualStyle, setThemePrompt }}>
            {children}
        </StoryBuilderContext.Provider>
    );
}

export function useStoryBuilder() {
    const ctx = useContext(StoryBuilderContext);
    if (!ctx) throw new Error('useStoryBuilder must be inside provider');
    return ctx;
}