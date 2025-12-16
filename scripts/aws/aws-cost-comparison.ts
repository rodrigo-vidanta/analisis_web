#!/usr/bin/env tsx
/**
 * Script para comparar costos antes y después de las optimizaciones
 * Calcula el porcentaje de reducción desde el análisis inicial hasta hoy
 */

import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';

const costExplorer = new CostExplorerClient({ region: 'us-east-1' });

// Costos REALES ANTES de las optimizaciones (Noviembre 2025 completo)
// Este es el costo real medido antes de aplicar las optimizaciones
const COSTO_INICIAL_REAL = {
  mensual: 1016.21, // USD - Costo real de Noviembre 2025 (antes de optimizaciones)
  fecha: 'Noviembre 2025',
  servicios: {
    'Supabase Studio': 150, // Eliminado
    'RDS Multi-AZ': 120, // Optimizado a Single-AZ
    'ElastiCache Redis (2 nodos)': 90, // Optimizado a 1 nodo y downgrade
    'ECS Fargate': 100,
    'ALB': 30,
    'CloudFront': 30,
    'Route 53': 5,
    'S3': 20,
    'Otros servicios': 451.21, // Diferencia entre estimado y real
  }
};

// Costos estimados ANTES de las optimizaciones (basado en análisis inicial)
const COSTO_INICIAL_ESTIMADO = {
  mensual: 340, // USD - Estimación alta antes de optimizaciones
  servicios: {
    'Supabase Studio': 150, // Eliminado
    'RDS Multi-AZ': 120, // Optimizado a Single-AZ
    'ElastiCache Redis (2 nodos)': 90, // Optimizado a 1 nodo y downgrade
    'ECS Fargate': 100,
    'ALB': 30,
    'CloudFront': 30,
    'Route 53': 5,
    'S3': 20,
  }
};

// Costos estimados DESPUÉS de las optimizaciones
const COSTO_OPTIMIZADO_ESTIMADO = {
  mensual: 150, // USD - Estimación después de optimizaciones
  servicios: {
    'RDS Single-AZ': 60, // Sin Multi-AZ
    'ElastiCache Redis (1 nodo downgrade)': 30, // 1 nodo cache.t3.medium
    'ECS Fargate': 100,
    'ALB': 30,
    'CloudFront': 30,
    'Route 53': 5,
    'S3': 20,
  }
};

async function getCurrentMonthCost(): Promise<number> {
  try {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: startDate,
        End: endDate,
      },
      Granularity: 'MONTHLY',
      Metrics: ['BlendedCost'],
    });

    const response = await costExplorer.send(command);
    
    if (response.ResultsByTime && response.ResultsByTime.length > 0) {
      const amount = parseFloat(response.ResultsByTime[0].Total?.BlendedCost?.Amount || '0');
      return amount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error obteniendo costo actual:', error);
    return 0;
  }
}

async function getLast3MonthsCosts(): Promise<{ month: string; cost: number }[]> {
  try {
    const today = new Date();
    const months: { month: string; cost: number }[] = [];

    for (let i = 2; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const startDate = date.toISOString().split('T')[0];
      
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const endDate = nextMonth.toISOString().split('T')[0];

      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate,
          End: endDate,
        },
        Granularity: 'MONTHLY',
        Metrics: ['BlendedCost'],
      });

      const response = await costExplorer.send(command);
      
      if (response.ResultsByTime && response.ResultsByTime.length > 0) {
        const amount = parseFloat(response.ResultsByTime[0].Total?.BlendedCost?.Amount || '0');
        const monthName = date.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
        months.push({ month: monthName, cost: amount });
      }
    }

    return months;
  } catch (error) {
    console.error('Error obteniendo costos históricos:', error);
    return [];
  }
}

function calculateReductionPercentage(initial: number, current: number): number {
  if (initial === 0) return 0;
  return ((initial - current) / initial) * 100;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

async function main() {
  console.log('📊 Análisis de Reducción de Costos AWS\n');
  console.log('='.repeat(60));
  
  // Costo inicial estimado
  console.log('\n💰 COSTO INICIAL (Antes de optimizaciones):');
  console.log(`   Estimado mensual: ${formatCurrency(COSTO_INICIAL_ESTIMADO.mensual)}`);
  console.log('\n   Desglose por servicio:');
  Object.entries(COSTO_INICIAL_ESTIMADO.servicios).forEach(([service, cost]) => {
    console.log(`   - ${service}: ${formatCurrency(cost)}`);
  });

  // Costo optimizado estimado
  console.log('\n✅ COSTO OPTIMIZADO (Después de optimizaciones):');
  console.log(`   Estimado mensual: ${formatCurrency(COSTO_OPTIMIZADO_ESTIMADO.mensual)}`);
  console.log('\n   Desglose por servicio:');
  Object.entries(COSTO_OPTIMIZADO_ESTIMADO.servicios).forEach(([service, cost]) => {
    console.log(`   - ${service}: ${formatCurrency(cost)}`);
  });

  // Reducción estimada
  const reduccionEstimada = COSTO_INICIAL_ESTIMADO.mensual - COSTO_OPTIMIZADO_ESTIMADO.mensual;
  const porcentajeReduccionEstimado = calculateReductionPercentage(
    COSTO_INICIAL_ESTIMADO.mensual,
    COSTO_OPTIMIZADO_ESTIMADO.mensual
  );

  console.log('\n📉 REDUCCIÓN ESTIMADA:');
  console.log(`   Ahorro mensual: ${formatCurrency(reduccionEstimada)}`);
  console.log(`   Porcentaje de reducción: ${porcentajeReduccionEstimado.toFixed(2)}%`);

  // Costos reales de AWS
  console.log('\n' + '='.repeat(60));
  console.log('\n📈 COSTOS REALES AWS (últimos 3 meses):');
  
  const last3Months = await getLast3MonthsCosts();
  
  if (last3Months.length > 0) {
    last3Months.forEach(({ month, cost }) => {
      console.log(`   ${month}: ${formatCurrency(cost)}`);
    });

    // Costo promedio de los últimos 3 meses
    const promedio = last3Months.reduce((sum, m) => sum + m.cost, 0) / last3Months.length;
    console.log(`\n   Promedio mensual: ${formatCurrency(promedio)}`);

    // Comparación con costo inicial
    const reduccionReal = COSTO_INICIAL_ESTIMADO.mensual - promedio;
    const porcentajeReduccionReal = calculateReductionPercentage(
      COSTO_INICIAL_ESTIMADO.mensual,
      promedio
    );

    console.log('\n📉 REDUCCIÓN REAL:');
    console.log(`   Ahorro mensual promedio: ${formatCurrency(reduccionReal)}`);
    console.log(`   Porcentaje de reducción: ${porcentajeReduccionReal.toFixed(2)}%`);

    // Costo del mes actual
    const currentMonthCost = await getCurrentMonthCost();
    if (currentMonthCost > 0) {
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const currentDay = new Date().getDate();
      const projectedMonthCost = (currentMonthCost / currentDay) * daysInMonth;

      console.log('\n📅 COSTO PROYECTADO DEL MES ACTUAL:');
      console.log(`   Costo hasta hoy: ${formatCurrency(currentMonthCost)}`);
      console.log(`   Proyección mensual: ${formatCurrency(projectedMonthCost)}`);

      const reduccionProyectada = COSTO_INICIAL_ESTIMADO.mensual - projectedMonthCost;
      const porcentajeReduccionProyectado = calculateReductionPercentage(
        COSTO_INICIAL_ESTIMADO.mensual,
        projectedMonthCost
      );

      console.log('\n📉 REDUCCIÓN PROYECTADA:');
      console.log(`   Ahorro mensual proyectado: ${formatCurrency(reduccionProyectada)}`);
      console.log(`   Porcentaje de reducción: ${porcentajeReduccionProyectado.toFixed(2)}%`);
    }
  } else {
    console.log('   ⚠️  No se pudieron obtener costos históricos');
  }

  // Comparación real: Noviembre (antes) vs Diciembre proyectado (después)
  if (last3Months.length >= 2) {
    const noviembre = last3Months.find(m => m.month.toLowerCase().includes('noviembre'));
    const diciembre = last3Months.find(m => m.month.toLowerCase().includes('diciembre'));
    
    if (noviembre && diciembre) {
      const currentMonthCost = await getCurrentMonthCost();
      if (currentMonthCost > 0) {
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const currentDay = new Date().getDate();
        const diciembreProyectado = (currentMonthCost / currentDay) * daysInMonth;

        const reduccionRealNovDic = noviembre.cost - diciembreProyectado;
        const porcentajeReduccionRealNovDic = calculateReductionPercentage(
          noviembre.cost,
          diciembreProyectado
        );

        console.log('\n' + '='.repeat(60));
        console.log('\n🎯 COMPARACIÓN REAL: ANTES vs DESPUÉS');
        console.log(`   Noviembre 2025 (antes optimizaciones): ${formatCurrency(noviembre.cost)}`);
        console.log(`   Diciembre 2025 proyectado (después): ${formatCurrency(diciembreProyectado)}`);
        console.log(`   Reducción: ${formatCurrency(reduccionRealNovDic)}`);
        console.log(`   Porcentaje de reducción: ${porcentajeReduccionRealNovDic.toFixed(2)}%`);
      }
    }
  }

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 RESUMEN:');
  console.log(`   Costo inicial estimado: ${formatCurrency(COSTO_INICIAL_ESTIMADO.mensual)}/mes`);
  if (last3Months.length >= 2) {
    const noviembre = last3Months.find(m => m.month.toLowerCase().includes('noviembre'));
    if (noviembre) {
      console.log(`   Costo inicial REAL (Nov 2025): ${formatCurrency(noviembre.cost)}/mes`);
    }
  }
  console.log(`   Costo optimizado estimado: ${formatCurrency(COSTO_OPTIMIZADO_ESTIMADO.mensual)}/mes`);
  console.log(`   Reducción estimada: ${porcentajeReduccionEstimado.toFixed(2)}%`);
  
  if (last3Months.length > 0) {
    const promedio = last3Months.reduce((sum, m) => sum + m.cost, 0) / last3Months.length;
    const porcentajeReduccionReal = calculateReductionPercentage(
      COSTO_INICIAL_ESTIMADO.mensual,
      promedio
    );
    console.log(`   Reducción real promedio: ${porcentajeReduccionReal.toFixed(2)}%`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Análisis completado\n');
}

main().catch(console.error);

