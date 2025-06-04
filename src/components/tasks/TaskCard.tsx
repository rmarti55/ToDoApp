'use client';
import { useState, useEffect, useRef, useCallback, useTransition, useMemo } from 'react';
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
  onAutoSave?: (taskId: string, title: string, content: string, categoryId: string | null) => Promise<void>;
  onDelete?: () => void;
}

// Debounce utility function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
}

export function TaskCard({ task, categories, currentCategoryId, onClose, onSave, onAutoSave, onDelete }: TaskCardProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAllKeystrokes, setShowAllKeystrokes] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isSavingInProgress, startSaveTransition] = useTransition();

  const prevTaskPropIdRef = useRef<string | null | undefined>(null);

  const isEditing = !!task;
  const isMac = typeof window !== 'undefined' ? navigator.platform.toUpperCase().indexOf('MAC') >= 0 : false;

  // Only reset internal state when task ID changes, not when same task is updated
  useEffect(() => {
    const currentTaskId = task?.id;
    const prevTaskId = prevTaskPropIdRef.current;
    
    // Reset internal state if:
    // 1. Task ID changes (switching to different task)
    // 2. Task becomes null (closing editing mode)
    // 3. Task becomes defined when it was null (opening editing mode)
    const shouldReset = currentTaskId !== prevTaskId;
    
    if (shouldReset) {
      if (task) {
        // Editing existing task
        setTitle(task.title || '');
        setContent(task.content || '');
        setSelectedCategoryId(task.category_id || null);
      } else {
        // Creating new task
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
        // Focus title input for new tasks
        setTimeout(() => titleInputRef.current?.focus(), 50);
      }
    }
    
    prevTaskPropIdRef.current = currentTaskId;
  }, [task, currentCategoryId]);

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

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

  const handleCategoryChange = (newCategoryId: string | null) => {
    setSelectedCategoryId(newCategoryId);
  };

  const performAutoSave = useCallback(
    async (taskId: string, currentTitle: string, currentContent: string, currentCatId: string | null) => {
      if (!onAutoSave) return;

      startSaveTransition(async () => {
        try {
          await onAutoSave(taskId, currentTitle, currentContent, currentCatId);
        } catch (error) {
          console.error("Auto-save failed silently:", error);
        }
      });
    },
    [onAutoSave, startSaveTransition]
  );

  const debouncedPerformAutoSave = useMemo(() => debounce(performAutoSave, 1500), [performAutoSave]);

  useEffect(() => {
    if (isEditing && task && task.id) {
      debouncedPerformAutoSave(task.id, title, content, selectedCategoryId);
    }
  }, [title, content, selectedCategoryId, isEditing, task, debouncedPerformAutoSave]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const handleClose = () => {
    // Auto-save logic for both new and existing tasks
    if (title.trim() || content.trim()) {
      if (isEditing) {
        // For existing tasks, just close - auto-save already handled it
        onClose();
      } else {
        // For new tasks, save before closing
        onSave(title, content, selectedCategoryId);
        try {
          localStorage.removeItem(NEW_TASK_DRAFT_KEY);
        } catch (error) {
          console.error("Failed to remove draft:", error);
        }
      }
    } else {
      // No content, just close
      onClose();
    }
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
      handleClose();
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
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-40"
      onClick={handleClose}
      onKeyDown={handleModalKeyDown} 
      tabIndex={-1}
    >
      <div 
        className="relative z-50 w-full md:w-3/4 p-4 md:p-0 flex flex-col h-[90vh] max-h-[750px] min-h-[600px] overflow-hidden shadow-2xl rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="w-full mx-auto bg-white flex flex-col flex-grow overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-2 flex-shrink-0 border-b">
            <CardTitle className="text-xl font-bold flex-1 pl-6 py-1">
              <Input
                ref={titleInputRef}
                placeholder="Enter task title..."
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={handleTitleInputKeyDown}
                className="text-xl font-bold border-none p-0 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </CardTitle>
            <div className="flex gap-1 pr-2">
              {isEditing && onDelete && (
                <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} className="text-red-500 hover:text-red-700" type="button">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleClose} type="button">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col flex-grow overflow-hidden p-0">
            <div className="flex-grow flex flex-col overflow-hidden px-6 pt-3 pb-4">
              <RichTextEditor content={content} onChange={handleContentChange} editorInstanceRef={editorRef} />
            </div>
            
            <div className="flex-shrink-0 border-t bg-gray-50 px-6 pt-3 pb-3">
              <div className="mb-3">
                  <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <div className="relative">
                    <select 
                        id="category-select"
                        value={selectedCategoryId || "uncategorized"} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const value = e.target.value;
                          handleCategoryChange(value === "uncategorized" ? null : value);
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

              <div className="text-xs text-gray-500 mb-2 py-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                      <Keyboard size={14} />
                      {commonKeystrokes.slice(0, 2).map(k => (
                          <span key={k.cmd} className="whitespace-nowrap"><kbd className="px-1.5 py-0.5 border bg-gray-100 rounded text-xs">{k.cmd}</kbd> {k.desc}</span>
                      ))}
                      <span className="whitespace-nowrap">...</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowAllKeystrokes(s => !s)} className="h-6 w-6 flex-shrink-0">
                      <Info size={14}/>
                  </Button>
                </div>
                {showAllKeystrokes && (
                  <div className="mt-2 space-y-1 text-[11px]">
                      {allKeystrokes.map(k => (
                          <div key={k.cmd} className="flex justify-between items-center">
                              <span className="text-gray-600">{k.desc}</span>
                              <kbd className="px-1.5 py-0.5 border bg-white rounded text-xs shadow-sm">{k.cmd}</kbd>
                          </div>
                      ))}
                  </div>
                )}
                <p className="text-right text-gray-400 text-[10px] mt-1">Keystrokes powered by <a href="https://tiptap.dev" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">TipTap.dev</a></p>
              </div>
              
              <div className="text-xs text-gray-500 flex items-center gap-4 flex-wrap">
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
            </div>

            {showDeleteConfirm && (
              <div className="px-6 pt-3 pb-3 bg-red-50 border-t flex-shrink-0">
                <p className="text-red-800 text-sm mb-2">Are you sure you want to delete this task?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleDelete} type="button">Delete</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)} type="button">Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 