import React, { useEffect, useState } from 'react';
import { getToken } from '../lib/apiClient';
import { Newspaper, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  type: 'internal' | 'external';
  publish_date: string;
  thumbnail?: string;
  quality_score?: number;
  topic?: string;
  impact_score?: number;
  business_relevance?: number;
  region?: string;
  audience?: string[];
  action_hint?: string;
}

export const NewsWidget: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedType, setFeedType] = useState<'daily' | 'client' | 'risk'>('daily');

    const fetchNews = async () => {
        setLoading(true);
        const token = getToken();
        if (!token) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/news?feed=${feedType}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNews(data);
            }
        } catch (error) {
            console.error("Error fetching news:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [feedType]);

    if (loading) {
        return (
            <div className="bg-card/60 border border-border rounded-2xl p-5 flex items-center justify-center h-[600px]">
                <div className="w-8 h-8 border-4 border-[#135bec] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-card/60 border border-border rounded-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/80">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Newspaper size={18} className="text-[#135bec]" />
                    Aktuelles & KI News
                </h2>
                <div className="flex gap-2 bg-muted/30 p-1 rounded-lg">
                    <button 
                        onClick={() => setFeedType('daily')}
                        className={`text-xs px-3 py-1 rounded-md transition-colors ${feedType === 'daily' ? 'bg-primary text-white font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                        Daily
                    </button>
                    <button 
                        onClick={() => setFeedType('client')}
                        className={`text-xs px-3 py-1 rounded-md transition-colors ${feedType === 'client' ? 'bg-primary text-white font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                        Client
                    </button>
                    <button 
                        onClick={() => setFeedType('risk')}
                        className={`text-xs px-3 py-1 rounded-md transition-colors ${feedType === 'risk' ? 'bg-primary text-white font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                        Risk
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {(() => {
                    if (news.length === 0) {
                        return <div className="text-center text-muted-foreground text-sm py-4">Keine aktuellen Nachrichten vorhanden.</div>;
                    }

                    return news.map(item => (
                        <div key={item.id} className="bg-card/40 p-4 rounded-xl border border-border/50 hover:border-border/80 transition-colors flex flex-col-reverse sm:flex-row gap-4 justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    {item.type === 'internal' ? (
                                        <MessageCircle size={16} className="text-green-400 shrink-0" />
                                    ) : (
                                        <Sparkles size={16} className="text-purple-400 shrink-0" />
                                    )}
                                    <h3 className="font-medium text-foreground text-base mr-1">{item.title}</h3>
                                    
                                    {(item.impact_score !== undefined || item.quality_score !== undefined) && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase flex-shrink-0 ${
                                            (item.impact_score || item.quality_score || 0) >= 0.8 ? 'bg-amber-500/20 text-amber-400' :
                                            (item.impact_score || item.quality_score || 0) >= 0.5 ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-slate-500/20 text-slate-400'
                                        }`}>
                                            Impact {(item.impact_score || item.quality_score || 0).toFixed(1)}
                                        </span>
                                    )}
                                    {item.region && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground uppercase flex-shrink-0">
                                            {item.region}
                                        </span>
                                    )}
                                    {item.topic && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground uppercase flex-shrink-0">
                                            {item.topic}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mb-3 flex justify-between">
                                    <span>{item.type === 'internal' ? 'Team Info' : 'AI Daily Update'}</span>
                                    <span>{new Date(item.publish_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-sm text-foreground/90 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-ul:pl-4">
                                    <ReactMarkdown>{item.content}</ReactMarkdown>
                                </div>
                                {item.action_hint && (
                                    <div className="mt-3 text-xs bg-primary/10 text-primary px-3 py-2 rounded-lg flex items-start gap-2">
                                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                        <span><strong>Action:</strong> {item.action_hint}</span>
                                    </div>
                                )}
                            </div>
                            {item.thumbnail && (
                                <div className="shrink-0 w-full aspect-video sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-muted/20 relative mb-2 sm:mb-0">
                                    <img src={item.thumbnail} alt={item.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                </div>
                            )}
                        </div>
                    ));
                })()}
            </div>
        </div>
    );
};
