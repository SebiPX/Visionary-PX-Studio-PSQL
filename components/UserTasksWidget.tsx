import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tasks as apiTasks } from '../lib/apiClient';
import { Clock, LayoutList, PlayCircle, ChevronDown, AlignLeft, ChevronUp } from 'lucide-react';
import { TimeTrackingModal } from './TimeTrackingModal';

interface Task {
  id: string;
  title: string;
  description?: string | null;
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
    'todo': 'text-muted-foreground bg-card/80 border-border/80',
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
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    const toggleExpand = (taskId: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const fetchTasks = async () => {
        if (!profile?.id) return;
        try {
            const data = await apiTasks.list(profile.id);
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
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            await apiTasks.update(taskId, { status: newStatus });
            
            // Remove task if it's now completed or done
            if (newStatus === 'completed' || newStatus === 'done') {
                setTasks(prev => prev.filter(t => t.id !== taskId));
            }
        } catch (error) {
            console.error("Error updating status:", error);
            // Re-fetch to revert on error
            fetchTasks();
        }
    };

    if (loading) {
        return (
            <div className="bg-card/60 border border-border rounded-2xl p-5 flex items-center justify-center h-32">
                <div className="w-8 h-8 border-4 border-[#135bec] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="bg-card/60 border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <LayoutList size={18} className="text-blue-400" />
                    <h2 className="font-semibold text-foreground">Meine Aufgaben</h2>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">Keine offenen Aufgaben zugewiesen. Gut gemacht!</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-card/60 border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="font-semibold text-foreground flex items-center gap-2">
                        <LayoutList size={18} className="text-blue-400" />
                        Meine Aufgaben
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
                            {tasks.length}
                        </span>
                    </h2>
                </div>
                <div className="divide-y divide-border/60 max-h-[300px] overflow-y-auto w-full relative">
                    {tasks.map(task => {
                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'done';
                        const colorClass = statusColors[task.status] || statusColors['todo'];

                        const isExpanded = expandedTasks.has(task.id);
                        const hasDescription = !!task.description?.trim();

                        return (
                            <div key={task.id} className="px-5 py-3 hover:bg-muted/30 transition-colors group border-b border-border/50 last:border-0">
                             <div className="flex items-center justify-between">
                                <div className="flex flex-col items-start gap-1 flex-1 min-w-0 pr-4">
                                    <div className="min-w-0 flex-1 w-full flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-foreground font-medium truncate">{task.title}</p>
                                            {hasDescription && (
                                                <button 
                                                    onClick={() => toggleExpand(task.id)}
                                                    className="text-muted-foreground hover:text-blue-400 transition-colors flex items-center gap-1"
                                                    title="Beschreibung umschalten"
                                                >
                                                    <AlignLeft size={14} />
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span className="truncate max-w-[150px]">{task.project?.title || 'Unbekanntes Projekt'}</span>
                                        {task.due_date && (
                                            <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
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
                                            <option value="todo">Offen</option>
                                            <option value="in_progress">In Bearbeitung</option>
                                            <option value="review">Freigabe</option>
                                            <option value="done">Abgeschlossen</option>
                                        </select>
                                        <ChevronDown size={12} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70 ${colorClass.split(' ')[0]}`} />
                                    </div>

                                    <button 
                                        onClick={() => setSelectedTaskForTime(task)}
                                        className="text-muted-foreground hover:text-green-400 hover:bg-green-400/10 p-1.5 rounded-full transition-colors"
                                        title="Zeit erfassen"
                                    >
                                        <PlayCircle size={18} />
                                    </button>
                                </div>
                             </div>
                             
                             {/* Anzeigebereich für die Beschreibung, falls ausgeklappt */}
                             {isExpanded && hasDescription && (
                                 <div className="mt-3 text-sm text-foreground/90 bg-card/60 p-3 rounded-lg border border-border/60 whitespace-pre-wrap leading-relaxed mr-2">
                                     {task.description}
                                 </div>
                             )}
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
