"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Trash2, Edit, Save, Loader2, StickyNote } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/feedback-states"
import { useToast } from "@/hooks/use-toast"
import { supabase } from '@/lib/supabase'

interface Note {
  id: string
  content: string
  created_at: string
  updated_at: string
}

interface NotesPanelProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export function NotesPanel({ isOpen, onClose, userId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && userId) {
      loadNotes()
    }
  }, [isOpen, userId])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('employee_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load notes. Please try again.",
          variant: "destructive"
        })
        setNotes([])
        return
      }
      setNotes(data || [])
    } catch {
      toast({
        title: "Error",
        description: "Failed to load notes. Please try again.",
        variant: "destructive"
      })
      setNotes([])
    } finally {
      setLoading(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return

    try {
      setSaving(true)
      const { data, error } = await supabase
        .from("notes")
        .insert({
          employee_id: userId,
          content: newNote.trim()
        })
        .select()
        .single()

      if (error) throw error

      setNotes([data, ...notes])
      setNewNote("")
      toast({
        title: "Success",
        description: "Note added successfully"
      })
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Unknown error"
      toast({
        title: "Error",
        description: `Failed to add note: ${message}`,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const updateNote = async (noteId: string) => {
    if (!editText.trim()) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('notes')
        .update({ content: editText.trim() })
        .eq('id', noteId)
        .eq('employee_id', userId)

      if (error) throw error

      setNotes(notes.map(note =>
        note.id === noteId
          ? { ...note, content: editText.trim(), updated_at: new Date().toISOString() }
          : note
      ))
      setEditingNote(null)
      setEditText("")
      toast({
        title: "Success",
        description: "Note updated successfully"
      })
    } catch (error) {
      console.error('Error updating note:', error)
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('employee_id', userId)

      if (error) throw error

      setNotes(notes.filter(note => note.id !== noteId))
      toast({
        title: "Success",
        description: "Note deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting note:', error)
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (note: Note) => {
    setEditingNote(note.id)
    setEditText(note.content)
  }

  const cancelEditing = () => {
    setEditingNote(null)
    setEditText("")
  }

  if (!isOpen) return null

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b py-2 pl-4 pr-2">
        <h3 className="text-sm font-semibold">My notes</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close notes"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Add New Note */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add New Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              aria-label="New note"
              placeholder="Write your note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <Button
              onClick={addNote}
              disabled={!newNote.trim() || saving}
              size="sm"
              className="w-full"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Note
            </Button>
          </CardContent>
        </Card>

        {/* Notes List */}
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Loading notes…</span>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState icon={StickyNote} title="No notes yet" description="Jot down anything you want to remember." className="rounded-xl border border-dashed" />
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                {editingNote === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      aria-label="Edit note"
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateNote(note.id)}
                        disabled={!editText.trim() || saving}
                        size="sm"
                        className="flex-1"
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button
                        onClick={cancelEditing}
                        disabled={saving}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm mb-3 whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                        {note.updated_at !== note.created_at && (
                          <span className="ml-1">(edited)</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => startEditing(note)}
                          disabled={saving}
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          aria-label="Edit note"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          onClick={() => deleteNote(note.id)}
                          disabled={saving}
                          variant="ghost"
                          size="icon"
                          className="size-9 text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                          aria-label="Delete note"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
