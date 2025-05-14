'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

interface ColorPickerProps {
    label: string;
    initialColor: string;
    onChange: (color: string) => void;
    commonColors?: string[];
}

export function ColorPicker({ label, initialColor, onChange, commonColors = [] }: ColorPickerProps) {
    const [selectedColor, setSelectedColor] = useState(initialColor || '#000000');
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Default colors if none provided
    const colors = commonColors.length > 0 ? commonColors : [
        '#000000', '#4A4A4A', '#848484', // Black/Gray shades
        '#A52A2A', '#D2691E', '#CD853F', // Brown shades
        '#FFA500', '#FFD700', '#FFFFE0', // Blonde/Yellow shades
        '#FF0000', '#FF6347', '#FA8072', // Red shades
        '#800080', '#9400D3', '#8A2BE2', // Purple shades
        '#0000FF', '#1E90FF', '#87CEEB', // Blue shades
        '#006400', '#228B22', '#00FF00', // Green shades
    ];

    useEffect(() => {
        if (initialColor && initialColor !== selectedColor) {
            setSelectedColor(initialColor);
        }
    }, [initialColor]);

    const handleColorSelect = (color: string) => {
        setSelectedColor(color);
        onChange(color);
        setIsPanelOpen(false);
    };

    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className="flex items-center justify-between w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4CAF50] hover:border-gray-400 transition-colors cursor-pointer"
                >
                    <div className="flex items-center">
                        <div
                            className="w-6 h-6 rounded-full mr-3 border border-gray-200"
                            style={{ backgroundColor: selectedColor }}
                        />
                        <span className="text-gray-800">{selectedColor}</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isPanelOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-3"
                        >
                            <div className="grid grid-cols-5 gap-2.5">
                                {colors.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => handleColorSelect(color)}
                                        className={`w-full aspect-square rounded-md border focus:outline-none focus:ring-2 focus:ring-[#4CAF50] relative cursor-pointer transition-transform hover:scale-105 ${
                                            selectedColor === color ? 'ring-2 ring-[#4CAF50]' : 'border-gray-200'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    >
                                        {selectedColor === color && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Check size={16} className={`text-${isLightColor(color) ? 'gray-800' : 'white'}`} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-3">
                                <input
                                    type="text"
                                    value={selectedColor}
                                    onChange={(e) => setSelectedColor(e.target.value)}
                                    onBlur={() => {
                                        if (isValidHexColor(selectedColor)) {
                                            onChange(selectedColor);
                                        }
                                    }}
                                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm cursor-text"
                                    placeholder="#000000"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

function isLightColor(color: string): boolean {
    // Remove # if present
    const hex = color.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return true if light, false if dark
    return luminance > 0.5;
}