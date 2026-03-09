import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../lib/apiClient';
import { CheckCircle2, Circle, Clock, LayoutList } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project: {
    id: string;
    title: string;
  };
}

export const UserTasksWidget: React.FC = () => {
    const { profile } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (!profile?.id || !token) {
            setLoading(false);
            return;
        }

        const fetchTasks = async () => {
            try {
                // Assuming labs-api is available at the standard env URL or relative path
                const apiUrl = import.meta.env.VITE_LABS_API_URL || '/api';
                const res = await fetch(`${apiUrl}/agency/tasks?assignee_id=${profile.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch tasks');
                const data = await res.json();
                
                // Filter out completed tasks to only show active ones
                const activeTasks = data.filter((t: Task) => t.status !== 'completed');
                setTasks(activeTasks);
            } catch (error) {
                console.error("Error fetching tasks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [profile]);

    if (loading) {
        return (
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex items-center justify-center h-32">
                <div className="w-8 h-8 border-4 border-[#135bec] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <LayoutList size={18} className="text-blue-400" />
                    <h2 className="font-semibold text-white">Meine ProjectFlow Tasks</h2>
                </div>
                <p className="text-sm text-slate-500 text-center py-4">Keine offenen Tasks zugewiesen. Gut gemacht!</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                <h2 className="font-semibold text-white flex items-center gap-2">
                    <LayoutList size={18} className="text-blue-400" />
                    Meine ProjectFlow Tasks
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
                        {tasks.length}
                    </span>
                </h2>
            </div>
            <div className="divide-y divide-slate-700/60 max-h-[300px] overflow-y-auto">
                {tasks.map(task => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                    
                    return (
                        <div key={task.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-700/30 transition-colors">
                            <div className="mt-0.5 shrink-0">
                                {task.status === 'in_progress' ? (
                                    <Circle size={16} className="text-blue-400 fill-blue-400/20" />
                                ) : (
                                    <Circle size={16} className="text-slate-500" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-white font-medium truncate">{task.title}</p>
                                <p className="text-xs text-slate-400 truncate">{task.project?.title || 'Unknown Project'}</p>
                            </div>
                            {task.due_date && (
                                <div className={`shrink-0 flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                                    <Clock size={12} />
                                    {new Date(task.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
