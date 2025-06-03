import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TaskCardProps {
  onClose: () => void;
  onSave: (title: string, content: string) => void;
}

export function TaskCard({ onClose, onSave }: TaskCardProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showError, setShowError] = useState(false);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }
    
    onSave(title, content);
    onClose();
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
              autoFocus
            />
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <RichTextEditor content={content} onChange={setContent} />
          
          {showError && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              Please add a title or some content before saving.
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
                Save Task
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 