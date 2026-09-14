export function formatDateIT(dateStr?: string | null): string {
  if (!dateStr) return '--/--/----';
  const trimmed = dateStr.trim();
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return trimmed;
}

export function parseDateObj(dateStr?: string | null): Date {
  if (!dateStr) return new Date(0);
  const trimmed = String(dateStr).trim();
  let parts = trimmed.includes('-') ? trimmed.split('-') : trimmed.split('/');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      // DD/MM/YYYY
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }
  return new Date(dateStr) || new Date(0);
}

export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+39')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('39') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

export function arePhonesMatching(phoneA?: string | null, phoneB?: string | null): boolean {
  const normA = normalizePhoneNumber(phoneA);
  const normB = normalizePhoneNumber(phoneB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length >= 7 && normB.length >= 7) {
    return normA.endsWith(normB) || normB.endsWith(normA);
  }
  return false;
}

export function isValidString(value?: unknown, minLength = 1): boolean {
  return typeof value === 'string' && value.trim().length >= minLength;
}

export function isValidDate(dateString?: string | null): boolean {
  if (!dateString) return false;
  const regex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
