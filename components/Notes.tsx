import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { notes as notesApi, ApiNote } from '../lib/apiClient';

export const Notes: React.FC = () => {
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load notes from DB on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setIsLoading(true);
        const data = await notesApi.list();
        setNotes(data);
        if (data.length > 0) {
          setActiveNoteId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load notes', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const handleCreateNote = async () => {
    try {
      const newNote = await notesApi.create({
        title: 'New Note',
        content: '',
      });
      setNotes([newNote, ...notes]);
      setActiveNoteId(newNote.id);
      setIsEditing(true);
    } catch (err) {
      console.error('Failed to create note', err);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await notesApi.delete(id);
        const updatedNotes = notes.filter(n => n.id !== id);
        setNotes(updatedNotes);
        if (activeNoteId === id) {
          setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
        }
      } catch (err) {
        console.error('Failed to delete note', err);
      }
    }
  };

  // Keep a ref to the latest activeNote to debounce saves correctly
  const activeNoteRef = useRef(activeNote);
  useEffect(() => {
    activeNoteRef.current = activeNote;
  }, [activeNote]);

  // Debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateActiveNote = (updates: Partial<ApiNote>) => {
    if (!activeNoteId) return;

    // Optimistically update UI
    setNotes(currentNotes => 
      currentNotes.map(n => 
        n.id === activeNoteId 
          ? { ...n, ...updates, updated_at: new Date().toISOString() } 
          : n
      )
    );

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce API call
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Find the latest state of the note to send
        const latestNote = activeNoteRef.current;
        if (!latestNote) return;
        
        // Merge updates for safety
        const finalUpdates = { title: latestNote.title, content: latestNote.content, ...updates };
        await notesApi.update(activeNoteId, finalUpdates);
      } catch (err) {
        console.error('Failed to save note', err);
      }
    }, 1000); // 1 second debounce
  };

  const filteredNotes = notes.filter(n => 
    (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (n.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background text-muted-foreground">
        Loading notes...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col bg-card/30">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="material-icons-round text-primary">edit_note</span>
              Notes
            </h2>
            <button 
              onClick={handleCreateNote}
              className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              title="New Note"
            >
              <span className="material-icons-round text-sm">add</span>
            </button>
          </div>
          
          <div className="relative">
            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">search</span>
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground text-sm">
              No notes found.
            </div>
          ) : (
            filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                  activeNoteId === note.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`font-medium text-sm truncate ${activeNoteId === note.id ? 'text-primary' : 'text-foreground'}`}>
                    {note.title || 'Untitled Note'}
                  </h3>
                  <button 
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <span className="material-icons-round text-[14px]">delete</span>
                  </button>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {format(new Date(note.updated_at), 'MMM d, yyyy • h:mm a')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <input 
                type="text"
                value={activeNote.title || ''}
                onChange={(e) => updateActiveNote({ title: e.target.value })}
                placeholder="Note Title"
                className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full"
              />
              
              <div className="flex bg-muted/50 p-1 rounded-lg">
                <button 
                  onClick={() => setIsEditing(true)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isEditing ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Edit
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!isEditing ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Editor / Preview Area */}
            <div className="flex-1 overflow-hidden flex flex-col p-4">
              {isEditing ? (
                <textarea 
                  value={activeNote.content || ''}
                  onChange={(e) => updateActiveNote({ content: e.target.value })}
                  placeholder="Write your note here... (Markdown supported)"
                  className="w-full flex-1 resize-none bg-transparent border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-mono text-sm leading-relaxed"
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-4 border border-border rounded-lg bg-card/30 prose prose-invert max-w-none">
                  {activeNote.content ? (
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-2xl font-bold text-foreground mb-4 mt-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-bold text-foreground mb-3 mt-6">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">{children}</h3>,
                        p: ({ children }) => <p className="mb-4 last:mb-0 text-foreground/90 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-foreground/90">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-foreground/90">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                        em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
                        code: ({ children }) => <code className="bg-muted text-primary px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/50 pl-4 my-4 text-muted-foreground italic bg-muted/20 py-2 rounded-r-lg">{children}</blockquote>,
                        hr: () => <hr className="border-border my-6" />,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
                      }}
                    >
                      {activeNote.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="text-muted-foreground italic">Nothing to preview.</div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
            <span className="material-icons-round text-4xl opacity-20">edit_note</span>
            <p>Select a note or create a new one.</p>
            <button 
              onClick={handleCreateNote}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Create Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
