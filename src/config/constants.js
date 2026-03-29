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

export const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

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

export function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
}
