'use client'

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus, Clock } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask, DbTask } from '@/app/actions';
import { formatTaskDate } from '@/lib/utils/date-formatter';

// Client-side Task interface now includes dates for display and passing to TaskCard
interface ClientTask {
  id: string;
  title: string | null; 
  content: string | null;
  created_at: string; 
  updated_at: string;
}

export default function Home() {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<ClientTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true);
      const fetchedTasks: DbTask[] = await getTasks();
      // Map DbTask to ClientTask
      setTasks(fetchedTasks.map(ft => ({ 
        id: ft.id, 
        title: ft.title, 
        content: ft.content, 
        created_at: ft.created_at,
        updated_at: ft.updated_at
      })));
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
      createTask(newTaskData).then(savedTaskDb => {
        if (savedTaskDb) {
          const savedTaskClient: ClientTask = { ...savedTaskDb }; // Map DbTask to ClientTask
          setTasks(prevTasks => [savedTaskClient, ...prevTasks].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
      updateTask(id, updatedTaskData).then(updatedTaskResultDb => {
        if (updatedTaskResultDb) {
          const updatedTaskResultClient: ClientTask = { ...updatedTaskResultDb }; // Map DbTask to ClientTask
          setTasks(prevTasks => prevTasks.map(task => 
            task.id === id ? updatedTaskResultClient : task
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

  const handleCardClick = (task: ClientTask) => {
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
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group bg-white flex flex-col justify-between"
              onClick={() => handleCardClick(task)}
            >
              <div>
                <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">{task.title || 'Untitled Task'}</h2>
                <div
                  className="prose prose-sm max-w-none text-gray-600 break-words mb-3"
                  dangerouslySetInnerHTML={{ __html: task.content || '' }}
                />
              </div>
              <div className="mt-auto pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} /> {formatTaskDate(task.created_at)}
                </span>
              </div>
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
