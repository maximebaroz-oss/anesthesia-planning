export const SECTORS = [
  {
    id: 'duhb',
    name: 'DUHB',
    color: 'blue',
    units: [
      { id: 'hors-bloc', name: 'Hors Bloc' },
    ],
  },
  {
    id: 'extop',
    name: 'EXTOP',
    color: 'violet',
    units: [],
  },
  {
    id: 'unicat',
    name: 'UNICAT',
    color: 'emerald',
    units: [],
  },
  {
    id: 'bocha',
    name: 'BOCHA',
    color: 'orange',
    units: [],
  },
]

export const SECTOR_STYLES = {
  blue:    { card: 'border-blue-700 hover:border-blue-500',    badge: 'bg-blue-900 text-blue-300',    dot: 'bg-blue-500' },
  violet:  { card: 'border-violet-700 hover:border-violet-500', badge: 'bg-violet-900 text-violet-300', dot: 'bg-violet-500' },
  emerald: { card: 'border-emerald-700 hover:border-emerald-500', badge: 'bg-emerald-900 text-emerald-300', dot: 'bg-emerald-500' },
  orange:  { card: 'border-orange-700 hover:border-orange-500', badge: 'bg-orange-900 text-orange-300', dot: 'bg-orange-500' },
}
