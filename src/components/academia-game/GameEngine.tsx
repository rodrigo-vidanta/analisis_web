import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface GameEngineProps {
  onGameReady?: (game: Phaser.Game) => void;
}

// Configuración del juego
const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: 'phaser-game',
  backgroundColor: '#2c3e50',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 800,
      height: 600
    },
    max: {
      width: 1600,
      height: 1200
    }
  }
};

// Variables globales del juego
let player: Phaser.Physics.Arcade.Sprite;
let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
let wasd: any;
let npcs: Phaser.Physics.Arcade.Group;
let interactionText: Phaser.GameObjects.Text;
let currentNPC: any = null;
let gameScene: Phaser.Scene;

// Precargar assets
function preload(this: Phaser.Scene) {
  gameScene = this;
  
  // Crear sprites temporales con colores hasta obtener assets reales
  // Player sprite (vendedor héroe)
  this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  
  // NPCs (clientes/jefes)
  this.load.image('npc_client', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  this.load.image('npc_boss', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  
  // Tiles del mundo
  this.load.image('floor_tile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  this.load.image('wall_tile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  
  // Crear sprites de colores temporales
  this.load.on('complete', () => {
    // Player sprite azul
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0x3498db);
    playerGraphics.fillRect(0, 0, 32, 48);
    playerGraphics.generateTexture('player_sprite', 32, 48);
    playerGraphics.destroy();
    
    // NPC cliente verde
    const npcGraphics = this.add.graphics();
    npcGraphics.fillStyle(0x2ecc71);
    npcGraphics.fillRect(0, 0, 32, 48);
    npcGraphics.generateTexture('npc_client_sprite', 32, 48);
    npcGraphics.destroy();
    
    // Boss rojo
    const bossGraphics = this.add.graphics();
    bossGraphics.fillStyle(0xe74c3c);
    bossGraphics.fillRect(0, 0, 48, 64);
    bossGraphics.generateTexture('npc_boss_sprite', 48, 64);
    bossGraphics.destroy();
    
    // Floor tile
    const floorGraphics = this.add.graphics();
    floorGraphics.fillStyle(0x95a5a6);
    floorGraphics.fillRect(0, 0, 32, 32);
    floorGraphics.generateTexture('floor_sprite', 32, 32);
    floorGraphics.destroy();
    
    // Wall tile
    const wallGraphics = this.add.graphics();
    wallGraphics.fillStyle(0x34495e);
    wallGraphics.fillRect(0, 0, 32, 32);
    wallGraphics.generateTexture('wall_sprite', 32, 32);
    wallGraphics.destroy();
  });
}

// Crear el mundo del juego
function create(this: Phaser.Scene) {
  // Crear el mundo (oficina/academia)
  createWorld(this);
  
  // Crear el jugador
  player = this.physics.add.sprite(100, 100, 'player_sprite');
  player.setCollideWorldBounds(true);
  player.setSize(24, 32);
  
  // Crear animaciones del jugador
  this.anims.create({
    key: 'walk_down',
    frames: [{ key: 'player_sprite' }],
    frameRate: 8,
    repeat: -1
  });
  
  this.anims.create({
    key: 'walk_up',
    frames: [{ key: 'player_sprite' }],
    frameRate: 8,
    repeat: -1
  });
  
  this.anims.create({
    key: 'walk_left',
    frames: [{ key: 'player_sprite' }],
    frameRate: 8,
    repeat: -1
  });
  
  this.anims.create({
    key: 'walk_right',
    frames: [{ key: 'player_sprite' }],
    frameRate: 8,
    repeat: -1
  });
  
  this.anims.create({
    key: 'idle',
    frames: [{ key: 'player_sprite' }],
    frameRate: 1
  });
  
  // Crear NPCs
  createNPCs(this);
  
  // Configurar controles
  cursors = this.input.keyboard!.createCursorKeys();
  wasd = this.input.keyboard!.addKeys('W,S,A,D');
  
  // Texto de interacción
  interactionText = this.add.text(512, 50, '', {
    fontSize: '16px',
    color: '#ffffff',
    backgroundColor: '#000000',
    padding: { x: 10, y: 5 }
  }).setOrigin(0.5).setVisible(false);
  
  // Configurar colisiones
  this.physics.add.overlap(player, npcs, handleNPCInteraction, undefined, this);
  
  // Configurar cámara
  this.cameras.main.startFollow(player);
  this.cameras.main.setLerp(0.1, 0.1);
  
  // UI del juego
  createGameUI(this);
}

// Crear el mundo del juego
function createWorld(scene: Phaser.Scene) {
  // Crear piso
  for (let x = 0; x < 32; x++) {
    for (let y = 0; y < 24; y++) {
      scene.add.image(x * 32, y * 32, 'floor_sprite').setOrigin(0);
    }
  }
  
  // Crear paredes exteriores
  for (let x = 0; x < 32; x++) {
    scene.add.image(x * 32, 0, 'wall_sprite').setOrigin(0);
    scene.add.image(x * 32, 23 * 32, 'wall_sprite').setOrigin(0);
  }
  
  for (let y = 0; y < 24; y++) {
    scene.add.image(0, y * 32, 'wall_sprite').setOrigin(0);
    scene.add.image(31 * 32, y * 32, 'wall_sprite').setOrigin(0);
  }
  
  // Crear salas/áreas específicas
  // Área de entrenamiento
  for (let x = 5; x < 10; x++) {
    for (let y = 5; y < 8; y++) {
      scene.add.image(x * 32, y * 32, 'wall_sprite').setOrigin(0);
    }
  }
  
  // Arena de jefes
  const bossArenaX = 20;
  const bossArenaY = 15;
  for (let x = bossArenaX; x < bossArenaX + 8; x++) {
    for (let y = bossArenaY; y < bossArenaY + 6; y++) {
      if (x === bossArenaX || x === bossArenaX + 7 || y === bossArenaY || y === bossArenaY + 5) {
        scene.add.image(x * 32, y * 32, 'wall_sprite').setOrigin(0);
      }
    }
  }
}

// Crear NPCs interactivos
function createNPCs(scene: Phaser.Scene) {
  npcs = scene.physics.add.group();
  
  // Cliente básico para entrenamiento
  const clienteBasico = scene.physics.add.sprite(200, 200, 'npc_client_sprite');
  clienteBasico.setImmovable(true);
  clienteBasico.setData('type', 'cliente');
  clienteBasico.setData('name', 'María González');
  clienteBasico.setData('difficulty', 1);
  clienteBasico.setData('dialogue', 'Hola, estoy interesada en conocer sobre las vacaciones en Vidanta...');
  npcs.add(clienteBasico);
  
  // Cliente intermedio
  const clienteIntermedio = scene.physics.add.sprite(400, 300, 'npc_client_sprite');
  clienteIntermedio.setImmovable(true);
  clienteIntermedio.setData('type', 'cliente');
  clienteIntermedio.setData('name', 'Roberto Mendoza');
  clienteIntermedio.setData('difficulty', 3);
  clienteIntermedio.setData('dialogue', 'Soy un empresario ocupado, convénceme rápido...');
  npcs.add(clienteIntermedio);
  
  // Boss final
  const boss = scene.physics.add.sprite(700, 500, 'npc_boss_sprite');
  boss.setImmovable(true);
  boss.setData('type', 'boss');
  boss.setData('name', 'Cliente Imposible');
  boss.setData('difficulty', 10);
  boss.setData('dialogue', '¡Soy el Kobayashi Maru de las ventas! ¡Nadie me ha vendido nunca!');
  npcs.add(boss);
  
  // Agregar animaciones idle a NPCs
  npcs.children.entries.forEach((npc: any) => {
    // Animación idle simple (bobbing)
    scene.tweens.add({
      targets: npc,
      y: npc.y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  });
}

// Crear UI del juego
function createGameUI(scene: Phaser.Scene) {
  // Barra de HP
  const hpBarBg = scene.add.rectangle(100, 30, 200, 20, 0x000000).setOrigin(0);
  const hpBar = scene.add.rectangle(100, 30, 160, 16, 0xe74c3c).setOrigin(0);
  
  // Barra de XP
  const xpBarBg = scene.add.rectangle(100, 60, 200, 15, 0x000000).setOrigin(0);
  const xpBar = scene.add.rectangle(100, 60, 120, 11, 0xf39c12).setOrigin(0);
  
  // Texto de stats
  scene.add.text(10, 30, 'HP:', { fontSize: '16px', color: '#ffffff' });
  scene.add.text(10, 60, 'XP:', { fontSize: '16px', color: '#ffffff' });
  
  // Nivel del jugador
  scene.add.text(10, 90, 'Nivel 5', { fontSize: '18px', color: '#f1c40f', fontStyle: 'bold' });
  
  // Mini-mapa
  const miniMap = scene.add.rectangle(scene.cameras.main.width - 150, 100, 140, 100, 0x000000, 0.7).setOrigin(0);
  scene.add.text(scene.cameras.main.width - 145, 80, 'Mini-Mapa', { fontSize: '12px', color: '#ffffff' });
  
  // Inventario rápido
  for (let i = 0; i < 6; i++) {
    const slot = scene.add.rectangle(10 + (i * 40), scene.cameras.main.height - 50, 35, 35, 0x34495e).setOrigin(0);
    slot.setStrokeStyle(2, 0x2c3e50);
    
    // Agregar items de ejemplo
    if (i === 0) {
      scene.add.text(15 + (i * 40), scene.cameras.main.height - 45, '⚔️', { fontSize: '20px' });
    } else if (i === 1) {
      scene.add.text(15 + (i * 40), scene.cameras.main.height - 45, '🛡️', { fontSize: '20px' });
    }
  }
  
  // Controles de ayuda
  scene.add.text(10, scene.cameras.main.height - 80, 'WASD/Flechas: Mover | Espacio: Interactuar', {
    fontSize: '12px',
    color: '#bdc3c7'
  });
}

// Manejar interacciones con NPCs
function handleNPCInteraction(player: any, npc: any) {
  if (!currentNPC) {
    currentNPC = npc;
    const npcData = npc.getData('name');
    const npcType = npc.getData('type');
    
    interactionText.setText(`Presiona ESPACIO para hablar con ${npcData}`);
    interactionText.setVisible(true);
    
    // Agregar efecto visual de interacción
    gameScene.tweens.add({
      targets: npc,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Power2'
    });
    
    // Crear partículas de interacción
    const particles = gameScene.add.particles(npc.x, npc.y - 20, 'player_sprite', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.3, end: 0 },
      lifespan: 600,
      tint: npcType === 'boss' ? 0xff0000 : 0x00ff00
    });
    
    setTimeout(() => {
      particles.destroy();
    }, 1000);
  }
}

// Loop principal del juego
function update(this: Phaser.Scene) {
  if (!player) return;
  
  // Resetear velocidad
  player.setVelocity(0);
  
  // Movimiento del jugador
  const speed = 160;
  let moving = false;
  
  if (cursors.left.isDown || wasd.A.isDown) {
    player.setVelocityX(-speed);
    player.anims.play('walk_left', true);
    moving = true;
  } else if (cursors.right.isDown || wasd.D.isDown) {
    player.setVelocityX(speed);
    player.anims.play('walk_right', true);
    moving = true;
  }
  
  if (cursors.up.isDown || wasd.W.isDown) {
    player.setVelocityY(-speed);
    if (!moving) player.anims.play('walk_up', true);
    moving = true;
  } else if (cursors.down.isDown || wasd.S.isDown) {
    player.setVelocityY(speed);
    if (!moving) player.anims.play('walk_down', true);
    moving = true;
  }
  
  if (!moving) {
    player.anims.play('idle', true);
  }
  
  // Interacción con NPCs
  if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('SPACE')) && currentNPC) {
    startBattle(currentNPC);
  }
  
  // Verificar si el jugador se alejó del NPC
  if (currentNPC) {
    const distance = Phaser.Math.Distance.Between(player.x, player.y, currentNPC.x, currentNPC.y);
    if (distance > 80) {
      currentNPC = null;
      interactionText.setVisible(false);
    }
  }
}

// Iniciar batalla con NPC
function startBattle(npc: any) {
  const npcName = npc.getData('name');
  const npcDifficulty = npc.getData('difficulty');
  const npcType = npc.getData('type');
  
  // Pausar el juego
  gameScene.scene.pause();
  
  // Crear overlay de batalla
  const battleOverlay = gameScene.add.rectangle(
    gameScene.cameras.main.centerX,
    gameScene.cameras.main.centerY,
    gameScene.cameras.main.width,
    gameScene.cameras.main.height,
    0x000000,
    0.8
  );
  
  // UI de batalla
  const battleUI = gameScene.add.container(gameScene.cameras.main.centerX, gameScene.cameras.main.centerY);
  
  // Fondo de batalla
  const battleBg = gameScene.add.rectangle(0, 0, 600, 400, 0x2c3e50).setStrokeStyle(4, 0xf39c12);
  
  // Sprites de batalla
  const playerBattleSprite = gameScene.add.image(-200, 0, 'player_sprite').setScale(3);
  const enemyBattleSprite = gameScene.add.image(200, 0, npcType === 'boss' ? 'npc_boss_sprite' : 'npc_client_sprite').setScale(3);
  
  // Información del enemigo
  const enemyInfo = gameScene.add.text(0, -150, `${npcName}\nDificultad: ${npcDifficulty}/10`, {
    fontSize: '20px',
    color: '#ffffff',
    align: 'center'
  }).setOrigin(0.5);
  
  // Botones de batalla
  const attackBtn = gameScene.add.rectangle(-100, 120, 120, 40, 0xe74c3c)
    .setInteractive()
    .on('pointerdown', () => performAttack(npc, battleUI, battleOverlay));
  
  const attackText = gameScene.add.text(-100, 120, 'ATACAR', {
    fontSize: '16px',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  
  const defendBtn = gameScene.add.rectangle(100, 120, 120, 40, 0x3498db)
    .setInteractive()
    .on('pointerdown', () => performDefend(npc, battleUI, battleOverlay));
  
  const defendText = gameScene.add.text(100, 120, 'DEFENDER', {
    fontSize: '16px',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  
  // Agregar elementos al contenedor
  battleUI.add([battleBg, playerBattleSprite, enemyBattleSprite, enemyInfo, attackBtn, attackText, defendBtn, defendText]);
  
  // Animación de entrada
  battleUI.setScale(0);
  gameScene.tweens.add({
    targets: battleUI,
    scaleX: 1,
    scaleY: 1,
    duration: 500,
    ease: 'Back.easeOut'
  });
}

// Realizar ataque (llamada de ventas)
function performAttack(npc: any, battleUI: Phaser.GameObjects.Container, overlay: Phaser.GameObjects.Rectangle) {
  // Aquí se integraría VAPI para la llamada real
  console.log('🎮 Iniciando batalla de ventas con:', npc.getData('name'));
  
  // Simular resultado de batalla
  const success = Math.random() > 0.5;
  
  // Efectos visuales de ataque
  const attackEffect = gameScene.add.circle(0, 0, 30, success ? 0x00ff00 : 0xff0000, 0.7);
  battleUI.add(attackEffect);
  
  gameScene.tweens.add({
    targets: attackEffect,
    scaleX: 3,
    scaleY: 3,
    alpha: 0,
    duration: 800,
    onComplete: () => {
      battleUI.destroy();
      overlay.destroy();
      gameScene.scene.resume();
      
      // Mostrar resultado
      showBattleResult(success, npc);
    }
  });
}

// Realizar defensa
function performDefend(npc: any, battleUI: Phaser.GameObjects.Container, overlay: Phaser.GameObjects.Rectangle) {
  console.log('🛡️ Defendiendo contra:', npc.getData('name'));
  
  // Efecto de defensa
  const defendEffect = gameScene.add.circle(0, 0, 40, 0x3498db, 0.5);
  battleUI.add(defendEffect);
  
  gameScene.tweens.add({
    targets: defendEffect,
    scaleX: 2,
    scaleY: 2,
    alpha: 0,
    duration: 600,
    onComplete: () => {
      battleUI.destroy();
      overlay.destroy();
      gameScene.scene.resume();
      
      // Resultado de defensa (menor daño)
      showBattleResult(true, npc, 'defend');
    }
  });
}

// Mostrar resultado de batalla
function showBattleResult(success: boolean, npc: any, action: string = 'attack') {
  const resultText = success 
    ? `¡Victoria! Ganaste experiencia y una pieza de armadura`
    : `Derrota... Perdiste HP. ¡Entrena más y vuelve!`;
  
  const resultColor = success ? '#2ecc71' : '#e74c3c';
  
  const result = gameScene.add.text(gameScene.cameras.main.centerX, gameScene.cameras.main.centerY - 100, resultText, {
    fontSize: '24px',
    color: resultColor,
    backgroundColor: '#000000',
    padding: { x: 20, y: 10 },
    align: 'center'
  }).setOrigin(0.5).setAlpha(0);
  
  // Animación de resultado
  gameScene.tweens.add({
    targets: result,
    alpha: 1,
    y: result.y - 50,
    duration: 1000,
    ease: 'Power2.easeOut',
    onComplete: () => {
      setTimeout(() => {
        gameScene.tweens.add({
          targets: result,
          alpha: 0,
          duration: 500,
          onComplete: () => result.destroy()
        });
      }, 2000);
    }
  });
  
  // Efectos de XP ganado
  if (success) {
    createXPEffect(player.x, player.y - 30);
  }
}

// Crear efecto de XP ganado
function createXPEffect(x: number, y: number) {
  const xpText = gameScene.add.text(x, y, '+50 XP', {
    fontSize: '18px',
    color: '#f1c40f',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  
  gameScene.tweens.add({
    targets: xpText,
    y: y - 50,
    alpha: 0,
    duration: 1500,
    ease: 'Power2.easeOut',
    onComplete: () => xpText.destroy()
  });
}

const GameEngine: React.FC<GameEngineProps> = ({ onGameReady }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      // Crear el juego
      const config = {
        ...gameConfig,
        parent: gameRef.current
      };
      
      phaserGameRef.current = new Phaser.Game(config);
      
      if (onGameReady) {
        onGameReady(phaserGameRef.current);
      }
    }

    // Cleanup al desmontar
    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [onGameReady]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <div 
        ref={gameRef}
        id="phaser-game"
        className="border-4 border-yellow-400 rounded-lg shadow-2xl"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
};

export default GameEngine;
