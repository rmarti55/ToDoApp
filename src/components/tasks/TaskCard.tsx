'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Trash2, Clock, Folder, Keyboard, Info } from 'lucide-react';
import { formatTaskDate } from '@/lib/utils/date-formatter';
import type { Editor } from '@tiptap/core';
import type { Category } from '@/app/actions';

const NEW_TASK_DRAFT_KEY = 'newTaskDraft';

interface DraftData {
  title: string;
  content: string;
  selectedCategoryId: string | null;
  timestamp: number;
}

// This interface should align with what the database provides or what page.tsx uses.
export interface TaskForCard {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  category_id?: string | null;
}

interface TaskCardProps {
  task?: TaskForCard | null;
  categories: Category[];
  currentCategoryId?: string | null;
  onClose: () => void;
  onSave: (title: string, content: string, categoryId: string | null) => void;
  onDelete?: () => void;
}

export function TaskCard({ task, categories, currentCategoryId, onClose, onSave, onDelete }: TaskCardProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllKeystrokes, setShowAllKeystrokes] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!task;
  const isMac = typeof window !== 'undefined' ? navigator.platform.toUpperCase().indexOf('MAC') >= 0 : false;

  useEffect(() => {
    if (isEditing && task) {
      setTitle(task.title || '');
      setContent(task.content || '');
      setSelectedCategoryId(task.category_id || null);
    } else {
      try {
        const draftString = localStorage.getItem(NEW_TASK_DRAFT_KEY);
        if (draftString) {
          const draft: DraftData = JSON.parse(draftString);
          setTitle(draft.title);
          setContent(draft.content);
          setSelectedCategoryId(draft.selectedCategoryId);
        } else {
          setTitle('');
          setContent('');
          setSelectedCategoryId(currentCategoryId || null);
        }
      } catch (error) {
        console.error("Failed to load draft:", error);
        setTitle('');
        setContent('');
        setSelectedCategoryId(currentCategoryId || null);
      }
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [task, isEditing, currentCategoryId]);

  const saveDraft = useCallback(() => {
    if (!isEditing) {
      try {
        const draft: DraftData = {
          title,
          content,
          selectedCategoryId,
          timestamp: Date.now(),
        };
        localStorage.setItem(NEW_TASK_DRAFT_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error("Failed to save draft:", error);
      }
    }
  }, [isEditing, title, content, selectedCategoryId]);

  useEffect(() => {
    if (!isEditing) {
      const handler = setTimeout(() => {
        saveDraft();
      }, 500);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [title, content, selectedCategoryId, isEditing, saveDraft]);
  
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleSave = () => {
    if (!(title.trim() || content.trim())) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }
    onSave(title, content, selectedCategoryId);
    if (!isEditing) {
      try {
        localStorage.removeItem(NEW_TASK_DRAFT_KEY);
      } catch (error) {
        console.error("Failed to remove draft:", error);
      }
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const handleClose = () => {
    if (!isEditing && (title.trim() || content.trim())) {
      saveDraft();
    }
    onClose();
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const handleTitleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      editorRef.current?.commands.focus();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };
  
  const formattedCreatedAt = task?.created_at ? formatTaskDate(task.created_at) : '';
  const formattedUpdatedAt = task?.updated_at ? formatTaskDate(task.updated_at) : '';
  const showUpdatedAt = isEditing && formattedUpdatedAt && formattedCreatedAt !== formattedUpdatedAt;

  const commonKeystrokes = [
    { cmd: isMac ? 'Cmd+B' : 'Ctrl+B', desc: 'Bold' },
    { cmd: isMac ? 'Cmd+I' : 'Ctrl+I', desc: 'Italic' },
    { cmd: isMac ? 'Cmd+U' : 'Ctrl+U', desc: 'Underline' },
  ];

  const allKeystrokes = [
    ...commonKeystrokes,
    { cmd: isMac ? 'Cmd+Shift+X' : 'Ctrl+Shift+X', desc: 'Strikethrough' },
    { cmd: isMac ? 'Cmd+.' : 'Ctrl+.', desc: 'Bullet List' }, // TipTap often uses Cmd+Shift+8 or different combos
    { cmd: isMac ? 'Cmd+Shift+7' : 'Ctrl+Shift+7', desc: 'Ordered List' }, // Same as above
    { cmd: isMac ? 'Cmd+Z' : 'Ctrl+Z', desc: 'Undo' },
    { cmd: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y', desc: 'Redo' },
    { cmd: 'Enter', desc: 'New Paragraph' },
    { cmd: 'Shift+Enter', desc: 'Soft Break' },
  ];

  // Note: Actual TipTap keystrokes for lists might differ if not using default StarterKit or specific extensions.
  // For example, default bullet list from StarterKit is often `*`, `-`, or `+` followed by space.
  // And ordered list is `1.` followed by space.
  // The Cmd+Shift+Number ones are common but not always default in bare TipTap.

  return (
    <div 
      onKeyDown={handleModalKeyDown} 
      tabIndex={-1} 
      className="relative z-50 w-full md:w-3/4 p-4 md:p-0 flex flex-col max-h-[90vh]"
    >
      <Card className="w-full mx-auto shadow-xl bg-white flex flex-col flex-grow overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-2 flex-shrink-0">
          <CardTitle className="text-xl font-bold flex-1 pl-6 py-4">
            <Input
              ref={titleInputRef}
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleInputKeyDown}
              className="text-xl font-bold border-none p-0 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
            />
          </CardTitle>
          <div className="flex gap-1">
            {isEditing && onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:text-red-700"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleClose} type="button">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 flex flex-col flex-grow overflow-y-auto">
          <div className="flex-grow min-h-[150px] max-h-[calc(90vh-24rem)] overflow-y-auto mb-4 pr-1">
             <RichTextEditor content={content} onChange={handleContentChange} editorInstanceRef={editorRef} />
          </div>
          
          <div className="mt-auto flex-shrink-0">
            <div className="mb-3">
                <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="relative">
                <select 
                    id="category-select"
                    value={selectedCategoryId || "uncategorized"} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const value = e.target.value;
                    setSelectedCategoryId(value === "uncategorized" ? null : value);
                    }}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm appearance-none bg-white border"
                >
                    <option value="uncategorized">All Tasks (Uncategorized)</option>
                    {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <Folder size={14} className="text-gray-500"/>
                </div>
                </div>
            </div>

            {/* Keystroke Hints Section */}
            <div className="text-xs text-gray-500 mt-3 mb-2 py-2 border-t border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Keyboard size={14} />
                    {commonKeystrokes.slice(0, 2).map(k => (
                        <span key={k.cmd}><kbd className="px-1.5 py-0.5 border bg-gray-100 rounded text-xs">{k.cmd}</kbd> {k.desc}</span>
                    ))}
                    <span>...</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAllKeystrokes(s => !s)} className="h-6 w-6">
                    <Info size={14}/>
                </Button>
              </div>
              {showAllKeystrokes && (
                <div className="mt-2 space-y-1">
                    {allKeystrokes.map(k => (
                        <div key={k.cmd} className="flex justify-between">
                            <span>{k.desc}</span>
                            <kbd className="px-1.5 py-0.5 border bg-gray-100 rounded text-xs">{k.cmd}</kbd>
                        </div>
                    ))}
                </div>
              )}
              <p className="text-right text-gray-400 text-[10px] mt-1">Keystrokes powered by <a href="https://tiptap.dev" target="_blank" rel="noopener noreferrer" className="underline">TipTap.dev</a></p>
            </div>

            <div className="text-xs flex items-center gap-4 flex-wrap">
                {formattedCreatedAt && (
                <span className="text-gray-500 flex items-center gap-1">
                    <Clock size={12} /> Created: {formattedCreatedAt}
                </span>
                )}
                {showUpdatedAt && (
                <span className="text-black flex items-center gap-1">
                    <Clock size={12} /> Updated: {formattedUpdatedAt}
                </span>
                )}
            </div>

            {showError && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                Please add a title or some content before saving.
                </div>
            )}

            {showDeleteConfirm && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 text-sm mb-2">Are you sure you want to delete this task?</p>
                <div className="flex gap-2">
                    <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={handleDelete}
                    type="button"
                    >
                    Delete
                    </Button>
                    <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                    type="button"
                    >
                    Cancel
                    </Button>
                </div>
                </div>
            )}
            
            <div className="mt-4 flex justify-end">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} type="button">
                    Cancel
                  </Button>
                <Button onClick={handleSave} type="button">
                    {isEditing ? 'Update Task' : 'Save Task'}
                </Button>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 