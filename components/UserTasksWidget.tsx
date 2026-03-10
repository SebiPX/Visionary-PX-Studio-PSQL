import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getToken } from '../lib/apiClient';
import { Clock, LayoutList, PlayCircle, ChevronDown } from 'lucide-react';
import { TimeTrackingModal } from './TimeTrackingModal';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project_id: string;
  assignee_id?: string | null;
  project: {
    id: string;
    title: string;
  };
}

const statusColors: Record<string, string> = {
    'todo': 'text-slate-400 bg-slate-800/80 border-slate-600',
    'in_progress': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    'review': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    'done': 'text-green-400 bg-green-500/10 border-green-500/30',
    'completed': 'text-green-400 bg-green-500/10 border-green-500/30',
};

export const UserTasksWidget: React.FC = () => {
    const { profile } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTaskForTime, setSelectedTaskForTime] = useState<Task | null>(null);

    const fetchTasks = async () => {
        const token = getToken();
        if (!profile?.id || !token) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/tasks?assignee_id=${profile.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch tasks');
            const data = await res.json();
            
            // Filter out completed tasks to only show active ones
            const activeTasks = data.filter((t: Task) => t.status !== 'completed' && t.status !== 'done');
            setTasks(activeTasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        // Get the full task data to prevent the backend from nullifying omitted fields (like assignee_id)
        const fullTaskToUpdate = tasks.find(t => t.id === taskId);
        
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            const token = getToken();
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    ...fullTaskToUpdate,
                    status: newStatus,
                    assignee_id: fullTaskToUpdate?.assignee_id || profile?.id 
                })
            });

            if (!res.ok) {
                console.error('Failed to update task status');
                // Re-fetch to revert on error
                fetchTasks();
            } else {
                // Remove task if it's now completed or done
                if (newStatus === 'completed' || newStatus === 'done') {
                    setTasks(prev => prev.filter(t => t.id !== taskId));
                }
            }
        } catch (error) {
            console.error("Error updating status:", error);
            fetchTasks();
        }
    };

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
        <>
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
                <div className="divide-y divide-slate-700/60 max-h-[300px] overflow-y-auto w-full relative">
                    {tasks.map(task => {
                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'done';
                        const colorClass = statusColors[task.status] || statusColors['todo'];

                        return (
                            <div key={task.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors group">
                                <div className="flex flex-col items-start gap-1 flex-1 min-w-0 pr-4">
                                    <div className="min-w-0 flex-1 w-full flex justify-between items-start">
                                        <p className="text-sm text-white font-medium truncate">{task.title}</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        <span className="truncate max-w-[150px]">{task.project?.title || 'Unknown Project'}</span>
                                        {task.due_date && (
                                            <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                                                <Clock size={12} />
                                                {new Date(task.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 shrink-0 relative">
                                    <div className="relative group/select">
                                        <select
                                            value={task.status}
                                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                            className={`appearance-none text-xs font-semibold px-2.5 py-1 pr-6 rounded-md border cursor-pointer outline-none transition-all ${colorClass}`}
                                        >
                                            <option value="todo">To Do</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="review">Review</option>
                                            <option value="done">Done</option>
                                        </select>
                                        <ChevronDown size={12} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70 ${colorClass.split(' ')[0]}`} />
                                    </div>

                                    <button 
                                        onClick={() => setSelectedTaskForTime(task)}
                                        className="text-slate-400 hover:text-green-400 hover:bg-green-400/10 p-1.5 rounded-full transition-colors"
                                        title="Zeit erfassen"
                                    >
                                        <PlayCircle size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedTaskForTime && (
                <TimeTrackingModal
                    isOpen={true}
                    task={selectedTaskForTime}
                    onClose={() => setSelectedTaskForTime(null)}
                />
            )}
        </>
    );
};
