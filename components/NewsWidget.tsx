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
}

export const NewsWidget: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

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
                    News of the Day
                </h2>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {news.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4">Keine aktuellen Nachrichten vorhanden.</div>
                ) : (
                    news.map(item => (
                        <div key={item.id} className="bg-card/40 p-4 rounded-xl border border-border/50 hover:border-border/80 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                {item.type === 'internal' ? (
                                    <MessageCircle size={16} className="text-green-400 shrink-0" />
                                ) : (
                                    <Sparkles size={16} className="text-purple-400 shrink-0" />
                                )}
                                <h3 className="font-medium text-foreground text-base">{item.title}</h3>
                            </div>
                            <div className="text-xs text-muted-foreground mb-3 flex justify-between">
                                <span>{item.type === 'internal' ? 'Team Info' : 'AI Daily Update'}</span>
                                <span>{new Date(item.publish_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="text-sm text-foreground/90 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-ul:pl-4">
                                <ReactMarkdown>{item.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
