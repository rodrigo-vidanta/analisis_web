/**
 * ============================================
 * MODAL DE IMPORTACIÓN CSV
 * ============================================
 *
 * Wizard de 3 pasos para importar contactos desde CSV:
 * 1. Configurar lote (código campaña + descripción)
 * 2. Cargar CSV (drag & drop + preview + validación)
 * 3. Confirmar importación
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileText, CheckCircle, AlertCircle,
  ChevronRight, ChevronLeft, Loader2, FileSpreadsheet,
  Phone, User, Building, Trash2, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { importacionesService } from '../../../services/importacionesService';
import { normalizarTelefono } from '../../../types/importaciones';
import type { CSVRow } from '../../../types/importaciones';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'config' | 'upload' | 'confirm';

function parseCSV(text: string): { rows: CSVRow[]; invalidRows: { line: number; raw: string; reason: string }[]; duplicates: number } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], invalidRows: [{ line: 1, raw: lines[0] || '', reason: 'Archivo vacío o sin datos' }], duplicates: 0 };
  }

  // Detect separator from header
  const headerLine = lines[0];
  let separator = ',';
  if (headerLine.includes('\t')) separator = '\t';
  else if (headerLine.includes(';')) separator = ';';

  const headers = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Map headers to fields
  const nameIdx = headers.findIndex(h => ['nombre', 'name', 'nombre_completo'].includes(h));
  const phoneIdx = headers.findIndex(h => ['telefono', 'phone', 'tel', 'celular', 'whatsapp', 'número', 'numero'].includes(h));
  const dynamicsIdx = headers.findIndex(h => ['id_dynamics', 'dynamics', 'crm_id', 'lead_id', 'id'].includes(h));

  if (nameIdx === -1 || phoneIdx === -1) {
    return {
      rows: [],
      invalidRows: [{ line: 1, raw: headerLine, reason: 'Columnas "nombre" y "telefono" son requeridas en el encabezado' }],
      duplicates: 0,
    };
  }

  const rows: CSVRow[] = [];
  const invalidRows: { line: number; raw: string; reason: string }[] = [];
  const seenPhones = new Set<string>();
  let duplicates = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));

    const nombre = cols[nameIdx]?.trim() || '';
    const telefono = cols[phoneIdx]?.trim() || '';
    const id_dynamics = dynamicsIdx >= 0 ? cols[dynamicsIdx]?.trim() || undefined : undefined;

    if (!nombre) {
      invalidRows.push({ line: i + 1, raw: line, reason: 'Nombre vacío' });
      continue;
    }
    if (!telefono) {
      invalidRows.push({ line: i + 1, raw: line, reason: 'Teléfono vacío' });
      continue;
    }

    const digits = telefono.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      invalidRows.push({ line: i + 1, raw: line, reason: `Teléfono inválido (${digits.length} dígitos)` });
      continue;
    }

    const normalized = normalizarTelefono(telefono);
    if (seenPhones.has(normalized)) {
      duplicates++;
      continue;
    }
    seenPhones.add(normalized);

    rows.push({ nombre, telefono, id_dynamics });
  }

  return { rows, invalidRows, duplicates };
}

const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState<WizardStep>('config');

  // Step 1: Config
  const [codigoCampana, setCodigoCampana] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Step 2: Upload
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ line: number; raw: string; reason: string }[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Step 3: Confirm
  const [importing, setImporting] = useState(false);

  const resetState = useCallback(() => {
    setStep('config');
    setCodigoCampana('');
    setDescripcion('');
    setFileName('');
    setParsedRows([]);
    setInvalidRows([]);
    setDuplicateCount(0);
    setImporting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
      toast.error('Solo se aceptan archivos CSV, TXT o TSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setFileName(file.name);
      setParsedRows(result.rows);
      setInvalidRows(result.invalidRows);
      setDuplicateCount(result.duplicates);
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDownloadLayout = useCallback(() => {
    const csvContent = 'nombre,telefono,id_dynamics\nJuan Pérez,2211234567,DYN-001\nMaría López,5512345678,DYN-002\n';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'layout_importacion.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Layout descargado');
  }, []);

  const handleImport = useCallback(async () => {
    if (!user?.id || parsedRows.length === 0) return;

    setImporting(true);
    try {
      // 1. Crear importación
      const importacion = await importacionesService.createImportacion(
        codigoCampana,
        descripcion || null,
        user.id
      );

      // 2. Insertar importados
      const result = await importacionesService.insertImportados(importacion.id, parsedRows);

      toast.success(`Importación completada: ${result.inserted} registros importados${result.duplicates > 0 ? `, ${result.duplicates} duplicados actualizados` : ''}`);
      handleClose();
      onSuccess();
    } catch (err) {
      console.error('Error importing:', err);
      toast.error('Error al importar los datos');
    } finally {
      setImporting(false);
    }
  }, [user, parsedRows, codigoCampana, descripcion, handleClose, onSuccess]);

  if (!isOpen) return null;

  const canGoNext = () => {
    if (step === 'config') return codigoCampana.trim().length > 0;
    if (step === 'upload') return parsedRows.length > 0;
    return true;
  };

  const stepIndex = { config: 0, upload: 1, confirm: 2 };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-900 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Importar Base de Datos
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {step === 'config' && 'Paso 1: Configurar lote'}
                  {step === 'upload' && 'Paso 2: Cargar archivo'}
                  {step === 'confirm' && 'Paso 3: Confirmar importación'}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </motion.button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-1 px-6 pt-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <motion.div
                  className={`h-full rounded-full ${
                    i < stepIndex[step] ? 'bg-emerald-500' :
                    i === stepIndex[step] ? 'bg-blue-500' : 'bg-transparent'
                  }`}
                  initial={{ width: '0%' }}
                  animate={{ width: i <= stepIndex[step] ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Step 1: Config */}
              {step === 'config' && (
                <motion.div
                  key="config"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Código de Campaña *
                    </label>
                    <input
                      type="text"
                      value={codigoCampana}
                      onChange={(e) => setCodigoCampana(e.target.value)}
                      placeholder="Ej: CAMPANA_FEB_2026"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Descripción de la importación..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Formato CSV:</strong> El archivo debe tener columnas <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-xs">nombre</code> y <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-xs">telefono</code> (requeridas). Opcionalmente <code className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded text-xs">id_dynamics</code>.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Upload */}
              {step === 'upload' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {/* Drag & Drop Zone */}
                  {parsedRows.length === 0 && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt,.tsv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                      <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                        Arrastra tu archivo CSV aquí
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        CSV, TXT o TSV
                      </p>
                    </div>
                  )}

                  {/* Download Layout Button */}
                  {parsedRows.length === 0 && (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleDownloadLayout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Descargar layout de ejemplo
                    </motion.button>
                  )}

                  {/* File loaded - Preview */}
                  {parsedRows.length > 0 && (
                    <div className="space-y-4">
                      {/* File info */}
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{fileName}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              {parsedRows.length} registros válidos
                              {duplicateCount > 0 && ` · ${duplicateCount} duplicados removidos`}
                              {invalidRows.length > 0 && ` · ${invalidRows.length} inválidos`}
                            </p>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setParsedRows([]); setInvalidRows([]); setFileName(''); setDuplicateCount(0); }}
                          className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </motion.button>
                      </div>

                      {/* Stats cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800">
                          <User className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{parsedRows.length}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">Válidos</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{invalidRows.length}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">Inválidos</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center border border-purple-200 dark:border-purple-800">
                          <Phone className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                          <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{duplicateCount}</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400">Duplicados</p>
                        </div>
                      </div>

                      {/* Preview table */}
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Preview (primeros {Math.min(10, parsedRows.length)} registros)
                          </p>
                        </div>
                        <div className="overflow-x-auto max-h-48">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Nombre</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Teléfono</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Normalizado</th>
                                {parsedRows.some(r => r.id_dynamics) && (
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Dynamics</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {parsedRows.slice(0, 10).map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                  <td className="px-3 py-1.5 text-xs text-gray-400">{idx + 1}</td>
                                  <td className="px-3 py-1.5 text-gray-900 dark:text-gray-100">{row.nombre}</td>
                                  <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400 font-mono text-xs">{row.telefono}</td>
                                  <td className="px-3 py-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-xs">{normalizarTelefono(row.telefono)}</td>
                                  {parsedRows.some(r => r.id_dynamics) && (
                                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400 text-xs">{row.id_dynamics || '-'}</td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Invalid rows */}
                      {invalidRows.length > 0 && (
                        <div className="rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
                          <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800">
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">
                              Registros inválidos ({invalidRows.length})
                            </p>
                          </div>
                          <div className="max-h-32 overflow-y-auto p-3 space-y-1">
                            {invalidRows.slice(0, 5).map((row, idx) => (
                              <p key={idx} className="text-xs text-red-600 dark:text-red-400">
                                Línea {row.line}: {row.reason}
                              </p>
                            ))}
                            {invalidRows.length > 5 && (
                              <p className="text-xs text-red-500 dark:text-red-500 italic">
                                ...y {invalidRows.length - 5} más
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Confirm */}
              {step === 'confirm' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Resumen de Importación
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Código de campaña</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{codigoCampana}</p>
                      </div>
                      {descripcion && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Descripción</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{descripcion}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Archivo</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{fileName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Registros a importar</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{parsedRows.length}</p>
                      </div>
                    </div>
                  </div>

                  {(duplicateCount > 0 || invalidRows.length > 0) && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {duplicateCount > 0 && `${duplicateCount} teléfonos duplicados serán ignorados. `}
                        {invalidRows.length > 0 && `${invalidRows.length} registros inválidos serán omitidos. `}
                        Los duplicados existentes en la BD serán actualizados con los nuevos datos.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <button
              onClick={step === 'config' ? handleClose : () => setStep(step === 'confirm' ? 'upload' : 'config')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 'config' ? 'Cancelar' : 'Atrás'}
            </button>

            {step !== 'confirm' ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(step === 'config' ? 'upload' : 'confirm')}
                disabled={!canGoNext()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar {parsedRows.length} registros
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImportCSVModal;
