-- ==========================================================
-- 1. Profiles Table (Tracks user profile data)
-- ==========================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT DEFAULT 'character_profile.jpg',
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================================
-- 2. Workouts Table (Tracks exercises for body parts)
-- ==========================================================
CREATE TABLE public.workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  body_part TEXT NOT NULL CHECK (body_part IN ('face', 'neck', 'chest', 'arms', 'abs', 'back', 'lat', 'leg', 'glutes')),
  name TEXT NOT NULL,
  counter_type TEXT NOT NULL CHECK (counter_type IN ('tally', 'stopwatch', 'timer')),
  count INTEGER DEFAULT 0,
  status BOOLEAN DEFAULT false, -- false: pending (red), true: completed (green)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for workouts
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workouts" 
  ON public.workouts FOR ALL USING (auth.uid() = user_id);

-- ==========================================================
-- 3. Worship Alarms Table (Tracks alarms and prayer tallies)
-- ==========================================================
CREATE TABLE public.worship_alarms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  time TEXT NOT NULL, -- e.g. "05:30" (24h format) or "18:45"
  completed BOOLEAN DEFAULT false, -- false: white, true: green (double tap completed)
  count INTEGER DEFAULT 0, -- tally counter
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for worship_alarms
ALTER TABLE public.worship_alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own worship entries" 
  ON public.worship_alarms FOR ALL USING (auth.uid() = user_id);

-- ==========================================================
-- 4. Discipline Todos Table (Tracks to-do list items)
-- ==========================================================
CREATE TABLE public.discipline_todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  time TEXT, -- e.g. "09:00"
  completed BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0, -- Used for drag-and-drop reordering
  checkboxes JSONB DEFAULT '[]'::jsonb, -- e.g., [{"text": "Subtask 1", "checked": false}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for discipline_todos
ALTER TABLE public.discipline_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own todos" 
  ON public.discipline_todos FOR ALL USING (auth.uid() = user_id);

-- ==========================================================
-- 5. Focus Notes Table (Tracks finance transactions)
-- ==========================================================
CREATE TABLE public.focus_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for focus_notes
ALTER TABLE public.focus_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own finance notes" 
  ON public.focus_notes FOR ALL USING (auth.uid() = user_id);

-- ==========================================================
-- 6. Trigger to Create Profile automatically on Sign Up
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, last_login)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'character_profile.jpg'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
