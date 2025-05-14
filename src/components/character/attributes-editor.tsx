'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPicker } from './color-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Loader2, Save, User, Paintbrush, Shirt, Edit2, Check, ChevronDown, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
    material?: string; // For toy characters
    outfit?: string;
    accessories?: string;
    collar?: string; // Specifically for pets with collars
}

interface AttributesEditorProps {
    isOpen: boolean;
    onClose: () => void;
    elementId: string;
    elementName: string;
    imageUrl: string;
    characterType: 'human' | 'pet' | 'toy' | 'object'; // Updated to include all character types
    initialAttributes?: CharacterAttributes;
    onSave: (attributes: CharacterAttributes) => void;
    onNameChange?: (newName: string) => Promise<void>;
    isLoading?: boolean;
    isPrimary?: boolean;
    onSetPrimary?: () => void;
}

// Top ethnicities in the US based on census data
const ethnicities = [
    { label: 'White/Caucasian', value: 'white' },
    { label: 'Black/African American', value: 'black' },
    { label: 'Hispanic/Latino', value: 'hispanic' },
    { label: 'Asian', value: 'asian' },
    { label: 'Native American', value: 'native_american' },
    { label: 'Pacific Islander', value: 'pacific_islander' },
    { label: 'Middle Eastern', value: 'middle_eastern' },
    { label: 'Multi-Racial', value: 'multi_racial' },
    { label: 'Other', value: 'other' },
];

// Common dog breeds
const dogBreeds = [
    { label: 'Labrador Retriever', value: 'labrador' },
    { label: 'German Shepherd', value: 'german_shepherd' },
    { label: 'Golden Retriever', value: 'golden_retriever' },
    { label: 'Beagle', value: 'beagle' },
    { label: 'Bulldog', value: 'bulldog' },
    { label: 'Poodle', value: 'poodle' },
    { label: 'Boxer', value: 'boxer' },
    { label: 'Dachshund', value: 'dachshund' },
    { label: 'Siberian Husky', value: 'siberian_husky' },
    { label: 'Chihuahua', value: 'chihuahua' },
    { label: 'Other Dog', value: 'other_dog' },
    { label: 'Cat', value: 'cat' },
    { label: 'Other Pet', value: 'other_pet' },
];

// Common toy and object materials
const materials = [
    { label: 'Plush/Stuffed', value: 'plush' },
    { label: 'Plastic', value: 'plastic' },
    { label: 'Wood', value: 'wood' },
    { label: 'Metal', value: 'metal' },
    { label: 'Cloth/Fabric', value: 'fabric' },
    { label: 'Rubber', value: 'rubber' },
    { label: 'Clay/Ceramic', value: 'ceramic' },
    { label: 'Mixed Materials', value: 'mixed' },
    { label: 'Other', value: 'other' },
];

export function AttributesEditor({
                                     isOpen,
                                     onClose,
                                     elementId,
                                     elementName,
                                     imageUrl,
                                     characterType,
                                     initialAttributes,
                                     onSave,
                                     onNameChange,
                                     isLoading = false,
                                     isPrimary = false,
                                     onSetPrimary,
                                 }: AttributesEditorProps) {
    // Check if this is a human character
    const isHuman = characterType === 'human';
    const isPet = characterType === 'pet';
    const isToy = characterType === 'toy' || characterType === 'object';

    // State for character attributes - initialize with defaults based on type
    const [attributes, setAttributes] = useState<CharacterAttributes>(() => ({
        elementId,
        age: '',
        gender: '',
        ...(isHuman ? {
            skinColor: '#E3B98A', // Default realistic skin tone
            hairColor: '#6E3E19', // Default realistic hair color
            eyeColor: '#5F4B32', // Default realistic eye color - brown
        } : isPet ? {
            furColor: '#A52A2A', // Default fur color
            eyeColor: '#5F4B32', // Default eye color for pets
            collar: '', // Initialize empty collar value
        } : {
            // Defaults for toys/objects
            material: 'plush',
        }),
    }));

    // UI state
    const [name, setName] = useState(elementName);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [pendingNameUpdate, setPendingNameUpdate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    // Selection dropdowns state
    const [openEthnicity, setOpenEthnicity] = useState(false);
    const [selectedEthnicity, setSelectedEthnicity] = useState("");
    const [customEthnicity, setCustomEthnicity] = useState("");

    const [openBreed, setOpenBreed] = useState(false);
    const [selectedBreed, setSelectedBreed] = useState("");
    const [customBreed, setCustomBreed] = useState("");

    const [openMaterial, setOpenMaterial] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [customMaterial, setCustomMaterial] = useState("");

    // Initialize attributes from props
    useEffect(() => {
        if (initialAttributes) {
            // Safely merge attributes without causing infinite loop
            setAttributes(prevAttrs => {
                const newAttrs = { ...prevAttrs };
                // Only update fields that actually changed
                Object.entries(initialAttributes).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        newAttrs[key as keyof CharacterAttributes] = value;
                    }
                });
                return newAttrs;
            });

            // Handle dropdown selections based on character type
            if (isHuman && initialAttributes.ethnicity) {
                const matchedEthnicity = ethnicities.find(e =>
                    e.label.toLowerCase() === initialAttributes.ethnicity?.toLowerCase() ||
                    e.value === initialAttributes.ethnicity
                );

                if (matchedEthnicity) {
                    setSelectedEthnicity(matchedEthnicity.value);
                    setCustomEthnicity("");
                } else {
                    setSelectedEthnicity('other');
                    setCustomEthnicity(initialAttributes.ethnicity || '');
                }
            } else if (isPet && initialAttributes.breed) {
                const matchedBreed = dogBreeds.find(b =>
                    b.label.toLowerCase() === initialAttributes.breed?.toLowerCase() ||
                    b.value === initialAttributes.breed
                );

                if (matchedBreed) {
                    setSelectedBreed(matchedBreed.value);
                    setCustomBreed("");
                } else {
                    setSelectedBreed('other_pet');
                    setCustomBreed(initialAttributes.breed || '');
                }
            } else if (isToy && initialAttributes.material) {
                const matchedMaterial = materials.find(m =>
                    m.label.toLowerCase() === initialAttributes.material?.toLowerCase() ||
                    m.value === initialAttributes.material
                );

                if (matchedMaterial) {
                    setSelectedMaterial(matchedMaterial.value);
                    setCustomMaterial("");
                } else {
                    setSelectedMaterial('other');
                    setCustomMaterial(initialAttributes.material || '');
                }
            }
        }

        // Reset name state when element changes
        setName(elementName);
        setPendingNameUpdate(false);
    }, [elementId, elementName, initialAttributes, isHuman, isPet, isToy]);

    // Handle name update - immediately save to backend
    const handleNameUpdate = async (newName: string) => {
        if (!onNameChange || newName.trim() === '') return;

        // If name hasn't changed, just close the editing UI
        if (newName === elementName) {
            setIsEditingName(false);
            return;
        }

        setIsUpdatingName(true);
        try {
            await onNameChange(newName);
            toast.success("Name updated", {
                description: "Name has been updated successfully",
                duration: 2000
            });
            setPendingNameUpdate(false);
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error("Name update failed", {
                description: "There was an error updating the name"
            });
            // Revert to original name on failure
            setName(elementName);
            setPendingNameUpdate(false);
        } finally {
            setIsUpdatingName(false);
            setIsEditingName(false);
        }
    };

    // Handle changes to the name input
    const handleNameChange = (newName: string) => {
        setName(newName);
        // Track if there's a pending name change that hasn't been saved yet
        setPendingNameUpdate(newName !== elementName);
    };

    // Handle save of all attributes
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // First prepare the final attributes
            let finalAttributes = { ...attributes };

            // Handle dropdown selections based on character type
            if (isHuman) {
                if (selectedEthnicity === 'other' && customEthnicity) {
                    finalAttributes.ethnicity = customEthnicity;
                } else if (selectedEthnicity && selectedEthnicity !== 'other') {
                    const selectedOption = ethnicities.find(e => e.value === selectedEthnicity);
                    finalAttributes.ethnicity = selectedOption?.label || selectedEthnicity;
                }
            } else if (isPet) {
                if ((selectedBreed === 'other_dog' || selectedBreed === 'other_pet') && customBreed) {
                    finalAttributes.breed = customBreed;
                } else if (selectedBreed && !['other_dog', 'other_pet'].includes(selectedBreed)) {
                    const selectedOption = dogBreeds.find(b => b.value === selectedBreed);
                    finalAttributes.breed = selectedOption?.label || selectedBreed;
                }
            } else if (isToy) {
                if (selectedMaterial === 'other' && customMaterial) {
                    finalAttributes.material = customMaterial;
                } else if (selectedMaterial && selectedMaterial !== 'other') {
                    const selectedOption = materials.find(m => m.value === selectedMaterial);
                    finalAttributes.material = selectedOption?.label || selectedMaterial;
                }
            }

            // Save attributes
            await onSave(finalAttributes);

            // If there's a pending name change that wasn't saved with the immediate update
            if (pendingNameUpdate && onNameChange && name !== elementName) {
                await onNameChange(name);
                setPendingNameUpdate(false);
            }

            toast.success("Details saved", {
                description: "Character details have been saved successfully"
            });
        } catch (error) {
            console.error('Error saving attributes:', error);
            toast.error("Save Failed", {
                description: "Failed to save character details"
            });
        } finally {
            setIsSaving(false);
            onClose();
        }
    };

    // Update a single attribute value
    const updateAttribute = (key: keyof CharacterAttributes, value: string) => {
        setAttributes(prev => ({ ...prev, [key]: value }));
    };

    // Color options
    const humanSkinColors = [
        '#FFDBAC', '#F5D7B9', '#F1C27D', '#E3B98A', // Light/pale to medium
        '#D8A67A', '#C68642', '#9F734F', '#8D5524', // Medium to brown
        '#774C2A', '#664232', '#523022', '#362214', // Dark brown to deeper brown
    ];

    const eyeColors = [
        '#5F4B32', '#634916', '#7A4B15', // Brown eyes
        '#9B7653', '#AA8F66', '#B8A99B', // Light brown/hazel
        '#52773F', '#6C7C59', '#869B62', // Green/hazel green
        '#3D5E8C', '#6082B6', '#91A3B0', // Blue eyes
        '#486882', '#7393A7', '#A2CDCD', // Blue-gray/gray
    ];

    const humanHairColors = [
        '#FFECD0', '#E1C8A5', '#FFE39F', // Very light blonde, blonde
        '#E7C083', '#DEB887', '#D6BF75', // Golden blonde, dirty blonde
        '#B8642B', '#8B4513', '#6E3E19', // Light to medium brown
        '#4C3117', '#3B2C24', '#0F0D0B', // Dark brown to black
        '#C74E23', '#D5654B', '#844335', // Red/auburn shades
        '#CDCDCD', '#A6A6A6', '#8E8E8E', // Gray/silver shades
    ];

    const furColors = [
        '#A52A2A', '#8B4513', '#D2B48C', // Browns
        '#F5DEB3', '#FFE4C4', '#FFDEAD', // Tans/Creams
        '#808080', '#A9A9A9', '#D3D3D3', // Grays
        '#000000', '#FFFFFF', '#FFF8DC', // Black/White/Off-white
        '#FFA500', '#FF4500', '#B22222', // Orange/Red tones
    ];

    const toyColors = [
        '#FF5252', '#FF4081', '#E040FB', // Red/Pink/Purple
        '#7C4DFF', '#536DFE', '#448AFF', // Purple/Blue
        '#40C4FF', '#18FFFF', '#64FFDA', // Blue/Teal
        '#69F0AE', '#B2FF59', '#EEFF41', // Green/Lime/Yellow
        '#FFD740', '#FFAB40', '#FF6E40', // Yellow/Orange/Deep Orange
    ];

    // Content variants for animation
    const contentVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } }
    };

    // Get appropriate dialog title based on character type
    const getDialogTitle = () => {
        if (isPet) return 'Pet Details';
        if (isToy) return characterType === 'toy' ? 'Toy Details' : 'Object Details';
        return 'Character Details';
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="sm:max-w-md overflow-y-auto"
                style={{ maxHeight: '650px', height: isLoading ? '400px' : 'auto' }}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#4CAF50]">
                        {getDialogTitle()}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    // Loading state
                    <div className="flex flex-col items-center justify-center h-[300px]">
                        <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50] mb-4" />
                        <p className="text-gray-600 text-center">
                            Loading character details...
                        </p>
                        <p className="text-gray-500 text-sm text-center mt-2">This will just take a moment</p>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4 py-2">
                        {/* Character/Pet/Toy image and name editor */}
                        <div className="flex items-center space-x-4 mb-2">
                            <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 border-[#4CAF50] flex-shrink-0 relative ${isPrimary ? 'bg-amber-50' : ''}`}>
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                                {/* Primary indicator */}
                                {isPrimary && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-amber-400 text-white text-xs py-1 text-center">
                                        Primary
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                {isEditingName ? (
                                    <div className="flex items-center">
                                        <Input
                                            value={name}
                                            onChange={(e) => handleNameChange(e.target.value)}
                                            className="mr-2 py-1 h-9 cursor-text"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleNameUpdate(name);
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleNameUpdate(name)}
                                            disabled={isUpdatingName || name.trim() === ''}
                                            className="h-9 cursor-pointer"
                                        >
                                            {isUpdatingName ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <div className="flex items-center">
                                            <h3 className={`text-lg font-semibold mr-2 ${pendingNameUpdate ? 'text-[#4CAF50]' : ''}`}>
                                                {name}
                                                {pendingNameUpdate && " (unsaved)"}
                                            </h3>
                                            <button
                                                onClick={() => setIsEditingName(true)}
                                                className="text-gray-500 hover:text-[#4CAF50] transition-colors cursor-pointer p-1 rounded-full hover:bg-[#4CAF50]/10"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center mt-1">
                                            {!isPrimary && onSetPrimary && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={onSetPrimary}
                                                    className="text-xs h-7 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                                                >
                                                    <Crown size={12} className="text-amber-500" />
                                                    Make Primary
                                                </Button>
                                            )}
                                            <p className="text-sm text-gray-500 ml-2">
                                                {isPrimary
                                                    ? "This is the primary character in your story"
                                                    : "Edit character details below"
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Attribute tabs - content differs based on character type */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid grid-cols-3 mb-3">
                                <TabsTrigger value="basic" className="flex items-center gap-1.5 cursor-pointer">
                                    <User size={16} />
                                    <span>Basic</span>
                                </TabsTrigger>
                                <TabsTrigger value="appearance" className="flex items-center gap-1.5 cursor-pointer">
                                    <Paintbrush size={16} />
                                    <span>Appearance</span>
                                </TabsTrigger>
                                <TabsTrigger value="clothing" className="flex items-center gap-1.5 cursor-pointer">
                                    <Shirt size={16} />
                                    <span>{isHuman ? 'Clothing' : 'Accessories'}</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* Basic info tab */}
                            {activeTab === 'basic' && (
                                <motion.div
                                    key="basic"
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-4 py-1 px-1"
                                >
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <Label htmlFor="age" className="mb-1 block">Age</Label>
                                            <Input
                                                id="age"
                                                value={attributes.age || ''}
                                                onChange={(e) => updateAttribute('age', e.target.value)}
                                                placeholder={
                                                    isHuman ? "e.g., 8, Teen, Adult" :
                                                        isPet ? "e.g., Puppy, Young, Adult" :
                                                            "e.g., New, Old, Vintage"
                                                }
                                                className="cursor-text"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="gender" className="mb-1 block">
                                                {isHuman ? "Gender" : isPet ? "Gender" : "Type"}
                                            </Label>
                                            <Select
                                                value={attributes.gender || ''}
                                                onValueChange={(value) => updateAttribute('gender', value)}
                                            >
                                                <SelectTrigger className="cursor-pointer">
                                                    <SelectValue placeholder={
                                                        isToy ? "Select type..." : "Select gender..."
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {isHuman || isPet ? (
                                                        <>
                                                            <SelectItem value="Male">Male</SelectItem>
                                                            <SelectItem value="Female">Female</SelectItem>
                                                            {isHuman && (
                                                                <SelectItem value="Non-binary">Non-binary</SelectItem>
                                                            )}
                                                            <SelectItem value="Unknown">Unknown</SelectItem>
                                                        </>
                                                    ) : (
                                                        // For toys/objects
                                                        <>
                                                            <SelectItem value="Toy">Toy</SelectItem>
                                                            <SelectItem value="Doll">Doll</SelectItem>
                                                            <SelectItem value="Stuffed Animal">Stuffed Animal</SelectItem>
                                                            <SelectItem value="Action Figure">Action Figure</SelectItem>
                                                            <SelectItem value="Object">Object</SelectItem>
                                                            <SelectItem value="Other">Other</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Specific fields based on character type */}
                                    {isHuman && (
                                        // Ethnicity for human characters
                                        <div>
                                            <Label htmlFor="ethnicity" className="mb-1 block">Ethnicity</Label>

                                            <Popover open={openEthnicity} onOpenChange={setOpenEthnicity}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openEthnicity}
                                                        className="w-full justify-between cursor-pointer"
                                                    >
                                                        {selectedEthnicity === 'other' && customEthnicity
                                                            ? customEthnicity
                                                            : selectedEthnicity
                                                                ? ethnicities.find((ethnicity) => ethnicity.value === selectedEthnicity)?.label
                                                                : "Select ethnicity..."}
                                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search ethnicity..." className="cursor-text" />
                                                        <CommandEmpty>No ethnicity found.</CommandEmpty>
                                                        <CommandGroup className="max-h-60 overflow-auto">
                                                            {ethnicities.map((ethnicity) => (
                                                                <CommandItem
                                                                    key={ethnicity.value}
                                                                    value={ethnicity.label}
                                                                    onSelect={() => {
                                                                        setSelectedEthnicity(ethnicity.value);
                                                                        if (ethnicity.value === 'other') {
                                                                            setTimeout(() => {
                                                                                const customInput = document.getElementById('custom-ethnicity');
                                                                                if (customInput) (customInput as HTMLInputElement).focus();
                                                                            }, 100);
                                                                        }
                                                                        setOpenEthnicity(ethnicity.value === 'other');
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedEthnicity === ethnicity.value ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {ethnicity.label}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                            {/* Show input field if "Other" selected */}
                                            {selectedEthnicity === 'other' && (
                                                <div className="mt-2">
                                                    <Input
                                                        id="custom-ethnicity"
                                                        value={customEthnicity}
                                                        onChange={(e) => setCustomEthnicity(e.target.value)}
                                                        placeholder="Enter custom ethnicity"
                                                        className="cursor-text"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isPet && (
                                        // Breed for pets
                                        <div>
                                            <Label htmlFor="breed" className="mb-1 block">Breed/Species</Label>

                                            <Popover open={openBreed} onOpenChange={setOpenBreed}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openBreed}
                                                        className="w-full justify-between cursor-pointer"
                                                    >
                                                        {(selectedBreed === 'other_dog' || selectedBreed === 'other_pet') && customBreed
                                                            ? customBreed
                                                            : selectedBreed
                                                                ? dogBreeds.find((breed) => breed.value === selectedBreed)?.label
                                                                : "Select breed/species..."}
                                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search breed/species..." className="cursor-text" />
                                                        <CommandEmpty>No breed found.</CommandEmpty>
                                                        <CommandGroup className="max-h-60 overflow-auto">
                                                            {dogBreeds.map((breed) => (
                                                                <CommandItem
                                                                    key={breed.value}
                                                                    value={breed.label}
                                                                    onSelect={() => {
                                                                        setSelectedBreed(breed.value);
                                                                        if (['other_dog', 'other_pet'].includes(breed.value)) {
                                                                            setTimeout(() => {
                                                                                const customInput = document.getElementById('custom-breed');
                                                                                if (customInput) (customInput as HTMLInputElement).focus();
                                                                            }, 100);
                                                                        }
                                                                        setOpenBreed(['other_dog', 'other_pet'].includes(breed.value));
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedBreed === breed.value ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {breed.label}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                            {/* Show input field if "Other" selected */}
                                            {(selectedBreed === 'other_dog' || selectedBreed === 'other_pet') && (
                                                <div className="mt-2">
                                                    <Input
                                                        id="custom-breed"
                                                        value={customBreed}
                                                        onChange={(e) => setCustomBreed(e.target.value)}
                                                        placeholder={selectedBreed === 'other_dog'
                                                            ? "Enter dog breed"
                                                            : "Enter pet type"
                                                        }
                                                        className="cursor-text"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isToy && (
                                        // Material for toys/objects
                                        <div>
                                            <Label htmlFor="material" className="mb-1 block">Material</Label>

                                            <Popover open={openMaterial} onOpenChange={setOpenMaterial}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openMaterial}
                                                        className="w-full justify-between cursor-pointer"
                                                    >
                                                        {selectedMaterial === 'other' && customMaterial
                                                            ? customMaterial
                                                            : selectedMaterial
                                                                ? materials.find((material) => material.value === selectedMaterial)?.label
                                                                : "Select material..."}
                                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search material..." className="cursor-text" />
                                                        <CommandEmpty>No material found.</CommandEmpty>
                                                        <CommandGroup className="max-h-60 overflow-auto">
                                                            {materials.map((material) => (
                                                                <CommandItem
                                                                    key={material.value}
                                                                    value={material.label}
                                                                    onSelect={() => {
                                                                        setSelectedMaterial(material.value);
                                                                        if (material.value === 'other') {
                                                                            setTimeout(() => {
                                                                                const customInput = document.getElementById('custom-material');
                                                                                if (customInput) (customInput as HTMLInputElement).focus();
                                                                            }, 100);
                                                                        }
                                                                        setOpenMaterial(material.value === 'other');
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedMaterial === material.value ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {material.label}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                            {/* Show input field if "Other" selected */}
                                            {selectedMaterial === 'other' && (
                                                <div className="mt-2">
                                                    <Input
                                                        id="custom-material"
                                                        value={customMaterial}
                                                        onChange={(e) => setCustomMaterial(e.target.value)}
                                                        placeholder="Enter custom material"
                                                        className="cursor-text"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Appearance tab - different for characters vs pets */}
                            {activeTab === 'appearance' && (
                                <motion.div
                                    key="appearance"
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-4 py-1 px-1"
                                >
                                    {isHuman ? (
                                        // Human appearance
                                        <>
                                            <div className="space-y-3">
                                                <Label htmlFor="skinColor" className="mb-1 block">Skin Color</Label>
                                                <ColorPicker
                                                    label=""
                                                    initialColor={attributes.skinColor || '#E3B98A'}
                                                    onChange={(color) => updateAttribute('skinColor', color)}
                                                    commonColors={humanSkinColors}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="eyeColor" className="mb-1 block">Eye Color</Label>
                                                <ColorPicker
                                                    label=""
                                                    initialColor={attributes.eyeColor || '#5F4B32'}
                                                    onChange={(color) => updateAttribute('eyeColor', color)}
                                                    commonColors={eyeColors}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <Label htmlFor="hairStyle" className="mb-1 block">Hair Style</Label>
                                                    <Input
                                                        id="hairStyle"
                                                        value={attributes.hairStyle || ''}
                                                        onChange={(e) => updateAttribute('hairStyle', e.target.value)}
                                                        placeholder="e.g., Curly, Straight"
                                                        className="cursor-text"
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="hairColor" className="mb-1 block">Hair Color</Label>
                                                    <div>
                                                        <ColorPicker
                                                            label=""
                                                            initialColor={attributes.hairColor || '#6E3E19'}
                                                            onChange={(color) => updateAttribute('hairColor', color)}
                                                            commonColors={humanHairColors}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : isPet ? (
                                        // Pet appearance
                                        <>
                                            <div className="space-y-3">
                                                <Label htmlFor="furColor" className="mb-1 block">Fur/Coat Color</Label>
                                                <ColorPicker
                                                    label=""
                                                    initialColor={attributes.furColor || '#A52A2A'}
                                                    onChange={(color) => updateAttribute('furColor', color)}
                                                    commonColors={furColors}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="eyeColor" className="mb-1 block">Eye Color</Label>
                                                <ColorPicker
                                                    label=""
                                                    initialColor={attributes.eyeColor || '#5F4B32'}
                                                    onChange={(color) => updateAttribute('eyeColor', color)}
                                                    commonColors={eyeColors}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <Label htmlFor="furStyle" className="mb-1 block">Coat Type</Label>
                                                    <Input
                                                        id="furStyle"
                                                        value={attributes.furStyle || ''}
                                                        onChange={(e) => updateAttribute('furStyle', e.target.value)}
                                                        placeholder="e.g., Short, Long, Curly"
                                                        className="cursor-text"
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="markings" className="mb-1 block">Markings/Pattern</Label>
                                                    <Input
                                                        id="markings"
                                                        value={attributes.markings || ''}
                                                        onChange={(e) => updateAttribute('markings', e.target.value)}
                                                        placeholder="e.g., Spots, Stripes"
                                                        className="cursor-text"
                                                    />
                                                </div>
                                            </div>

                                            {/* Special field for pet collar, since that's what you noticed was missing */}
                                            <div>
                                                <Label htmlFor="collar" className="mb-1 block">Collar</Label>
                                                <Input
                                                    id="collar"
                                                    value={attributes.collar || ''}
                                                    onChange={(e) => updateAttribute('collar', e.target.value)}
                                                    placeholder="e.g., Red collar with name tag"
                                                    className="cursor-text"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        // Toy/Object appearance
                                        <>
                                            <div className="space-y-3">
                                                <Label htmlFor="primaryColor" className="mb-1 block">Primary Color</Label>
                                                <ColorPicker
                                                    label=""
                                                    initialColor={attributes.skinColor || '#FF5252'} // Using skin color field for primary color
                                                    onChange={(color) => updateAttribute('skinColor', color)}
                                                    commonColors={toyColors}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="secondaryColor" className="mb-1 block">Secondary Color</Label>
                                                <ColorPicker
                                                    label=""
                                                    initialColor={attributes.hairColor || '#448AFF'} // Using hair color field for secondary color
                                                    onChange={(color) => updateAttribute('hairColor', color)}
                                                    commonColors={toyColors}
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="detailsAppearance" className="mb-1 block">Visual Details</Label>
                                                <Input
                                                    id="detailsAppearance"
                                                    value={attributes.markings || ''}
                                                    onChange={(e) => updateAttribute('markings', e.target.value)}
                                                    placeholder="e.g., Button eyes, Painted features"
                                                    className="cursor-text"
                                                />
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            {/* Clothing/Accessories tab */}
                            {activeTab === 'clothing' && (
                                <motion.div
                                    key="clothing"
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-4 py-1 px-1"
                                >
                                    <div>
                                        <Label htmlFor="outfit" className="mb-1 block">
                                            {isHuman ? 'Outfit/Clothing' : isPet ? 'Collar/Outfit' : 'Details'}
                                        </Label>
                                        <Input
                                            id="outfit"
                                            value={attributes.outfit || ''}
                                            onChange={(e) => updateAttribute('outfit', e.target.value)}
                                            placeholder={isHuman
                                                ? "e.g., Blue dress, Red t-shirt"
                                                : isPet
                                                    ? "e.g., Red collar, Sweater"
                                                    : "e.g., Stitching details, Worn patches"
                                            }
                                            className="cursor-text"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="accessories" className="mb-1 block">Accessories</Label>
                                        <Input
                                            id="accessories"
                                            value={attributes.accessories || ''}
                                            onChange={(e) => updateAttribute('accessories', e.target.value)}
                                            placeholder={isHuman
                                                ? "e.g., Glasses, Hat, Necklace"
                                                : isPet
                                                    ? "e.g., Bandana, Bow, Name tag"
                                                    : "e.g., Ribbons, Buttons, Attached items"
                                            }
                                            className="cursor-text"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </Tabs>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSaving || isLoading}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className={`bg-[#4CAF50] hover:bg-[#43a047] cursor-pointer ${pendingNameUpdate ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Details {pendingNameUpdate ? '(including name)' : ''}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}