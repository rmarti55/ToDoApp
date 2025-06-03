import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Trash2, Clock } from 'lucide-react';
import { formatTaskDate } from '@/lib/utils/date-formatter';
import type { Editor } from '@tiptap/core';

// This interface should align with what the database provides or what page.tsx uses.
export interface TaskForCard {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskCardProps {
  task?: TaskForCard | null;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
  onDelete?: () => void;
}

export function TaskCard({ task, onClose, onSave, onDelete }: TaskCardProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [content, setContent] = useState(task?.content || '');
  const [showError, setShowError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null); // Ref for title input for focusing

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setContent(task.content || '');
    } else {
      setTitle('');
      setContent('');
      // Focus title input for new tasks after a short delay to ensure it's rendered
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [task]);

  const handleSave = () => {
    if (!(title.trim() || content.trim())) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }
    onSave(title, content);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
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
    // Allow Escape to bubble up to handleModalKeyDown if not handled here explicitly for closing
  };
  
  const formattedCreatedAt = task?.created_at ? formatTaskDate(task.created_at) : '';
  const formattedUpdatedAt = task?.updated_at ? formatTaskDate(task.updated_at) : '';
  const showUpdatedAt = isEditing && formattedUpdatedAt && formattedCreatedAt !== formattedUpdatedAt;

  return (
    // Increased width, global Escape listener, relative positioning for z-index context
    <div 
      onKeyDown={handleModalKeyDown} 
      tabIndex={-1} // Makes div focusable for keydown events
      className="relative z-50 md:w-1/2 xl:w-2/5 w-full p-4 md:p-0"
    >
      <Card className="w-full mx-auto shadow-xl bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-2">
          <CardTitle className="text-xl font-bold flex-1 pl-6 py-4">
            <Input
              ref={titleInputRef} // Assign ref
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleInputKeyDown} // Specific keydown for title input
              className="text-xl font-bold border-none p-0 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
              // autoFocus={!isEditing} // Replaced with explicit focus in useEffect for new tasks
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
            <Button variant="ghost" size="icon" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <RichTextEditor content={content} onChange={setContent} editorInstanceRef={editorRef} /> 
          
          <div className="mt-3 text-xs flex items-center gap-4 flex-wrap">
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
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button onClick={handleSave} type="button">
                {isEditing ? 'Update Task' : 'Save Task'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 