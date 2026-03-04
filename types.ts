
// ── Domain types (formerly database.types.ts) ─────────────────────────

export interface Profile {
  id: string;
  created_at: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  billable_hourly_rate: number | null;
  internal_cost_per_hour: number | null;
  weekly_hours: number | null;
  client_id: string | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  bot_id: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface StoryAsset {
  id: string;
  type: 'actor' | 'environment' | 'product';
  name: string;
  description: string;
  image_url: string;           // Generated / final result image
  ref_image_url?: string;      // User-uploaded reference photo (i2i source)
  is_character_sheet?: boolean; // If true: ref is already a sheet → wardrobe-change mode
  source: 'upload' | 'ai-generated';
  created_at: string;
}

export interface StoryShot {
  id: string;
  order: number;
  scene_number: string;
  title: string;
  description: string;
  location: string;
  framing: string;
  camera_angle: string;
  camera_movement: string;
  focal_length: string;
  lighting: string;
  equipment: string;
  audio_notes: string;
  estimated_duration: number;
  movement_notes: string;
  vfx_notes: string;
  actors: string[];
  environment: string;
  products: string[];
  dialog: string;
  notes: string;
  image_url?: string;
  video_url?: string;
  ai_model?: 'GEMINI' | 'FAL_QWEN';
  duration: number;
  created_at: string;
}

export interface StoryboardSession {
  id: string;
  user_id: string;
  title: string | null;
  concept: string | null;
  target_duration: number | null;
  num_shots: number | null;
  config: {
    story_text?: string;
    genre?: string;
    mood?: string;
    target_audience?: string;
    [key: string]: any;
  };
  assets: StoryAsset[];
  shots: StoryShot[];
  created_at: string;
  updated_at: string;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  prompt: string | null;
  style: string | null;
  image_url: string;
  config: {
    aspectRatio?: string;
    mode?: string;
    referenceImage?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface GeneratedVideo {
  id: string;
  user_id: string;
  prompt: string | null;
  model: string | null;
  video_url: string;
  thumbnail_url: string | null;
  config: {
    duration?: number;
    aspectRatio?: string;
    cameraMovement?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface GeneratedThumbnail {
  id: string;
  user_id: string;
  prompt: string | null;
  platform: string | null;
  image_url: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GeneratedText {
  id: string;
  user_id: string;
  content: string;
  topic: string | null;
  platform: string | null;
  audience: string | null;
  tone: string | null;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GeneratedSketch {
  id: string;
  user_id: string;
  sketch_data: string;
  generated_image_url: string | null;
  context: string;
  style: string;
  edit_history: any[];
  created_at: string;
  updated_at: string;
}

// ── App enums & view types ─────────────────────────────────────────────

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  IMAGE_GEN = 'IMAGE_GEN',
  VIDEO_STUDIO = 'VIDEO_STUDIO',
  TEXT_ENGINE = 'TEXT_ENGINE',
  THUMBNAIL_ENGINE = 'THUMBNAIL_ENGINE',
  STORY_STUDIO = 'STORY_STUDIO',
  SKETCH_STUDIO = 'SKETCH_STUDIO',
  PX_CREATIVE = 'PX_CREATIVE',
  CHAT_BOT = 'CHAT_BOT',
  SETTINGS = 'SETTINGS',
  INVENTAR = 'INVENTAR',
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
}

export interface GenerationItem {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'TEXT' | 'THUMBNAIL';
  url: string; // Image URL
  title?: string;
  timestamp: string;
  meta?: string; // e.g., duration, style name
}

export const MOCK_GENERATIONS: GenerationItem[] = [
  {
    id: '1',
    type: 'IMAGE',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMUVC9qSZqXGV3lrEORIY3geWU55ShO38gKE0UDjNem4H3u5iZ9ks-xgtvZLUt2bj5Kn0x2s0QSCGqWFSYCM6YjVoQIIT19bEjibwy4qBTChbmJDHoxFR1P1F-nXbENWyEljEbtFlsZu-4oHlU4s5D-YoKvyVqhUUPUFG9W38g0mSIAxETGfYiaTTLPGyVBnYAfshoX6A22JS9l0U_GpiqAbObMRNHIutGqI6QW7YwT8ghMnGwPYV_2eru_6hH6VZXpLosP1I76_Oa',
    timestamp: '2m ago'
  },
  {
    id: '2',
    type: 'VIDEO',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxYL_1wgzB4A7CUKOM5uYCe6RtQRu752oiJd9BuSornr-1GgoIy7OfrcjSDVYHPX5LBdEZvr27YCd01krovy6dp343tlR8ffJnU-NpR8XQb9YO1X4cqCMwr3Uj0_AvoE0xWNJm39IZATT97wv8qsZmzgXY5RDbtzvBykeGSBiwCDG4jVV0w55eNBBL7BDVHbmtrs4HWx5MOuNO-A3PHXX4m9lckt_njSrZEUOFYnvY3hTUJhPSXpM2KQWaHjgQTNV9A1PxCaqs5lDk',
    title: 'Cyberpunk Streetscape',
    timestamp: '0:15s',
    meta: '15s'
  },
  {
    id: '3',
    type: 'THUMBNAIL',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEpHeiSrrPHbvB2-uuBcgp-foKKgcTrOYuVNZWOXTYk6N3Zd2GPPgMwAnM3h36g3iQ6_ZEVI6vzCY_DXhWQsUns2Tdoj0Y90c6VW7K6j6TY2bs9AaDC7ZPZwMaUectRIiSwothZyI7AAr0qSflM1C4wuko6THJvSvC6unydYDuHCz3YqFPD0QHgtjZnXpCL-yT8BmMYM-s3Pypd-EsvqgmmltjKG-3Si8_LwEFFGBd-tH-1ExCMTNDHMFNQDTHtoAoWXTEA_Cat37B',
    timestamp: '30m ago'
  },
  {
    id: '4',
    type: 'TEXT',
    url: '', // Text items might not have a main image, but we render a card
    title: 'The intersection of human creativity...',
    timestamp: '1h ago',
    meta: 'Text Gen'
  },
  {
    id: '5',
    type: 'IMAGE',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPO75E8QltwiWCU_9zBhNbyytpq30S7dj_ncD889hvbJWpKEw9PmwPfArDc7UWDSy6T6_-n6i5XBy4gJzcHUSy55wZ_68ZY-Wf41MF1vlxZZLH6Bli2HNR7FNEI9JcmF5HQLcr8jaCBtvMmb4KawGXNUu8C2dXt973TKeACv9jY3Lcf1SLN6X0oWD-0fnley5G7MwAeAbsH2x2MeQ0XgMIa2msUcy8PNu3myxH1qVx9Lf04DZPkEBohe9sR_jj_HgaHmG0iRANaxVv',
    timestamp: '2h ago'
  },
  {
    id: '6',
    type: 'VIDEO',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnZ2XAj7F7L6r95sxqCYV64WIdofvv1YjiKKKUBGOhUlJaVXMix4l24TKjK9CxhQynwGFyMHJPIJYoh6Y7d-nnLuFg915We6hRpy7yeDYivVbc1tdMJhTo0JfYWpDJIqign0WKCFo0H6mkHj1k94JcMR8RwfuAGjdv1Bn3839sZfeASz2jivDsuLSUghxaF-5NBvhRpM0F7Z0uZv9363906RQg4iTVQk0vq8R9T55Ceb3TgU3TSAekvvyd6K1zJnwoSj-rncgFbnNB',
    title: 'Orbital Render',
    timestamp: '3h ago',
    meta: 'Orbital Render'
  },
];