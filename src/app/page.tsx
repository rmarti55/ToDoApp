'use client'

import { useState, useEffect, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus, Clock, ChevronDown, FolderPlus, Loader2, MoreVertical, X as IconX } from 'lucide-react';
import { getTasksByCategory, createTask, updateTask, deleteTask, getCategories, createCategory, Category, DbTask } from '@/app/actions';
import { formatTaskDate } from '@/lib/utils/date-formatter';

// Client-side Task interface now includes dates for display and passing to TaskCard
interface ClientTask extends Omit<DbTask, 'category_id'> {
  category_id?: string | null;
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<ClientTask | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [initialCategoryApplied, setInitialCategoryApplied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // State for "Move to Category" modal
  const [movingTask, setMovingTask] = useState<ClientTask | null>(null);
  const [showMoveToCategoryModal, setShowMoveToCategoryModal] = useState(false);

  // Load categories on mount
  useEffect(() => {
    async function loadInitialCategories() {
      setIsLoadingCategories(true);
      const cats = await getCategories();
      setCategories(cats);
      setIsLoadingCategories(false);
      // Initial category selection will be handled by the effect below once isLoadingCategories is false
    }
    loadInitialCategories();
  }, []);

  // Effect to set the initial category once categories are loaded, or handle if selected category is removed
  useEffect(() => {
    if (isLoadingCategories) return; // Wait for categories to load

    if (!initialCategoryApplied) {
      if (categories.length > 0) {
        setSelectedCategory(categories[0]); // Default to the first category
      } else {
        setSelectedCategory(null); // Default to "All Tasks" if no categories exist
      }
      setInitialCategoryApplied(true); // Mark that initial selection logic has run
    } else {
      // If a category was selected, but it no longer exists (e.g., deleted), fall back to "All Tasks"
      if (selectedCategory && !categories.find(c => c.id === selectedCategory.id)) {
        setSelectedCategory(null);
      }
    }
  }, [categories, isLoadingCategories, initialCategoryApplied, selectedCategory]);

  // Load tasks when selectedCategory changes OR when initial category setup is complete and categories are loaded
  useEffect(() => {
    async function loadTasksForCurrentCategory() {
      // Only load tasks if category loading is complete AND initial selection logic has run.
      if (isLoadingCategories || !initialCategoryApplied) {
        if (initialCategoryApplied && selectedCategory === null) { 
          // Allow loading for "All Tasks (Uncategorized)" even if categories are still loading, 
          // provided initial setup decided on 'null'
        } else {
            return;
        }
      }
      
      setIsLoadingTasks(true);
      const categoryIdToFetch = selectedCategory?.id || null; // Handles 'null' for "All Tasks"
      const fetchedTasks: DbTask[] = await getTasksByCategory(categoryIdToFetch);
      // Ensure category_id is part of the ClientTask, even if undefined
      setTasks(fetchedTasks.map(ft => ({ ...ft, category_id: ft.category_id || null })));
      setIsLoadingTasks(false);
    }
    loadTasksForCurrentCategory();
  }, [selectedCategory, isLoadingCategories, initialCategoryApplied]);

  // Click outside handler for category dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
        setShowNewCategoryInput(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [categoryDropdownRef]);

  const handleSaveTask = (title: string, content: string, newCategoryId?: string | null) => {
    const taskDetails = {
      title: title,
      content,
      category_id: newCategoryId !== undefined ? newCategoryId : selectedCategory?.id || null,
    };
    startTransition(() => {
      createTask(taskDetails).then(savedTaskDb => {
        if (savedTaskDb) {
          // Only add to current view if it matches the selected category
          if ((savedTaskDb.category_id || null) === (selectedCategory?.id || null)) {
            const savedTaskClient: ClientTask = { ...savedTaskDb, category_id: savedTaskDb.category_id || null };
            setTasks(prevTasks => [savedTaskClient, ...prevTasks].sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
          } else if (newCategoryId === undefined) { // if creating in current view but assigned elsewhere via logic not yet UI-exposed
            // This case implies a mismatch, perhaps log or handle
          }
        }
      }).catch(error => console.error("Failed to save task", error));
    });
  };

  const handleEditTask = (id: string, title: string, content: string, newCategoryId?: string | null) => {
    const updatedTaskData = {
      title: title,
      content,
      category_id: newCategoryId !== undefined ? newCategoryId : selectedCategory?.id || null, // Use newCategoryId if provided
    };
    startTransition(() => {
      updateTask(id, updatedTaskData).then(updatedTaskResultDb => {
        if (updatedTaskResultDb) {
          const updatedTaskClient: ClientTask = { ...updatedTaskResultDb, category_id: updatedTaskResultDb.category_id || null };
          // Update task in the list or remove it if its category changed and it's no longer in the current view
          const currentViewCategoryId = selectedCategory?.id || null;
          if ((updatedTaskClient.category_id || null) === currentViewCategoryId) {
            setTasks(prevTasks => prevTasks.map(task =>
              task.id === id ? updatedTaskClient : task
            ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          } else {
            // Task moved to a different category, remove from current view
            setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
          }
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
    setIsCreatingTask(false);
    setEditingTask(null);
  };

  const handleCategorySelect = (cat: Category | null) => {
    setSelectedCategory(cat);
    setShowCategoryDropdown(false);
    setShowNewCategoryInput(false);
    // initialCategoryApplied is already true, so this selection will be respected
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    // Optimistic UI update can be added here if desired
    startTransition(async () => {
      const newCatServer = await createCategory({ name: newCategoryName.trim() });
      if (newCatServer) {
        // Update categories list with the new category from server ensuring it has id and created_at
        setCategories(prev => [...prev, newCatServer].sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedCategory(newCatServer); // Select the newly created category
        setShowNewCategoryInput(false);
        setNewCategoryName('');
        setShowCategoryDropdown(false); // Close the main dropdown as well
      } else {
        // Handle error, e.g., show a toast notification
        console.error("Failed to create category on server. Please check Vercel function logs for specific Supabase errors from 'actions.ts'.");
      }
    });
  };
  
  const openMoveToCategoryModal = (task: ClientTask, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click from opening edit modal
    setMovingTask(task);
    setShowMoveToCategoryModal(true);
  };

  const closeMoveToCategoryModal = () => {
    setMovingTask(null);
    setShowMoveToCategoryModal(false);
  };

  const handleMoveTaskToNewCategory = (newCategoryId: string | null) => {
    if (!movingTask) return;

    const { id, title, content } = movingTask; // Current title and content are not changed by move
    const originalCategoryId = movingTask.category_id || null;

    // Ensure title and content are not null, provide defaults if necessary for updateTask structure
    const taskDataForUpdate = {
        title: title || "Untitled Task", 
        content: content || "", 
        category_id: newCategoryId,
    };

    startTransition(() => {
      updateTask(id, taskDataForUpdate).then(updatedTaskResultDb => {
        if (updatedTaskResultDb) {
          // If task moved out of current category view, remove it
          const currentViewCategoryId = selectedCategory?.id || null;
          if (originalCategoryId === currentViewCategoryId && newCategoryId !== currentViewCategoryId) {
            setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
          } else if (newCategoryId === currentViewCategoryId && originalCategoryId !== currentViewCategoryId) {
            // If task moved into current category view, add it (or update if somehow already there)
             const movedTaskClient: ClientTask = { ...updatedTaskResultDb, category_id: updatedTaskResultDb.category_id || null };
             setTasks(prevTasks => [...prevTasks, movedTaskClient].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          } else if (newCategoryId === currentViewCategoryId && originalCategoryId === currentViewCategoryId) {
            // Task category changed but it remains in the current view (e.g. from category A to A, or All Tasks to All tasks but category changed)
            // This case is for when currentView is All Tasks and task moves between categories, or task stays in same category (though UI shouldn't allow this directly)
            const movedTaskClient: ClientTask = { ...updatedTaskResultDb, category_id: updatedTaskResultDb.category_id || null };
            setTasks(prevTasks => prevTasks.map(t => t.id === id ? movedTaskClient : t).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          }
        }
        closeMoveToCategoryModal();
      }).catch(error => {
        console.error("Failed to move task", error);
        closeMoveToCategoryModal(); // Close modal even on error
      });
    });
  };

  const totalTasks = tasks.length;
  const totalCategories = categories.length;

  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="relative" ref={categoryDropdownRef}>
          <button
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white border rounded shadow-sm hover:bg-gray-50 text-base sm:text-lg font-semibold w-full sm:min-w-[200px] md:min-w-[250px] justify-between"
            onClick={() => setShowCategoryDropdown(v => !v)}
            aria-haspopup="listbox"
            aria-expanded={showCategoryDropdown}
            disabled={isLoadingCategories || isPending}
          >
            <div className="flex items-center gap-2 overflow-hidden">
                <FolderPlus className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <span className="truncate">
                {selectedCategory ? selectedCategory.name : (isLoadingCategories ? 'Loading Categories...' : 'All Tasks (Uncategorized)')}
                </span>
            </div>
            <div className="flex items-center flex-shrink-0">
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <span className="text-xs text-gray-400 mr-1">({totalCategories})</span>
                <ChevronDown className="w-4 h-4" />
            </div>
          </button>
          {showCategoryDropdown && (
            <div className="absolute left-0 mt-2 w-full sm:w-72 md:w-80 bg-white border rounded shadow-lg z-50">
              <ul className="max-h-60 overflow-y-auto" role="listbox">
                <li 
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${!selectedCategory ? 'bg-gray-100 font-bold' : ''}`}
                    onClick={() => handleCategorySelect(null)}
                    role="option"
                    aria-selected={!selectedCategory}
                >
                    All Tasks (Uncategorized)
                </li>
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
                <div className="flex items-center gap-2 p-2 border-t bg-gray-50">
                  <input
                    className="flex-1 border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateCategory();
                      if (e.key === 'Escape') { setShowNewCategoryInput(false); setNewCategoryName(''); }
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateCategory} disabled={isPending || !newCategoryName.trim()}>Add</Button>
                </div>
              ) : (
                <button
                  className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 border-t flex items-center gap-2"
                  onClick={() => setShowNewCategoryInput(true)}
                >
                  <Plus size={16}/> Create new category
                </button>
              )}
            </div>
          )}
        </div>
        <div className="text-gray-600 text-sm text-right sm:text-left">
            {isLoadingTasks ? 'Loading tasks...' : `${totalTasks} task${totalTasks !== 1 ? 's' : ''}`}
        </div>
      </div>

      {(isCreatingTask || editingTask) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <TaskCard
            task={editingTask}
            categories={categories}
            currentCategoryId={editingTask ? editingTask.category_id : selectedCategory?.id || null}
            onClose={closeModal}
            onSave={(title, content, categoryId) => {
              if (editingTask) {
                handleEditTask(editingTask.id, title, content, categoryId);
              } else {
                handleSaveTask(title, content, categoryId);
              }
              closeModal();
            }}
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

      {/* "Move to Category" Modal */}
      {showMoveToCategoryModal && movingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Move "<span className="truncate max-w-[200px] inline-block align-bottom">{movingTask.title || 'Untitled Task'}</span>" to:</h3>
              <Button variant="ghost" size="icon" onClick={closeMoveToCategoryModal} className="-mr-2 -mt-2">
                <IconX size={20} />
              </Button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              <li>
                <Button
                  variant={!movingTask.category_id ? "secondary" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleMoveTaskToNewCategory(null)}
                  disabled={movingTask.category_id === null || isPending}
                >
                  <FolderPlus size={16} className="mr-2" /> All Tasks (Uncategorized)
                </Button>
              </li>
              {categories.map(cat => (
                <li key={cat.id}>
                  <Button
                    variant={movingTask.category_id === cat.id ? "secondary" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleMoveTaskToNewCategory(cat.id)}
                    disabled={movingTask.category_id === cat.id || isPending}
                  >
                    <FolderPlus size={16} className="mr-2" /> {cat.name}
                  </Button>
                </li>
              ))}
            </ul>
             {isPending && <div className="flex items-center justify-center mt-4 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Moving task...</div>}
          </div>
        </div>
      )}

      {isLoadingCategories ? (
         <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" /></div>
      ) : isLoadingTasks ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 bg-white flex flex-col justify-between h-40 min-h-[10rem] animate-pulse">
                    <div className="w-3/4 h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="w-full h-4 bg-gray-200 rounded mb-1"></div>
                    <div className="w-1/2 h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="mt-auto pt-2 border-t border-gray-100">
                        <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
                    </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow group bg-white flex flex-col justify-between h-40 max-h-40 min-h-[10rem] overflow-hidden relative"
              onClick={() => handleCardClick(task)}
              style={{ height: '10rem' }}
            >
              <Button 
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 z-10 text-gray-400 hover:text-gray-700 h-7 w-7"
                onClick={(e) => openMoveToCategoryModal(task, e)}
              >
                <MoreVertical size={16}/>
              </Button>
              <div>
                <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors truncate pr-8">
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
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors min-h-[120px] h-40 max-h-40"
            onClick={() => setIsCreatingTask(true)}
            tabIndex={0}
            aria-label="Add new task"
            style={{ height: '10rem' }}
          >
            <Plus className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-gray-500 text-sm font-medium">Add new task…</span>
          </div>
          
          {tasks.length === 0 && !isCreatingTask && !editingTask && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">
                {selectedCategory ? `No tasks in ${selectedCategory.name}.` : (isLoadingCategories ? 'Loading categories...' : 'No tasks yet.')}
                {' '}Click the card above to get started!
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
