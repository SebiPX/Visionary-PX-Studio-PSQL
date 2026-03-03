import { create } from 'zustand';
import { supabase } from '../lib/supabase'; // We'll just use fetch with token

export interface CreativeProject {
  id: string;
  user_id: string;
  title: string;
  current_step: 'briefing' | 'matrix' | 'scamper' | 'finished';
  occasion: string;
  guest_count: number;
  budget?: string;
  season?: string;
  industry?: string;
  emotional_goals?: string;
  target_audience?: string;
  location_preference?: string;
  created_at: string;
  updated_at: string;
  matrices?: CreativeMatrix[];
  concepts?: CreativeConcept[];
}

export interface CreativeMatrix {
  id: string;
  project_id: string;
  matrix_data: {
    categories: Array<{
      name: string;
      options: Array<{ name: string; color: string; reason: string }>;
    }>;
  };
  ai_suggestions?: any;
}

export interface CreativeConcept {
  id: string;
  project_id: string;
  concept_type: 'user' | 'ai';
  selected_parameters: Record<string, string>;
  scamper_refinements?: { 
    idea: string;
    real_world_validation?: {
      location?: { 
        name: string; 
        description: string; 
        address?: string;
        contact?: string;
        website?: string;
      };
      nearby_vendors?: Array<{
        name: string;
        type: string;
        description: string;
        contact: string;
      }>;
    };
  };
  how_now_wow_score?: 'how' | 'now' | 'wow';
  budget_estimation?: string;
  is_final_choice?: boolean;
}

interface CreativeAgentState {
  projects: CreativeProject[];
  currentProject: CreativeProject | null;
  loading: boolean;
  error: string | null;

  fetchProjects: (token: string) => Promise<void>;
  fetchProject: (token: string, id: string) => Promise<void>;
  createProject: (token: string, data: Partial<CreativeProject>) => Promise<CreativeProject>;
  updateProject: (token: string, id: string, data: Partial<CreativeProject>) => Promise<void>;
  deleteProject: (token: string, id: string) => Promise<void>;
  
  generateMatrix: (token: string, id: string) => Promise<void>;
  generateConcepts: (token: string, id: string, userConcepts: any[]) => Promise<void>;
  selectFinalConcept: (token: string, projectId: string, conceptId: string) => Promise<void>;

  setCurrentProject: (project: CreativeProject | null) => void;
  clearError: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const useCreativeAgentStore = create<CreativeAgentState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  setCurrentProject: (project) => set({ currentProject: project }),
  clearError: () => set({ error: null }),

  fetchProjects: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/creative/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      set({ projects: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchProject: async (token, id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/creative/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();
      set({ currentProject: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createProject: async (token, data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/creative/projects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create project');
      const newProject = await res.json();
      set((state) => ({ 
        projects: [newProject, ...state.projects],
        currentProject: newProject,
        loading: false 
      }));
      return newProject;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateProject: async (token, id, data) => {
    try {
      const res = await fetch(`${API_URL}/api/creative/projects/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update project');
      const upData = await res.json();
      
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...upData } : p),
        currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...upData } : state.currentProject
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteProject: async (token, id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/creative/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete project');
      set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  generateMatrix: async (token, id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/creative/projects/${id}/matrix`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate matrix');
      await get().fetchProject(token, id); // Refresh data completely
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  generateConcepts: async (token, id, userConcepts) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/creative/projects/${id}/concepts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ userConcepts })
      });
      if (!res.ok) throw new Error('Failed to generate concepts');
      await get().fetchProject(token, id); // Refresh data completely
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  selectFinalConcept: async (token, projectId, conceptId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/creative/projects/${projectId}/concepts/${conceptId}/select`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to select concept');
      await get().fetchProject(token, projectId); // Refresh data
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }

}));
