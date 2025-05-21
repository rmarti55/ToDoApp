'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useTodoStore } from "@/lib/store"
import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

export default function Home() {
  const [newTodo, setNewTodo] = useState('')
  const { todos, isLoading, error, fetchTodos, addTodo, toggleTodo, deleteTodo } = useTodoStore()

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newTodo.trim()) return
    await addTodo(newTodo.trim())
    setNewTodo('')
  }

  return (
    <main className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8">Todo App</h1>
      
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <Input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          Add Task
        </Button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-2 p-4 bg-white rounded-lg shadow"
          >
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => toggleTodo(todo.id)}
              disabled={isLoading}
            />
            <span className={`flex-1 ${todo.completed ? 'line-through text-gray-500' : ''}`}>
              {todo.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTodo(todo.id)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </main>
  )
}
