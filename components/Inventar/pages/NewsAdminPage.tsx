import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Newspaper } from 'lucide-react';
import { getToken } from '../../../lib/apiClient';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  type: 'internal' | 'external';
  publish_date: string;
}

export const NewsAdminPage: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'internal' | 'external'>('internal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    const token = getToken();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      // Fetch all news
      const res = await fetch(`${apiUrl}/api/news?all=true`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setNews(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setIsSubmitting(true);
    const token = getToken();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/news`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type })
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        fetchNews();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return;
    const token = getToken();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/news/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchNews();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
          <Newspaper className="text-blue-400" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">News Verwaltung</h1>
          <p className="text-muted-foreground text-sm">Dashboard-Nachrichten an das Team steuern</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* FORM */}
        <div className="bg-card/60 border border-border p-5 rounded-2xl lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">Neue News Posten</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Typ</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full bg-card border border-border text-foreground rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm">
                <option value="internal">Intern (Team News)</option>
                <option value="external">Extern (AI News)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Titel</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} type="text" className="w-full bg-card border border-border text-foreground rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" placeholder="z.B. Heute ist Pizza-Tag!" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Inhalt (Markdown unterstützt)</label>
              <textarea required value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="w-full bg-card border border-border text-foreground rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" placeholder="Nachrichtentext..." />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-foreground py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              <Plus size={16} /> Speichern
            </button>
          </form>
        </div>

        {/* LIST */}
        <div className="bg-card/60 border border-border rounded-2xl lg:col-span-2 overflow-hidden">
          <table className="w-full text-left text-sm text-foreground/90">
            <thead className="bg-card/50 text-xs uppercase text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-5 py-3">Typ</th>
                <th className="px-5 py-3">Titel</th>
                <th className="px-5 py-3">Datum</th>
                <th className="px-5 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6">Laden...</td></tr>
              ) : news.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Keine News vorhanden</td></tr>
              ) : (
                news.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${item.type === 'internal' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{item.title}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{new Date(item.publish_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 p-1 bg-red-400/10 rounded">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
