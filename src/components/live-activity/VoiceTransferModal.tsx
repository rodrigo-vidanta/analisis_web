/**
 * ============================================
 * MODAL: VOICE TRANSFER - SELECCIONAR DESTINO
 * ============================================
 *
 * Modal con lista de miembros online de la coordinacion,
 * agrupados por rol, para seleccionar a quien transferir.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRightLeft,
  Loader2,
  Users,
  Shield,
  Crown,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { voiceTransferService, type TeamMember, type TransferCallParams, type WarmTransferData } from '../../services/voiceTransferService';

// ============================================
// TYPES
// ============================================

export interface VoiceTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentCallSid: string;
  coordinacionId: string;
  llamadaCallId: string;
  prospectoId: string;
  prospectoNombre?: string;
  fromNumber?: string;
  tipoLlamada?: string;
  /** IDs de todas las coordinaciones del usuario actual */
  userCoordinacionIds: string[];
  /** Callback cuando la transferencia fue iniciada exitosamente (antes del close) */
  onTransferStarted?: (targetName: string, warmData: WarmTransferData) => void;
}

// Roles agrupados y su config visual
const ROLE_GROUPS: { key: string; label: string; icon: React.ReactNode; matches: string[] }[] = [
  { key: 'coordinador', label: 'Coordinadores', icon: <Crown className="w-4 h-4 text-amber-400" />, matches: ['coordinador'] },
  { key: 'supervisor', label: 'Supervisores', icon: <Shield className="w-4 h-4 text-purple-400" />, matches: ['supervisor'] },
  { key: 'ejecutivo', label: 'Ejecutivos', icon: <User className="w-4 h-4 text-blue-400" />, matches: ['ejecutivo', 'ejecutivo_pisos'] },
];

function getRoleGroup(roleName: string): string {
  const lower = roleName.toLowerCase();
  for (const group of ROLE_GROUPS) {
    if (group.matches.some(m => lower.includes(m))) return group.key;
  }
  return 'ejecutivo';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ============================================
// COMPONENT
// ============================================

export const VoiceTransferModal: React.FC<VoiceTransferModalProps> = ({
  isOpen,
  onClose,
  parentCallSid,
  coordinacionId,
  llamadaCallId,
  prospectoId,
  prospectoNombre,
  fromNumber,
  tipoLlamada,
  userCoordinacionIds,
  onTransferStarted,
}) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar miembros online al abrir
  useEffect(() => {
    if (!isOpen) {
      setMembers([]);
      setError(null);
      setSuccess(null);
      setTransferTarget(null);
      setIsTransferring(false);
      return;
    }

    const loadMembers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const coordIds = userCoordinacionIds.length > 0 ? userCoordinacionIds : [coordinacionId];
        const data = await voiceTransferService.getOnlineTeamMembers(coordIds);
        setMembers(data);
        if (data.length === 0) {
          setError('No hay miembros del equipo conectados');
        }
      } catch {
        setError('Error al cargar miembros del equipo');
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [isOpen, coordinacionId, userCoordinacionIds]);

  const handleTransfer = async (member: TeamMember) => {
    setIsTransferring(true);
    setTransferTarget(member.user_id);
    setError(null);

    const params: TransferCallParams = {
      parentCallSid,
      targetUserId: member.user_id,
      coordinacionId,
      llamadaCallId,
      prospectoId,
      prospectoNombre,
      fromNumber,
      tipoLlamada,
    };

    const result = await voiceTransferService.transferCall(params);

    if (result.success) {
      const targetName = result.targetName || member.full_name;
      setSuccess(`Conectando conferencia con ${targetName}...`);
      if (result.conferenceSid && result.prospectoParticipantSid) {
        onTransferStarted?.(targetName, {
          conferenceName: result.conferenceName ?? '',
          conferenceSid: result.conferenceSid,
          prospectoParticipantSid: result.prospectoParticipantSid,
          transferId: result.transferId ?? '',
          targetName,
        });
      }
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError(result.error || 'Error al transferir');
      setIsTransferring(false);
      setTransferTarget(null);
    }
  };

  // Agrupar miembros por rol
  const grouped = ROLE_GROUPS.map(group => ({
    ...group,
    members: members.filter(m => getRoleGroup(m.role_name) === group.key),
  })).filter(g => g.members.length > 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[380px] max-h-[70vh] bg-gray-900/98 backdrop-blur-xl border border-gray-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Transferir Llamada</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {prospectoNombre && (
              <p className="text-xs text-gray-500 mt-1">
                Prospecto: <span className="text-gray-400">{prospectoNombre}</span>
              </p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-ultra-thin">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                <p className="text-sm text-gray-500">Buscando miembros conectados...</p>
              </div>
            ) : success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                <p className="text-sm text-emerald-300 font-medium">{success}</p>
              </motion.div>
            ) : (
              <>
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}

                {grouped.map(group => (
                  <div key={group.key}>
                    <div className="flex items-center gap-2 mb-2">
                      {group.icon}
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-gray-600">({group.members.length})</span>
                    </div>

                    <div className="space-y-1.5">
                      {group.members.map(member => (
                        <button
                          key={member.user_id}
                          onClick={() => handleTransfer(member)}
                          disabled={isTransferring}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                            transferTarget === member.user_id
                              ? 'bg-blue-600/20 border border-blue-500/40'
                              : 'bg-gray-800/40 border border-gray-700/30 hover:bg-gray-800/80 hover:border-gray-600/50'
                          } ${isTransferring && transferTarget !== member.user_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {/* Avatar with online dot */}
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-300">
                              {getInitials(member.full_name)}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900" />
                          </div>

                          {/* Name + role */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{member.full_name}</p>
                            <p className="text-[10px] text-gray-500 capitalize">{member.role_name.replace(/_/g, ' ')}</p>
                          </div>

                          {/* Transfer indicator */}
                          {transferTarget === member.user_id ? (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                          ) : (
                            <ArrowRightLeft className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {members.length === 0 && !isLoading && !error && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Users className="w-10 h-10 text-gray-700 mb-3" />
                    <p className="text-sm text-gray-500">No hay miembros conectados</p>
                    <p className="text-xs text-gray-600 mt-1">Solo se muestran miembros de tu coordinacion</p>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceTransferModal;
