-- ============================================================
-- Planning Bloc - Schéma Supabase
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- 1. Table des profils (liée aux utilisateurs Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  profession TEXT NOT NULL CHECK (profession IN ('medecin', 'infirmier')),
  grade TEXT NOT NULL CHECK (grade IN ('cadre', 'chef_clinique', 'interne', 'iade')),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des affectations quotidiennes
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL CHECK (room_id BETWEEN 1 AND 73),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id, date)
);

-- 3. Table des fermetures de salles
CREATE TABLE IF NOT EXISTS room_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id INTEGER NOT NULL CHECK (room_id BETWEEN 1 AND 73),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, date)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_closures ENABLE ROW LEVEL SECURITY;

-- Profils : tout le monde peut lire, chacun peut modifier le sien
CREATE POLICY "Lecture profils" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Insertion profil propre" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Modification profil propre" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Affectations : lecture pour tous, écriture pour soi ou admin
CREATE POLICY "Lecture affectations" ON assignments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Insertion affectation" ON assignments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Suppression affectation" ON assignments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Fermetures : lecture pour tous, écriture pour admins uniquement
CREATE POLICY "Lecture fermetures" ON room_closures
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Gestion fermetures admin" ON room_closures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================
-- Realtime (pour mises à jour instantanées entre téléphones)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE room_closures;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ============================================================
-- Exemples d'insertion de personnel (à adapter)
-- Note : les utilisateurs doivent d'abord être créés dans
-- Authentication > Users dans le dashboard Supabase,
-- puis leurs profils insérés ici avec leur UUID exact.
-- ============================================================

-- Exemple (remplacer 'uuid-ici' par l'UUID réel de l'utilisateur) :
-- INSERT INTO profiles (id, full_name, profession, grade, is_admin) VALUES
--   ('uuid-ici', 'Dr. Martin Sophie', 'medecin', 'cadre', true),
--   ('uuid-ici', 'Dr. Dupont Pierre', 'medecin', 'chef_clinique', false),
--   ('uuid-ici', 'Dr. Bernard Lucas', 'medecin', 'interne', false),
--   ('uuid-ici', 'Leroy Marie', 'infirmier', 'iade', false);
