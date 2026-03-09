/**
 * apiClient.ts — replaces supabaseClient.ts
 *
 * All calls go to the labs-api Express backend.
 * JWT token is stored in localStorage under 'labs_token'.
 */

const API_URL = import.meta.env.VITE_API_URL as string || 'http://localhost:4000';

/**
 * R2 URLs are already proper HTTPS — no normalization needed.
 * Kept for drop-in compatibility where supabaseClient.normalizeStorageUrl was used.
 */
export const normalizeStorageUrl = (url: string): string => url;

// ── Token helpers ────────────────────────────────────────────────
export const getToken = (): string | null => localStorage.getItem('labs_token');
export const setToken = (token: string) => localStorage.setItem('labs_token', token);
export const clearToken = () => localStorage.removeItem('labs_token');

// ── Base fetch wrapper ───────────────────────────────────────────
async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await res.json() as any;

    if (!res.ok) {
        throw new Error(data?.error || `API error ${res.status}`);
    }
    return data as T;
}

// ── Auth ─────────────────────────────────────────────────────────
export const auth = {
    login: (email: string, password: string) =>
        request<{ token: string; user: ApiUser }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    register: (email: string, password: string, full_name: string) =>
        request<{ token: string; user: ApiUser }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name }),
        }),

    me: () => request<ApiUser>('/auth/me'),

    updateProfile: (data: Partial<Pick<ApiUser, 'full_name' | 'avatar_url'>>) =>
        request<ApiUser>('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    updatePassword: (current_password: string, new_password: string) =>
        request<{ success: boolean }>('/auth/password', {
            method: 'PATCH',
            body: JSON.stringify({ current_password, new_password }),
        }),

    adminResetPassword: (user_id: string, new_password: string) =>
        request<{ success: boolean; user: { id: string; email: string; full_name: string } }>('/auth/admin/reset-password', {
            method: 'PATCH',
            body: JSON.stringify({ user_id, new_password }),
        }),
};

// ── Images ───────────────────────────────────────────────────────
export const images = {
    list: () => request<ApiImage[]>('/api/images'),
    create: (data: Omit<ApiImage, 'id' | 'user_id' | 'created_at'>) =>
        request<ApiImage>('/api/images', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/images/${id}`, { method: 'DELETE' }),
};

// ── Videos ───────────────────────────────────────────────────────
export const videos = {
    list: () => request<ApiVideo[]>('/api/videos'),
    create: (data: Omit<ApiVideo, 'id' | 'user_id' | 'created_at'>) =>
        request<ApiVideo>('/api/videos', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/videos/${id}`, { method: 'DELETE' }),
};

// ── Thumbnails ───────────────────────────────────────────────────
export const thumbnails = {
    list: () => request<ApiThumbnail[]>('/api/thumbnails'),
    create: (data: Omit<ApiThumbnail, 'id' | 'user_id' | 'created_at'>) =>
        request<ApiThumbnail>('/api/thumbnails', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/thumbnails/${id}`, { method: 'DELETE' }),
};

// ── 3D Models ────────────────────────────────────────────────────
export const models3d = {
    list: () => request<any[]>('/api/models3d'),
    create: (data: any) =>
        request<any>('/api/models3d', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/models3d/${id}`, { method: 'DELETE' }),
};

// ── Voices (TTS) ─────────────────────────────────────────────────
export const voices = {
    list: () => request<any[]>('/api/voices'),
    create: (data: any) => request<any>('/api/voices', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/voices/${id}`, { method: 'DELETE' })
};

// ── Music (Fal.ai / Yue) ─────────────────────────────────────────
export const music = {
    list: () => request<any[]>('/api/music'),
    create: (data: any) => request<any>('/api/music', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/music/${id}`, { method: 'DELETE' })
};

// ── I2Audio ──────────────────────────────────────────────────────
export const i2audio = {
    list: () => request<any[]>('/api/i2audio'),
    create: (data: any) => request<any>('/api/i2audio', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/i2audio/${id}`, { method: 'DELETE' })
};

// ── Social Audit ─────────────────────────────────────────────────
export const socialAudit = {
    getAccounts: () => request<any[]>('/api/social-audit/accounts'),
    addAccount: (data: any) => request<any>('/api/social-audit/accounts', { method: 'POST', body: JSON.stringify(data) }),
    syncAccount: (accountId: string) => request<any>(`/api/social-audit/sync/${accountId}`, { method: 'POST' }),
    getPosts: (accountId: string) => request<any[]>(`/api/social-audit/posts/${accountId}`),
    saveAnalysis: (data: any) => request<any>('/api/social-audit/analysis', { method: 'POST', body: JSON.stringify(data) }),
    deleteAccount: (accountId: string) => request<any>(`/api/social-audit/accounts/${accountId}`, { method: 'DELETE' })
};

// ── Texts ────────────────────────────────────────────────────────
export const texts = {
    list: () => request<ApiText[]>('/api/texts'),
    create: (data: Omit<ApiText, 'id' | 'user_id' | 'created_at'>) =>
        request<ApiText>('/api/texts', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/texts/${id}`, { method: 'DELETE' }),
};

// ── Sketches ─────────────────────────────────────────────────────
export const sketches = {
    list: () => request<ApiSketch[]>('/api/sketches'),
    create: (data: Omit<ApiSketch, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
        request<ApiSketch>('/api/sketches', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/sketches/${id}`, { method: 'DELETE' }),
};

// ── Storyboards ──────────────────────────────────────────────────
export const storyboards = {
    list: () => request<ApiStoryboard[]>('/api/storyboards'),
    create: (data: Omit<ApiStoryboard, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
        request<ApiStoryboard>('/api/storyboards', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ApiStoryboard>) =>
        request<ApiStoryboard>(`/api/storyboards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/storyboards/${id}`, { method: 'DELETE' }),
};

// ── File Upload → Cloudflare R2 ───────────────────────────────────
export const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/upload?folder=${folder}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(data?.error || 'Upload failed');
    return data.url as string;
};

// ── Gemini Proxy ──────────────────────────────────────────────────
export const geminiProxy = (body: Record<string, unknown>) =>
    request<unknown>('/api/gemini', {
        method: 'POST',
        body: JSON.stringify(body),
    });

// ── Download helper (unchanged from supabaseClient) ───────────────
export const downloadAsset = async (url: string, filename: string): Promise<void> => {
    try {
        // data: URLs are already local — fetch them directly in the browser (no proxy needed)
        if (url.startsWith('data:')) {
            const response = await fetch(url);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
            return;
        }

        // Remote URLs (R2 etc.) — route through labs-api proxy to avoid CORS
        const proxyUrl = `${API_URL}/api/proxy/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        const response = await fetch(proxyUrl, {
            headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    } catch (err) {
        console.error('[downloadAsset] Failed, opening in new tab instead:', err);
        window.open(url, '_blank');
    }
};

// ── Types ──────────────────────────────────────────────────────────
export interface ApiUser {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    role: 'user' | 'admin';
    created_at: string;
}

export interface ApiImage {
    id: string;
    user_id: string;
    prompt?: string;
    style?: string;
    image_url: string;
    config?: Record<string, unknown>;
    created_at: string;
}

export interface ApiVideo {
    id: string;
    user_id: string;
    prompt?: string;
    model?: string;
    video_url: string;
    thumbnail_url?: string;
    config?: Record<string, unknown>;
    created_at: string;
}

export interface ApiThumbnail {
    id: string;
    user_id: string;
    prompt?: string;
    platform?: string;
    image_url: string;
    config?: Record<string, unknown>;
    created_at: string;
}

export interface ApiText {
    id: string;
    user_id: string;
    prompt?: string;
    content?: string;
    type?: string;
    config?: Record<string, unknown>;
    created_at: string;
}

export interface ApiSketch {
    id: string;
    user_id: string;
    sketch_data: string;
    generated_image_url?: string;
    context: string;
    style: string;
    edit_history?: unknown[];
    created_at: string;
    updated_at: string;
}

export interface ApiStoryboard {
    id: string;
    user_id: string;
    title?: string;
    concept?: string;
    target_duration?: number;
    num_shots?: number;
    config?: Record<string, unknown>;
    assets?: unknown[];
    shots?: unknown[];
    created_at: string;
    updated_at: string;
}

// ── Inventar Types ─────────────────────────────────────────────────
export interface InventarItem {
    id: string; created_at: string; updated_at: string;
    geraet: string; px_nummer?: string; aufkleber?: string;
    modell?: string; seriennummer?: string; ort?: string; os?: string;
    status?: string; ip_office?: string; ip_tiger?: string;
    px_eigentum?: boolean; handy_nr?: string; notes?: string;
    department?: string; is_verleihartikel?: boolean;
    anschaffungsdatum?: string; anschaffungspreis?: number;
    bild_url?: string; assigned_to_name?: string; assigned_to_id?: string;
}
export interface InventarLoan {
    id: string; created_at: string; item_id: string;
    profile_id?: string; mitarbeiter_name?: string; department?: string;
    ausgeliehen_am: string; zurueck_bis?: string; zurueck_am?: string;
    zweck?: string; notes?: string; created_by?: string;
    profile?: { id: string; full_name: string; email: string; avatar_url?: string; role: string } | null;
    item?: { id: string; geraet: string; modell?: string; px_nummer?: string; bild_url?: string } | null;
}
export interface InventarLink {
    id: string; created_at: string; updated_at: string;
    titel: string; url: string; beschreibung?: string;
    kategorie?: string; sort_order: number;
}
export interface Login {
    id: string; created_at: string; updated_at: string;
    name?: string; website?: string; login_name?: string;
    passwort?: string; anmerkung?: string; kategorie?: string; department?: string;
}
export interface Kreditkarte {
    id: string; created_at: string; updated_at: string;
    name?: string; nummer?: string; assignee?: string;
    ablaufdatum?: string; check_code?: string; pin_abheben?: string; secure_code?: string;
}
export interface Handyvertrag {
    id: string; created_at: string; updated_at: string;
    handynummer?: string; kartennummer?: string;
    pin?: string; puk?: string; pin2?: string; puk2?: string;
    anmerkung?: string; it_bestandsliste?: string;
}
export interface Firmendatum {
    id: string; created_at: string; updated_at: string;
    kategorie: string; bezeichner?: string; wert?: string;
    anmerkung?: string; datei_name?: string; sort_order?: number;
}
export interface VerleihscheinItem {
    id: string; verleihschein_id: string; item_id: string;
    anschaffungspreis?: number; tagespreis?: number; gesamtpreis?: number;
    item?: { id: string; geraet: string; modell?: string; px_nummer?: string; status?: string } | null;
}
export interface Verleihschein {
    id: string; created_at: string; borrower_type: 'team' | 'extern';
    profile_id?: string; extern_name?: string; extern_firma?: string;
    extern_email?: string; extern_telefon?: string;
    abholzeit: string; rueckgabezeit: string;
    prozentsatz?: number; gesamtkosten?: number;
    zweck?: string; notizen?: string; status?: string; erledigt_am?: string;
    created_by?: string;
    profile?: { id: string; full_name: string; email: string } | null;
    items?: VerleihscheinItem[];
}
export interface InventarProfile {
    id: string; email: string; full_name: string; avatar_url?: string; role: string;
}

// ── Inventar API ───────────────────────────────────────────────────
export const inventar = {
    items: {
        list: () => request<InventarItem[]>('/api/inventar/items'),
        create: (data: Omit<InventarItem, 'id' | 'created_at' | 'updated_at'>) =>
            request<InventarItem>('/api/inventar/items', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<InventarItem>) =>
            request<InventarItem>(`/api/inventar/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => request<void>(`/api/inventar/items/${id}`, { method: 'DELETE' }),
    },
    loans: {
        list: (itemId?: string) =>
            request<InventarLoan[]>(`/api/inventar/loans${itemId ? `?item_id=${itemId}` : ''}`),
        create: (data: Omit<InventarLoan, 'id' | 'created_at' | 'profile' | 'item'>) =>
            request<InventarLoan>('/api/inventar/loans', { method: 'POST', body: JSON.stringify(data) }),
        return_: (id: string) =>
            request<InventarLoan>(`/api/inventar/loans/${id}/return`, { method: 'PATCH', body: '{}' }),
        delete: (id: string) => request<void>(`/api/inventar/loans/${id}`, { method: 'DELETE' }),
    },
    verleihscheine: {
        list: (status: 'aktiv' | 'erledigt' = 'aktiv') =>
            request<Verleihschein[]>(`/api/inventar/verleihscheine?status=${status}`),
        create: (header: any, items: any[]) =>
            request<Verleihschein>('/api/inventar/verleihscheine', {
                method: 'POST', body: JSON.stringify({ header, items }),
            }),
        markErledigt: (id: string, itemIds: string[]) =>
            request<void>(`/api/inventar/verleihscheine/${id}/erledigt`, {
                method: 'PATCH', body: JSON.stringify({ itemIds }),
            }),
    },
    links: {
        list: () => request<InventarLink[]>('/api/inventar/links'),
        create: (data: Omit<InventarLink, 'id' | 'created_at' | 'updated_at'>) =>
            request<InventarLink>('/api/inventar/links', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<InventarLink>) =>
            request<InventarLink>(`/api/inventar/links/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => request<void>(`/api/inventar/links/${id}`, { method: 'DELETE' }),
    },
    logins: {
        list: () => request<Login[]>('/api/inventar/logins'),
        create: (data: Omit<Login, 'id' | 'created_at' | 'updated_at'>) =>
            request<Login>('/api/inventar/logins', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Login>) =>
            request<Login>(`/api/inventar/logins/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => request<void>(`/api/inventar/logins/${id}`, { method: 'DELETE' }),
    },
    kreditkarten: {
        list: () => request<Kreditkarte[]>('/api/inventar/kreditkarten'),
        create: (data: Omit<Kreditkarte, 'id' | 'created_at' | 'updated_at'>) =>
            request<Kreditkarte>('/api/inventar/kreditkarten', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Kreditkarte>) =>
            request<Kreditkarte>(`/api/inventar/kreditkarten/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => request<void>(`/api/inventar/kreditkarten/${id}`, { method: 'DELETE' }),
    },
    handyvertraege: {
        list: () => request<Handyvertrag[]>('/api/inventar/handyvertraege'),
        create: (data: Omit<Handyvertrag, 'id' | 'created_at' | 'updated_at'>) =>
            request<Handyvertrag>('/api/inventar/handyvertraege', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Handyvertrag>) =>
            request<Handyvertrag>(`/api/inventar/handyvertraege/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => request<void>(`/api/inventar/handyvertraege/${id}`, { method: 'DELETE' }),
    },
    firmendaten: {
        list: () => request<Firmendatum[]>('/api/inventar/firmendaten'),
        create: (data: Omit<Firmendatum, 'id' | 'created_at' | 'updated_at'>) =>
            request<Firmendatum>('/api/inventar/firmendaten', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: Partial<Firmendatum>) =>
            request<Firmendatum>(`/api/inventar/firmendaten/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => request<void>(`/api/inventar/firmendaten/${id}`, { method: 'DELETE' }),
    },
    dashboardConfig: {
        get: () => request<Record<string, unknown> | null>('/api/inventar/dashboard-config'),
        save: (config: Record<string, unknown>) =>
            request<void>('/api/inventar/dashboard-config', { method: 'PUT', body: JSON.stringify(config) }),
    },
    profiles: {
        list: () => request<InventarProfile[]>('/api/inventar/profiles'),
    },
};

// ── Chat Sessions ──────────────────────────────────────────────────
export interface ApiChatSession {
    id: string;
    title: string;
    bot_id: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    created_at: string;
    updated_at: string;
}

export const chats = {
    list: () => request<ApiChatSession[]>('/api/chats'),
    save: (data: { id?: string; title: string; bot_id: string; messages: ApiChatSession['messages'] }) =>
        request<ApiChatSession>('/api/chats', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/chats/${id}`, { method: 'DELETE' }),
};
