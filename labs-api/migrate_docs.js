const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Unsere-Schickeria-2026@api.labs-schickeria.com:5433/labs_db',
  ssl: false
});

const sql = `
CREATE TABLE IF NOT EXISTS agency_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES agency_projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'shotlist' Or 'call_sheet'
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_shotlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES agency_documents(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  scene_name VARCHAR(255),
  scene_number VARCHAR(50),
  take VARCHAR(50),
  duration VARCHAR(50),
  framing VARCHAR(255),
  cast_list TEXT,
  props TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_call_sheet_data (
  document_id UUID PRIMARY KEY REFERENCES agency_documents(id) ON DELETE CASCADE,
  location_name VARCHAR(255),
  location_address TEXT,
  weather_info TEXT,
  hospital_info TEXT,
  general_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_call_sheet_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES agency_documents(id) ON DELETE CASCADE,
  time_start VARCHAR(50),
  time_end VARCHAR(50),
  description TEXT,
  persons TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_call_sheet_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES agency_documents(id) ON DELETE CASCADE,
  name VARCHAR(255),
  role VARCHAR(255),
  phone VARCHAR(100),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

pool.query(sql)
  .then(() => {
    console.log('Migration successful');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
