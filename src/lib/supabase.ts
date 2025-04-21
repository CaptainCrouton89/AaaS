import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Database } from "../types/database.types";

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials are not set in environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
