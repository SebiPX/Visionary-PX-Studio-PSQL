-- ==========================================
-- PX Creative AI Event Agent Database Schema
-- ==========================================

-- 1. Projekte / Briefings
CREATE TABLE IF NOT EXISTS public.px_creative_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    current_step VARCHAR(50) DEFAULT 'briefing', 
    occasion VARCHAR(255) NOT NULL,
    guest_count INT NOT NULL,
    budget DECIMAL(12,2),
    season VARCHAR(50),
    industry VARCHAR(100),
    emotional_goals TEXT,
    target_audience VARCHAR(255),
    location_preference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_px_creative_projects_user ON px_creative_projects(user_id);

-- 2. Der Morphologische Kasten (Matrix-Daten)
CREATE TABLE IF NOT EXISTS public.px_creative_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES px_creative_projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
    matrix_data JSONB NOT NULL,
    ai_suggestions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Die generierten Konzepte (2 User, 2 KI)
CREATE TABLE IF NOT EXISTS public.px_creative_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES px_creative_projects(id) ON DELETE CASCADE NOT NULL,
    concept_type VARCHAR(50),
    selected_parameters JSONB NOT NULL,
    scamper_refinements JSONB,
    how_now_wow_score VARCHAR(50),
    budget_estimation VARCHAR(255),
    is_final_choice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_px_creative_concepts_project ON px_creative_concepts(project_id);
