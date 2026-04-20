import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { format } from 'date-fns';
import { notes as notesApi, ApiNote, geminiProxy } from '../lib/apiClient';

export const Notes: React.FC = () => {
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // AI State
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeAiAction, setActiveAiAction] = useState<'improve' | 'seo' | 'continue' | null>(null);
  const [tone, setTone] = useState<string>('Professional');
  const [seoKeyword, setSeoKeyword] = useState<string>('');
  const [seoLocation, setSeoLocation] = useState<string>('');
  const [showAiSettings, setShowAiSettings] = useState<'improve' | 'seo' | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Formatting Helper
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current || !activeNote) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeNote.content || '';
    
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    
    updateActiveNote({ content: newText });
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  // AI Generation
  const generateAiContent = async (action: 'improve' | 'seo' | 'continue') => {
    if (!activeNote?.content && action !== 'continue') return;
    
    setIsGenerating(true);
    setActiveAiAction(action);
    setShowAiSettings(null);
    setAiSuggestion(null);

    let prompt = "";
    if (action === 'improve') {
      prompt = `Rewrite the following text to improve its flow, clarity, and professionalism. \nTone of voice: ${tone}\n\nExisting text:\n${activeNote?.content || ''}\n\nIMPORTANT: Output only the rewritten text. Do not include any introductions or meta-commentary.`;
    } else if (action === 'seo') {
      prompt = `Optimize the following text for Search Engine Optimization (SEO). \n${seoKeyword ? `Target Keyword: ${seoKeyword}\n` : ''}${seoLocation ? `Target Location: ${seoLocation}\n` : ''}\nImprove the structure, readability, and natural keyword integration. \n\nExisting text:\n${activeNote?.content || ''}\n\nIMPORTANT: Output only the optimized text. Do not include any introductions or meta-commentary.`;
    } else if (action === 'continue') {
      prompt = `Continue the following text organically. Keep the same style, tone, and context. \n\nExisting text:\n${activeNote?.content || ''}\n\nIMPORTANT: Output only the continuation text. Do not repeat what was already written. Do not include any introductions or meta-commentary.`;
    }

    try {
      const response = await geminiProxy({
        action: 'generateContent',
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: "You are an expert copywriter and SEO specialist.",
      }) as any;

      if (response?.error) throw new Error(JSON.stringify(response.error));
      
      const generatedText = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (generatedText) {
        setAiSuggestion(generatedText);
      } else {
        alert("Received empty response from AI.");
        setActiveAiAction(null);
      }
    } catch (err) {
      console.error("AI Generation error:", err);
      alert("Error generating content. Please try again.");
      setActiveAiAction(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAi = () => {
    if (!aiSuggestion || !activeAiAction) return;
    
    if (activeAiAction === 'continue') {
      const currentContent = activeNote?.content || '';
      updateActiveNote({ content: currentContent + (currentContent ? '\n\n' : '') + aiSuggestion });
    } else {
      updateActiveNote({ content: aiSuggestion });
    }
    
    setAiSuggestion(null);
    setActiveAiAction(null);
  };

  const handleDiscardAi = () => {
    setAiSuggestion(null);
    setActiveAiAction(null);
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
                onClick={() => {
                  setActiveNoteId(note.id);
                  if (activeAiAction) handleDiscardAi(); // Cancel AI review if switching notes
                }}
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
                disabled={activeAiAction !== null}
              />
              
              <div className="flex bg-muted/50 p-1 rounded-lg">
                <button 
                  onClick={() => setIsEditing(true)}
                  disabled={activeAiAction !== null}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isEditing && !activeAiAction ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'}`}
                >
                  Edit
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  disabled={activeAiAction !== null}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!isEditing && !activeAiAction ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* AI Review Mode OR Normal Editor */}
            {activeAiAction ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {/* Review Header */}
                <div className="flex items-center justify-between p-3 border-b border-border bg-card/50">
                  <div className="flex items-center gap-2">
                    <span className={`material-icons-round text-primary ${isGenerating ? 'animate-pulse' : ''}`}>
                      {isGenerating ? 'autorenew' : 'auto_awesome'}
                    </span>
                    <span className="font-semibold text-sm">
                      {isGenerating ? 'AI is thinking...' : 'Review AI Suggestion'}
                    </span>
                  </div>
                  {!isGenerating && aiSuggestion && (
                    <div className="flex gap-2">
                      <button onClick={handleDiscardAi} className="px-3 py-1.5 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors">Discard</button>
                      <button onClick={() => generateAiContent(activeAiAction)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors">Regenerate</button>
                      <button onClick={handleAcceptAi} className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-colors">Accept</button>
                    </div>
                  )}
                </div>
                
                {/* Split View */}
                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 border-r border-border p-4 overflow-y-auto bg-muted/10 opacity-70">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3">Original</h3>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{activeNote.content || ''}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto relative">
                    <h3 className="text-xs font-bold text-primary uppercase mb-3">
                      {activeAiAction === 'continue' ? 'Continuation Suggestion' : 'Suggested Rewrite'}
                    </h3>
                    {isGenerating ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-icons-round text-4xl text-primary animate-spin opacity-50">autorenew</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none text-green-100">
                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{aiSuggestion || ''}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {isEditing ? (
                  <>
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-card/30">
                      <button onClick={() => insertFormatting('**', '**')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Bold"><span className="material-icons-round text-[18px]">format_bold</span></button>
                      <button onClick={() => insertFormatting('*', '*')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Italic"><span className="material-icons-round text-[18px]">format_italic</span></button>
                      <div className="w-px h-4 bg-border mx-1"></div>
                      <button onClick={() => insertFormatting('# ')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Heading 1"><h1 className="font-bold text-[14px] leading-none">H1</h1></button>
                      <button onClick={() => insertFormatting('## ')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Heading 2"><h2 className="font-bold text-[13px] leading-none">H2</h2></button>
                      <div className="w-px h-4 bg-border mx-1"></div>
                      <button onClick={() => insertFormatting('- ')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Bullet List"><span className="material-icons-round text-[18px]">format_list_bulleted</span></button>
                      <button onClick={() => insertFormatting('1. ')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Numbered List"><span className="material-icons-round text-[18px]">format_list_numbered</span></button>
                      <div className="w-px h-4 bg-border mx-1"></div>
                      <button onClick={() => insertFormatting('> ')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Quote"><span className="material-icons-round text-[18px]">format_quote</span></button>
                      
                      <div className="flex-1"></div>
                      
                      {/* AI Buttons */}
                      <div className="relative">
                        <button onClick={() => setShowAiSettings(showAiSettings === 'improve' ? null : 'improve')} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-gradient-to-r from-purple-500/20 to-primary/20 text-purple-400 hover:from-purple-500/30 hover:to-primary/30 transition-all border border-purple-500/30">
                          <span className="material-icons-round text-[14px]">auto_fix_high</span> Improve
                        </button>
                        {showAiSettings === 'improve' && (
                          <div className="absolute top-full mt-2 right-0 w-48 p-3 bg-card border border-border rounded-lg shadow-xl z-10">
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Tone of Voice</label>
                            <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-background border border-border rounded p-1.5 text-xs mb-3 focus:outline-none focus:border-primary">
                              <option>Professional</option>
                              <option>Casual</option>
                              <option>Persuasive</option>
                              <option>Creative</option>
                              <option>Empathetic</option>
                            </select>
                            <button onClick={() => generateAiContent('improve')} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground py-1.5 rounded text-xs font-bold transition-colors">Generate</button>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button onClick={() => setShowAiSettings(showAiSettings === 'seo' ? null : 'seo')} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-emerald-400 hover:from-green-500/30 hover:to-emerald-500/30 transition-all border border-green-500/30">
                          <span className="material-icons-round text-[14px]">language</span> SEO & GEO
                        </button>
                        {showAiSettings === 'seo' && (
                          <div className="absolute top-full mt-2 right-0 w-56 p-3 bg-card border border-border rounded-lg shadow-xl z-10">
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Target Keyword (Optional)</label>
                            <input type="text" value={seoKeyword} onChange={e => setSeoKeyword(e.target.value)} placeholder="e.g. AI Agency" className="w-full bg-background border border-border rounded p-1.5 text-xs mb-2 focus:outline-none focus:border-primary" />
                            
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Target Location (Optional)</label>
                            <input type="text" value={seoLocation} onChange={e => setSeoLocation(e.target.value)} placeholder="e.g. Munich" className="w-full bg-background border border-border rounded p-1.5 text-xs mb-3 focus:outline-none focus:border-primary" />
                            
                            <button onClick={() => generateAiContent('seo')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded text-xs font-bold transition-colors">Optimize</button>
                          </div>
                        )}
                      </div>

                      <button onClick={() => generateAiContent('continue')} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border">
                        <span className="material-icons-round text-[14px]">edit_note</span> Continue
                      </button>
                    </div>

                    <textarea 
                      ref={textareaRef}
                      value={activeNote.content || ''}
                      onChange={(e) => updateActiveNote({ content: e.target.value })}
                      placeholder="Write your note here... (Markdown supported)"
                      className="w-full flex-1 resize-none bg-transparent p-4 focus:outline-none text-foreground font-mono text-sm leading-relaxed"
                    />
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto p-4 bg-card/30 prose prose-invert max-w-none">
                    {activeNote.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkBreaks]}
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-bold text-foreground mb-4 mt-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold text-foreground mb-3 mt-6">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">{children}</h3>,
                          p: ({ children }) => <p className="mb-4 last:mb-0 text-foreground/90 leading-relaxed break-words">{children}</p>,
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
            )}
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
