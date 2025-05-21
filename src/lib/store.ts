import { create } from 'zustand'
import { createClient } from './supabase-client'

export interface Todo {
  id: string
  title: string
  completed: boolean
  created_at: string
  user_id: string
}

interface TodoStore {
  todos: Todo[]
  isLoading: boolean
  error: string | null
  fetchTodos: () => Promise<void>
  addTodo: (title: string) => Promise<void>
  toggleTodo: (id: string) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,

  fetchTodos: async () => {
    set({ isLoading: true, error: null })
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ todos: data || [], isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch todos', isLoading: false })
    }
  },

  addTodo: async (title: string) => {
    set({ isLoading: true, error: null })
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('todos')
        .insert([{ title, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      set(state => ({ todos: [data, ...state.todos], isLoading: false }))
    } catch (error) {
      set({ error: 'Failed to add todo', isLoading: false })
    }
  },

  toggleTodo: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const supabase = createClient()
      const todo = get().todos.find(t => t.id === id)
      if (!todo) throw new Error('Todo not found')

      const { error } = await supabase
        .from('todos')
        .update({ completed: !todo.completed })
        .eq('id', id)

      if (error) throw error
      set(state => ({
        todos: state.todos.map(t =>
          t.id === id ? { ...t, completed: !t.completed } : t
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: 'Failed to toggle todo', isLoading: false })
    }
  },

  deleteTodo: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (error) throw error
      set(state => ({
        todos: state.todos.filter(t => t.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: 'Failed to delete todo', isLoading: false })
    }
  },
})) 