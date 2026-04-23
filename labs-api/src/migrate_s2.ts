import pool from './db';

async function migrate() {
    try {
        console.log("Starting Sprint 2 DB Migration...");
        
        // 1. Add status column
        console.log("Adding status column to px_creative_projects...");
        await pool.query(`ALTER TABLE px_creative_projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'briefing';`);
        
        // 2. Map old current_step values to new status values
        console.log("Migrating current_step to status...");
        await pool.query(`
            UPDATE px_creative_projects 
            SET status = 
                CASE 
                    WHEN current_step = 'briefing' THEN 'briefing'
                    WHEN current_step = 'matrix' THEN 'drafting'
                    WHEN current_step = 'scamper' THEN 'review'
                    WHEN current_step = 'finished' THEN 'approved'
                    ELSE 'briefing'
                END
            WHERE status = 'briefing' OR status IS NULL;
        `);

        // 3. Add owner_id and reviewer_id
        console.log("Adding owner_id and reviewer_id...");
        await pool.query(`ALTER TABLE px_creative_projects ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255);`);
        await pool.query(`ALTER TABLE px_creative_projects ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(255);`);
        
        // 4. Create px_creative_comments table
        console.log("Creating px_creative_comments table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS px_creative_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID REFERENCES px_creative_projects(id) ON DELETE CASCADE,
                user_id VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // 5. Add client_name and tags (Tag 10)
        console.log("Adding client_name and tags...");
        await pool.query(`ALTER TABLE px_creative_projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);`);
        await pool.query(`ALTER TABLE px_creative_projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';`);
        
        console.log("Migration completed successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}

migrate();
