#!/usr/bin/env node
/**
 * Script para limpiar cache de Live Chat
 * Ejecutar: node scripts/clear-live-chat-cache.js
 */

console.log('🧹 Limpiando cache de Live Chat...');

// Lista de keys de localStorage a limpiar
const keysToRemove = [
  'livechat-column-widths',
  'livechat-prospect-id',
  'bot-pause-status',
  'live-chat-conversations',
  'live-chat-messages',
  'live-chat-selected-conversation'
];

console.log('📋 Keys a limpiar:', keysToRemove.join(', '));
console.log('\n⚠️  Para limpiar el cache en el navegador:');
console.log('1. Abre las DevTools (F12)');
console.log('2. Ve a Application > Storage > Local Storage');
console.log('3. Elimina manualmente las siguientes keys:');
keysToRemove.forEach(key => {
  console.log(`   - ${key}`);
});

console.log('\n✅ O ejecuta en la consola del navegador:');
console.log('keysToRemove.forEach(key => localStorage.removeItem(key));');

console.log('\n🔄 También puedes:');
console.log('1. Cerrar todas las pestañas del proyecto');
console.log('2. Abrir DevTools > Application > Clear storage');
console.log('3. Marcar "Local storage" y "Session storage"');
console.log('4. Click en "Clear site data"');

