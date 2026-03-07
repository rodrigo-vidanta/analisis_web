/**
 * Toast Interceptor - Sistema de switch global de notificaciones
 *
 * Intercepta las llamadas de react-hot-toast y las redirige a sileo
 * cuando el provider activo es 'sileo'. Permite rollback instantaneo
 * sin modificar los 61+ archivos que usan toast directamente.
 *
 * Funciona monkey-patching el objeto `toast` de react-hot-toast,
 * ya que todos los modulos comparten la misma referencia al objeto.
 */
import toast from 'react-hot-toast';
import { sileo } from 'sileo';

export type ToastProvider = 'react-hot-toast' | 'sileo';

// Guardar referencias originales de react-hot-toast
const originalSuccess = toast.success.bind(toast);
const originalError = toast.error.bind(toast);
const originalLoading = toast.loading.bind(toast);
const originalDismiss = toast.dismiss.bind(toast);

let activeProvider: ToastProvider = 'react-hot-toast';

/**
 * Retorna el fill color del blob SVG según el tema activo
 * Dark: slate-800 (superficie elevada sobre fondo slate-900)
 * Light: blanco puro (contrasta con fondo claro)
 */
const getThemedFill = (): string =>
  document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff';

/**
 * Extrae el texto de un mensaje de toast (puede ser string o JSX)
 */
const extractMessage = (message: unknown): string => {
  if (typeof message === 'string') return message;
  if (message && typeof message === 'object' && 'props' in (message as Record<string, unknown>)) {
    const props = (message as Record<string, unknown>).props as Record<string, unknown>;
    if (typeof props?.children === 'string') return props.children;
  }
  return 'Notificacion';
};

/**
 * Aplica el provider de toast activo.
 * Cuando es 'sileo', reemplaza los metodos de react-hot-toast
 * para redirigir las llamadas a sileo.
 * Cuando es 'react-hot-toast', restaura los metodos originales.
 */
export const applyToastProvider = (provider: ToastProvider) => {
  activeProvider = provider;

  if (provider === 'sileo') {
    // Override react-hot-toast methods → sileo
    toast.success = ((message: unknown, _opts?: unknown) => {
      sileo.success({ title: extractMessage(message), fill: getThemedFill() });
      return '';
    }) as typeof toast.success;

    toast.error = ((message: unknown, _opts?: unknown) => {
      sileo.error({ title: extractMessage(message), fill: getThemedFill() });
      return '';
    }) as typeof toast.error;

    toast.loading = ((message: unknown, _opts?: unknown) => {
      sileo.info({ title: extractMessage(message), fill: getThemedFill() });
      return '';
    }) as typeof toast.loading;

    // dismiss no tiene equivalente en sileo, lo dejamos como noop
    toast.dismiss = ((_toastId?: string) => {}) as typeof toast.dismiss;
  } else {
    // Restaurar originales
    toast.success = originalSuccess;
    toast.error = originalError;
    toast.loading = originalLoading;
    toast.dismiss = originalDismiss;
  }
};

/**
 * Obtiene el provider activo actual
 */
export const getActiveToastProvider = (): ToastProvider => activeProvider;
