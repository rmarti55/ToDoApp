'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useTodoStore } from "@/lib/store"
import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { createClient } from '@/lib/supabase-client'

export default async function Home() {
  const supabase = createClient()
  const { data, error } = await supabase.from('todo_lists').select('*')
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Todo App</h1>
        <div className="mb-4">
          <p>Supabase Connection Test:</p>
          <pre className="mt-2 p-4 bg-gray-100 rounded">
            {error ? `Error: ${error.message}` : `Connected! Found ${data?.length || 0} lists`}
          </pre>
        </div>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add New Task
        </button>
      </div>
    </main>
  )
}
