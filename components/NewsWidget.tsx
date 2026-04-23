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
}

export const NewsWidget: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [highQualityOnly, setHighQualityOnly] = useState(true);

    const fetchNews = async () => {
        setLoading(true);
        const token = getToken();
        if (!token) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/news`, {
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
    }, []);

    if (loading) {
        return (
            <div className="bg-card/60 border border-border rounded-2xl p-5 flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-[#135bec] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-card/60 border border-border rounded-2xl overflow-hidden flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/80">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Newspaper size={18} className="text-[#135bec]" />
                    Aktuelles & KI News
                </h2>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline-block">Top News</span>
                    <button 
                        onClick={() => setHighQualityOnly(!highQualityOnly)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${highQualityOnly ? 'bg-primary' : 'bg-muted/50'}`}
                    >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${highQualityOnly ? 'left-[18px]' : 'left-0.5'}`}></span>
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {(() => {
                    const filteredNews = highQualityOnly 
                        ? news.filter(n => n.type === 'internal' || n.quality_score === undefined || n.quality_score >= 0.5)
                        : news;
                    
                    if (filteredNews.length === 0) {
                        return <div className="text-center text-muted-foreground text-sm py-4">Keine aktuellen Nachrichten vorhanden.</div>;
                    }

                    return filteredNews.map(item => (
                        <div key={item.id} className="bg-card/40 p-4 rounded-xl border border-border/50 hover:border-border/80 transition-colors flex flex-col-reverse sm:flex-row gap-4 justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    {item.type === 'internal' ? (
                                        <MessageCircle size={16} className="text-green-400 shrink-0" />
                                    ) : (
                                        <Sparkles size={16} className="text-purple-400 shrink-0" />
                                    )}
                                    <h3 className="font-medium text-foreground text-base">{item.title}</h3>
                                    {item.quality_score !== undefined && (
                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase flex-shrink-0 ${
                                            item.quality_score >= 0.8 ? 'bg-amber-500/20 text-amber-400' :
                                            item.quality_score >= 0.5 ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-slate-500/20 text-slate-400'
                                        }`}>
                                            Score {item.quality_score.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mb-3 flex justify-between">
                                    <span>{item.type === 'internal' ? 'Team Info' : 'KI Daily Update'}</span>
                                    <span>{new Date(item.publish_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-sm text-foreground/90 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-ul:pl-4">
                                    <ReactMarkdown>{item.content}</ReactMarkdown>
                                </div>
                            </div>
                            {item.thumbnail && (
                                <div className="shrink-0 w-full aspect-video sm:aspect-square sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-muted/20 relative mb-2 sm:mb-0">
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
