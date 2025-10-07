#!/usr/bin/env python3
"""
CONTROLADOR MAESTRO DE MIGRACIÓN RAILWAY → AWS
==============================================
Sistema autónomo para ejecutar la migración completa usando el archivo de control YAML.
Diseñado para trabajar con Cursor y AWS CLI de manera autónoma.
"""

import yaml
import subprocess
import json
import time
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path

class MigrationController:
    def __init__(self, control_file: str = "migration-control.yaml"):
        """Inicializa el controlador de migración"""
        self.control_file = control_file
        self.config = self._load_config()
        self.logger = self._setup_logging()
        self.variables = {}
        self.start_time = datetime.now()
        
        # Colores para output
        self.colors = {
            'RED': '\033[0;31m',
            'GREEN': '\033[0;32m',
            'YELLOW': '\033[1;33m',
            'BLUE': '\033[0;34m',
            'PURPLE': '\033[0;35m',
            'CYAN': '\033[0;36m',
            'NC': '\033[0m'  # No Color
        }
        
    def _load_config(self) -> Dict[str, Any]:
        """Carga la configuración desde el archivo YAML"""
        try:
            with open(self.control_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            print(f"❌ Error: No se encontró el archivo {self.control_file}")
            sys.exit(1)
        except yaml.YAMLError as e:
            print(f"❌ Error parsing YAML: {e}")
            sys.exit(1)
            
    def _setup_logging(self) -> logging.Logger:
        """Configura el sistema de logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('migration.log'),
                logging.StreamHandler()
            ]
        )
        return logging.getLogger(__name__)
        
    def _print_colored(self, message: str, color: str = 'NC') -> None:
        """Imprime mensaje con color"""
        print(f"{self.colors.get(color, '')}{message}{self.colors['NC']}")
        
    def _execute_command(self, command: str, description: str = "", 
                        dry_run: bool = False, capture_output: bool = True) -> Dict[str, Any]:
        """Ejecuta un comando y retorna el resultado"""
        
        self._print_colored(f"\n🔧 {description}", 'BLUE')
        self._print_colored(f"📝 Comando: {command}", 'CYAN')
        
        if dry_run:
            self._print_colored("🔍 DRY RUN - Comando no ejecutado", 'YELLOW')
            return {"success": True, "output": "dry_run", "error": None}
            
        try:
            if capture_output:
                result = subprocess.run(
                    command,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minutos timeout
                )
            else:
                result = subprocess.run(command, shell=True, text=True)
                
            if result.returncode == 0:
                self._print_colored(f"✅ Éxito: {description}", 'GREEN')
                self.logger.info(f"Comando exitoso: {command}")
                
                # Intentar parsear JSON si es posible
                output = result.stdout if capture_output else "executed"
                try:
                    if output and output.strip().startswith('{'):
                        output = json.loads(output)
                except json.JSONDecodeError:
                    pass
                    
                return {
                    "success": True,
                    "output": output,
                    "error": None,
                    "command": command
                }
            else:
                error_msg = result.stderr if capture_output else "Error desconocido"
                self._print_colored(f"❌ Error: {error_msg}", 'RED')
                self.logger.error(f"Comando falló: {command} - Error: {error_msg}")
                
                return {
                    "success": False,
                    "output": None,
                    "error": error_msg,
                    "command": command
                }
                
        except subprocess.TimeoutExpired:
            self._print_colored(f"⏰ Timeout: {command}", 'YELLOW')
            return {"success": False, "output": None, "error": "Timeout", "command": command}
        except Exception as e:
            self._print_colored(f"❌ Excepción: {str(e)}", 'RED')
            return {"success": False, "output": None, "error": str(e), "command": command}
            
    def _substitute_variables(self, text: str) -> str:
        """Sustituye variables en el texto usando ${VARIABLE}"""
        for key, value in self.variables.items():
            text = text.replace(f"${{{key}}}", str(value))
        return text
        
    def _extract_resource_ids(self, output: Any, resource_type: str) -> Optional[str]:
        """Extrae IDs de recursos de la salida de AWS CLI"""
        if not output or not isinstance(output, dict):
            return None
            
        # Mapeo de tipos de recursos a sus campos de ID
        id_mappings = {
            'vpc': ['Vpc', 'VpcId'],
            'subnet': ['Subnet', 'SubnetId'],
            'security_group': ['GroupId'],
            'internet_gateway': ['InternetGateway', 'InternetGatewayId'],
            'route_table': ['RouteTable', 'RouteTableId'],
            'db_instance': ['DBInstance', 'DBInstanceIdentifier'],
            'cache_cluster': ['CacheCluster', 'CacheClusterId'],
            'ecs_cluster': ['Cluster', 'ClusterArn'],
            'load_balancer': ['LoadBalancers', 0, 'LoadBalancerArn'],
            'target_group': ['TargetGroups', 0, 'TargetGroupArn']
        }
        
        if resource_type in id_mappings:
            path = id_mappings[resource_type]
            current = output
            
            try:
                for key in path:
                    if isinstance(key, int):
                        current = current[key]
                    else:
                        current = current[key]
                return current
            except (KeyError, IndexError, TypeError):
                pass
                
        return None
        
    def verify_aws_credentials(self) -> bool:
        """Verifica que las credenciales de AWS estén configuradas"""
        self._print_colored("\n🔐 Verificando credenciales AWS...", 'PURPLE')
        
        result = self._execute_command(
            "aws sts get-caller-identity",
            "Verificar credenciales AWS"
        )
        
        if result["success"]:
            identity = result["output"]
            if isinstance(identity, dict):
                self._print_colored(f"✅ Conectado como: {identity.get('Arn', 'Usuario desconocido')}", 'GREEN')
                self.variables['AWS_ACCOUNT_ID'] = identity.get('Account', '')
                return True
        
        self._print_colored("❌ Error: Credenciales AWS no configuradas", 'RED')
        self._print_colored("💡 Ejecuta: aws configure", 'YELLOW')
        return False
        
    def execute_phase(self, phase_name: str, dry_run: bool = False) -> bool:
        """Ejecuta una fase completa de la migración"""
        
        if phase_name not in self.config['migration_phases']:
            self._print_colored(f"❌ Fase '{phase_name}' no encontrada", 'RED')
            return False
            
        phase = self.config['migration_phases'][phase_name]
        self._print_colored(f"\n🚀 Iniciando {phase['name']}", 'PURPLE')
        self._print_colored(f"⏱️  Duración estimada: {phase['duration']}", 'CYAN')
        
        # Ejecutar tareas de la fase
        for task in phase['tasks']:
            if not self.execute_task(task, dry_run):
                self._print_colored(f"❌ Fase {phase_name} falló en tarea: {task['name']}", 'RED')
                return False
                
        self._print_colored(f"✅ Fase {phase_name} completada exitosamente", 'GREEN')
        return True
        
    def execute_task(self, task: Dict[str, Any], dry_run: bool = False) -> bool:
        """Ejecuta una tarea individual"""
        
        task_name = task.get('name', 'Tarea sin nombre')
        self._print_colored(f"\n📋 Ejecutando: {task_name}", 'BLUE')
        
        # Verificar dependencias
        dependencies = task.get('dependencies', [])
        for dep in dependencies:
            if not self._check_dependency(dep):
                self._print_colored(f"❌ Dependencia no cumplida: {dep}", 'RED')
                return False
                
        # Ejecutar comandos
        commands = task.get('commands', [])
        for command in commands:
            # Sustituir variables
            command = self._substitute_variables(command)
            
            result = self._execute_command(command, f"Ejecutando comando para {task_name}", dry_run)
            
            if not result["success"]:
                self._print_colored(f"❌ Tarea falló: {task_name}", 'RED')
                return False
                
            # Extraer IDs de recursos si es necesario
            if result["output"] and task.get('id'):
                resource_id = self._extract_resource_ids(result["output"], task['id'])
                if resource_id:
                    var_name = f"{task['id'].upper()}_ID"
                    self.variables[var_name] = resource_id
                    self._print_colored(f"💾 Variable guardada: {var_name} = {resource_id}", 'CYAN')
                    
        # Ejecutar validación si existe
        validation = task.get('validation')
        if validation:
            validation = self._substitute_variables(validation)
            result = self._execute_command(validation, f"Validando {task_name}")
            
            if not result["success"]:
                self._print_colored(f"❌ Validación falló para: {task_name}", 'RED')
                return False
                
        self._print_colored(f"✅ Tarea completada: {task_name}", 'GREEN')
        return True
        
    def _check_dependency(self, dependency: str) -> bool:
        """Verifica si una dependencia está cumplida"""
        # Por ahora, asumimos que las dependencias están cumplidas
        # En una implementación más completa, verificaríamos el estado real
        return True
        
    def run_full_migration(self, dry_run: bool = False) -> bool:
        """Ejecuta la migración completa"""
        
        self._print_colored("🌟 INICIANDO MIGRACIÓN COMPLETA RAILWAY → AWS", 'PURPLE')
        self._print_colored("=" * 60, 'PURPLE')
        
        if not dry_run and not self.verify_aws_credentials():
            return False
            
        # Cargar variables de entorno
        env_vars = self.config.get('environment_variables', {}).get('global', {})
        self.variables.update(env_vars)
        
        # Ejecutar fases en orden
        phases = ['phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5']
        
        for phase_name in phases:
            if not self.execute_phase(phase_name, dry_run):
                self._print_colored(f"❌ Migración falló en fase: {phase_name}", 'RED')
                return False
                
            # Pausa entre fases para revisión
            if not dry_run:
                self._print_colored(f"\n⏸️  Pausa de 30 segundos antes de la siguiente fase...", 'YELLOW')
                time.sleep(30)
                
        end_time = datetime.now()
        duration = end_time - self.start_time
        
        self._print_colored("\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE", 'GREEN')
        self._print_colored(f"⏱️  Tiempo total: {duration}", 'CYAN')
        self._print_colored("=" * 60, 'GREEN')
        
        return True
        
    def generate_status_report(self) -> Dict[str, Any]:
        """Genera un reporte del estado actual"""
        return {
            "start_time": self.start_time.isoformat(),
            "current_time": datetime.now().isoformat(),
            "variables": self.variables,
            "config_loaded": bool(self.config),
            "aws_credentials": self.verify_aws_credentials()
        }
        
    def save_state(self) -> None:
        """Guarda el estado actual para recuperación"""
        state = {
            "variables": self.variables,
            "timestamp": datetime.now().isoformat(),
            "config_file": self.control_file
        }
        
        with open("migration_state.json", "w") as f:
            json.dump(state, f, indent=2)
            
    def load_state(self) -> bool:
        """Carga el estado guardado"""
        try:
            with open("migration_state.json", "r") as f:
                state = json.load(f)
                self.variables.update(state.get("variables", {}))
                return True
        except FileNotFoundError:
            return False
            
    def interactive_mode(self) -> None:
        """Modo interactivo para ejecutar comandos individuales"""
        self._print_colored("\n🎮 MODO INTERACTIVO", 'PURPLE')
        self._print_colored("Comandos disponibles:", 'CYAN')
        self._print_colored("  1. verify - Verificar credenciales AWS", 'CYAN')
        self._print_colored("  2. phase <nombre> - Ejecutar fase específica", 'CYAN')
        self._print_colored("  3. status - Ver estado actual", 'CYAN')
        self._print_colored("  4. vars - Ver variables", 'CYAN')
        self._print_colored("  5. full - Ejecutar migración completa", 'CYAN')
        self._print_colored("  6. dry-run - Ejecutar en modo dry-run", 'CYAN')
        self._print_colored("  7. exit - Salir", 'CYAN')
        
        while True:
            try:
                command = input(f"\n{self.colors['YELLOW']}migration> {self.colors['NC']}").strip()
                
                if command == "exit":
                    break
                elif command == "verify":
                    self.verify_aws_credentials()
                elif command.startswith("phase "):
                    phase_name = command.split(" ", 1)[1]
                    self.execute_phase(phase_name)
                elif command == "status":
                    report = self.generate_status_report()
                    print(json.dumps(report, indent=2))
                elif command == "vars":
                    print(json.dumps(self.variables, indent=2))
                elif command == "full":
                    self.run_full_migration()
                elif command == "dry-run":
                    self.run_full_migration(dry_run=True)
                else:
                    self._print_colored("❌ Comando no reconocido", 'RED')
                    
            except KeyboardInterrupt:
                self._print_colored("\n👋 Saliendo...", 'YELLOW')
                break
            except Exception as e:
                self._print_colored(f"❌ Error: {e}", 'RED')


def main():
    """Función principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Controlador de migración Railway → AWS")
    parser.add_argument("--config", default="migration-control.yaml", help="Archivo de configuración")
    parser.add_argument("--dry-run", action="store_true", help="Ejecutar en modo dry-run")
    parser.add_argument("--phase", help="Ejecutar fase específica")
    parser.add_argument("--interactive", action="store_true", help="Modo interactivo")
    parser.add_argument("--full", action="store_true", help="Ejecutar migración completa")
    
    args = parser.parse_args()
    
    controller = MigrationController(args.config)
    
    if args.interactive:
        controller.interactive_mode()
    elif args.full:
        controller.run_full_migration(args.dry_run)
    elif args.phase:
        controller.execute_phase(args.phase, args.dry_run)
    else:
        # Modo por defecto: mostrar estado
        report = controller.generate_status_report()
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
