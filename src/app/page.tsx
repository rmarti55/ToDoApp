'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus } from 'lucide-react';
// import { getTasks, createTask, updateTask, deleteTask } from '@/app/actions'; // Will uncomment later

interface Task {
  id: string;
  title: string;
  content: string;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // useEffect(() => { // Will uncomment and modify later for Supabase fetching
  //   const loadTasks = async () => {
  //     const fetchedTasks = await getTasks();
  //     setTasks(fetchedTasks);
  //   };
  //   loadTasks();
  // }, []);

  const handleSaveTask = async (title: string, content: string) => {
    const newTaskData = {
      title: title || 'Untitled Task',
      content,
    };
    // const savedTask = await createTask(newTaskData); // Will use later
    // setTasks([...tasks, savedTask]);
    // Temporary in-memory save:
    const tempNewTask = { ...newTaskData, id: Date.now().toString() };
    setTasks([...tasks, tempNewTask]);
  };

  const handleEditTask = async (id: string, title: string, content: string) => {
    const updatedTaskData = {
      title: title || 'Untitled Task',
      content,
    };
    // const updatedTask = await updateTask(id, updatedTaskData); // Will use later
    // setTasks(tasks.map(task => task.id === id ? updatedTask : task));
    // Temporary in-memory edit:
    setTasks(tasks.map(task => 
      task.id === id 
        ? { ...task, title: title || 'Untitled Task', content }
        : task
    ));
  };

  const handleDeleteTask = async (id: string) => {
    // await deleteTask(id); // Will use later
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group bg-white"
            onClick={() => handleCardClick(task)}
          >
            <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">{task.title}</h2>
            <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: task.content }}
            />
          </div>
        ))}
        
        {tasks.length === 0 && !isCreating && !editingTask && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">No tasks yet. Click "Add New Task" to get started!</p>
          </div>
        )}
      </div>
    </main>
  );
}
