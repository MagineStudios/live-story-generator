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
import { ElementCategory } from '@prisma/client';

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
    collar?: string;
    outfit?: string;
    accessories?: string;
    material?: string;
    primaryColor?: string;
    secondaryColor?: string;
    details?: string;
}

interface AttributesEditorProps {
    isOpen: boolean;
    onClose: () => void;
    elementId: string;
    elementName: string;
    imageUrl: string;
    category: ElementCategory; // Use the ElementCategory type
    initialAttributes?: CharacterAttributes;
    onSave: (attributes: CharacterAttributes) => void;
    onNameChange?: (newName: string) => Promise<void>;
    isLoading?: boolean;
}

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
                                 }: AttributesEditorProps) {
    // Determine what type of element we're editing
    const isCharacter = category === 'CHARACTER';
    const isPet = category === 'PET';
    const isObject = category === 'OBJECT';
    const isLocation = category === 'LOCATION';

    // State for character attributes
    const [attributes, setAttributes] = useState<CharacterAttributes>(() => ({
        elementId,
        age: '',
        gender: '',
        ...(isCharacter ? {
            skinColor: '#E3B98A', // Default realistic skin tone
            hairColor: '#6E3E19', // Default realistic hair color
            eyeColor: '#5F4B32', // Default realistic eye color - brown
        } : isPet ? {
            furColor: '#A52A2A', // Default fur color
            eyeColor: '#5F4B32', // Default eye color for pets
            collar: '', // Initialize empty collar value
        } : isObject ? {
            material: '',
            primaryColor: '#FF5252',
            secondaryColor: '#448AFF',
        } : {}),
    }));

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
            // Make sure we're keeping all the attributes that match the current category
            let defaultAttributes = { elementId };

            // Add category-specific default values
            if (isCharacter) {
                defaultAttributes = {
                    ...defaultAttributes,
                    skinColor: '#E3B98A',
                    hairColor: '#6E3E19',
                    eyeColor: '#5F4B32',
                };
            } else if (isPet) {
                defaultAttributes = {
                    ...defaultAttributes,
                    furColor: '#A52A2A',
                    eyeColor: '#5F4B32',
                };
            } else if (isObject) {
                defaultAttributes = {
                    ...defaultAttributes,
                    primaryColor: '#FF5252',
                    secondaryColor: '#448AFF',
                };
            }

            // Set attributes with defaults and then override with actual values
            setAttributes({
                ...defaultAttributes,
                ...initialAttributes
            });
        }
        setName(elementName);
        setPendingNameUpdate(false);
    }, [initialAttributes, elementName, isOpen, category, elementId]);

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
                description: `${newName} has been saved as the new name`,
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
            // First save attributes
            await onSave(attributes);

            // If there's a pending name change that wasn't saved with the immediate update
            if (pendingNameUpdate && onNameChange && name !== elementName) {
                await onNameChange(name);
                setPendingNameUpdate(false);
            }

            toast.success("Details saved", {
                description: `${name}'s details have been saved successfully`
            });
        } catch (error) {
            console.error('Error saving attributes:', error);
            toast.error("Save Failed", {
                description: `Failed to save ${isCharacter ? 'character' : isPet ? 'pet' : 'object'} details`
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
        '#FF0000', '#990000', '#CC6600', // Red tones (for collars)
    ];

    const toyColors = [
        '#FF5252', '#FF4081', '#E040FB', // Red/Pink/Purple
        '#7C4DFF', '#536DFE', '#448AFF', // Purple/Blue
        '#40C4FF', '#18FFFF', '#64FFDA', // Blue/Teal
        '#69F0AE', '#B2FF59', '#EEFF41', // Green/Lime/Yellow
        '#FFD740', '#FFAB40', '#FF6E40', // Yellow/Orange/Deep Orange
    ];

    // Get the appropriate dialog title based on category
    const getDialogTitle = () => {
        switch (category) {
            case 'PET':
                return 'Pet Details';
            case 'OBJECT':
                return 'Object Details';
            case 'LOCATION':
                return 'Location Details';
            default:
                return 'Character Details';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#4CAF50]">
                        {getDialogTitle()}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[300px]">
                        <Loader2 className="h-10 w-10 animate-spin text-[#4CAF50] mb-4" />
                        <p className="text-gray-600 text-center">
                            Loading {isPet ? 'pet' : isCharacter ? 'character' : isObject ? 'object' : 'location'} details...
                        </p>
                        <p className="text-gray-500 text-sm text-center mt-2">This will just take a moment</p>
                    </div>
                ) : (
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
                                    Edit {isPet ? 'pet' : isCharacter ? 'character' : isObject ? 'object' : 'location'} details below
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
                                    <span>{isCharacter ? 'Clothing' : isPet ? 'Accessories' : 'Details'}</span>
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
                                                    placeholder={
                                                        isCharacter ? "e.g., 8, Teen, Adult" :
                                                            isPet ? "e.g., Puppy, Adult" :
                                                                "e.g., New, Vintage"
                                                    }
                                                    className="cursor-text"
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="gender" className="mb-1.5 block">
                                                    {isObject ? "Type" : "Gender"}
                                                </Label>
                                                <Select
                                                    value={attributes.gender || ''}
                                                    onValueChange={(value) => updateAttribute('gender', value)}
                                                >
                                                    <SelectTrigger className="cursor-pointer">
                                                        <SelectValue placeholder={isObject ? "Select type" : "Select gender"} />
                                                    </SelectTrigger>
                                                    <SelectContent className="cursor-pointer">
                                                        {(isCharacter || isPet) && (
                                                            <>
                                                                <SelectItem value="Male" className="cursor-pointer">Male</SelectItem>
                                                                <SelectItem value="Female" className="cursor-pointer">Female</SelectItem>
                                                                {isCharacter && <SelectItem value="Non-binary" className="cursor-pointer">Non-binary</SelectItem>}
                                                                <SelectItem value="Unknown" className="cursor-pointer">Unknown</SelectItem>
                                                            </>
                                                        )}

                                                        {isObject && (
                                                            <>
                                                                <SelectItem value="Toy" className="cursor-pointer">Toy</SelectItem>
                                                                <SelectItem value="Doll" className="cursor-pointer">Doll</SelectItem>
                                                                <SelectItem value="Stuffed Animal" className="cursor-pointer">Stuffed Animal</SelectItem>
                                                                <SelectItem value="Action Figure" className="cursor-pointer">Action Figure</SelectItem>
                                                                <SelectItem value="Object" className="cursor-pointer">Object</SelectItem>
                                                                <SelectItem value="Other" className="cursor-pointer">Other</SelectItem>
                                                            </>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {isCharacter && (
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
                                        )}

                                        {isPet && (
                                            <div>
                                                <Label htmlFor="breed" className="mb-1.5 block">
                                                    <span className="inline-block mr-1">🐾</span>
                                                    Breed/Species
                                                </Label>
                                                <Input
                                                    id="breed"
                                                    value={attributes.breed || ''}
                                                    onChange={(e) => updateAttribute('breed', e.target.value)}
                                                    placeholder="e.g., Labrador, Persian Cat"
                                                    className="cursor-text"
                                                />
                                            </div>
                                        )}

                                        {isObject && (
                                            <div>
                                                <Label htmlFor="material" className="mb-1.5 block">
                                                    <span className="inline-block mr-1">🧸</span>
                                                    Material
                                                </Label>
                                                <Input
                                                    id="material"
                                                    value={attributes.material || ''}
                                                    onChange={(e) => updateAttribute('material', e.target.value)}
                                                    placeholder="e.g., Plush, Plastic, Wood"
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
                                                    commonColors={eyeColors}
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
                                                    commonColors={furColors}
                                                />

                                                <ColorPicker
                                                    label="Eye Color"
                                                    initialColor={attributes.eyeColor || '#5F4B32'}
                                                    onChange={(color) => updateAttribute('eyeColor', color)}
                                                    commonColors={eyeColors}
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
                                        ) : isObject ? (
                                            <>
                                                <ColorPicker
                                                    label="Primary Color"
                                                    initialColor={attributes.primaryColor || '#FF5252'}
                                                    onChange={(color) => updateAttribute('primaryColor', color)}
                                                    commonColors={toyColors}
                                                />

                                                <ColorPicker
                                                    label="Secondary Color"
                                                    initialColor={attributes.secondaryColor || '#448AFF'}
                                                    onChange={(color) => updateAttribute('secondaryColor', color)}
                                                    commonColors={toyColors}
                                                />

                                                <div>
                                                    <Label htmlFor="details" className="mb-1.5 block">Visual Details</Label>
                                                    <Input
                                                        id="details"
                                                        value={attributes.details || ''}
                                                        onChange={(e) => updateAttribute('details', e.target.value)}
                                                        placeholder="e.g., Button eyes, Painted features"
                                                        className="cursor-text"
                                                    />
                                                </div>
                                            </>
                                        ) : null}
                                    </TabsContent>

                                    {/* Clothing/Accessories tab */}
                                    <TabsContent value="clothing" className="space-y-5 pt-2">
                                        {isPet && (
                                            <div>
                                                <Label htmlFor="collar" className="mb-1.5 block">
                                                    <span className="inline-block mr-1">🐾</span>
                                                    Collar
                                                </Label>
                                                <Input
                                                    id="collar"
                                                    value={attributes.collar || ''}
                                                    onChange={(e) => updateAttribute('collar', e.target.value)}
                                                    placeholder="e.g., Red collar with name tag"
                                                    className="cursor-text"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <Label htmlFor="outfit" className="mb-1.5 block">
                                                {isCharacter ? 'Outfit/Clothing' : isPet ? 'Pet Outfit' : 'Details'}
                                            </Label>
                                            <Input
                                                id="outfit"
                                                value={attributes.outfit || ''}
                                                onChange={(e) => updateAttribute('outfit', e.target.value)}
                                                placeholder={
                                                    isCharacter ? "e.g., Blue dress, Red t-shirt" :
                                                        isPet ? "e.g., Sweater, Bandana" :
                                                            "e.g., Stitching details, Worn patches"
                                                }
                                                className="cursor-text"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="accessories" className="mb-1.5 block">Accessories</Label>
                                            <Input
                                                id="accessories"
                                                value={attributes.accessories || ''}
                                                onChange={(e) => updateAttribute('accessories', e.target.value)}
                                                placeholder={
                                                    isCharacter ? "e.g., Glasses, Hat, Necklace" :
                                                        isPet ? "e.g., Bandana, Bow, Name tag" :
                                                            "e.g., Ribbons, Buttons, Attached items"
                                                }
                                                className="cursor-text"
                                            />
                                        </div>
                                    </TabsContent>
                                </motion.div>
                            </AnimatePresence>
                        </Tabs>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0 mt-2">
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