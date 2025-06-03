'use client'

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask, Task as DbTask } from '@/app/actions';

// Client-side Task interface, can omit created_at if not directly used for display logic here
interface Task {
  id: string;
  title: string | null; 
  content: string | null;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true);
      const fetchedTasks = await getTasks();
      setTasks(fetchedTasks.map(ft => ({ id: ft.id, title: ft.title, content: ft.content })));
      setIsLoading(false);
    }
    loadTasks();
  }, []);

  const handleSaveTask = (title: string, content: string) => {
    const newTaskData = {
      title: title,
      content,
    };
    startTransition(() => {
      createTask(newTaskData).then(savedTask => {
        if (savedTask) {
          setTasks(prevTasks => [savedTask, ...prevTasks].sort((a, b) => 
            new Date( (b as DbTask).created_at ).getTime() - new Date( (a as DbTask).created_at ).getTime()
          ));
        }
      }).catch(error => console.error("Failed to save task", error));
    });
  };

  const handleEditTask = (id: string, title: string, content: string) => {
    const updatedTaskData = {
      title: title,
      content,
    };
    startTransition(() => {
      updateTask(id, updatedTaskData).then(updatedTaskResult => {
        if (updatedTaskResult) {
          setTasks(prevTasks => prevTasks.map(task => 
            task.id === id ? updatedTaskResult : task
          ));
        }
      }).catch(error => console.error("Failed to update task", error));
    });
  };

  const handleDeleteTask = (id: string) => {
    startTransition(() => {
      deleteTask(id).then(success => {
        if (success) {
          setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
        }
      }).catch(error => console.error("Failed to delete task", error));
    });
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
        <Button onClick={() => setIsCreating(true)} disabled={isLoading || isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Task
        </Button>
      </div>

      {(isCreating || editingTask) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-40">
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

      {isLoading ? (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500 text-lg">Loading tasks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group bg-white"
              onClick={() => handleCardClick(task)}
            >
              <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">{task.title || 'Untitled Task'}</h2>
              <div
                className="prose prose-sm max-w-none text-gray-600 break-words"
                dangerouslySetInnerHTML={{ __html: task.content || '' }}
              />
            </div>
          ))}
          
          {tasks.length === 0 && !isCreating && !editingTask && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No tasks yet. Click "Add New Task" to get started!</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
