#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlPath = join(__dirname, 'sql/UPDATE_LABEL_PERMISSIONS.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('📝 SQL Corregido (ejecuta en SQL Editor):\n');
console.log(sql);
console.log('\n✅ Esto eliminará la ambigüedad en los nombres de columnas');

process.exit(0);

