-- Agency Schema for ProjectFlow
-- These tables share the `labs_db` alongside Visionary Studio tables.
-- They use the `agency_` prefix to avoid conflicts.

-- 1. agency_clients
CREATE TABLE IF NOT EXISTS public.agency_clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    address_line1 TEXT,
    zip_code TEXT,
    city TEXT,
    country TEXT,
    vat_id TEXT,
    payment_terms_days INTEGER DEFAULT 30,
    website TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lead')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. agency_client_contacts
CREATE TABLE IF NOT EXISTS public.agency_client_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. agency_projects
CREATE TABLE IF NOT EXISTS public.agency_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    client_id UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    budget NUMERIC(15, 2),
    hourly_rate NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. agency_project_members
-- Note: Links to the existing 'profiles' table (or whatever table stores the user id in labs_db)
CREATE TABLE IF NOT EXISTS public.agency_project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.agency_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'contributor', 'viewer')),
    allocation_percent INTEGER DEFAULT 100 CHECK (allocation_percent >= 0 AND allocation_percent <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);

-- 5. agency_tasks
CREATE TABLE IF NOT EXISTS public.agency_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.agency_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    estimated_hours NUMERIC(10, 2),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. agency_time_entries
CREATE TABLE IF NOT EXISTS public.agency_time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.agency_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours NUMERIC(10, 2) NOT NULL CHECK (hours > 0),
    description TEXT,
    billable BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. agency_assets
CREATE TABLE IF NOT EXISTS public.agency_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.agency_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT,
    feedback_note TEXT,
    storage_path TEXT,
    file_type TEXT,
    file_size BIGINT,
    is_physical BOOLEAN DEFAULT false,
    location TEXT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_visible_to_client BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. agency_costs
CREATE TABLE IF NOT EXISTS public.agency_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.agency_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    category TEXT CHECK (category IN ('software', 'hardware', 'travel', 'external_service', 'other')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. agency_financial_documents
CREATE TABLE IF NOT EXISTS public.agency_financial_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.agency_projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('quote', 'invoice')),
    title TEXT NOT NULL,
    document_url TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. agency_service_modules
CREATE TABLE IF NOT EXISTS public.agency_service_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    estimated_days INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. agency_seniority_levels
CREATE TABLE IF NOT EXISTS public.agency_seniority_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. agency_service_pricing
CREATE TABLE IF NOT EXISTS public.agency_service_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.agency_service_modules(id) ON DELETE CASCADE,
    seniority_id UUID NOT NULL REFERENCES public.agency_seniority_levels(id) ON DELETE CASCADE,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(service_id, seniority_id)
);

-- 13. agency_notifications
CREATE TABLE IF NOT EXISTS public.agency_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    related_entity_id UUID,
    related_entity_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable Row Level Security (RLS) since backend handles authorization
ALTER TABLE public.agency_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_client_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_financial_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_service_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_seniority_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_service_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_notifications DISABLE ROW LEVEL SECURITY;
