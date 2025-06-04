'use client'

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus, Clock, ChevronDown, FolderPlus } from 'lucide-react';
import { getTasksByCategory, createTask, updateTask, deleteTask, getCategories, createCategory, Category, DbTask } from '@/app/actions';
import { formatTaskDate } from '@/lib/utils/date-formatter';

// Client-side Task interface now includes dates for display and passing to TaskCard
interface ClientTask {
  id: string;
  title: string | null; 
  content: string | null;
  created_at: string; 
  updated_at: string;
  category_id?: string | null;
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<ClientTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadCategories() {
      const cats = await getCategories();
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0]);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true);
      const fetchedTasks: DbTask[] = await getTasksByCategory(selectedCategory?.id || null);
      // Map DbTask to ClientTask
      setTasks(fetchedTasks.map(ft => ({ 
        id: ft.id, 
        title: ft.title, 
        content: ft.content, 
        created_at: ft.created_at,
        updated_at: ft.updated_at,
        category_id: ft.category_id || null,
      })));
      setIsLoading(false);
    }
    loadTasks();
  }, [selectedCategory]);

  const handleSaveTask = (title: string, content: string) => {
    const newTaskData = {
      title: title,
      content,
      category_id: selectedCategory?.id || null,
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
      category_id: selectedCategory?.id || null,
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

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    setShowCategoryDropdown(false);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat = await createCategory({ name: newCategoryName.trim() });
    if (newCat) {
      setCategories(prev => [...prev, newCat]);
      setSelectedCategory(newCat);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    }
  };

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded shadow-sm hover:bg-gray-50 text-lg font-semibold"
              onClick={() => setShowCategoryDropdown(v => !v)}
              aria-haspopup="listbox"
              aria-expanded={showCategoryDropdown}
            >
              <FolderPlus className="w-5 h-5 text-gray-500" />
              {selectedCategory ? selectedCategory.name : 'No Category'}
              <ChevronDown className="w-4 h-4 ml-1" />
              <span className="ml-2 text-xs text-gray-400">({categories.length})</span>
            </button>
            {showCategoryDropdown && (
              <div className="absolute left-0 mt-2 w-56 bg-white border rounded shadow-lg z-50">
                <ul className="max-h-60 overflow-y-auto" role="listbox">
                  {categories.map(cat => (
                    <li
                      key={cat.id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${selectedCategory?.id === cat.id ? 'bg-gray-100 font-bold' : ''}`}
                      onClick={() => handleCategorySelect(cat)}
                      role="option"
                      aria-selected={selectedCategory?.id === cat.id}
                    >
                      {cat.name}
                    </li>
                  ))}
                </ul>
                {showNewCategoryInput ? (
                  <div className="flex items-center gap-2 p-2 border-t">
                    <input
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateCategory();
                        if (e.key === 'Escape') setShowNewCategoryInput(false);
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleCreateCategory}>Add</Button>
                  </div>
                ) : (
                  <button
                    className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 border-t"
                    onClick={() => setShowNewCategoryInput(true)}
                  >
                    + Create new category
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="text-gray-500 text-sm ml-2">{tasks.length} tasks</span>
        </div>
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
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group bg-white flex flex-col justify-between h-40 max-h-40 min-h-[10rem] overflow-hidden"
              onClick={() => handleCardClick(task)}
              style={{ height: '10rem' }}
            >
              <div>
                <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors truncate">
                  {task.title || 'Untitled Task'}
                </h2>
                <div
                  className="prose prose-sm max-w-none text-gray-600 break-words mb-3 overflow-hidden text-ellipsis line-clamp-3"
                  style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
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
          {/* Add Task Card */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors min-h-[120px] h-40 max-h-40"
            onClick={() => setIsCreating(true)}
            tabIndex={0}
            aria-label="Add new task"
            style={{ height: '10rem' }}
          >
            <div className="w-full h-6 bg-gray-300 rounded mb-2 animate-pulse" />
            <div className="w-2/3 h-4 bg-gray-200 rounded mb-1 animate-pulse" />
            <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse" />
            <span className="mt-4 text-gray-400 text-sm font-medium">Add new task…</span>
          </div>
          {tasks.length === 0 && !isCreating && !editingTask && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No tasks yet. Click the card below to get started!</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
