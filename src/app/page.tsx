'use client'

import { useState, useEffect, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Input } from '@/components/ui/input';
import { Plus, Clock, ChevronDown, FolderPlus, Loader2, MoreVertical, X as IconX, Edit3, Check, XCircle, ArrowRightLeft, Trash2, Undo2 } from 'lucide-react';
import { getTasksByCategory, createTask, updateTask, deleteTask, getCategories, createCategory, updateCategory, Category, DbTask, restoreTask, getRecentlyDeletedTasks } from '@/app/actions';
import { formatTaskDate } from '@/lib/utils/date-formatter';

// Client-side Task interface now includes dates for display and passing to TaskCard
interface ClientTask extends Omit<DbTask, 'category_id'> {
  category_id?: string | null;
}

// Special interface for non-category views like "Recently Deleted"
interface SpecialView {
  id: string; // Unique ID like 'recently-deleted'
  name: string; // Display name like "Recently Deleted"
  isSpecialView: true; // Discriminator
}

const RECENTLY_DELETED_VIEW_ID = 'system-view-recently-deleted';
const RECENTLY_DELETED_VIEW: SpecialView = {
  id: RECENTLY_DELETED_VIEW_ID,
  name: 'Recently Deleted',
  isSpecialView: true,
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | SpecialView | null>(null);
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

  // State for editing category name
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryNameInput, setEditingCategoryNameInput] = useState('');

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
      // Only do this if the selectedCategory is NOT a special view.
      if (selectedCategory && !('isSpecialView' in selectedCategory) && !categories.find(c => c.id === selectedCategory.id)) {
        setSelectedCategory(null);
      }
      // If the selected category is being edited, update its name in selectedCategory state
      // Also ensure it's not a special view before attempting to find it in categories.
      if (selectedCategory && !('isSpecialView' in selectedCategory) && editingCategoryId === selectedCategory.id) {
        const updatedCat = categories.find(c => c.id === editingCategoryId);
        if (updatedCat) setSelectedCategory(updatedCat);
      }
    }
  }, [categories, isLoadingCategories, initialCategoryApplied, selectedCategory, editingCategoryId]);

  // Load tasks when selectedCategory changes OR when initial category setup is complete and categories are loaded
  useEffect(() => {
    async function loadTasksForCurrentView() {
      if (isLoadingCategories || !initialCategoryApplied) {
        // Special case: allow loading "All Tasks (Uncategorized)" or "Recently Deleted" view even if categories are still loading,
        // provided initial setup decided on one of these states.
        const canLoadNonCategoryView = initialCategoryApplied && 
                                       (selectedCategory === null || (selectedCategory && 'isSpecialView' in selectedCategory && selectedCategory.id === RECENTLY_DELETED_VIEW_ID));
        if (!canLoadNonCategoryView) {
            return;
        }
      }
      
      setIsLoadingTasks(true);
      let fetchedTasks: DbTask[] = [];

      if (selectedCategory && 'isSpecialView' in selectedCategory && selectedCategory.id === RECENTLY_DELETED_VIEW_ID) {
        fetchedTasks = await getRecentlyDeletedTasks();
      } else {
        // This handles both a specific category OR null (All Tasks / Uncategorized)
        const categoryIdToFetch = (selectedCategory && !('isSpecialView' in selectedCategory)) ? selectedCategory.id : null;
        fetchedTasks = await getTasksByCategory(categoryIdToFetch);
      }
      
      setTasks(fetchedTasks.map(ft => ({ ...ft, category_id: ft.category_id || null })));
      setIsLoadingTasks(false);
    }
    loadTasksForCurrentView();
  }, [selectedCategory, isLoadingCategories, initialCategoryApplied]);

  // Click outside handler for category dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
        setShowNewCategoryInput(false);
        setEditingCategoryId(null); // Cancel category edit on outside click
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
    // Prevent opening the edit modal for soft-deleted tasks
    if (selectedCategory && 'isSpecialView' in selectedCategory && selectedCategory.id === RECENTLY_DELETED_VIEW_ID) {
      return;
    }
    setEditingTask(task);
  };

  const closeModal = () => {
    setIsCreatingTask(false);
    setEditingTask(null);
  };

  const handleCategorySelect = (cat: Category | SpecialView | null) => {
    if (editingCategoryId) return; // Prevent selection while editing a category name
    setSelectedCategory(cat);
    setShowCategoryDropdown(false);
    setShowNewCategoryInput(false);
    setEditingCategoryId(null); // Cancel any active edit
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setEditingCategoryId(null); // Ensure not in edit mode
    startTransition(async () => {
      const newCatServer = await createCategory({ name: newCategoryName.trim() });
      if (newCatServer) {
        setCategories(prev => [...prev, newCatServer].sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedCategory(newCatServer);
        setShowNewCategoryInput(false);
        setNewCategoryName('');
        // setShowCategoryDropdown(false); // Keep dropdown open to see new category, select it
      } else {
        console.error("Failed to create category on server. Please check Vercel function logs for specific Supabase errors from 'actions.ts'.");
      }
    });
  };
  
  const openMoveToCategoryModal = (task: ClientTask, event: React.MouseEvent) => {
    event.stopPropagation();
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

  const handleStartEditCategoryName = (cat: Category, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent category selection
    setEditingCategoryId(cat.id);
    setEditingCategoryNameInput(cat.name);
    setShowNewCategoryInput(false); // Close new category input if open
  };

  const handleCancelEditCategoryName = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setEditingCategoryId(null);
    setEditingCategoryNameInput('');
  };

  const handleSaveCategoryName = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    const newName = editingCategoryNameInput.trim();
    if (!editingCategoryId || !newName) {
      handleCancelEditCategoryName();
      return;
    }

    const originalCategory = categories.find(c => c.id === editingCategoryId);
    if (originalCategory && originalCategory.name === newName) {
        handleCancelEditCategoryName();
        return;
    }

    // Client-side check for duplicate category name (case-insensitive)
    const otherCategories = categories.filter(c => c.id !== editingCategoryId);
    if (otherCategories.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
        alert(`A category named "${newName}" already exists. Please choose a different name.`);
        return; // Keep input active for user to correct
    }

    startTransition(async () => {
      const updatedCat = await updateCategory(editingCategoryId, { name: newName });
      if (updatedCat) {
        setCategories(prev => 
          prev.map(c => c.id === editingCategoryId ? updatedCat : c).sort((a,b) => a.name.localeCompare(b.name))
        );
        if (selectedCategory?.id === editingCategoryId) {
          setSelectedCategory(updatedCat);
        }
        setEditingCategoryId(null);
        setEditingCategoryNameInput('');
      } else {
        console.error("Failed to update category name on server.");
        // Optionally, provide feedback to the user that save failed
      }
    });
  };

  const handleAutoSaveTask = async (taskId: string, title: string, content: string, categoryId: string | null): Promise<void> => {
    const taskDataToUpdate = { 
      title, 
      content, 
      category_id: categoryId 
    };
    
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          const updatedTaskResultDb = await updateTask(taskId, taskDataToUpdate);
          
          if (updatedTaskResultDb) {
            setEditingTask(prevEditingTask => {
              if (!prevEditingTask || prevEditingTask.id !== taskId) {
                return prevEditingTask; 
              }

              // Corrected merge logic:
              const newClientTask: ClientTask = {
                ...prevEditingTask,     // 1. Base state from before this auto-save.
                ...taskDataToUpdate,    // 2. User's current input for this cycle.
                ...updatedTaskResultDb, // 3. Authoritative fields returned by the server.
              };
              
              // Update the main tasks list
              setTasks(prevTasks => 
                prevTasks.map(t => (t.id === taskId ? newClientTask : t))
                         .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              );
              
              return newClientTask; // Update editingTask state
            });
          }
          resolve();
        } catch (error) {
          console.error("Auto-save failed for task:", taskId, error);
          reject(error); 
        }
      });
    });
  };

  const handleRestoreTask = async (taskId: string) => {
    startTransition(async () => {
      const restoredTask = await restoreTask(taskId);
      if (restoredTask) {
        // Optimistically remove from the current 'Recently Deleted' view
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        // revalidatePath('/') in the action will ensure other views are updated if navigated to.
      } else {
        // Handle error if needed, e.g., show a toast notification
        console.error("Failed to restore task from UI");
      }
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
            onClick={() => {
              if (editingCategoryId) return; // Prevent closing dropdown if an item input is active
              setShowCategoryDropdown(v => !v);
              if (showCategoryDropdown) { // If was open, and now closing, cancel edits
                setEditingCategoryId(null);
                setShowNewCategoryInput(false);
              }
            }}
            aria-haspopup="listbox"
            aria-expanded={showCategoryDropdown}
            disabled={isLoadingCategories || (isPending && !editingCategoryId)}
          >
            <div className="flex items-center gap-2 overflow-hidden">
                <FolderPlus className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <span className="truncate">
                {selectedCategory ? selectedCategory.name : (isLoadingCategories ? 'Loading Categories...' : 'All Tasks (Uncategorized)')}
                </span>
            </div>
            <div className="flex items-center flex-shrink-0">
                {(isPending && !editingCategoryId) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <span className="text-xs text-gray-400 mr-1">({totalCategories})</span>
                <ChevronDown className="w-4 h-4" />
            </div>
          </button>
          {showCategoryDropdown && (
            <div className="absolute left-0 mt-2 w-full sm:w-72 md:w-80 bg-white border rounded shadow-lg z-50">
              <ul className="max-h-60 overflow-y-auto" role="listbox">
                <li 
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${!selectedCategory && !editingCategoryId ? 'bg-gray-100 font-bold' : ''} ${editingCategoryId ? 'opacity-50 cursor-not-allowed': ''}`}
                    onClick={() => handleCategorySelect(null)}
                    role="option"
                    aria-selected={!selectedCategory}
                >
                    All Tasks (Uncategorized)
                </li>
                {categories.map(cat => (
                  <li
                    key={cat.id}
                    className={`flex items-center justify-between px-4 py-1.5 group ${editingCategoryId === cat.id ? 'bg-blue-50' : (selectedCategory?.id === cat.id && !editingCategoryId ? 'bg-gray-100 font-bold' : 'hover:bg-gray-100')} ${editingCategoryId && editingCategoryId !== cat.id ? 'opacity-50 cursor-not-allowed': 'cursor-pointer'}`}
                    onClick={() => editingCategoryId !== cat.id ? handleCategorySelect(cat) : undefined}
                    role="option"
                    aria-selected={selectedCategory?.id === cat.id}
                  >
                    {editingCategoryId === cat.id ? (
                      <div className="flex-grow flex items-center gap-1">
                        <Input 
                          type="text" 
                          value={editingCategoryNameInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingCategoryNameInput(e.target.value)}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') handleSaveCategoryName();
                            if (e.key === 'Escape') handleCancelEditCategoryName();
                          }}
                          className="h-7 text-sm px-1 flex-grow"
                          autoFocus
                          onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()} // Prevent li click
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={handleSaveCategoryName} disabled={isPending || !editingCategoryNameInput.trim()}> <Check size={16}/> </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={handleCancelEditCategoryName} disabled={isPending}> <XCircle size={16}/> </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-grow truncate">{cat.name}</span>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-7 w-7 text-gray-400 group-hover:text-gray-600 ${editingCategoryId ? 'invisible': ''}`}
                            onClick={(e) => handleStartEditCategoryName(cat, e)}
                            disabled={isPending || !!editingCategoryId}
                        >
                            <Edit3 size={14}/>
                        </Button>
                      </>
                    )}
                  </li>
                ))}
                {/* "Recently Deleted" Link */}
                <li 
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 border-t ${selectedCategory?.id === RECENTLY_DELETED_VIEW_ID ? 'bg-gray-100 font-bold' : ''} ${editingCategoryId ? 'opacity-50 cursor-not-allowed': ''}`}
                    onClick={() => !editingCategoryId && handleCategorySelect(RECENTLY_DELETED_VIEW)}
                    role="option"
                    aria-selected={selectedCategory?.id === RECENTLY_DELETED_VIEW_ID}
                  >
                    <Trash2 size={14} className="inline-block mr-2 -mt-0.5 text-gray-500" />
                    Recently Deleted
                </li>
              </ul>
              <div className={`${editingCategoryId ? 'opacity-50 cursor-not-allowed': ''}`}> 
                {showNewCategoryInput ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 border-t bg-gray-50">
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
                      disabled={!!editingCategoryId}
                    />
                    <Button size="sm" onClick={handleCreateCategory} disabled={isPending || !newCategoryName.trim() || !!editingCategoryId}>Add</Button>
                  </div>
                ) : (
                  <button
                    className="w-full text-left px-4 py-1.5 text-blue-600 hover:bg-blue-50 border-t flex items-center gap-2"
                    onClick={() => { 
                        if (editingCategoryId) return;
                        setShowNewCategoryInput(true);
                    }}
                    disabled={!!editingCategoryId}
                  >
                    <Plus size={16}/> Create new category
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="text-gray-600 text-sm text-right sm:text-left">
            {isLoadingTasks ? 'Loading tasks...' : `${totalTasks} task${totalTasks !== 1 ? 's' : ''}`}
        </div>
      </div>

      {(isCreatingTask || editingTask) && (
        <TaskCard
          task={editingTask}
          categories={categories}
          currentCategoryId={selectedCategory?.id}
          onClose={closeModal}
          onSave={
            editingTask 
              ? (title, content, catId) => { 
                  handleEditTask(editingTask.id, title, content, catId); 
                  closeModal(); // Manual save of existing task closes modal
                }
              : (title, content, catId) => { 
                  handleSaveTask(title, content, catId); 
                  closeModal(); // Save of new task closes modal
                }
          }
          onAutoSave={editingTask ? handleAutoSaveTask : undefined}
          onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
        />
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
          {tasks.map((task) => {
            const isDeletedView = selectedCategory && 'isSpecialView' in selectedCategory && selectedCategory.id === RECENTLY_DELETED_VIEW_ID;
            return (
            <div
              key={task.id}
              className={`border rounded-lg group bg-white h-40 max-h-40 min-h-[10rem] overflow-hidden relative ${isDeletedView ? 'opacity-75 hover:shadow-md' : 'hover:shadow-lg cursor-pointer'}`}
              onClick={() => !isDeletedView && handleCardClick(task)} // Only allow click if not in deleted view
              style={{ height: '10rem' }}
            >
              {/* Content area that can scroll behind footer */}
              <div className={`p-4 h-full overflow-hidden ${isDeletedView ? 'pb-10' : 'pb-12'}`}> {/* Slightly less bottom padding for content if it's a deleted card to make space for restore button if footer is tight */}
                <h2 className={`text-xl font-bold mb-2 transition-colors truncate pr-8 ${!isDeletedView ? 'group-hover:text-blue-600' : 'text-gray-700'}`}>
                  {task.title || 'Untitled Task'}
                </h2>
                <div
                  className={`prose prose-sm max-w-none break-words ${isDeletedView ? 'text-gray-500' : 'text-gray-600'}`}
                  dangerouslySetInnerHTML={{ __html: task.content || '' }}
                />
              </div>
              
              {/* Fade gradient overlay - precisely aligned with the footer's top border */}
              {!isDeletedView && (
                <div 
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{
                    bottom: 'calc(3rem + 1px)', 
                    height: '1.5rem'
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-t from-white to-transparent" />
                </div>
              )}
              
              {/* Fixed footer at bottom */}
              <div className={`absolute bottom-0 left-0 right-0 px-4 py-2 bg-white border-t border-gray-100 z-20 flex items-center ${isDeletedView ? 'justify-end' : 'justify-between'}`}> 
                {!isDeletedView && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> {formatTaskDate(task.created_at)}
                  </span>
                )}
                {isDeletedView && task.deleted_at && (
                  <span className="text-xs text-red-400 flex items-center gap-1 mr-auto">
                    <Trash2 size={12} /> Deleted: {formatTaskDate(task.deleted_at)}
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {isDeletedView ? (
                    <Button
                      variant="outline"
                      size="sm" // Smaller restore button
                      className="text-gray-600 hover:text-black hover:border-gray-400 h-8 px-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreTask(task.id);
                      }}
                      aria-label="Restore task"
                    >
                      <Undo2 size={14} className="mr-1.5" /> Restore
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-gray-700 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMoveToCategoryModal(task, e);
                        }}
                        aria-label="Move task"
                      >
                        <ArrowRightLeft size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        aria-label="Delete task"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )})}
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
