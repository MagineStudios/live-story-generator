'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPicker } from './color-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Save, User, Paintbrush, Shirt, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';

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
}

interface AttributesEditorProps {
    isOpen: boolean;
    onClose: () => void;
    elementId: string;
    elementName: string;
    imageUrl: string;
    isCharacter: boolean; // true for character, false for pet
    initialAttributes?: CharacterAttributes;
    onSave: (attributes: CharacterAttributes) => void;
    onNameChange?: (newName: string) => Promise<void>;
}

export function AttributesEditor({
                                     isOpen,
                                     onClose,
                                     elementId,
                                     elementName,
                                     imageUrl,
                                     isCharacter,
                                     initialAttributes,
                                     onSave,
                                     onNameChange,
                                 }: AttributesEditorProps) {
    // State for character attributes
    const [attributes, setAttributes] = useState<CharacterAttributes>({
        elementId,
        age: '',
        gender: '',
        ...(isCharacter ? {
            skinColor: '#E3B98A', // Default realistic skin tone
            hairColor: '#6E3E19', // Default realistic hair color
            eyeColor: '#5F4B32', // Default realistic eye color - brown
        } : {
            furColor: '#A52A2A', // Default fur color
        }),
    });

    // Name editing state
    const [name, setName] = useState(elementName);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [pendingNameUpdate, setPendingNameUpdate] = useState(false);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    // Initialize attributes from props
    useEffect(() => {
        if (initialAttributes) {
            setAttributes({ ...attributes, ...initialAttributes });
        }
        setName(elementName);
        setPendingNameUpdate(false);
    }, [initialAttributes, elementName, isOpen]);

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
                description: "Character name has been updated successfully",
                duration: 2000
            });
            setPendingNameUpdate(false);
        } catch (error) {
            console.error('Error updating name:', error);
            toast.error("Name update failed", {
                description: "There was an error updating the character name"
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
            // First save attributes
            await onSave(attributes);

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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#4CAF50]">
                        {isCharacter ? 'Character Details' : 'Pet Details'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col space-y-4 py-4">
                    {/* Character image and name editor */}
                    <div className="flex items-center space-x-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-[#4CAF50] flex-shrink-0">
                            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
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
                            )}
                            <p className="text-sm text-gray-500">
                                Edit {isCharacter ? 'character' : 'pet'} details below
                            </p>
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

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="px-1"
                            >
                                {/* Basic info tab */}
                                <TabsContent value="basic" className="space-y-5 pt-2">
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
                                            <Input
                                                id="ethnicity"
                                                value={attributes.ethnicity || ''}
                                                onChange={(e) => updateAttribute('ethnicity', e.target.value)}
                                                placeholder="e.g., Asian, Hispanic, African"
                                                className="cursor-text"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <Label htmlFor="breed" className="mb-1.5 block">Breed/Species</Label>
                                            <Input
                                                id="breed"
                                                value={attributes.breed || ''}
                                                onChange={(e) => updateAttribute('breed', e.target.value)}
                                                placeholder="e.g., Labrador, Persian Cat"
                                                className="cursor-text"
                                            />
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Appearance tab */}
                                <TabsContent value="appearance" className="space-y-5 pt-2">
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
                                    ) : (
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
                                    )}
                                </TabsContent>

                                {/* Clothing tab */}
                                <TabsContent value="clothing" className="space-y-5 pt-2">
                                    <div>
                                        <Label htmlFor="outfit" className="mb-1.5 block">Outfit/Clothing</Label>
                                        <Input
                                            id="outfit"
                                            value={attributes.outfit || ''}
                                            onChange={(e) => updateAttribute('outfit', e.target.value)}
                                            placeholder="e.g., Blue dress, Red t-shirt and jeans"
                                            className="cursor-text"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="accessories" className="mb-1.5 block">Accessories</Label>
                                        <Input
                                            id="accessories"
                                            value={attributes.accessories || ''}
                                            onChange={(e) => updateAttribute('accessories', e.target.value)}
                                            placeholder="e.g., Glasses, Hat, Necklace"
                                            className="cursor-text"
                                        />
                                    </div>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
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