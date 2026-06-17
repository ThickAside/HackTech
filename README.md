# HackTech — Setup Guide

> **Stack:** HTML + Vanilla CSS + JavaScript + Supabase (Auth + PostgreSQL)

This application has been successfully migrated from Firebase to **Supabase**. Below are the setup instructions to get your PostgreSQL database, Authentication, and Row Level Security (RLS) policies running.

---

## 🚀 Quick Start

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in or sign up.
2. Click **"New Project"** and select/create an organization.
3. Name your project (e.g., `hacktech`), set a secure database password, choose a region close to you, and click **"Create New Project"**.

### 2. Run the Database Setup SQL Script

To create your database tables and set up security:
1. In your Supabase Dashboard, click on the **"SQL Editor"** icon in the left sidebar.
2. Click **"New Query"** to create a blank editor.
3. Paste the following SQL script into the editor:

```sql
-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create Users Profile Table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null check (role in ('participant', 'admin')),
  "joinedEvents" text[] default '{}',
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Events Table
create table public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  location text not null,
  "maxParticipants" integer not null,
  "maxTeamSize" integer default 4 not null,
  tags text[] default '{}',
  date timestamp with time zone not null,
  "updatedAt" timestamp with time zone default timezone('utc'::text, now()),
  participants text[] default '{}',
  "createdBy" uuid references public.users(id),
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Teams Table
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  "eventId" uuid references public.events(id) on delete cascade,
  description text,
  members text[] default '{}',
  "leaderId" uuid references public.users(id) on delete cascade,
  "inviteCode" text not null unique,
  "maxSize" integer default 4 not null,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create Blog Posts Table
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  "eventId" uuid references public.events(id) on delete set null,
  "eventTitle" text,
  "authorId" uuid references public.users(id) on delete cascade,
  "authorName" text not null,
  likes text[] default '{}',
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.posts enable row level security;

-- Users Table Policies
create policy "Allow read access for authenticated users on users"
  on public.users for select using (auth.role() = 'authenticated');

create policy "Allow insert/update for users on their own profile"
  on public.users for all using (auth.uid() = id);

-- Events Table Policies
create policy "Allow read access for authenticated users on events"
  on public.events for select using (auth.role() = 'authenticated');

create policy "Allow update for authenticated users on events (to join/leave)"
  on public.events for update using (auth.role() = 'authenticated');

create policy "Allow admin write operations on events"
  on public.events for all using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Teams Table Policies
create policy "Allow read/write access for authenticated users on teams"
  on public.teams for select using (auth.role() = 'authenticated');

create policy "Allow insert for authenticated users on teams"
  on public.teams for insert with check (auth.role() = 'authenticated');

-- Allow team update
create policy "Allow update for members on teams"
  on public.teams for update using (auth.role() = 'authenticated');

create policy "Allow delete for team leaders"
  on public.teams for delete using (auth.uid() = "leaderId");

-- Blog Posts Table Policies
create policy "Allow read/write access for authenticated users on posts"
  on public.posts for select using (auth.role() = 'authenticated');

create policy "Allow insert for authenticated users on posts"
  on public.posts for insert with check (auth.role() = 'authenticated');

create policy "Allow update for authenticated users on posts (to like)"
  on public.posts for update using (auth.role() = 'authenticated');

create policy "Allow delete for post authors"
  on public.posts for delete using (auth.uid() = "authorId");
```

4. Click the **"Run"** button in the bottom right. You should see a success message indicating your schema has been successfully compiled.

### 3. Configure `supabase-config.js`

1. Go to **"Project Settings"** (gear icon in the bottom-left sidebar of the Supabase Dashboard) ➔ **"API"**.
2. Copy the **Project URL** and the **`anon` `public` key**.
3. Open `supabase-config.js` in your local project folder and replace the placeholders:

```js
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
```

### 4. Enable Email Sign Up (No Confirmation for Easy Testing)

By default, Supabase requires users to click a link in an email to confirm their account. To disable this for local testing:
1. Go to **Authentication** (sidebar) ➔ **Providers** ➔ **Email**.
2. Turn off **"Confirm email"** and click **Save**.

### 5. Open the App

You can now open the app!
* **Option A:** Use the VS Code extension **"Live Server"** (Right-click `index.html` ➔ *Open with Live Server*). This will run the app at `http://127.0.0.1:5500`.
* **Option B:** Double-click `index.html` in your Windows file browser to open it directly.

---

## 👤 User Roles

| Role | How to register | Capabilities |
|------|----------------|--------------|
| **Participant** | Click "Participant" on login screen | Browse events, join events, create/join teams, share blog experiences |
| **Admin** | Click "Admin" on login screen + enter admin code | All above + create/edit/delete tech events, see participant registry |

**Default Admin Code:** `HACKTECH2026` (change this in `supabase-config.js`)

---

## ✨ Design Customization & Theme

The app now incorporates a premium **Neutral Dark Space Glassmorphism** visual style:
- 🌌 **Space Charcoal Background:** Deep and sophisticated space shades (`#07090e` to `#0d0f17`) with glowing aura radial backgrounds.
- ⚡ **Purple & Cyan Spotlights:** Ambient glow highlights and custom animated buttons.
- 🪟 **Futuristic Glass Panels:** Transparent backdrop filters (`backdrop-filter: blur(12px)`) with thin borders.
- 🎯 **Interactive Cursor Spotlight:** Global mouse movements track a gorgeous spotlight radial gradient that seamlessly follows your cursor!
- 🧬 **Floating Motion:** Premium ease transitions that scale, float, and shift on hover.
