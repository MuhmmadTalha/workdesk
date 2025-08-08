"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Trash2, Edit, Save, Loader2 } from 'lucide-react'
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
  userRole: string
}

export function NotesPanel({ isOpen, onClose, userId, userRole }: NotesPanelProps) {
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
        console.error('Error loading notes:', error)
        // If table doesn't exist, show a more user-friendly message
        if (error.message?.includes('relation "notes" does not exist')) {
          toast({
            title: "Setup Required",
            description: "Notes feature requires database setup. Please contact your administrator.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to load notes. Please try again.",
            variant: "destructive"
          })
        }
        setNotes([])
        return
      }
      setNotes(data || [])
    } catch (error) {
      console.error('Error loading notes:', error)
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
      console.log('🔍 Adding note for user:', userId)
      
      // First check if the notes table exists and if we can insert
      const { data: tableCheck } = await supabase
        .from('notes')
        .select('id')
        .limit(1)
      
      // Try to add the note with proper error handling
      const { data, error } = await supabase
        .from('notes')
        .insert({
          employee_id: userId,
          content: newNote.trim()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Database error:', error)
        
        // If RLS error, provide helpful message
        if (error.message.includes('row-level security policy')) {
          toast({
            title: "Authentication Issue",
            description: "Notes feature requires proper database authentication setup. Contact administrator.",
            variant: "destructive"
          })
          return
        }
        
        throw error
      }

      console.log('✅ Note added successfully:', data)
      setNotes([data, ...notes])
      setNewNote("")
      toast({
        title: "Success",
        description: "Note added successfully"
      })
    } catch (error) {
      console.error('❌ Error adding note:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      
      // Check if it's a database table issue
      if (error instanceof Error && error.message.includes('relation "notes" does not exist')) {
        toast({
          title: "Database Setup Required",
          description: "Please run the database setup script first. Check the SIMPLIFIED-DATABASE-SETUP.sql file.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to add note: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        })
      }
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
    <div className="h-full flex flex-col border-l bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">My Notes</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Add New Note */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add New Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No notes yet.</p>
                <p className="text-xs mt-1">Add your first note above!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                {editingNote === note.id ? (
                  <div className="space-y-3">
                    <Textarea
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
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => deleteNote(note.id)}
                          disabled={saving}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
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
