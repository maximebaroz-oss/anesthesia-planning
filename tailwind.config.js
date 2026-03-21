/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    // Salle fermée (gris)
    'bg-gray-100', 'border-gray-300', 'bg-gray-300', 'bg-gray-500', 'text-white',
    // Salle au complet (vert)
    'bg-green-50', 'border-green-300', 'bg-green-500', 'bg-green-600',
    // Salle incomplète (orange)
    'bg-orange-50', 'border-orange-300', 'bg-orange-400', 'bg-orange-500',
    // Salle disponible (bleu)
    'bg-white', 'border-blue-200', 'bg-blue-600', 'bg-blue-100', 'text-blue-700',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
