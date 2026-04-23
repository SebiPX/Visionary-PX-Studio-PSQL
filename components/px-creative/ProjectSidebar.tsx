import React, { useEffect, useState } from 'react';
import { useCreativeAgentStore } from '../../store/useCreativeAgentStore';
import { getToken } from '../../lib/apiClient';
import { MessageSquare, User, CheckCircle, Send } from 'lucide-react';

export const ProjectSidebar: React.FC = () => {
  const { currentProject, comments, fetchComments, postComment, updateProject } = useCreativeAgentStore();
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token && currentProject) {
      fetchComments(token, currentProject.id);
    }
  }, [currentProject?.id, fetchComments]);

  if (!currentProject) return null;

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      await postComment(token, currentProject.id, newComment);
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    const token = getToken();
    if (!token) return;
    if (confirm('Dieses Projekt final freigeben?')) {
      await updateProject(token, currentProject.id, { status: 'approved' });
    }
  };

  const handleSubmitForReview = async () => {
    const token = getToken();
    if (!token) return;
    if (confirm('Dieses Projekt zur Freigabe einreichen?')) {
      await updateProject(token, currentProject.id, { status: 'review' });
    }
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-foreground mb-4">Projekt Details</h3>
        
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs">Kunde / Projekt</span>
            <span className="font-medium">{currentProject.client_name || 'Kein Kunde angegeben'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Aktueller Status</span>
            <span className="inline-block px-2 py-1 bg-brand-500/20 text-brand-400 rounded-md text-xs font-bold uppercase mt-1">
              {currentProject.status}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {currentProject.status === 'drafting' && (
            <button 
              onClick={handleSubmitForReview}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors"
            >
              Zur Freigabe einreichen
            </button>
          )}
          {currentProject.status === 'review' && (
            <button 
              onClick={handleApprove}
              className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Projekt freigeben
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
          <MessageSquare size={16} /> Kommentare
        </h4>
        
        {comments.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground mt-4">Noch keine Kommentare.</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="bg-background rounded-lg p-3 text-sm border border-border">
              <div className="flex items-center gap-2 mb-1">
                <User size={12} className="text-muted-foreground" />
                <span className="font-semibold text-xs text-muted-foreground">User {c.user_id.substring(0, 4)}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-foreground">{c.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendComment()}
            placeholder="Kommentar schreiben..."
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
          <button 
            onClick={handleSendComment}
            disabled={loading || !newComment.trim()}
            className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-md disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
