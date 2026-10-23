import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================

const SUPABASE_URL = "https://rjkvozjbgzbxiefcfmlg.supabase.co";
const SUPABASE_KEY = "sb_publishable_XnbiQBfAk0bGZI2HdlUrrw_6PEsPGI1";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);