'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ElementCard } from './element-card';
import { EmptyState } from './empty-state';
import { MyWorldElement, ElementCategory, ELEMENT_CATEGORIES } from './types';
import { EditElementModal } from './edit-element-modal';
import { AddElementModal } from './add-element-modal';
import { toast } from 'sonner';

export default function MyWorldPage() {
  const [elements, setElements] = useState<MyWorldElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ElementCategory>('CHARACTER');
  const [editingElement, setEditingElement] = useState<MyWorldElement | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchElements();
  }, []);

  const fetchElements = async () => {
    try {
      const response = await fetch('/api/my-world/elements');
      if (response.ok) {
        const data = await response.json();
        setElements(data.elements || []);
      }
    } catch (error) {
      console.error('Error fetching elements:', error);
      toast.error('Failed to load elements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (elementId: string) => {
    try {
      const response = await fetch(`/api/my-world/elements/${elementId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setElements(elements.filter(el => el.id !== elementId));
        toast.success('Element deleted successfully');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting element:', error);
      toast.error('Failed to delete element');
    }
  };

  const handleEdit = (element: MyWorldElement) => {
    setEditingElement(element);
  };

  const handleAdd = () => {
    setShowAddModal(true);
  };

  const handleElementUpdated = (updatedElement: MyWorldElement) => {
    setElements(elements.map(el => 
      el.id === updatedElement.id ? updatedElement : el
    ));
  };

  const handleElementAdded = (newElement: MyWorldElement) => {
    setElements([...elements, newElement]);
  };

  const filteredElements = elements.filter(el => el.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My World</h1>
        <p className="text-muted-foreground">
          Manage your characters, pets, locations, and objects that appear in your stories
        </p>
      </div>

      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ElementCategory)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {ELEMENT_CATEGORIES.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              <span className="mr-2">{category.icon}</span>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ELEMENT_CATEGORIES.map((category) => (
          <TabsContent key={category.value} value={category.value} className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {category.label} ({filteredElements.length})
              </h2>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add {category.label.slice(0, -1)}
              </Button>
            </div>

            {filteredElements.length === 0 ? (
              <EmptyState category={category.value} onAdd={handleAdd} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredElements.map((element) => (
                  <ElementCard
                    key={element.id}
                    element={element}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Modal */}
      <EditElementModal
        element={editingElement}
        isOpen={!!editingElement}
        onClose={() => setEditingElement(null)}
        onSave={handleElementUpdated}
      />

      {/* Add Modal */}
      <AddElementModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onElementAdded={handleElementAdded}
        category={selectedCategory}
      />
    </div>
  );
}