-- Schema for Study With Me SaaS
-- Run this in your Supabase SQL Editor

-- 1. Create Profiles table (Linked to auth.users automatically)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  friend_code text unique default substr(md5(random()::text), 1, 8),
  level integer default 1,
  xp integer default 0,
  study_minutes integer default 0,
  current_streak integer default 0,
  last_study_date date,
  settings jsonb default '{
    "timer": {
      "focusDuration": 25,
      "shortBreakDuration": 5,
      "longBreakDuration": 15,
      "cyclesBeforeLongBreak": 4,
      "autoStartBreaks": false,
      "autoStartFocus": false
    },
    "theme": "dark",
    "audio": {
      "volume": 0.5,
      "activeAmbience": null
    }
  }'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Handle Policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Create Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null default '',
  content text not null default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes." ON public.notes;
CREATE POLICY "Users can manage their own notes." 
ON public.notes FOR ALL USING (auth.uid() = user_id);

-- 3. Create Friends Table
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their friendships." ON public.friendships;
CREATE POLICY "Users can manage their friendships." 
ON public.friendships FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  completed boolean default false,
  pomodoros_completed integer default 0,
  pomodoros_estimated integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tasks." ON public.tasks;
CREATE POLICY "Users can manage their own tasks." 
ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- 5. Study Sessions (History)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_type text not null, -- 'focus', 'shortBreak', 'longBreak'
  duration_minutes integer not null,
  xp_earned integer default 0,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own study history." ON public.study_sessions;
CREATE POLICY "Users can view their own study history." 
ON public.study_sessions FOR ALL USING (auth.uid() = user_id);

-- 6. Study Rooms
DROP TABLE IF EXISTS public.room_messages;
DROP TABLE IF EXISTS public.rooms;

CREATE TABLE public.rooms (
  id text primary key, -- Text to support slugs like 'global-random-1'
  name text not null,
  code text unique,
  room_type text default 'random' check (room_type in ('random', 'private')),
  timer_sync boolean default false,
  leader_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rooms are viewable by everyone." ON public.rooms;
CREATE POLICY "Rooms are viewable by everyone." 
ON public.rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own rooms." ON public.rooms;
CREATE POLICY "Users can manage their own rooms." 
ON public.rooms FOR ALL USING (auth.uid() = leader_id);

-- 7. Room Messages (Chat)
CREATE TABLE public.room_messages (
  id uuid default gen_random_uuid() primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages are viewable by room participants." ON public.room_messages;
CREATE POLICY "Messages are viewable by room participants." 
ON public.room_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can post to rooms." ON public.room_messages;
CREATE POLICY "Users can post to rooms." 
ON public.room_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Default global room
INSERT INTO public.rooms (id, name, room_type)
VALUES ('global-random-1', 'Global Lobby', 'random')
ON CONFLICT (id) DO NOTHING;
-- Enable Realtime for room messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
