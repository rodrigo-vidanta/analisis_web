#!/usr/bin/env node
/**
 * Script completo para limpiar cache de Live Chat
 * Ejecutar: node scripts/clear-live-chat-complete.js
 */

console.log('🧹 LIMPIEZA COMPLETA DE LIVE CHAT');
console.log('================================\n');

console.log('📋 PASOS PARA LIMPIAR CACHE:\n');

console.log('1️⃣ LIMPIAR LOCALSTORAGE EN EL NAVEGADOR:');
console.log('   Abre DevTools (F12) > Application > Local Storage');
console.log('   Elimina estas keys:');
const keys = [
  'livechat-column-widths',
  'livechat-prospect-id',
  'bot-pause-status',
  'live-chat-conversations',
  'live-chat-messages',
  'live-chat-selected-conversation',
  'uchat-conversations-cache',
  'livechat-cached-conversations'
];
keys.forEach(key => console.log(`   - ${key}`));

console.log('\n2️⃣ O EJECUTA EN LA CONSOLA DEL NAVEGADOR:');
console.log('   [' + keys.map(k => `'${k}'`).join(', ') + '].forEach(key => localStorage.removeItem(key));');

console.log('\n3️⃣ LIMPIAR SESSION STORAGE:');
console.log('   Application > Session Storage > Clear All');

console.log('\n4️⃣ LIMPIAR CACHE DEL NAVEGADOR:');
console.log('   Application > Clear storage > Marcar todo > Clear site data');

console.log('\n5️⃣ CERRAR TODAS LAS PESTAÑAS DEL PROYECTO Y REABRIR');

console.log('\n6️⃣ VERIFICAR QUE LA FUNCIÓN RPC ESTÉ CORREGIDA:');
console.log('   Ejecuta en Supabase SQL Editor:');
console.log('   SELECT * FROM get_conversations_ordered();');
console.log('   Debe devolver solo conversaciones con mensajes reales');

console.log('\n✅ DESPUÉS DE LIMPIAR, RECARGA LA PÁGINA CON Ctrl+Shift+R (hard refresh)');

