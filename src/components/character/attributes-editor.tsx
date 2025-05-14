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
import { Loader2, Save, User, Paintbrush, Shirt } from 'lucide-react';
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
 }: AttributesEditorProps) {
    const [attributes, setAttributes] = useState<CharacterAttributes>({
        elementId,
        age: '',
        gender: '',
        ...(isCharacter ? {
            skinColor: '#F5DEB3', // Default skin color
            hairColor: '#8B4513', // Default hair color
            eyeColor: '#6082B6', // Default eye color
        } : {
            furColor: '#A52A2A', // Default fur color
        }),
    });

    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    useEffect(() => {
        if (initialAttributes) {
            setAttributes({ ...attributes, ...initialAttributes });
        }
    }, [initialAttributes, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(attributes);
        } catch (error) {
            console.error('Error saving attributes:', error);
            toast.error("Save Failed", {
                description: "There was an unexpected error saving your character details."
            });
        } finally {
            setIsSaving(false);
            onClose();
        }
    };

    const updateAttribute = (key: keyof CharacterAttributes, value: string) => {
        setAttributes(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#4CAF50]">
                        {isCharacter ? 'Character Details' : 'Pet Details'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col space-y-4 py-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-[#4CAF50] flex-shrink-0">
                            <img src={imageUrl} alt={elementName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">{elementName}</h3>
                            <p className="text-sm text-gray-500">
                                Edit {isCharacter ? 'character' : 'pet'} details below
                            </p>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-3 mb-4">
                            <TabsTrigger value="basic" className="flex items-center gap-1.5">
                                <User size={16} />
                                <span>Basic</span>
                            </TabsTrigger>
                            <TabsTrigger value="appearance" className="flex items-center gap-1.5">
                                <Paintbrush size={16} />
                                <span>Appearance</span>
                            </TabsTrigger>
                            <TabsTrigger value="clothing" className="flex items-center gap-1.5">
                                <Shirt size={16} />
                                <span>Clothing</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* AnimatePresence is important here for smooth tab transitions */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <TabsContent value="basic" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="age">Age</Label>
                                            <Input
                                                id="age"
                                                value={attributes.age || ''}
                                                onChange={(e) => updateAttribute('age', e.target.value)}
                                                placeholder={isCharacter ? "e.g., 8, Teen, Adult" : "e.g., Puppy, Adult"}
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="gender">Gender</Label>
                                            <Select
                                                value={attributes.gender || ''}
                                                onValueChange={(value) => updateAttribute('gender', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Male">Male</SelectItem>
                                                    <SelectItem value="Female">Female</SelectItem>
                                                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                                                    <SelectItem value="Unknown">Unknown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {isCharacter ? (
                                        <div>
                                            <Label htmlFor="ethnicity">Ethnicity</Label>
                                            <Input
                                                id="ethnicity"
                                                value={attributes.ethnicity || ''}
                                                onChange={(e) => updateAttribute('ethnicity', e.target.value)}
                                                placeholder="e.g., Asian, Hispanic, African"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <Label htmlFor="breed">Breed/Species</Label>
                                            <Input
                                                id="breed"
                                                value={attributes.breed || ''}
                                                onChange={(e) => updateAttribute('breed', e.target.value)}
                                                placeholder="e.g., Labrador, Persian Cat"
                                            />
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="appearance" className="space-y-4">
                                    {isCharacter ? (
                                        <>
                                            <ColorPicker
                                                label="Skin Color"
                                                initialColor={attributes.skinColor || '#F5DEB3'}
                                                onChange={(color) => updateAttribute('skinColor', color)}
                                                commonColors={[
                                                    '#F5DEB3', '#FFE4C4', '#D2B48C', '#A0522D',
                                                    '#8B4513', '#654321', '#3B2F2F', '#614126'
                                                ]}
                                            />

                                            <ColorPicker
                                                label="Eye Color"
                                                initialColor={attributes.eyeColor || '#6082B6'}
                                                onChange={(color) => updateAttribute('eyeColor', color)}
                                                commonColors={[
                                                    '#6082B6', '#3D59AB', '#1E3F66', '#2B3856',
                                                    '#533324', '#704214', '#7E4A35', '#6B4423',
                                                    '#729F39', '#93C572', '#00FF00', '#808000'
                                                ]}
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="hairStyle">Hair Style</Label>
                                                    <Input
                                                        id="hairStyle"
                                                        value={attributes.hairStyle || ''}
                                                        onChange={(e) => updateAttribute('hairStyle', e.target.value)}
                                                        placeholder="e.g., Curly, Straight, Braided"
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="hairColor">Hair Color</Label>
                                                    <div className="mt-1">
                                                        <ColorPicker
                                                            label=""
                                                            initialColor={attributes.hairColor || '#8B4513'}
                                                            onChange={(color) => updateAttribute('hairColor', color)}
                                                            commonColors={[
                                                                '#000000', '#36454F', '#555555', // Black/dark
                                                                '#8B4513', '#A52A2A', '#D2691E', // Brown
                                                                '#F5DEB3', '#FFE4B5', '#FFD700', // Blonde
                                                                '#B22222', '#FF4500', '#FF6347', // Red
                                                                '#808080', '#C0C0C0', '#FFFFFF'  // Gray/white
                                                            ]}
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

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="furStyle">Fur Style</Label>
                                                    <Input
                                                        id="furStyle"
                                                        value={attributes.furStyle || ''}
                                                        onChange={(e) => updateAttribute('furStyle', e.target.value)}
                                                        placeholder="e.g., Short, Long, Curly"
                                                    />
                                                </div>

                                                <div>
                                                    <Label htmlFor="markings">Markings</Label>
                                                    <Input
                                                        id="markings"
                                                        value={attributes.markings || ''}
                                                        onChange={(e) => updateAttribute('markings', e.target.value)}
                                                        placeholder="e.g., Spots, Stripes"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </TabsContent>

                                <TabsContent value="clothing" className="space-y-4">
                                    <div>
                                        <Label htmlFor="outfit">Outfit/Clothing</Label>
                                        <Input
                                            id="outfit"
                                            value={attributes.outfit || ''}
                                            onChange={(e) => updateAttribute('outfit', e.target.value)}
                                            placeholder="e.g., Blue dress, Red t-shirt and jeans"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="accessories">Accessories</Label>
                                        <Input
                                            id="accessories"
                                            value={attributes.accessories || ''}
                                            onChange={(e) => updateAttribute('accessories', e.target.value)}
                                            placeholder="e.g., Glasses, Hat, Necklace"
                                        />
                                    </div>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-[#4CAF50] hover:bg-[#43a047]"
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