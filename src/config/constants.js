export const ROOM_NAMES = {
  // Hors Bloc (HB)
  1: 'Gastro 4',
  2: 'Gastro 5',
  3: 'Broncho 7',
  4: 'Radio 11',
  5: 'Radio 12',
  6: 'Neuro-radio 13',
  7: 'Cardio 17',
  8: 'Tardif',
  9: 'Consultation',
  // Julliard
  10: 'Viscérale 10',
  11: 'Urg Viscérale 11',
  12: 'Viscérale 12',
  13: 'Uro 13',
  14: 'Viscérale 14',
  15: 'Consultation',
  16: 'Visite J+1',
  17: 'Consultation greffe',
  // BOU (UNICAT)
  18: 'BOU 1 (33501)',
  19: 'BOU 2 (33501)',
  20: 'BOU 1 (33500)',
  21: 'BOU 3 (32737)',
  22: 'Poly B Prévost',
  // Traumatologie (UNICAT)
  23: 'CDC Traumato (33510)',
  24: 'Tardif Traumato',
  36: 'Interne Salle 7',
  37: 'Interne Salle 8',
  // Prévost (UNICAT)
  25: 'NCH GIBOR',
  26: 'NCH Salle 4 (hybride)',
  27: 'NCH Salle 1',
  28: 'CV Salle 5 (hybride)',
  29: 'CV Salle 1',
  30: 'THO Salle 2',
  31: 'Cardio struct salle 5',
  32: 'CVT Tardif',
  33: 'NC Tardif',
  34: 'Consultation CVT',
  35: 'Consultation NCh',
  // BOCHA (AMOPA)
  38: 'Senior 1',
  39: 'Senior 2',
  40: 'Interne 1',
  41: 'Interne 2',
  42: 'CDC BOCHA',
  // ORL/MAX-FA/Plastie (AMOPA)
  43: 'Senior 1',
  44: 'CDC 1',
  45: 'Interne 1',
  46: 'Interne 2',
  47: 'Interne 3',
  48: 'Senior 2',
  49: 'Belle-idée CDC',
  // Antalgie (AMOPA)
  50: 'Antalgie',
  51: 'Interne 1',
  52: 'Interne 2',
  53: 'Antalgie chronique box 1',
  54: 'Antalgie chronique box 7',
  55: 'Antalgie chronique box 8',
  56: 'Antalgie chronique box 3/BOCHA 4',
  // Gynéco (Maternité)
  57: 'Sup/MG1',
  58: 'MG2 Interne',
  59: 'MG2 CDC',
  60: 'MG3 Tardif',
  61: 'MG4 Tardif',
  62: 'MG5 Da Vinci',
  63: 'MC Consult',
  // Obstétrique (Maternité)
  64: 'MO1 (32727)',
  65: 'MO2 CS électives',
  66: 'MO1 Jour (32722)',
  67: 'MO1 Soir (32722)',
  68: 'MO1 Garde WE (32727)',
  69: 'MO2 Garde WE (32722)',
  70: 'MO1 Garde N (32727)',
  71: 'MO2 Garde N (32722)',
  72: 'Piquet Maternité',
  // Ophtalmo
  73: 'Ophtalmologie',
  // SINPI
  74: 'Superviseur',
  75: 'Superviseur ISA',
  76: 'SINPI AM 07h-16h',
  77: 'SINPI PM 13h-22h',
  78: 'SSPI 11h-21h',
  79: 'SINPI AM 07h-17h',
  80: 'SINPI PM 12h-22h',
  81: 'Nuit 21h30-07h30',
  82: 'WE S1 07h-19h30',
  83: 'WE S2 07h-17h',
  84: 'WE Nuit 19h-07h30',
  85: 'Piquet Adjoint',
  // EXTOP
  86: 'Salle 1',
  87: 'Salle 2',
  88: 'Salle 3',
  89: 'Salle 4',
  90: 'Tardif Cadre',
  91: 'Consult BOX 2 0CL',
  92: 'Consult BOX 3 0CL',
}

// Abréviations (listes, badges)
export const GRADE_LABELS = {
  adjoint:      'Adj.',
  chef_clinique:'CDC',
  interne:      'Int.',
  consultant:   'Cons.',
  iade:         'ISA',
}

// Texte complet (profil, header)
export const GRADE_LABELS_FULL = {
  adjoint:      'Adjoint',
  chef_clinique:'Chef de clinique',
  interne:      'Interne',
  consultant:   'Consultant',
  iade:         'ISA',
}

// Retourne true si la salle est un horaire de nuit ou de week-end
export function isNightOrWE(roomName) {
  if (!roomName) return false
  const n = roomName.toLowerCase()
  return n.includes('nuit') ||
         n.includes('garde n') ||
         n.includes('garde we') ||
         n.startsWith('we ') ||
         n.includes(' we ') ||
         n.includes('soir') ||
         n.includes('tardif')
}

export const DAY_NAMES   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
export const DAY_NAMES_7 = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/**
 * Normalise un nom pour la comparaison : supprime TOUS les accents/diacritiques,
 * normalise tirets et espaces. Source unique de vérité pour tous les imports.
 *
 * Couvre :
 *  - NFD + plage \u0300-\u036f  → é,è,ê,ë,à,â,ä,ù,û,ü,î,ï,ô,ö,ç,ñ,ő,ū…
 *  - Ligatures non-décomposables : Œ→OE, Æ→AE, œ→OE, æ→AE
 *  - Caractères scandinaves     : Ø/ø→O, Å/å→A, Ð/ð→D, Þ/þ→TH
 *  - ß→SS (allemand, rare)
 *  - Tirets entourés d'espaces  : "DARAN - STEFANI" → "DARAN-STEFANI"
 *  - Espaces multiples          → espace simple
 */
export function normalizeName(str) {
  if (!str) return ''
  return str.trim().toUpperCase()
    // 1. Décompose les caractères précomposés (é → e + ́)
    .normalize('NFD')
    // 2. Supprime tous les diacritiques combinants (accents, cédilles, trémas…)
    .replace(/[\u0300-\u036f]/g, '')
    // 3. Ligatures non-décomposables par NFD
    .replace(/[Œœ]/g, 'OE')
    .replace(/[Ææ]/g, 'AE')
    // 4. Caractères spéciaux restants
    .replace(/[Øø]/g, 'O')
    .replace(/[Åå]/g, 'A')
    .replace(/ß/g,    'SS')
    // 5. Normalise les tirets et espaces
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

// Particules nobiliaires françaises (appartiennent au nom de famille)
const PARTICLES = new Set(['de', 'du', 'des', 'le', 'la', 'les', "d'"])

// Trouve l'index où commence le nom de famille (première particule ou dernier mot)
function lastNameStart(parts) {
  for (let i = 0; i < parts.length - 1; i++) {
    if (PARTICLES.has(parts[i].toLowerCase())) return i
  }
  return parts.length - 1
}

// Formate "Prénom [Particule] Nom" → "NOM Prénom" (uppercase)
export function formatLastFirst(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return parts[0].toUpperCase()
  const idx   = lastNameStart(parts)
  const last  = parts.slice(idx).join(' ').toUpperCase()
  const first = parts.slice(0, idx).join(' ')
  return `${last} ${first}`
}

// Extrait le nom de famille (avec particule, uppercase) pour le tri
export function getLastName(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(' ')
  return parts.slice(lastNameStart(parts)).join(' ').toUpperCase()
}

export function getCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekDays(monday) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function getFullWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}
