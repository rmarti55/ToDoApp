import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Trash2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  content: string;
}

interface TaskCardProps {
  task?: Task | null;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
  onDelete?: () => void;
}

export function TaskCard({ task, onClose, onSave, onDelete }: TaskCardProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showError, setShowError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setContent(task.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [task]);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  return (
    <div onKeyDown={handleKeyDown} tabIndex={-1}>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold flex-1">
            <Input
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold border-none focus-visible:ring-0 p-0 placeholder:text-gray-400"
              autoFocus={!isEditing}
            />
          </CardTitle>
          <div className="flex gap-1">
            {isEditing && onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RichTextEditor content={content} onChange={setContent} />
          
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
                >
                  Delete
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Tip: Press Esc to close, Cmd+Enter to save
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {isEditing ? 'Update Task' : 'Save Task'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 