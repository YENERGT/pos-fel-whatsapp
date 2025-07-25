// app/utils/date-utils.js
export function parseDateFormats(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const cleanDate = dateString.trim();
  
  // Formato 1: DD/MM/YYYY HH:MM:SS (ej: "25/07/2025 14:30:45")
  const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const ddmmyyyyMatch = cleanDate.match(ddmmyyyyRegex);
  
  if (ddmmyyyyMatch) {
    const [, day, month, year, hour, minute, second] = ddmmyyyyMatch;
    // JavaScript Date constructor espera (year, month-1, day, hour, minute, second)
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Mes base 0
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  // Formato 2: YYYY-MM-DD HH:MM:SS (ej: "2025-07-25 14:30:45")
  const yyyymmddRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const yyyymmddMatch = cleanDate.match(yyyymmddRegex);
  
  if (yyyymmddMatch) {
    const [, year, month, day, hour, minute, second] = yyyymmddMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Mes base 0
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  // Formato adicional: Solo fecha DD/MM/YYYY (sin hora)
  const ddmmyyyyOnlyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const ddmmyyyyOnlyMatch = cleanDate.match(ddmmyyyyOnlyRegex);
  
  if (ddmmyyyyOnlyMatch) {
    const [, day, month, year] = ddmmyyyyOnlyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Formato adicional: Solo fecha YYYY-MM-DD (sin hora)
  const yyyymmddOnlyRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const yyyymmddOnlyMatch = cleanDate.match(yyyymmddOnlyRegex);
  
  if (yyyymmddOnlyMatch) {
    const [, year, month, day] = yyyymmddOnlyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Si no coincide con ningún formato específico, intentar con Date.parse como respaldo
  const fallbackDate = new Date(cleanDate);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

export function formatDateForSearch(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }

  // Retornar en formato legible para búsqueda: "DD/MM/YYYY HH:MM:SS"
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hour = String(dateObj.getHours()).padStart(2, '0');
  const minute = String(dateObj.getMinutes()).padStart(2, '0');
  const second = String(dateObj.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
}

export function isDateInRange(dateString, searchTerm) {
  const dateObj = parseDateFormats(dateString);
  if (!dateObj) return false;

  const searchLower = searchTerm.toLowerCase().trim();
  
  // Formatear la fecha en diferentes formatos para búsqueda
  const formats = [
    formatDateForSearch(dateObj), // DD/MM/YYYY HH:MM:SS
    dateObj.toISOString().slice(0, 19).replace('T', ' '), // YYYY-MM-DD HH:MM:SS
    dateObj.toLocaleDateString('es-GT'), // DD/MM/YYYY
    dateObj.toISOString().slice(0, 10), // YYYY-MM-DD
    String(dateObj.getDate()).padStart(2, '0'), // Solo día
    String(dateObj.getMonth() + 1).padStart(2, '0'), // Solo mes
    String(dateObj.getFullYear()) // Solo año
  ];

  // Verificar si algún formato contiene el término de búsqueda
  return formats.some(format => format.toLowerCase().includes(searchLower));
}
