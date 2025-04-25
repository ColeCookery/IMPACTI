import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState } from "react";
import { useMutation } from "convex/react";
import logo from "./assets/logo.png";


const STATUSES = [
  "Idea",
  "Materials",
  "Plan",
  "Action",
  "Completion",
  "Testing",
  "Improvements",
];

const STATUS_COLORS = {
  Idea: "bg-red-50 border-red-200",
  Materials: "bg-orange-50 border-orange-200",
  Plan: "bg-yellow-50 border-yellow-200",
  Action: "bg-green-50 border-green-200",
  Completion: "bg-blue-50 border-blue-200",
  Testing: "bg-indigo-50 border-indigo-200",
  Improvements: "bg-violet-50 border-violet-200",
};

const STATUS_TEXT_COLORS = {
  Idea: "text-red-700",
  Materials: "text-orange-700",
  Plan: "text-yellow-700",
  Action: "text-green-700",
  Completion: "text-blue-700",
  Testing: "text-indigo-700",
  Improvements: "text-violet-700",
};

function Cloud({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute rounded-full bg-white/50 ${className}`}>
      <div className="absolute bg-white/50 rounded-full w-16 h-16 -left-4 -top-4" />
      <div className="absolute bg-white/50 rounded-full w-16 h-16 -right-4 -top-4" />
      <div className="absolute bg-white/50 rounded-full w-20 h-20 left-4 -top-8" />
      <div className="w-32 h-16" />
    </div>
  );
}

type EditingIdea = {
  id: string;
  title: string;
  description: string;
} | null;

function Board() {
  const ideas = useQuery(api.ideas.list);
  const createIdea = useMutation(api.ideas.create);
  const updateStatus = useMutation(api.ideas.updateStatus);
  const updateIdea = useMutation(api.ideas.update);
  const deleteIdea = useMutation(api.ideas.deleteIdea);
  const reorderIdea = useMutation(api.ideas.reorder);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingIdea, setEditingIdea] = useState<EditingIdea>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  if (!ideas) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createIdea({
      title: newTitle,
      description: newDescription,
      status: "Idea",
    });
    setNewTitle("");
    setNewDescription("");
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  };

  const handleDrop = async (e: React.DragEvent, status: string, index: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setDraggingId(null);

    const sourceIdea = ideas.find(i => i._id === id);
    if (!sourceIdea) return;

    if (sourceIdea.status !== status) {
      // Moving to a different status column
      await updateStatus({
        id: id as any,
        status,
        order: index,
      });
    } else if (sourceIdea.order !== index) {
      // Reordering within the same status column
      await reorderIdea({
        id: id as any,
        newOrder: index,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDragOver = (e: React.DragEvent, status: string, index: number) => {
    e.preventDefault();
    const draggedIdea = ideas.find(i => i._id === draggingId);
    if (!draggedIdea) return;

    // Add visual indicator for drop position
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    target.style.borderTop = y < height / 2 ? "2px solid #4299e1" : "none";
    target.style.borderBottom = y >= height / 2 ? "2px solid #4299e1" : "none";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.borderTop = "none";
    target.style.borderBottom = "none";
  };

  const handleEdit = async () => {
    if (!editingIdea) return;
    await updateIdea({
      id: editingIdea.id as any,
      title: editingIdea.title,
      description: editingIdea.description,
    });
    setEditingIdea(null);
  };

  const handleDelete = async () => {
    if (!editingIdea) return;
    await deleteIdea({
      id: editingIdea.id as any,
    });
    setEditingIdea(null);
  };

  return (
    <div className="h-full flex flex-col gap-2 lg:gap-4">
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New idea title"
          className="flex-1 px-3 py-2 border rounded"
        />
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add
        </button>
      </form>

      <div className="flex-1 flex flex-col lg:flex-row gap-2">
        {STATUSES.map((status) => (
          <div
            key={status}
            className={`flex-1 min-h-[200px] lg:min-h-0 lg:w-[calc(100%/7-0.75rem)] rounded-lg p-2 lg:p-3 border-2 ${STATUS_COLORS[status as keyof typeof STATUS_COLORS]}`}
            onDragOver={handleDragOver}
            onDrop={(e) => {
              const statusIdeas = ideas.filter(i => i.status === status);
              handleDrop(e, status, statusIdeas.length);
            }}
          >
            <h3 className={`font-semibold mb-2 lg:mb-3 text-sm lg:text-base ${STATUS_TEXT_COLORS[status as keyof typeof STATUS_TEXT_COLORS]}`}>
              {status}
            </h3>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-280px)]">
              {ideas
                .filter((idea) => idea.status === status)
                .sort((a, b) => a.order - b.order)
                .map((idea, index) => (
                  <div
                    key={idea._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idea._id)}
                    onDragOver={(e) => handleCardDragOver(e, status, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status, index)}
                    onDoubleClick={() => setEditingIdea({
                      id: idea._id,
                      title: idea.title,
                      description: idea.description,
                    })}
                    className="bg-white p-2 lg:p-3 rounded shadow cursor-move hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-medium text-sm">{idea.title}</h4>
                    <p className="text-xs lg:text-sm text-gray-600">{idea.description}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Edit View */}
      {editingIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">Edit Idea</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingIdea.title}
                  onChange={(e) => setEditingIdea({
                    ...editingIdea,
                    title: e.target.value,
                  })}
                  className="w-full px-3 py-2 border rounded text-base"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingIdea.description}
                  onChange={(e) => setEditingIdea({
                    ...editingIdea,
                    description: e.target.value,
                  })}
                  className="w-full px-3 py-2 border rounded text-base min-h-[100px]"
                />
              </div>
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setEditingIdea(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthenticatedApp() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <div>
          <h2 className="text-2xl font-bold">IMPACTI</h2>
          <p className="text-sm text-gray-500">
            <span className="text-red-500">I</span>dea · 
            <span className="text-orange-500">M</span>aterials · 
            <span className="text-yellow-500">P</span>lan · 
            <span className="text-green-500">A</span>ction · 
            <span className="text-blue-500">C</span>ompletion · 
            <span className="text-indigo-500">T</span>esting · 
            <span className="text-violet-500">I</span>mprovements
          </p>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 p-2 lg:p-4">
        <Board />
      </main>
    </>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <main className="flex-1">
          <div className="min-h-screen absolute inset-0 bg-sky-100 overflow-hidden">
            <Cloud className="top-12 left-[10%] animate-float" />
            <Cloud className="top-32 left-[25%] animate-float-slow" />
            <Cloud className="top-16 left-[45%] animate-float-slower" />
            <Cloud className="top-48 left-[65%] animate-float" />
            <Cloud className="top-24 left-[85%] animate-float-slow" />
            <div className="relative max-w-md mx-auto mt-20 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-4 mb-4 text-center">
                  <img src={logo} alt="IMPACTI logo" className="w-20 h-20 object-contain" />
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 via-green-500 to-blue-500 bg-clip-text text-transparent">
                    Welcome to IMPACTI
                  </h1>
                </div>
                <p className="text-gray-600">Sign in to manage your ideas</p>
              </div>
              <SignInForm />
            </div>
          </div>
        </main>
      </Unauthenticated>
      <Toaster />
    </div>
  );
}
