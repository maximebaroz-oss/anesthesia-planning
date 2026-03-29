export const UNITS = [
  {
    id: 'duhb',
    name: 'DUHB',
    color: 'blue',
    sectors: [
      { id: 'hors-bloc', name: 'Hors Bloc' },
      { id: 'julliard',  name: 'Julliard' },
    ],
  },
  {
    id: 'extop',
    name: 'EXTOP',
    color: 'violet',
    sectors: [],
  },
  {
    id: 'unicat',
    name: 'UNICAT',
    color: 'emerald',
    sectors: [
      { id: 'bou',           name: 'BOU' },
      { id: 'traumatologie', name: 'Traumatologie' },
      { id: 'prevost',       name: 'Prévost' },
    ],
  },
  {
    id: 'bocha',
    name: 'BOCHA',
    color: 'orange',
    sectors: [],
  },
  {
    id: 'amopa',
    name: 'AMOPA',
    color: 'fuchsia',
    sectors: [
      { id: 'bocha-amopa',    name: 'BOCHA' },
      { id: 'orl-maxfa-plastie', name: 'ORL/MAX-FA/Plastie' },
      { id: 'antalgie',       name: 'Antalgie' },
    ],
  },
]

export const UNIT_STYLES = {
  blue:    { card: 'border-blue-700 hover:border-blue-500',    badge: 'bg-blue-900 text-blue-300',    dot: 'bg-blue-500' },
  violet:  { card: 'border-violet-700 hover:border-violet-500', badge: 'bg-violet-900 text-violet-300', dot: 'bg-violet-500' },
  emerald: { card: 'border-emerald-700 hover:border-emerald-500', badge: 'bg-emerald-900 text-emerald-300', dot: 'bg-emerald-500' },
  orange:  { card: 'border-orange-700 hover:border-orange-500', badge: 'bg-orange-900 text-orange-300', dot: 'bg-orange-500' },
  fuchsia: { card: 'border-fuchsia-700 hover:border-fuchsia-500', badge: 'bg-fuchsia-900 text-fuchsia-300', dot: 'bg-fuchsia-500' },
}
