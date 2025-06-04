import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editorInstanceRef?: React.MutableRefObject<Editor | null>;
}

export function RichTextEditor({ content, onChange, editorInstanceRef }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your task details...',
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'list-none p-0',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-center gap-2',
        },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md border',
        },
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none p-4',
      },
      handleDrop: function(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0]; 
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (src) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (coordinates) {
                    const node = schema.nodes.image.create({ src });
                    const transaction = view.state.tr.insert(coordinates.pos, node);
                    view.dispatch(transaction);
                } else {
                    const node = schema.nodes.image.create({ src });
                    const transaction = view.state.tr.insert(view.state.selection.from, node);
                    view.dispatch(transaction);
                }
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      transformPastedHTML(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const paragraphs = Array.from(tempDiv.querySelectorAll('p'));

        let listItemsContent: string[] = [];
        let isTransformableList = paragraphs.length > 0;

        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          const text = p.textContent || '';
          const match = text.match(/^(\d+)\.\s+(.*)/);
          
          if (match) {
            listItemsContent.push(match[2]);
          } else {
            isTransformableList = false;
            break;
          }
        }

        if (isTransformableList && listItemsContent.length > 0) {
          let newHtml = '<ol>';
          for (const itemContent of listItemsContent) {
            newHtml += `<li><p>${itemContent}</p></li>`; 
          }
          newHtml += '</ol>';
          
          if (paragraphs.length === listItemsContent.length) {
            return newHtml;
          }
        }
        
        return html;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

  useEffect(() => {
    if (editorInstanceRef) {
      editorInstanceRef.current = editor;
    }
    return () => {
      if (editorInstanceRef) {
        editorInstanceRef.current = null;
      }
    };
  }, [editor, editorInstanceRef]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden flex flex-col h-full">
      <div className="border-b bg-gray-50 p-2 flex gap-1 flex-wrap flex-shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-gray-200' : ''}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <div className="w-px bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={editor.isActive('taskList') ? 'bg-gray-200' : ''}
          title="Task List (Toggle)"
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
        <div className="w-px bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent 
        editor={editor} 
        className="bg-white flex-grow overflow-y-auto [&_.ProseMirror]:min-h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_ul[data-type=taskList]]:list-none [&_.ProseMirror_ul[data-type=taskList]]:p-0 [&_.ProseMirror_li[data-type=taskItem]]:flex [&_.ProseMirror_li[data-type=taskItem]]:items-center [&_.ProseMirror_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem][data-checked=true]>div]:line-through [&_li[data-type=taskItem][data-checked=true]>div]:text-gray-500"
      />
    </div>
  );
} 