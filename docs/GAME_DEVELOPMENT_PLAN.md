# 🎮 Academia Game - Plan de Desarrollo RPG 2D

## 🎯 **Concepto del Juego**

### **Tema**: Business RPG - Vendedor Épico
Un RPG 2D donde los vendedores se convierten en héroes épicos, ganando armaduras y habilidades mientras dominan el arte de las ventas.

### **Mecánicas Core**:
- **Personaje**: Vendedor que evoluciona a héroe épico
- **Stats RPG**: Knowledge, Charisma, Confidence, Objection Handling, Storytelling
- **Sistema de Armadura**: 6 piezas que representan habilidades de venta
- **Boss Battles**: Llamadas VAPI con clientes imposibles
- **Progresión**: Ganar/perder armadura según rendimiento

## 🎨 **Recursos Visuales Gratuitos Identificados**

### 1. **OpenGameArt.org - Assets Principales**
```
Character Sprites:
- Business Character Base (suit, professional)
- Animation Sets (walk, idle, talk, victory, defeat)
- Facial Expressions (confident, nervous, focused)

Armor Sets:
- Medieval armor adaptable a "business armor"
- Helmet → Knowledge Crown
- Chest → Persuasion Armor  
- Gloves → Objection Handlers
- Boots → Closing Boots
- Shield → Confidence Shield
- Weapon → Storytelling Sword
```

### 2. **Kenney.nl - UI y Efectos**
```
UI Elements:
- RPG Interface Pack
- Progress Bars (HP, XP, Stats)
- Inventory Grids
- Button Sets
- Icon Packs

Effects:
- Particle Systems (level up, victory)
- Damage Numbers
- Spell Effects (adaptados a "sales magic")
```

### 3. **Craftpix.net - Freebies**
```
Business Themes:
- Office Environment Tiles
- Corporate Characters
- Modern UI Elements
- Professional Animations
```

## 🛠️ **Stack Tecnológico Recomendado**

### **Opción 1: Phaser.js + React (Recomendado)**
```bash
npm install phaser
npm install @types/phaser
```

**Ventajas**:
- Integración perfecta con React
- Asset loading robusto
- Physics engine incluido
- Audio management
- Mobile support

### **Opción 2: PixiJS + React**
```bash
npm install pixi.js @pixi/react
```

**Ventajas**:
- WebGL performance
- Mejor para animaciones complejas
- React wrapper disponible

### **Opción 3: Canvas API + Custom Engine**
**Ventajas**:
- Control total
- Sin dependencias adicionales
- Más ligero

## 🎯 **Arquitectura del Juego**

### **Estructura de Archivos**
```
src/components/academia-game/
├── AcademiaGameDashboard.tsx    # Dashboard principal
├── GameEngine/
│   ├── GameCanvas.tsx           # Canvas principal del juego
│   ├── CharacterRenderer.tsx    # Renderizado de personaje
│   ├── ArmorSystem.tsx          # Sistema de equipamiento
│   ├── BattleEngine.tsx         # Engine de batallas
│   └── StatsManager.tsx         # Gestión de estadísticas
├── Components/
│   ├── CharacterSheet.tsx       # Hoja de personaje RPG
│   ├── InventoryPanel.tsx       # Inventario de armaduras
│   ├── QuestLog.tsx            # Log de misiones
│   ├── BossArena.tsx           # Arena de jefe
│   └── ShopSystem.tsx          # Tienda de mejoras
└── Assets/
    ├── sprites/                 # Sprites de personajes
    ├── armor/                   # Piezas de armadura
    ├── ui/                      # Elementos de interfaz
    └── effects/                 # Efectos visuales
```

## 📊 **Sistema de Progresión Detallado**

### **Stats del Personaje**
```typescript
interface PlayerCharacter {
  // Core Stats (0-100)
  knowledge: number;        // Conocimiento producto
  charisma: number;         // Carisma y persuasión
  confidence: number;       // Confianza en ventas
  objectionHandling: number; // Manejo objeciones
  storytelling: number;     // Narrativa convincente
  
  // Meta Progression
  level: number;           // Nivel general (1-50)
  experience: number;      // XP acumulado
  currentHP: number;       // HP actual
  maxHP: number;          // HP máximo
  
  // Equipment Slots
  helmet: ArmorPiece | null;    // +Knowledge
  chest: ArmorPiece | null;     // +Charisma  
  gloves: ArmorPiece | null;    // +Objection Handling
  boots: ArmorPiece | null;     // +Confidence
  shield: ArmorPiece | null;    // +Defense general
  weapon: ArmorPiece | null;    // +Storytelling
  
  // Advanced Equipment
  pet: Pet | null;             // Mascota (bonuses pasivos)
  aura: AuraEffect | null;     // Efectos visuales
  title: string;               // Título ganado
}
```

### **Sistema de Armaduras**
```typescript
interface ArmorPiece {
  id: string;
  name: string;
  type: 'helmet' | 'chest' | 'gloves' | 'boots' | 'shield' | 'weapon';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  material: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'crystal';
  
  // Bonuses
  statBonus: { [stat: string]: number };
  specialEffect?: string;
  
  // Requirements
  levelRequired: number;
  questRequired?: string;
  bossDefeated?: string;
  
  // Visuals
  spriteUrl: string;
  effectUrl?: string;
  description: string;
}
```

## ⚔️ **Sistema de Boss Battles**

### **Progresión de Dificultad**
```
Nivel 1-10: Clientes Básicos
- Cliente Indeciso
- Familia Ocupada  
- Persona Mayor Cautelosa

Nivel 11-20: Clientes Intermedios
- Ejecutivo Exigente
- Cliente Escéptico
- Grupo Corporativo

Nivel 21-30: Clientes Avanzados
- Cliente Internacional
- Influencer Demanding
- CEO Ultra-Exigente

Nivel 31-40: Clientes Épicos
- Multimillonario Imposible
- Crítico de Lujo
- Competidor Disfrazado

Nivel 41-50: Kobayashi Maru
- Cliente Imposible Final
- Todas las objeciones posibles
- Requiere armadura completa
```

### **Mecánicas de Batalla**
```
1. Preparación (30s):
   - Revisar perfil del cliente
   - Seleccionar estrategia
   - Activar bonuses de armadura

2. Llamada VAPI (5-10min):
   - Conversación real con IA
   - Stats influyen en respuestas sugeridas
   - Armadura da bonuses específicos

3. Evaluación:
   - IA evalúa rendimiento
   - Objetivos cumplidos vs fallados
   - Cálculo de damage/healing

4. Resultado:
   - Victoria: Ganar pieza de armadura
   - Derrota: Perder HP, segunda derrota pierde armadura
   - Empate: Mantener estado actual
```

## 🏪 **Sistema de Tienda y Upgrades**

### **Moneda del Juego**: "Sales Coins"
- Ganadas por completar quests diarias
- Bonuses por victorias consecutivas
- Penalizaciones por derrotas

### **Compras Disponibles**:
```
Upgrades de Armadura:
- Enchantments (+5 a stats específicos)
- Visual Effects (brillos, auras)
- Set Bonuses (cuando tienes piezas completas)

Mascotas:
- Sales Dragon (boost XP +20%)
- Confidence Lion (boost Confidence +15%)
- Knowledge Owl (boost Knowledge +25%)

Consumibles:
- Health Potions (recuperar HP)
- XP Boosters (doble XP por 1 hora)
- Stat Potions (boost temporal de stats)
```

## 🎨 **Diseño Visual Específico**

### **Paleta de Colores**:
```css
--game-primary: #6366F1;      /* Indigo corporativo */
--game-secondary: #8B5CF6;    /* Purple épico */
--game-accent: #F59E0B;       /* Gold para legendarios */
--game-success: #10B981;      /* Emerald para victorias */
--game-danger: #EF4444;       /* Red para batallas */
--game-dark: #1E293B;         /* Slate para backgrounds */
```

### **Estilo de Arte**:
- **Base**: Pixel art moderno (32x32, 64x64)
- **Detalles**: HD overlays para efectos especiales
- **Animaciones**: 8-frame smooth animations
- **UI**: Mezcla de fantasy medieval + corporate modern

## 🚀 **Fases de Implementación**

### **Fase 1: MVP (2 semanas)**
- [ ] Setup Phaser.js en React
- [ ] Character sprite básico
- [ ] Sistema de stats fundamental
- [ ] 1 boss battle funcional
- [ ] UI básica de RPG

### **Fase 2: Core Game (3 semanas)**
- [ ] Sistema completo de armaduras
- [ ] 5 boss battles diferentes
- [ ] Daily quests funcionales
- [ ] Save/load progress
- [ ] Audio y efectos

### **Fase 3: Advanced Features (2 semanas)**
- [ ] Mascotas y pets
- [ ] Tienda de upgrades
- [ ] Leaderboards competitivos
- [ ] Achievements épicos
- [ ] Mobile optimization

### **Fase 4: Polish (1 semana)**
- [ ] Animations pulidas
- [ ] Sound design
- [ ] Tutorial interactivo
- [ ] Performance optimization
- [ ] Testing completo

## 📱 **Consideraciones Técnicas**

### **Performance**:
- Canvas 2D para compatibilidad
- Asset preloading inteligente
- Sprite atlases optimizados
- 60fps target en desktop, 30fps mobile

### **Responsive Design**:
- UI adaptativa para móvil
- Touch controls para battles
- Swipe gestures para navegación
- Landscape mode preferido

### **Integration**:
- Shared state con Academia original
- VAPI integration para boss battles
- Supabase para save data
- Real-time leaderboards

---

**🎮 Academia Game - Donde las ventas se convierten en épica aventura**
