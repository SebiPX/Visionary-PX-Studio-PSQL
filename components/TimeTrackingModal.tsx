import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { timeEntries, ApiTimeEntry } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Play, Square, X, Trash2, Plus, Minus } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    project_id: string;
}

interface TimeTrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task;
}

export const TimeTrackingModal: React.FC<TimeTrackingModalProps> = ({ isOpen, onClose, task }) => {
    const { profile } = useAuth();
    const profileId = profile?.id;

    const [entries, setEntries] = useState<ApiTimeEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionPending, setActionPending] = useState(false);

    // Timer state
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerStart, setTimerStart] = useState<Date | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [activeTimeEntryId, setActiveTimeEntryId] = useState<string | null>(null);

    // Manual entry state
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualFormData, setManualFormData] = useState({
        start_time: '',
        end_time: '',
        duration_minutes: '',
        billable: true,
    });

    const fetchEntries = useCallback(async () => {
        if (!isOpen || !profileId) return;
        setIsLoading(true);
        try {
            const data = await timeEntries.getByTask(task.id);
            setEntries(data);
        } catch (error: any) {
            toast.error(`Fehler beim Laden: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, profileId, task.id]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isTimerRunning && timerStart) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now.getTime() - timerStart.getTime()) / 1000);
                setElapsedSeconds(diff);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning, timerStart]);

    // Check for running timer on mount
    useEffect(() => {
        if (!isOpen || !profileId || entries.length === 0) return;

        const runningEntry = entries.find(
            (entry) => entry.status === 'draft' && entry.profile_id === profileId && !entry.end_time
        );

        if (runningEntry) {
            const startTime = new Date(runningEntry.start_time);
            setTimerStart(startTime);
            setIsTimerRunning(true);
            setActiveTimeEntryId(runningEntry.id);

            const now = new Date();
            const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            setElapsedSeconds(diff);
        }
    }, [isOpen, entries, profileId]);

    // Start timer
    const handleStartTimer = async () => {
        if (!profileId) {
            toast.error('Du musst angemeldet sein, um Zeit zu erfassen.');
            return;
        }

        const existingDraft = entries.find(
            (entry) => entry.status === 'draft' && entry.profile_id === profileId && !entry.end_time
        );

        if (existingDraft) {
            toast.error('Es läuft bereits ein Timer für diesen Task.');
            return;
        }

        const now = new Date();
        setTimerStart(now);
        setIsTimerRunning(true);
        setElapsedSeconds(0);
        setActionPending(true);

        try {
            const newEntry = await timeEntries.create({
                task_id: task.id,
                profile_id: profileId,
                start_time: now.toISOString(),
                status: 'draft',
                billable: true,
                duration_minutes: null,
                end_time: null,
                description: null
            });
            setActiveTimeEntryId(newEntry.id);
            await fetchEntries();
            toast.success('Zeiteintrag gestartet!');
        } catch (error: any) {
            setIsTimerRunning(false);
            setTimerStart(null);
            toast.error(`Fehler: ${error.message}`);
        } finally {
            setActionPending(false);
        }
    };

    // Stop timer
    const handleStopTimer = async () => {
        if (!activeTimeEntryId || !timerStart) return;

        const now = new Date();
        const durationMinutes = Math.round((now.getTime() - timerStart.getTime()) / 60000);

        setIsTimerRunning(false);
        setActionPending(true);

        try {
            await timeEntries.update(activeTimeEntryId, {
                end_time: now.toISOString(),
                duration_minutes: durationMinutes,
                status: 'submitted',
            });
            setActiveTimeEntryId(null);
            setTimerStart(null);
            setElapsedSeconds(0);
            await fetchEntries();
            toast.success('Zeiteintrag gespeichert!');
        } catch (error: any) {
            setIsTimerRunning(true);
            toast.error(`Fehler: ${error.message}`);
        } finally {
            setActionPending(false);
        }
    };

    // Handle manual entry submit
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!profileId) return;

        setActionPending(true);
        const startTime = new Date(manualFormData.start_time);
        const endTime = new Date(manualFormData.end_time);
        const durationMinutes = manualFormData.duration_minutes
            ? parseInt(manualFormData.duration_minutes)
            : Math.round((endTime.getTime() - startTime.getTime()) / 60000);

        try {        
            await timeEntries.create({
                task_id: task.id,
                profile_id: profileId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                duration_minutes: durationMinutes,
                status: 'submitted',
                billable: manualFormData.billable,
                description: null
            });

            setManualFormData({
                start_time: '',
                end_time: '',
                duration_minutes: '',
                billable: true,
            });
            setShowManualEntry(false);
            await fetchEntries();
            toast.success('Manuelle Zeit erfolgreich hinzugefügt!');
        } catch (error: any) {
            toast.error(`Fehler beim Speichern der Zeit: ${error.message}`);
        } finally {
            setActionPending(false);
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (confirm('Bist du sicher, dass du diesen Zeiteintrag löschen möchtest?')) {
            setActionPending(true);
            try {
                await timeEntries.delete(id);
                await fetchEntries();
                toast.success('Zeiteintrag gelöscht!');
            } catch(error: any) {
                toast.error(`Fehler beim Löschen: ${error.message}`);
            } finally {
                setActionPending(false);
            }
        }
    };

    // Format time
    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex bg-[#1a1a1a] items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2 text-primary-400">
                        <Clock className="w-5 h-5" />
                        <h2 className="text-xl font-bold text-white tracking-wide">Time Tracking</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto space-y-6 text-sm">
                    {/* Task Title Banner */}
                    <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-gray-300">
                        {task.title}
                    </div>

                    {/* Timer Section */}
                    <div className="bg-gradient-to-r from-primary-900/40 to-black/60 border border-primary-500/30 rounded-lg p-6 flex items-center justify-between">
                        <div>
                            <p className="text-primary-300 font-medium mb-1 tracking-wide">Laufende Zeit</p>
                            <div className="text-4xl font-mono text-white font-bold tracking-wider">
                                {formatTime(elapsedSeconds)}
                            </div>
                        </div>
                        <div className="flex items-center h-full">
                            {!isTimerRunning ? (
                                <button
                                    onClick={handleStartTimer}
                                    className="h-14 px-6 bg-green-500 hover:bg-green-400 text-black font-bold tracking-wide rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all flex items-center gap-2"
                                >
                                    <Play className="w-5 h-5" fill="currentColor" />
                                    START
                                </button>
                            ) : (
                                <button
                                    onClick={handleStopTimer}
                                    className="h-14 px-6 bg-red-500 hover:bg-red-400 text-white font-bold tracking-wide rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all flex items-center gap-2"
                                >
                                    <Square className="w-5 h-5" fill="currentColor" />
                                    STOP
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Manual Entry Form */}
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
                        <button 
                            onClick={() => setShowManualEntry(!showManualEntry)}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <span className="font-semibold text-gray-200">Zeit manuell nachtragen</span>
                            {showManualEntry ? <Minus className="w-4 h-4 text-gray-400" /> : <Plus className="w-4 h-4 text-gray-400" />}
                        </button>
                        
                        {showManualEntry && (
                            <form onSubmit={handleManualSubmit} className="pt-4 mt-4 border-t border-white/5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Start *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={manualFormData.start_time}
                                            onChange={(e) => setManualFormData({ ...manualFormData, start_time: e.target.value })}
                                            className="w-full bg-[#111] border border-white/10 text-white px-3 py-2 rounded-md focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors placeholder-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Ende *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={manualFormData.end_time}
                                            onChange={(e) => setManualFormData({ ...manualFormData, end_time: e.target.value })}
                                            className="w-full bg-[#111] border border-white/10 text-white px-3 py-2 rounded-md focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors placeholder-gray-600"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Dauer (Minuten, optional)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={manualFormData.duration_minutes}
                                            onChange={(e) => setManualFormData({ ...manualFormData, duration_minutes: e.target.value })}
                                            className="w-full bg-[#111] border border-white/10 text-white px-3 py-2 rounded-md focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors placeholder-gray-600"
                                            placeholder="Wird aut. berechnet"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 text-gray-300 pb-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={manualFormData.billable}
                                            onChange={(e) => setManualFormData({ ...manualFormData, billable: e.target.checked })}
                                            className="w-4 h-4 bg-[#111] border-white/20 rounded text-primary-500 focus:ring-primary-500"
                                        />
                                        Billable
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={actionPending}
                                        className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                                    >
                                        Hinzufügen
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Total & List */}
                    <div>
                        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                            <h3 className="font-semibold text-gray-200">Erfasste Zeiten</h3>
                            <span className="bg-primary-500/20 text-primary-300 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-widest">
                                TOTAL: {totalHours}h {remainingMinutes}m
                            </span>
                        </div>
                        
                        {isLoading ? (
                            <div className="text-center py-6 text-gray-500 animate-pulse">Lade Zeiten...</div>
                        ) : entries.length === 0 ? (
                            <div className="text-center py-6 text-gray-600 italic">Noch keine Zeiten erfasst.</div>
                        ) : (
                            <div className="space-y-2">
                                {entries.map((entry) => (
                                    <div key={entry.id} className="bg-[#1a1a1a] border border-white/5 rounded-md p-3 flex items-center justify-between group hover:border-white/10 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-200">{entry.profile?.full_name || 'Unbekannt'}</span>
                                                {entry.billable && (
                                                    <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                                        Billable
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                                                    entry.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                    entry.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                                                    entry.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {entry.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(entry.start_time).toLocaleString('de-DE')}
                                                {entry.end_time && ` - ${new Date(entry.end_time).toLocaleString('de-DE')}`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-white text-base">
                                                {entry.duration_minutes !== null ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m` : 'Laufend...'}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                title="Eintrag löschen"
                                                className="text-gray-600 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
