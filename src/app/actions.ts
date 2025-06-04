'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Ensure these environment variables are set in your Vercel project settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is not defined. Please check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DbTask {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  category_id?: string | null;
}

export interface TaskInput {
  title: string;
  content: string;
  category_id?: string | null;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface CategoryInput {
  name: string;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data as Category[];
}

export async function createCategory(categoryData: CategoryInput): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: categoryData.name })
    .select()
    .single();
  if (error) {
    console.error('Error creating category:', error);
    return null;
  }
  revalidatePath('/');
  return data as Category;
}

export async function getTasksByCategory(category_id: string | null): Promise<DbTask[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (category_id) {
    query = query.eq('category_id', category_id);
  } else {
    query = query.is('category_id', null);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching tasks by category:', error);
    return [];
  }
  return data as DbTask[];
}

export async function getTasks(): Promise<DbTask[]> {
  // For backward compatibility, returns all tasks
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data as DbTask[];
}

export async function createTask(taskData: TaskInput): Promise<DbTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: taskData.title || 'Untitled Task',
      content: taskData.content,
      category_id: taskData.category_id || null,
    })
    .select()
    .single();
  if (error) {
    console.error('Error creating task:', error);
    return null;
  }
  revalidatePath('/');
  return data as DbTask;
}

export async function updateTask(id: string, taskData: TaskInput): Promise<DbTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: taskData.title || 'Untitled Task',
      content: taskData.content,
      category_id: taskData.category_id || null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating task:', error);
    return null;
  }
  revalidatePath('/');
  return data as DbTask;
}

export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }
  revalidatePath('/');
  return true;
} 