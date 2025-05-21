'use client'

import { Button } from "@/components/ui/button"
import { useTodoStore } from "@/lib/store"

export default function Home() {
  const { todos, addTodo, toggleTodo, removeTodo } = useTodoStore()

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">ToDo App</h1>
        <Button onClick={() => addTodo('New Task')} className="mb-8">Add New Task</Button>
        
        <div className="space-y-4">
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="h-5 w-5"
              />
              <span className={todo.completed ? 'line-through' : ''}>
                {todo.text}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeTodo(todo.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
