'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  content: string;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleSaveTask = (title: string, content: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: title || 'Untitled Task',
      content,
    };
    setTasks([...tasks, newTask]);
  };

  const handleEditTask = (id: string, title: string, content: string) => {
    setTasks(tasks.map(task => 
      task.id === id 
        ? { ...task, title: title || 'Untitled Task', content }
        : task
    ));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleCardClick = (task: Task) => {
    setEditingTask(task);
  };

  const closeModal = () => {
    setIsCreating(false);
    setEditingTask(null);
  };

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Task
        </Button>
      </div>

      {(isCreating || editingTask) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <TaskCard
            task={editingTask}
            onClose={closeModal}
            onSave={editingTask ? 
              (title, content) => {
                handleEditTask(editingTask.id, title, content);
                closeModal();
              } : 
              (title, content) => {
                handleSaveTask(title, content);
                closeModal();
              }
            }
            onDelete={editingTask ? 
              () => {
                handleDeleteTask(editingTask.id);
                closeModal();
              } : 
              undefined
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => handleCardClick(task)}
          >
            <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">{task.title}</h2>
            <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: task.content }}
            />
            <div className="mt-3 text-xs text-gray-400">
              Click to edit
            </div>
          </div>
        ))}
        
        {tasks.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No tasks yet. Click "Add New Task" to get started!</p>
          </div>
        )}
      </div>
    </main>
  );
}
