/*
  Paste your own Supabase project's values below.
  Get these from: Supabase Dashboard → your project → Project Settings → API.
  - Project URL        → SUPABASE_URL
  - anon / public key  → SUPABASE_ANON_KEY
  These are safe to be public — actual protection comes from Row Level
  Security policies on your database and storage bucket, not from hiding this file.
*/

const SUPABASE_URL = "https://eztspowxxwxhavhpkthm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dHNwb3d4eHd4aGF2aHBrdGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzI2MTYsImV4cCI6MjEwMzAwODYxNn0.fVnX45GDjT8HMVXSAm5Xucr8J6PCJ9AQ4vkjmJLNeRE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Name of the private Storage bucket holding your PDFs */
const NOTES_BUCKET = "notes";

/* Fixed fake domain used to turn "usernames" into emails Supabase Auth can use internally.
   Users never see or type this — they only ever enter a username. */
const USERNAME_DOMAIN = "bednotes.local";

function usernameToEmail(username) {
    return username.trim().toLowerCase() + "@" + USERNAME_DOMAIN;
}
