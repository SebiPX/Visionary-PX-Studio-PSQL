import React, { useState, useEffect } from 'react';
import { useSocialAudit } from '../../hooks/useSocialAudit';
import { geminiProxy } from '../../lib/apiClient';
import toast from 'react-hot-toast';

interface AIInsightsViewProps {
  accountId: string;
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({ accountId }) => {
  const { loadPosts, saveAnalysis } = useSocialAudit();
  const [posts, setPosts] = useState<any[]>([]);
  const [analyzingPost, setAnalyzingPost] = useState<number | null>(null);

  const fetchPosts = async () => {
    const res = await loadPosts(accountId);
    if (res.success) {
      setPosts(res.data);
    }
  };

  useEffect(() => {
    if (accountId) fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const handleAnalyze = async (post: any) => {
    setAnalyzingPost(post.id);
    const toastId = toast.loading(`Analysiere Post...`);
    
    try {
      // Mocked AI analysis using Gemini Proxy
      const prompt = `Analysiere diesen Social Media Beitrag:
Caption: "${post.caption}"
Likes: ${post.likes}, Comments: ${post.comments_count}, Shares: ${post.shares}, Reach: ${post.reach}

Bitte extrahiere folgende Daten im JSON Format:
{
  "sentiment": "Positiv/Negativ/Neutral",
  "patterns": ["Tag1", "Tag2"],
  "summary": "Kurze Zusammenfassung warum der Post performt (oder nicht)."
}`;

      const aiResponse = await geminiProxy({
          action: 'generateContent',
          model: 'gemini-1.5-flash-latest',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
      }) as any;

      if (aiResponse.error) throw new Error(aiResponse.error.message);
      
      const jsonOutput = JSON.parse(aiResponse.candidates[0].content.parts[0].text);
      
      const saveRes = await saveAnalysis(post.id, jsonOutput.sentiment, jsonOutput.patterns, jsonOutput.summary);
      if (saveRes.success) {
         toast.success("Analyse gespeichert!", { id: toastId });
         fetchPosts(); // Refresh list to show new analysis
      } else {
         throw new Error("Fehler beim Speichern der Analyse.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setAnalyzingPost(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h3 className="text-xl font-bold text-white mb-6">AI Insights & Mustererkennung</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {posts.map(post => {
              const hasAnalysis = post.sentiment != null;
              
              return (
                 <div key={post.id} className="glass-card rounded-xl border border-white/5 overflow-hidden flex flex-col">
                    <div className="h-48 bg-black relative">
                       <img src={`${import.meta.env.VITE_API_URL}/api/proxy/image?url=${encodeURIComponent(post.media_url)}`} className="w-full h-full object-cover opacity-80" alt="Preview" />
                       <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-white text-xs font-bold line-clamp-1">{post.caption}</p>
                       </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col">
                       {hasAnalysis ? (
                          <div className="space-y-3 flex-1">
                             <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                                   {post.sentiment}
                                </span>
                             </div>
                             
                             <div className="flex flex-wrap gap-1">
                                {post.detected_patterns?.map((tag: string, i: number) => (
                                   <span key={i} className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] text-slate-300">
                                      #{tag}
                                   </span>
                                ))}
                             </div>
                             
                             <p className="text-xs text-slate-400 leading-relaxed">
                                {post.summary_text}
                             </p>
                          </div>
                       ) : (
                          <div className="flex-1 flex flex-col items-center justify-center py-4 opacity-50 text-center">
                             <span className="material-icons-round mb-2 text-slate-500">model_training</span>
                             <p className="text-xs text-slate-400">Noch keine Analyse vorhanden</p>
                          </div>
                       )}
                       
                       <button 
                          onClick={() => handleAnalyze(post)}
                          disabled={analyzingPost === post.id}
                          className="mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors flex items-center justify-center gap-2"
                       >
                          {analyzingPost === post.id ? (
                             <span className="material-icons-round text-[16px] animate-spin">refresh</span>
                          ) : (
                             <span className="material-icons-round text-[16px]">auto_awesome</span>
                          )}
                          {hasAnalysis ? 'Neu Analysieren' : 'KI Analyse Starten'}
                       </button>
                    </div>
                 </div>
              );
           })}
        </div>
      </div>
    </div>
  );
};
