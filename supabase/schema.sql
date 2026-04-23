-- Morriello Math: multi-student classroom math app
-- Tables are prefixed `classroom_` to keep them isolated from other apps
-- in the shared Supabase project (dhwllgdxpeucldtmzhme).

-- =============================================================
-- 1. Teachers (one row per authenticated teacher)
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 2. Classes (one per teacher for MVP; schema supports many)
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES classroom_teachers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. Students (roster)
-- pin_hash NULL means PIN not yet created (first login)
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classroom_classes(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_classroom_students_class_id ON classroom_students(class_id) WHERE archived_at IS NULL;

-- =============================================================
-- 4. Student session tokens
-- localStorage holds `token` only; server verifies on every request.
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES classroom_students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '12 hours')
);

CREATE INDEX IF NOT EXISTS idx_classroom_sessions_token ON classroom_sessions(token);
CREATE INDEX IF NOT EXISTS idx_classroom_sessions_student_id ON classroom_sessions(student_id);

-- =============================================================
-- 5. Practice sessions (one row per "sitting")
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES classroom_students(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  problems_count INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  is_diagnostic BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_classroom_practice_sessions_student_id ON classroom_practice_sessions(student_id, started_at DESC);

-- =============================================================
-- 6. Problem results (for session replay in teacher dashboard)
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_problem_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_session_id UUID NOT NULL REFERENCES classroom_practice_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES classroom_students(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty INT NOT NULL DEFAULT 1,
  problem_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  given_answer TEXT,
  correct BOOLEAN NOT NULL,
  first_try BOOLEAN NOT NULL DEFAULT true,
  time_spent_ms INT,
  xp_awarded INT NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_problem_results_student ON classroom_problem_results(student_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_classroom_problem_results_session ON classroom_problem_results(practice_session_id, answered_at);

-- =============================================================
-- 7. Per-topic progress (aggregated from problem_results)
-- Sliding window of last 8 attempts determines mastery.
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES classroom_students(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  correct_attempts INT NOT NULL DEFAULT 0,
  last_8_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  mastery TEXT NOT NULL DEFAULT 'untested' CHECK (mastery IN ('untested', 'needs-work', 'learning', 'mastered')),
  total_xp INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, topic)
);

-- =============================================================
-- 8. Overall per-student stats (XP, level, streak, Space Invaders)
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_student_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES classroom_students(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  space_invader_unlocks INT NOT NULL DEFAULT 0,
  next_space_invader_threshold INT NOT NULL DEFAULT 5,
  diagnostic_completed BOOLEAN NOT NULL DEFAULT false,
  diagnostic_completed_at TIMESTAMPTZ,
  last_active TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 9. Join requests (kid whose name isn't on the roster)
-- =============================================================
CREATE TABLE IF NOT EXISTS classroom_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classroom_classes(id) ON DELETE CASCADE,
  requested_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_classroom_join_requests_class_id ON classroom_join_requests(class_id) WHERE resolved_at IS NULL;

-- =============================================================
-- Row Level Security
-- Teachers use Supabase Auth; students bypass RLS via API routes
-- that use the service_role key. RLS only restricts authenticated
-- teachers to their own class's data.
-- =============================================================

ALTER TABLE classroom_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_problem_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_student_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_join_requests ENABLE ROW LEVEL SECURITY;

-- Teacher sees own profile
DROP POLICY IF EXISTS "teacher_self" ON classroom_teachers;
CREATE POLICY "teacher_self" ON classroom_teachers FOR ALL TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Teacher sees own classes
DROP POLICY IF EXISTS "teacher_own_classes" ON classroom_classes;
CREATE POLICY "teacher_own_classes" ON classroom_classes FOR ALL TO authenticated
  USING (teacher_id IN (SELECT id FROM classroom_teachers WHERE auth_user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM classroom_teachers WHERE auth_user_id = auth.uid()));

-- Teacher manages students in own classes
DROP POLICY IF EXISTS "teacher_own_students" ON classroom_students;
CREATE POLICY "teacher_own_students" ON classroom_students FOR ALL TO authenticated
  USING (class_id IN (
    SELECT c.id FROM classroom_classes c
    JOIN classroom_teachers t ON t.id = c.teacher_id
    WHERE t.auth_user_id = auth.uid()
  ))
  WITH CHECK (class_id IN (
    SELECT c.id FROM classroom_classes c
    JOIN classroom_teachers t ON t.id = c.teacher_id
    WHERE t.auth_user_id = auth.uid()
  ));

-- Teacher reads practice data for own students
DROP POLICY IF EXISTS "teacher_read_practice_sessions" ON classroom_practice_sessions;
CREATE POLICY "teacher_read_practice_sessions" ON classroom_practice_sessions FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT s.id FROM classroom_students s
    JOIN classroom_classes c ON c.id = s.class_id
    JOIN classroom_teachers t ON t.id = c.teacher_id
    WHERE t.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "teacher_read_problem_results" ON classroom_problem_results;
CREATE POLICY "teacher_read_problem_results" ON classroom_problem_results FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT s.id FROM classroom_students s
    JOIN classroom_classes c ON c.id = s.class_id
    JOIN classroom_teachers t ON t.id = c.teacher_id
    WHERE t.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "teacher_read_progress" ON classroom_student_progress;
CREATE POLICY "teacher_read_progress" ON classroom_student_progress FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT s.id FROM classroom_students s
    JOIN classroom_classes c ON c.id = s.class_id
    JOIN classroom_teachers t ON t.id = c.teacher_id
    WHERE t.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "teacher_read_stats" ON classroom_student_stats;
CREATE POLICY "teacher_read_stats" ON classroom_student_stats FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT s.id FROM classroom_students s
    JOIN classroom_classes c ON c.id = s.class_id
    JOIN classroom_teachers t ON t.id = c.teacher_id
    WHERE t.auth_user_id = auth.uid()
  ));

-- Teacher manages join requests for own class
DROP POLICY IF EXISTS "teacher_join_requests" ON classroom_join_requests;
CREATE POLICY "teacher_join_requests" ON classroom_join_requests FOR ALL TO authenticated
  USING (class_id IN (
    SELECT c.id FROM classroom_classes c
    JOIN classroom_teachers t ON t.id = c.teacher_id
    WHERE t.auth_user_id = auth.uid()
  ))
  WITH CHECK (class_id IN (
    SELECT c.id FROM classroom_classes c
    JOIN classroom_teachers t ON t.id = c.teacher_id
    WHERE t.auth_user_id = auth.uid()
  ));

-- Sessions table: no authenticated access (service role only).
-- Explicit deny to catch any future mistakes.
DROP POLICY IF EXISTS "sessions_deny_all" ON classroom_sessions;
CREATE POLICY "sessions_deny_all" ON classroom_sessions FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
