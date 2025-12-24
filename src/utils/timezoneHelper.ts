/**
 * Utilidad para conversión de zona horaria
 * Los timestamps de las conversaciones vienen en UTC y deben mostrarse en hora de México (UTC-6)
 */

/**
 * Convierte un timestamp de formato "H:MM:SS a.m./p.m." de UTC a hora de México (UTC-6)
 * @param utcTimestamp - Timestamp en formato "7:06:43 p.m." (UTC)
 * @returns Timestamp convertido a hora de México
 */
export const convertUTCToMexicoTime = (utcTimestamp: string): string => {
  if (!utcTimestamp || utcTimestamp.trim() === '') {
    return utcTimestamp;
  }

  try {
    // Parsear el timestamp de formato "H:MM:SS a.m./p.m." o "HH:MM:SS a.m./p.m."
    const match = utcTimestamp.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(a\.m\.|p\.m\.|AM|PM|am|pm)$/i);
    
    if (!match) {
      // Si no coincide con el formato esperado, devolver sin cambios
      return utcTimestamp;
    }

    let [, hoursStr, minutes, seconds, period] = match;
    let hours = parseInt(hoursStr, 10);
    
    // Normalizar el período
    const isPM = period.toLowerCase().includes('p');
    
    // Convertir a formato 24 horas
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }

    // Restar 6 horas para hora de México (UTC-6)
    hours -= 6;
    
    // Ajustar si cruza la medianoche hacia atrás
    if (hours < 0) {
      hours += 24;
    }

    // Convertir de vuelta a formato 12 horas
    let newPeriod = 'a.m.';
    let displayHours = hours;
    
    if (hours >= 12) {
      newPeriod = 'p.m.';
      if (hours > 12) {
        displayHours = hours - 12;
      }
    } else if (hours === 0) {
      displayHours = 12;
    }

    return `${displayHours}:${minutes}:${seconds} ${newPeriod}`;
  } catch (error) {
    console.warn('Error convirtiendo timestamp a hora de México:', error);
    return utcTimestamp;
  }
};

/**
 * Formatea una fecha ISO a hora de México con formato legible
 * @param isoDate - Fecha en formato ISO (e.g., "2025-12-17T18:01:44.43+00:00")
 * @returns Fecha formateada en hora de México
 */
export const formatISOToMexicoTime = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Error formateando fecha ISO a hora de México:', error);
    return isoDate;
  }
};



