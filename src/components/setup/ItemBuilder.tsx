// Copyright (C) 2026 William W. Davis, MSPM, PMP. All rights reserved.
// Licensed under the GNU General Public License v3.0.
// See LICENSE file in the project root for full license text.

import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBufferedField } from '../../hooks/useBufferedField';
import type { StructuredItem } from '../../types/ahp';

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="3" r="1.5" />
      <circle cx="11" cy="3" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="13" r="1.5" />
      <circle cx="11" cy="13" r="1.5" />
    </svg>
  );
}

interface SortableItemProps {
  item: StructuredItem;
  index: number;
  itemLabel: string;
  onUpdateLabel: (label: string) => void;
  onRemove: () => void;
}

function SortableItem({ item, index, itemLabel, onUpdateLabel, onRemove }: SortableItemProps) {
  const labelField = useBufferedField({
    storeValue: item.label,
    onCommit: (value) => { if (value !== item.label) onUpdateLabel(value); },
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${isDragging ? 'z-50 shadow-lg bg-white dark:bg-gray-800 rounded-md' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 touch-none"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        <GripIcon />
      </button>
      <span className="text-xs text-gray-400 dark:text-gray-500 w-6">{index + 1}.</span>
      <input
        type="text"
        name="itemLabel"
        value={labelField.draft}
        onChange={labelField.handleChange}
        onFocus={labelField.handleFocus}
        onBlur={labelField.handleBlur}
        onKeyDown={labelField.handleKeyDown}
        aria-label={`${itemLabel} ${index + 1} label`}
        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        onClick={onRemove}
        className="px-2 py-1 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

interface ItemBuilderProps {
  items: StructuredItem[];
  onChange: (items: StructuredItem[]) => void;
  itemLabel: string;
  hasComparisons: boolean;
}

export default function ItemBuilder({ items, onChange, itemLabel, hasComparisons }: ItemBuilderProps) {
  const [newLabel, setNewLabel] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;

    if (hasComparisons) {
      if (!window.confirm('Adding an item will clear existing comparisons. Continue?')) return;
    }

    const id = `${itemLabel.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange([...items, { id, label, description: '' }]);
    setNewLabel('');
  };

  const removeItem = (index: number) => {
    if (hasComparisons) {
      if (!window.confirm('Removing an item will clear existing comparisons. Continue?')) return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  const updateLabel = (index: number, label: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index]!, label };
    onChange(newItems);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3">
      <div className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {`${itemLabel}s`} ({items.length})
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, i) => (
            <SortableItem
              key={item.id}
              item={item}
              index={i}
              itemLabel={itemLabel}
              onUpdateLabel={(label) => updateLabel(i, label)}
              onRemove={() => removeItem(i)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <input
          type="text"
          name="newItemLabel"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder={`Add ${itemLabel.toLowerCase()}...`}
          aria-label={`Add ${itemLabel.toLowerCase()}`}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={addItem}
          disabled={!newLabel.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}
