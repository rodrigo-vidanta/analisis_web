/**
 * ============================================
 * UTILIDAD: Formateo de nombres de ejecutivos
 * ============================================
 *
 * Formato de display: "Nombre(s) Apellido1 Inicial2."
 * Ejemplo: "Darig Samuel Rosales Robledo" → "Darig Samuel Rosales R."
 *
 * Asume que full_name está en formato "Nombre(s) Apellido1 Apellido2"
 * y que first_name/last_name están correctamente separados en metadata.
 */

/**
 * Formatea nombre de ejecutivo para display en UI y plantillas.
 * Formato: "Nombre(s) Apellido1 Inicial2."
 *
 * @param fullName - Nombre completo en formato "Nombre(s) Apellido1 Apellido2"
 * @param firstName - Nombre(s) separados (opcional, si se tienen de user_profiles_v2)
 * @param lastName - Apellido(s) separados (opcional, si se tienen de user_profiles_v2)
 */
export function formatExecutiveDisplayName(
  fullName: string | null | undefined,
  firstName?: string | null,
  lastName?: string | null
): string {
  // Si tenemos first/last separados, usar esos (más confiable)
  if (firstName?.trim() && lastName?.trim()) {
    const nombres = firstName.trim();
    const apellidos = lastName.trim().split(/\s+/);
    if (apellidos.length >= 2) {
      const lastApellido = apellidos[apellidos.length - 1];
      const mainApellidos = apellidos.slice(0, -1).join(' ');
      return `${nombres} ${mainApellidos} ${lastApellido[0]}.`;
    }
    return `${nombres} ${apellidos[0]}`;
  }

  // Solo full_name disponible
  if (!fullName?.trim()) return '';
  const parts = fullName.trim().split(/\s+/);

  // 1-2 palabras: retornar tal cual (ej: "Elena Lemus", "Rodrigo Mora")
  if (parts.length <= 2) return fullName.trim();

  // 3+ palabras: asumir últimas 2 = apellidos, resto = nombres
  const apellido2 = parts[parts.length - 1];
  const apellido1 = parts[parts.length - 2];
  const nombres = parts.slice(0, -2).join(' ');
  return `${nombres} ${apellido1} ${apellido2[0]}.`;
}
