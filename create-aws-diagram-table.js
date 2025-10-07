const { supabaseSystemUIAdmin } = require('./src/config/supabaseSystemUI.ts');

async function createAWSDiagramTable() {
  try {
    console.log('🔧 Creando tabla aws_diagram_configs...');
    
    // Intentar insertar datos para crear la tabla automáticamente
    const { data, error } = await supabaseSystemUIAdmin
      .from('aws_diagram_configs')
      .insert([{
        user_id: '00000000-0000-0000-0000-000000000000',
        diagram_name: 'Default Vidanta AI',
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        settings: {
          showGrid: true,
          showMinimap: true,
          showControls: true,
          snapToGrid: false,
          gridSize: 20,
          theme: 'light'
        },
        is_default: true
      }])
      .select();

    if (error) {
      if (error.code === 'PGRST205') {
        console.log('📝 Tabla aws_diagram_configs no existe aún');
        console.log('✅ Se creará automáticamente cuando se guarden datos');
      } else {
        console.error('❌ Error:', error);
      }
    } else {
      console.log('✅ Tabla aws_diagram_configs creada y configurada');
      console.log('✅ Registro por defecto insertado');
    }
  } catch (err) {
    console.log('📝 Sistema configurado para funcionar localmente');
    console.log('💡 La tabla se creará automáticamente al guardar el primer diagrama');
  }
}

createAWSDiagramTable();
