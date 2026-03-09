import React, { useState, useEffect } from 'react';
import { useSocialAudit } from '../../hooks/useSocialAudit';
import { geminiProxy } from '../../lib/apiClient';
import toast from 'react-hot-toast';

interface AccountReportsViewProps {
  accountId: string;
}

export const AccountReportsView: React.FC<AccountReportsViewProps> = ({ accountId }) => {
  const { loadPosts, loadAccountReports, saveAccountReport, loading } = useSocialAudit();
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  const fetchReports = async () => {
    const res = await loadAccountReports(accountId);
    if (res.success) {
      setReports(res.data);
    }
  };

  useEffect(() => {
    if (accountId) fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    const toastId = toast.loading('Generiere Account Historien-Report...');
    
    try {
      // 1. Fetch all posts and metrics for this account
      const postsRes = await loadPosts(accountId);
      if (!postsRes.success) throw new Error('Konnte Account-Daten nicht laden.');
      
      const posts = postsRes.data || [];
      if (posts.length === 0) {
        throw new Error('Keine Posts vorhanden, um einen Report zu erstellen.');
      }

      // 2. Prepare data for the prompt
      // We summarize the last 30 posts (or all if fewer) to avoid hitting token limits
      const recentPosts = posts.slice(0, 30).map((p: any) => ({
        date: new Date(p.published_at).toLocaleDateString(),
        type: p.post_type,
        engagement_rate: p.engagement_rate,
        likes: p.likes,
        comments: p.comments_count,
        reach: p.reach,
        captionSnippet: p.caption?.substring(0, 100)
      }));

      const totals = recentPosts.reduce((acc: any, p: any) => {
        acc.likes += p.likes || 0;
        acc.comments += p.comments || 0;
        return acc;
      }, { likes: 0, comments: 0 });

      // 3. Build Prompt
      const prompt = `Du bist ein Social Media Performance Analyst. Hier sind die aggregierten Daten der letzten ${recentPosts.length} Posts dieses Accounts:
Insgesamt Likes: ${totals.likes}
Insgesamt Kommentare: ${totals.comments}

Details zu den letzten Posts:
${JSON.stringify(recentPosts, null, 2)}

Schreibe einen professionellen, zusammenfassenden Wachstums-Report (ca. 3-4 Absätze). 
Themen:
- Was waren die stärksten Content-Säulen?
- Wie hat sich die Engagement-Rate über diese Posts hinweg entwickelt?
- Konkrete Handlungsempfehlungen für nächste Posts.

Formatiere die Antwort in sauberem Markdown. Keine Begrüßungen, direkt der Report.`;

      // 4. Send to Gemini
      const aiResponse = await geminiProxy({
          action: 'generateContent',
          model: 'gemini-2.5-flash-lite',
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }) as any;

      if (aiResponse.error) throw new Error(aiResponse.error.message);
      
      const reportText = aiResponse.candidates[0].content.parts[0].text;

      // 5. Save Report
      const saveRes = await saveAccountReport(accountId, 'Wachstumsreport', reportText);
      if (saveRes.success) {
         toast.success("Report erfolgreich erstellt!", { id: toastId });
         fetchReports();
      } else {
         throw new Error("Fehler beim Speichern des Reports.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Fehler: ${err.message}`, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Account Historie & Reports</h3>
        <button 
          onClick={handleGenerateReport}
          disabled={generating || loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {generating ? (
             <span className="material-icons-round text-sm animate-spin">refresh</span>
          ) : (
             <span className="material-icons-round text-sm">auto_awesome</span>
          )}
          {generating ? 'Generiere...' : 'Neuen Report erstellen'}
        </button>
      </div>

      {reports.length === 0 && !loading && (
        <div className="text-center py-12 border border-white/5 border-dashed rounded-xl bg-white/5">
          <span className="material-icons-round text-slate-500 text-4xl mb-4">history</span>
          <p className="text-slate-400">Noch keine Wachstums-Reports für diesen Account verfasst.</p>
        </div>
      )}

      <div className="space-y-6">
        {reports.map((report) => (
          <div key={report.id} className="glass-card p-6 rounded-xl border border-white/5 relative pl-8">
            <div className="absolute left-[15px] top-6 bottom-[-24px] w-px bg-white/10 last:hidden"></div>
            <div className="absolute left-[11px] top-6 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h4 className="font-bold text-white text-lg">{report.report_type}</h4>
                  <p className="text-xs text-slate-400">{new Date(report.generated_at).toLocaleString()}</p>
               </div>
            </div>
            
            <div className="prose prose-invert prose-sm max-w-none text-slate-300">
               {/* Extremely simple Markdown renderer for the demo. In a real app we'd use react-markdown */}
               {report.report_text.split('\n\n').map((paragraph: string, i: number) => {
                  if (paragraph.startsWith('-')) {
                     return (
                        <ul key={i} className="list-disc pl-5 mb-4 space-y-1">
                           {paragraph.split('\n').map((li, j) => (
                              <li key={j}>{li.replace(/^- /, '')}</li>
                           ))}
                        </ul>
                     );
                  }
                  if (paragraph.startsWith('###')) {
                     return <h5 key={i} className="text-white font-bold mt-4 mb-2">{paragraph.replace(/^### /, '')}</h5>;
                  }
                  return <p key={i} className="mb-4">{paragraph}</p>;
               })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
