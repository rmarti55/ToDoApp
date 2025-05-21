import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">ToDo App</h1>
        <Button>Add New Task</Button>
      </div>
    </main>
  )
}
