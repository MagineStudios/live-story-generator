'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColorPicker } from './color-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Loader2, Save, User, Paintbrush, Shirt, Edit2, Check, Crown, ChevronsUpDown, CheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ElementCategory } from '@prisma/client';
import { Checkbox } from '@/components/ui/checkbox';

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

interface AttributesEditorProps {
    isOpen: boolean;
    onClose: () => void;
    elementId: string;
    elementName: string;
    imageUrl: string;
    category: ElementCategory;
    initialAttributes?: CharacterAttributes;
    onSave: (attributes: CharacterAttributes) => void;
    onNameChange?: (newName: string) => Promise<void>;
    isLoading?: boolean;
    isPrimary?: boolean;
    showToasts?: boolean; // New prop
    onSetPrimary?: (elementId: string) => void;
    description?: string;
    onDescriptionChange?: (newDescription: string) => Promise<void>;
}

// Top ethnicities in the US
const ethnicities = [
    { value: 'caucasian', label: 'Caucasian/White' },
    { value: 'african-american', label: 'African American/Black' },
    { value: 'hispanic-latino', label: 'Hispanic/Latino' },
    { value: 'asian', label: 'Asian' },
    { value: 'native-american', label: 'Native American' },
    { value: 'pacific-islander', label: 'Pacific Islander' },
    { value: 'middle-eastern', label: 'Middle Eastern' },
    { value: 'other', label: 'Other' },
];

// Top dog breeds
const dogBreeds = [
    { value: 'labrador-retriever', label: 'Labrador Retriever' },
    { value: 'german-shepherd', label: 'German Shepherd' },
    { value: 'golden-retriever', label: 'Golden Retriever' },
    { value: 'french-bulldog', label: 'French Bulldog' },
    { value: 'bulldog', label: 'Bulldog' },
    { value: 'beagle', label: 'Beagle' },
    { value: 'poodle', label: 'Poodle' },
    { value: 'rottweiler', label: 'Rottweiler' },
    { value: 'yorkshire-terrier', label: 'Yorkshire Terrier' },
    { value: 'boxer', label: 'Boxer' },
    { value: 'other', label: 'Other' },
];

// Top cat breeds
const catBreeds = [
    { value: 'domestic-shorthair', label: 'Domestic Shorthair' },
    { value: 'maine-coon', label: 'Maine Coon' },
    { value: 'siamese', label: 'Siamese' },
    { value: 'persian', label: 'Persian' },
    { value: 'ragdoll', label: 'Ragdoll' },
    { value: 'bengal', label: 'Bengal' },
    { value: 'abyssinian', label: 'Abyssinian' },
    { value: 'british-shorthair', label: 'British Shorthair' },
    { value: 'sphynx', label: 'Sphynx' },
    { value: 'scottish-fold', label: 'Scottish Fold' },
    { value: 'other', label: 'Other' },
];

export function AttributesEditor({
                                     isOpen,
                                     onClose,
                                     elementId,
                                     elementName,
                                     imageUrl,
                                     category,
                                     initialAttributes,
                                     onSave,
                                     onNameChange,
                                     isLoading = false,
                                     isPrimary = false,
                                     onSetPrimary,
                                     description = '',
                                     onDescriptionChange,
                                     showToasts = true, // Default to true
                                 }: AttributesEditorProps) {
    // State for character attributes
    const [attributes, setAttributes] = useState<CharacterAttributes>({
        elementId,
        age: '',
        gender: '',
        ...(category === 'CHARACTER' ? {
            skinColor: '#E3B98A', // Default realistic skin tone
            hairColor: '#6E3E19', // Default realistic hair color
            eyeColor: '#5F4B32', // Default realistic eye color - brown
        } : {
            furColor: '#A52A2A', // Default fur color
        }),
    });

    // Determine if it's a character, pet or object
    const isCharacter = category === 'CHARACTER';
    const isPet = category === 'PET';
    const isObject = category === 'OBJECT';

    // Custom inputs state
    const [customEthnicity, setCustomEthnicity] = useState('');
    const [customBreed, setCustomBreed] = useState('');
    const [openEthnicity, setOpenEthnicity] = useState(false);
    const [openBreed, setOpenBreed] = useState(false);

    // Name editing state
    const [name, setName] = useState(elementName);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isUpdatingName, setIsUpdatingName] = useState(false);

    // Primary character state
    const [isPrimaryCharacter, setIsPrimaryCharacter] = useState(isPrimary);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    // Initialize attributes from props
    useEffect(() => {
        if (initialAttributes) {
            setAttributes({ ...attributes, ...initialAttributes });
        }
        setName(elementName);
        setIsPrimaryCharacter(isPrimary);
    }, [initialAttributes, elementName, isPrimary, isOpen]);

    // Handle name update - immediately save to backend
    const handleNameUpdate = async () => {
        if (!onNameChange || name.trim() === '') return;

        // If name hasn't changed, just close the editing UI
        if (name === elementName) {
            setIsEditingName(false);
            return;
        }

        setIsUpdatingName(true);
        try {
            await onNameChange(name);
            if (showToasts) {
                toast.success("Name updated", {
                    description: "Character name has been updated successfully",
                    duration: 2000
                });
            }
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error("Name update failed", {
                description: "There was an error updating the character name"
            });
            // Revert to original name on failure
            setName(elementName);
        } finally {
            setIsUpdatingName(false);
            setIsEditingName(false);
        }
    };

    // Handle primary character toggle
    const handlePrimaryToggle = () => {
        if (onSetPrimary) {
            setIsPrimaryCharacter(!isPrimaryCharacter);
            onSetPrimary(elementId);
        }
    };

    // Handle save of all attributes
    // In your handleSave function, modify it to filter the attributes based on category:
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Create a clean version of attributes based on category
            const filteredAttributes: CharacterAttributes = {
                elementId: attributes.elementId,
                age: attributes.age,
                gender: attributes.gender
            };

            // Add category-specific attributes
            if (isCharacter) {
                // Character-specific fields
                filteredAttributes.skinColor = attributes.skinColor;
                filteredAttributes.hairColor = attributes.hairColor;
                filteredAttributes.hairStyle = attributes.hairStyle;
                filteredAttributes.eyeColor = attributes.eyeColor;
                filteredAttributes.ethnicity = attributes.ethnicity;
                filteredAttributes.outfit = attributes.outfit;
                filteredAttributes.accessories = attributes.accessories;
            } else if (isPet) {
                // Pet-specific fields
                filteredAttributes.furColor = attributes.furColor;
                filteredAttributes.furStyle = attributes.furStyle;
                filteredAttributes.markings = attributes.markings;
                filteredAttributes.breed = attributes.breed;
                filteredAttributes.collar = attributes.collar;
                filteredAttributes.outfit = attributes.outfit;
                filteredAttributes.accessories = attributes.accessories;

                // Handle eyeColor specially
                // If it's an object with left/right, convert to a string description
                if (typeof attributes.eyeColor === 'object' && attributes.eyeColor !== null) {
                    // Convert object to string description
                    const eyeObj = attributes.eyeColor as any;
                    if (eyeObj.left && eyeObj.right) {
                        filteredAttributes.eyeColor = `Heterochromatic: left ${eyeObj.left}, right ${eyeObj.right}`;
                    } else {
                        filteredAttributes.eyeColor = JSON.stringify(attributes.eyeColor);
                    }
                } else {
                    filteredAttributes.eyeColor = attributes.eyeColor;
                }
            } else if (isObject) {
                // Object-specific fields
                filteredAttributes.furColor = attributes.furColor;
                filteredAttributes.furStyle = attributes.furStyle;
                filteredAttributes.breed = attributes.breed;
                filteredAttributes.outfit = attributes.outfit;
                filteredAttributes.accessories = attributes.accessories;
            }

            // Save filtered attributes
            await onSave(filteredAttributes);

            if (showToasts) {
                toast.success("Details saved", {
                    description: "Details have been saved successfully"
                });
            }
        } catch (error) {
            console.error('Error saving attributes:', error);
            toast.error("Save Failed", {
                description: "Failed to save details"
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

    // Realistic human color options
    const humanSkinColors = [
        '#FFDBAC', '#F5D7B9', '#F1C27D', '#E3B98A', // Light/pale to medium
        '#D8A67A', '#C68642', '#9F734F', '#8D5524', // Medium to brown
        '#774C2A', '#664232', '#523022', '#362214', // Dark brown to deeper brown
    ];

    const humanEyeColors = [
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

    // Animation variants for smooth tab transitions
    const tabContentVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.3, ease: "easeOut" }
        },
        exit: {
            opacity: 0,
            x: 10,
            transition: { duration: 0.2, ease: "easeIn" }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#4CAF50]">
                        {isCharacter
                            ? 'Character Details'
                            : isPet
                                ? 'Pet Details'
                                : 'Object Details'
                        }
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col space-y-4 py-4">
                    {/* Character image, name */}
                    <div className="flex items-start space-x-4">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-[#4CAF50] flex-shrink-0">
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                            </div>

                            {/* Primary indicator on the image */}
                            {isPrimaryCharacter && (
                                <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                                    <Crown className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            {/* Name editor */}
                            {isEditingName ? (
                                <div className="flex items-center">
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mr-2 py-1 h-9 cursor-text"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleNameUpdate();
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleNameUpdate}
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
                                <div className="flex items-center">
                                    <h3 className="text-lg font-semibold mr-2">
                                        {name}
                                    </h3>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="text-gray-500 hover:text-[#4CAF50] transition-colors cursor-pointer p-1 rounded-full hover:bg-[#4CAF50]/10"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Show description (read-only) */}
                            {description && (
                                <p className="text-xs text-gray-600 mt-1">
                                    {description}
                                </p>
                            )}

                            {/* Primary character toggle */}
                            {onSetPrimary && (
                                <div className="flex items-center mt-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="primary"
                                            checked={isPrimaryCharacter}
                                            onCheckedChange={handlePrimaryToggle}
                                            className="data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-400"
                                        />
                                        <label
                                            htmlFor="primary"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center"
                                        >
                                            <Crown className="w-3.5 h-3.5 mr-1 text-amber-500" />
                                            Make Primary Character
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attribute tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 mb-4">
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
                                <span>Clothing</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="relative h-[300px]">
                            {/* Basic info tab */}
                            <TabsContent value="basic" asChild forceMount>
                                <motion.div
                                    initial="hidden"
                                    animate={activeTab === "basic" ? "visible" : "hidden"}
                                    exit="exit"
                                    variants={tabContentVariants}
                                    className="space-y-5 pt-2 absolute w-full"
                                    style={{ display: activeTab === "basic" ? "block" : "none" }}
                                >
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="age" className="mb-1.5 block">Age</Label>
                                            <Input
                                                id="age"
                                                value={attributes.age || ''}
                                                onChange={(e) => updateAttribute('age', e.target.value)}
                                                placeholder={isCharacter ? "e.g., 8, Teen, Adult" : "e.g., Puppy, Adult"}
                                                className="cursor-text"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="gender" className="mb-1.5 block">Gender</Label>
                                            <Select
                                                value={attributes.gender || ''}
                                                onValueChange={(value) => updateAttribute('gender', value)}
                                            >
                                                <SelectTrigger className="cursor-pointer">
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent className="cursor-pointer">
                                                    <SelectItem value="Male" className="cursor-pointer">Male</SelectItem>
                                                    <SelectItem value="Female" className="cursor-pointer">Female</SelectItem>
                                                    <SelectItem value="Non-binary" className="cursor-pointer">Non-binary</SelectItem>
                                                    <SelectItem value="Unknown" className="cursor-pointer">Unknown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {isCharacter ? (
                                        <div>
                                            <Label htmlFor="ethnicity" className="mb-1.5 block">Ethnicity</Label>
                                            <Popover open={openEthnicity} onOpenChange={setOpenEthnicity}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openEthnicity}
                                                        className="w-full justify-between cursor-pointer"
                                                    >
                                                        {attributes.ethnicity
                                                            ? ethnicities.find((ethnic) => ethnic.label.toLowerCase() === attributes.ethnicity?.toLowerCase())?.label || attributes.ethnicity
                                                            : "Select ethnicity"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search ethnicity..." />
                                                        <CommandEmpty>
                                                            <div className="p-2 text-center">
                                                                <p className="text-sm">Ethnicity not found</p>
                                                                <div className="mt-2 flex items-center">
                                                                    <Input
                                                                        placeholder="Enter custom ethnicity"
                                                                        value={customEthnicity}
                                                                        onChange={(e) => setCustomEthnicity(e.target.value)}
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        className="ml-2"
                                                                        onClick={() => {
                                                                            if (customEthnicity.trim()) {
                                                                                updateAttribute('ethnicity', customEthnicity.trim());
                                                                                setOpenEthnicity(false);
                                                                            }
                                                                        }}
                                                                    >
                                                                        Add
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CommandEmpty>
                                                        <div className="max-h-[200px] overflow-y-auto">
                                                            <CommandGroup>
                                                                {ethnicities.map((ethnic) => (
                                                                    <CommandItem
                                                                        key={ethnic.value}
                                                                        onSelect={() => {
                                                                            updateAttribute('ethnicity', ethnic.label);
                                                                            setOpenEthnicity(false);
                                                                        }}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        <CheckIcon
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                attributes.ethnicity?.toLowerCase() === ethnic.label.toLowerCase() ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {ethnic.label}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </div>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    ) : isPet ? (
                                        <div>
                                            <Label htmlFor="breed" className="mb-1.5 block">Breed/Species</Label>
                                            <Popover open={openBreed} onOpenChange={setOpenBreed}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openBreed}
                                                        className="w-full justify-between cursor-pointer"
                                                    >
                                                        {attributes.breed
                                                            ? [...dogBreeds, ...catBreeds].find(
                                                            (breed) => breed.label.toLowerCase() === attributes.breed?.toLowerCase()
                                                        )?.label || attributes.breed
                                                            : "Select breed"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search breed..." />
                                                        <CommandEmpty>
                                                            <div className="p-2 text-center">
                                                                <p className="text-sm">Breed not found</p>
                                                                <div className="mt-2 flex items-center">
                                                                    <Input
                                                                        placeholder="Enter custom breed"
                                                                        value={customBreed}
                                                                        onChange={(e) => setCustomBreed(e.target.value)}
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        className="ml-2"
                                                                        onClick={() => {
                                                                            if (customBreed.trim()) {
                                                                                updateAttribute('breed', customBreed.trim());
                                                                                setOpenBreed(false);
                                                                            }
                                                                        }}
                                                                    >
                                                                        Add
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CommandEmpty>
                                                        <div className="max-h-[200px] overflow-y-auto">
                                                            <CommandGroup heading="Dog Breeds">
                                                                {dogBreeds.map((breed) => (
                                                                    <CommandItem
                                                                        key={breed.value}
                                                                        onSelect={() => {
                                                                            updateAttribute('breed', breed.label);
                                                                            setOpenBreed(false);
                                                                        }}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        <CheckIcon
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                attributes.breed?.toLowerCase() === breed.label.toLowerCase() ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {breed.label}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                            <CommandGroup heading="Cat Breeds">
                                                                {catBreeds.map((breed) => (
                                                                    <CommandItem
                                                                        key={breed.value}
                                                                        onSelect={() => {
                                                                            updateAttribute('breed', breed.label);
                                                                            setOpenBreed(false);
                                                                        }}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        <CheckIcon
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                attributes.breed?.toLowerCase() === breed.label.toLowerCase() ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {breed.label}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </div>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    ) : (
                                        // For objects, show type
                                        <div>
                                            <Label htmlFor="type" className="mb-1.5 block">Object Type</Label>
                                            <Input
                                                id="type"
                                                value={attributes.breed || ''}
                                                onChange={(e) => updateAttribute('breed', e.target.value)}
                                                placeholder="e.g., Toy, Book, Statue"
                                                className="cursor-text"
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            </TabsContent>

                            {/* Appearance tab */}
                            <TabsContent value="appearance" asChild forceMount>
                                <motion.div
                                    initial="hidden"
                                    animate={activeTab === "appearance" ? "visible" : "hidden"}
                                    exit="exit"
                                    variants={tabContentVariants}
                                    className="space-y-5 pt-2 absolute w-full"
                                    style={{ display: activeTab === "appearance" ? "block" : "none" }}
                                >
                                    {isCharacter ? (
                                        <>
                                            <ColorPicker
                                                label="Skin Color"
                                                initialColor={attributes.skinColor || '#E3B98A'}
                                                onChange={(color) => updateAttribute('skinColor', color)}
                                                commonColors={humanSkinColors}
                                            />

                                            <ColorPicker
                                                label="Eye Color"
                                                initialColor={attributes.eyeColor || '#5F4B32'}
                                                onChange={(color) => updateAttribute('eyeColor', color)}
                                                commonColors={humanEyeColors}
                                            />

                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <Label htmlFor="hairStyle" className="mb-1.5 block">Hair Style</Label>
                                                    <Input
                                                        id="hairStyle"
                                                        value={attributes.hairStyle || ''}
                                                        onChange={(e) => updateAttribute('hairStyle', e.target.value)}
                                                        placeholder="e.g., Curly, Straight, Braided"
                                                        className="cursor-text"
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="hairColor" className="mb-1.5 block">Hair Color</Label>
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
                                        <>
                                            <ColorPicker
                                                label="Fur Color"
                                                initialColor={attributes.furColor || '#A52A2A'}
                                                onChange={(color) => updateAttribute('furColor', color)}
                                            />

                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <Label htmlFor="furStyle" className="mb-1.5 block">Fur Style</Label>
                                                    <Input
                                                        id="furStyle"
                                                        value={attributes.furStyle || ''}
                                                        onChange={(e) => updateAttribute('furStyle', e.target.value)}
                                                        placeholder="e.g., Short, Long, Curly"
                                                        className="cursor-text"
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="markings" className="mb-1.5 block">Markings</Label>
                                                    <Input
                                                        id="markings"
                                                        value={attributes.markings || ''}
                                                        onChange={(e) => updateAttribute('markings', e.target.value)}
                                                        placeholder="e.g., Spots, Stripes"
                                                        className="cursor-text"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        // Objects get simple appearance options
                                        <>
                                            <div>
                                                <Label htmlFor="color" className="mb-1.5 block">Color</Label>
                                                <ColorPicker
                                                    label=""
                                                    initialColor={attributes.furColor || '#6082B6'}
                                                    onChange={(color) => updateAttribute('furColor', color)}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="material" className="mb-1.5 block">Material</Label>
                                                <Input
                                                    id="material"
                                                    value={attributes.furStyle || ''}
                                                    onChange={(e) => updateAttribute('furStyle', e.target.value)}
                                                    placeholder="e.g., Wood, Plastic, Metal"
                                                    className="cursor-text"
                                                />
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            </TabsContent>

                            {/* Clothing tab */}
                            <TabsContent value="clothing" asChild forceMount>
                                <motion.div
                                    initial="hidden"
                                    animate={activeTab === "clothing" ? "visible" : "hidden"}
                                    exit="exit"
                                    variants={tabContentVariants}
                                    className="space-y-5 pt-2 absolute w-full"
                                    style={{ display: activeTab === "clothing" ? "block" : "none" }}
                                >
                                    <div>
                                        <Label htmlFor="outfit" className="mb-1.5 block">
                                            {isCharacter ? 'Outfit/Clothing' : isPet ? 'Collar/Outfit' : 'Decorations'}
                                        </Label>
                                        <Input
                                            id="outfit"
                                            value={attributes.outfit || ''}
                                            onChange={(e) => updateAttribute('outfit', e.target.value)}
                                            placeholder={isCharacter
                                                ? "e.g., Blue dress, Red t-shirt and jeans"
                                                : isPet ? "e.g., Red collar, Yellow sweater"
                                                    : "e.g., Stickers, Paint job"}
                                            className="cursor-text"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="accessories" className="mb-1.5 block">
                                            {isCharacter || isPet ? 'Accessories' : 'Features'}
                                        </Label>
                                        <Input
                                            id="accessories"
                                            value={attributes.accessories || ''}
                                            onChange={(e) => updateAttribute('accessories', e.target.value)}
                                            placeholder={isCharacter
                                                ? "e.g., Glasses, Hat, Necklace"
                                                : isPet ? "e.g., Bow, Tag, Bandana"
                                                    : "e.g., Buttons, Lights, Compartments"}
                                            className="cursor-text"
                                        />
                                    </div>
                                </motion.div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSaving}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-[#4CAF50] hover:bg-[#43a047] cursor-pointer"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Details
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}