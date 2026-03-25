ALTER TABLE syntheses ADD COLUMN IF NOT EXISTS titre text;
ALTER TABLE syntheses ADD COLUMN IF NOT EXISTS envoye boolean DEFAULT false;