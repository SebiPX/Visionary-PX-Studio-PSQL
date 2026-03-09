import React, { useState, useEffect } from 'react';
import { useSocialAudit } from '../../hooks/useSocialAudit';

interface PerformanceDashboardProps {
  accountId: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ accountId }) => {
  const { loadPosts, loading } = useSocialAudit();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const res = await loadPosts(accountId);
      if (res.success) {
        setPosts(res.data);
      }
    };
    if (accountId) fetchPosts();
  }, [accountId, loadPosts]);

  if (loading) {
    return <div className="text-slate-400">Lade Dashboard...</div>;
  }

  // Determine Top 3 and Flop 3 based on engagement_rate
  const sortedPosts = [...posts].filter(p => p.engagement_rate != null).sort((a, b) => b.engagement_rate - a.engagement_rate);
  const topPosts = sortedPosts.slice(0, 3);
  const flopPosts = sortedPosts.slice(-3).reverse(); // Worst first

  const renderPostCard = (post: any, isTop: boolean) => (
    <div key={post.id} className={`glass-card p-4 rounded-xl border ${isTop ? 'border-green-500/30' : 'border-red-500/30'} flex gap-4`}>
      <div className="w-24 h-32 bg-black rounded-lg overflow-hidden flex-shrink-0">
         <img src={`${import.meta.env.VITE_API_URL}/api/proxy/image?url=${encodeURIComponent(post.media_url)}`} alt="Post" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
           <p className="text-xs text-slate-400 mb-1">{new Date(post.published_at).toLocaleDateString()} • {post.post_type.toUpperCase()}</p>
           <p className="text-sm text-slate-200 line-clamp-2">{post.caption}</p>
        </div>
        <div className="flex items-center gap-4 mt-2 border-t border-white/5 pt-2">
           <div className="text-center">
             <p className="text-lg font-bold text-white">{post.engagement_rate}%</p>
             <p className="text-[10px] text-slate-500 tracking-wider uppercase">Engagement</p>
           </div>
           <div className="h-8 w-px bg-white/10"></div>
           <div className="flex gap-3 text-xs text-slate-400">
             <span className="flex items-center gap-1"><span className="material-icons-round text-[14px]">favorite</span> {post.likes}</span>
             <span className="flex items-center gap-1"><span className="material-icons-round text-[14px]">visibility</span> {post.reach}</span>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h3 className="text-xl font-bold text-white mb-6">Performance Dashboard</h3>
        {posts.length === 0 ? (
          <div className="text-center py-12 border border-white/5 border-dashed rounded-xl bg-white/5">
             <p className="text-slate-400">Keine Posts gefunden. Bitte führe zuerst einen Sync durch.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Top Performers */}
             <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-icons-round text-green-400">trending_up</span>
                  <h4 className="font-bold text-lg text-white">Top Performer</h4>
                </div>
                <div className="space-y-4">
                  {topPosts.map(p => renderPostCard(p, true))}
                </div>
             </div>

             {/* Low Performers */}
             <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-icons-round text-red-400">trending_down</span>
                  <h4 className="font-bold text-lg text-white">Low Performer</h4>
                </div>
                <div className="space-y-4">
                  {flopPosts.map(p => renderPostCard(p, false))}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
