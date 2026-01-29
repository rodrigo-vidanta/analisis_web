#!/usr/bin/env node
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_ANALYSIS_SUPABASE_URL;
const SERVICE_KEY = process.env.VITE_ANALYSIS_SUPABASE_SERVICE_KEY;

const response = await fetch(`${SUPABASE_URL}/rest/v1/system_config?config_key=eq.app_version`, {
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  }
});

const data = await response.json();
console.log('📊 app_version actual:', JSON.stringify(data, null, 2));
