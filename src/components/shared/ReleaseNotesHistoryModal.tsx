import { Sparkles, Bug, Zap, Wrench, Clock, Tag } from 'lucide-react';
import { Modal } from '../base/Modal';
import { useVersionHistory } from '../../hooks/useVersionHistory';
import type { VersionHistoryEntry } from '../../hooks/useVersionHistory';
import { APP_VERSION } from '../../config/appVersion';

interface ReleaseNotesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcon: Record<string, React.ReactNode> = {
  'Features': <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
  'Bug Fixes': <Bug className="w-3.5 h-3.5 text-amber-400" />,
  'Performance': <Zap className="w-3.5 h-3.5 text-yellow-400" />,
  'Refactoring': <Wrench className="w-3.5 h-3.5 text-blue-400" />,
  'Mejoras': <Zap className="w-3.5 h-3.5 text-emerald-400" />,
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Hace menos de 1 hora';
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function extractFrontendVersion(version: string): string {
  const match = version.match(/N([\d.]+)/);
  return match ? `v${match[1]}` : version;
}

function VersionEntry({ entry, isCurrent }: { entry: VersionHistoryEntry; isCurrent: boolean }) {
  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-3 bottom-0 w-px bg-gray-200 dark:bg-gray-700 last:hidden" />
      {/* Timeline dot */}
      <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
        isCurrent
          ? 'bg-blue-500 border-blue-300 dark:border-blue-700'
          : 'bg-gray-300 dark:bg-gray-600 border-gray-200 dark:border-gray-700'
      }`} />

      {/* Version header */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${
          isCurrent
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}>
          <Tag className="w-3 h-3" />
          {extractFrontendVersion(entry.version)}
        </span>
        {isCurrent && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            actual
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Clock className="w-3 h-3" />
          {formatRelativeDate(entry.deployed_at)}
        </span>
      </div>

      {/* Release notes categories */}
      {entry.release_notes.length > 0 ? (
        <div className="space-y-2">
          {entry.release_notes.map((category, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-1.5 mb-1">
                {categoryIcon[category.type] || <Sparkles className="w-3.5 h-3.5 text-gray-400" />}
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {category.type}
                </span>
              </div>
              <ul className="space-y-0.5 pl-5">
                {category.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed flex items-start gap-1.5">
                    <span className="text-gray-400 dark:text-gray-500 mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin notas de release</p>
      )}
    </div>
  );
}

const ReleaseNotesHistoryModal: React.FC<ReleaseNotesHistoryModalProps> = ({ isOpen, onClose }) => {
  const { versions, isLoading } = useVersionHistory();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Historial de Versiones"
      description="Últimas actualizaciones de la plataforma"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No hay historial de versiones disponible
        </p>
      ) : (
        <div className="py-2">
          {versions.map((entry, index) => (
            <VersionEntry
              key={entry.version}
              entry={entry}
              isCurrent={entry.version === APP_VERSION}
            />
          ))}
        </div>
      )}
    </Modal>
  );
};

export default ReleaseNotesHistoryModal;
