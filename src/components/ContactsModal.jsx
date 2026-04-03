import { useState } from 'react'
import { X, Phone, Search, BookUser } from 'lucide-react'
import { WARM } from '../config/theme'

function tel(raw) {
  if (!raw) return null
  const first = String(raw).split(/[\/\-]/)[0].trim()
  return first.replace(/[\s.]/g, '')
}

const CONTACTS = [
  { section: 'Médecins-chefs & Adjoints', entries: [
    { name: 'ABIDI Nour', phone: '32 047' },
    { name: 'AL KHOURY AL KALLAB Rita', phone: '32 114' },
    { name: 'ALBU Gergely', phone: '32 052' },
    { name: 'ALDENKORTT Florence', phone: '32 173' },
    { name: 'BOLLEN PINTO Bernardo', phone: '32 125' },
    { name: 'BONHOMME Fanny', phone: '32 175' },
    { name: 'BOUREZG Ali', phone: '32099' },
    { name: 'DUMONT Lionel', phone: '38041' },
    { name: 'EICHENBERGER Alain-Stéphane', phone: '32 060' },
    { name: 'ELIA Nadia', phone: '32148' },
    { name: 'ELLENBERGER Christoph', phone: '33 460' },
    { name: 'FALCIOLA Véronique', phone: '32 934' },
    { name: 'FOURNIER Roxane', phone: '32 058' },
    { name: 'GOVAERTS Amaury', phone: '32 079' },
    { name: 'HAGERMAN Andres', phone: '32 076' },
    { name: 'HALLER Guy', phone: '32 174' },
    { name: 'JAKUS Lien', phone: '32 127' },
    { name: 'KIVRAK Selin', phone: '32 135' },
    { name: 'LAHOUD Marie-José', phone: '32 071' },
    { name: 'LEPOT Ariane', phone: '32 170' },
    { name: 'MAILLARD Julien', phone: '32 091' },
    { name: 'PAVLOVIC Gordana', phone: '32 098' },
    { name: 'REHBERG Benno', phone: '32 132' },
    { name: 'ROHRER Marcel', phone: '32 067' },
    { name: 'SAVOLDELLI Georges', phone: '32 088' },
    { name: 'SCHIFFER Eduardo', phone: '32 069' },
    { name: 'SCHNEIDER Alexis', phone: '32 112' },
    { name: 'SCHORER Raoul', phone: '32 038' },
    { name: 'SUPPAN Mélanie', phone: '32 734' },
    { name: 'VUTSKITS Laszlo', phone: '33 462' },
    { name: 'WHITE Marion', phone: '32143' },
    { name: 'ZOCCATELLI Davide', phone: '32 171' },
  ]},
  { section: 'Chefs de clinique', entries: [
    { name: 'AL CHAMMAS Monique', phone: '39954' },
    { name: 'ALTUN Sahra', phone: '36487' },
    { name: 'ANDREOLETTI Hulda', phone: '39952' },
    { name: 'BARDINI Claire', phone: '30977' },
    { name: 'BAROZ Maxime', phone: '32042' },
    { name: 'BAUMGARTNER Mélanie', phone: '39950' },
    { name: 'BECKMANN Tal', phone: '32147' },
    { name: 'BENVENUTI Claudia', phone: '32083' },
    { name: 'BERTIN Christophe', phone: '32070' },
    { name: 'BETELLO Marco', phone: '32 080' },
    { name: 'BEZZI Martina', phone: '38543' },
    { name: 'BOECHER Lena', phone: '32 145' },
    { name: 'BRUNET Timothée', phone: '32 130' },
    { name: 'BUFFAT Anaïs', phone: '32176' },
    { name: 'BURCHAM TIZZONI Pamela', phone: '34078' },
    { name: 'CAMPANA Mathieu', phone: '32 064' },
    { name: 'CAMPICHE Sarah', phone: '37705' },
    { name: 'CHEVALLEY Benjamin', phone: '32066' },
    { name: 'COMPOSTO Valeria', phone: '32124' },
    { name: 'DA COSTA RODRIGUES Joao', phone: '32040' },
    { name: 'DARAN-STEFANI Alexandra', phone: '30268' },
    { name: 'DEL PUPPO Lola', phone: '30975' },
    { name: 'DE MAZIERES Julie', phone: '32096' },
    { name: 'DE VALENCE Timothée', phone: '39741' },
    { name: 'FARKAS Katalin', phone: '32 048' },
    { name: 'FAVRE Melody', phone: '39759' },
    { name: 'FIKRI Jalal', phone: '32028' },
    { name: 'FOLLONIER David', phone: '38450' },
    { name: 'FROIDEVAUX Mathias', phone: '33672' },
    { name: 'FUBINI Pietro', phone: '37292' },
    { name: 'GARCIA Vincent', phone: '36834' },
    { name: 'GAZARIAN Corinne', phone: '39933' },
    { name: 'GIARRIZZO Andrea', phone: '32118' },
    { name: 'GLAUSER Amandine', phone: '38432' },
    { name: 'GRANGE Elliot', phone: '32140' },
    { name: 'IBSEN Arni', phone: '32 024' },
    { name: 'IMOBERSTEG Nathalie', phone: '32051' },
    { name: 'KEHOE Samuel', phone: '39955' },
    { name: 'KOEGEL Jérémie', phone: '32116' },
    { name: 'KRATZER Marie', phone: '32074' },
    { name: 'MANGOLD Samuel', phone: '30 976' },
    { name: 'MANOVA Ekaterina', phone: '32 039' },
    { name: 'MICKLIZT Nadine', phone: '32034' },
    { name: 'MIDEZ Remy', phone: '32 027' },
    { name: 'NOIRMAIN Caroline', phone: '32 077' },
    { name: 'OUNG Caroline', phone: '32938' },
    { name: 'PEDROSO BARROS DE BRITO Marina', phone: '32139' },
    { name: 'PERRET Laurélie', phone: '38374' },
    { name: 'PHAM Minh Hoan', phone: '32 043' },
    { name: 'POZZA Silvia', phone: '36466' },
    { name: 'PUTZU Alessandro', phone: '39935' },
    { name: 'RAIS Gaël', phone: '32 178' },
    { name: 'SASTRE Sabine', phone: '32 053' },
    { name: 'SCHAEFER Aubry', phone: '32021' },
    { name: 'SCHOPFER Léonore', phone: '32719' },
    { name: 'SEIDENBERG Ruth', phone: '38547' },
    { name: 'SHEKA Mootii', phone: '32111' },
    { name: 'SOLLANDER Fanny', phone: '38451' },
    { name: 'SOUMAILLE-REYNAUD Marine', phone: '32730' },
    { name: 'SUTER Manuel', phone: '32094' },
    { name: 'TOMALA Simon', phone: '32134' },
    { name: 'ULAJ Artida', phone: '32177' },
    { name: 'WYSSA Damien', phone: '30 974' },
  ]},
  { section: 'Internes', entries: [
    { name: 'AHMED SUGULLE Mohamed', phone: '36639' },
    { name: 'AL GHABOUR Yara', phone: '32075' },
    { name: 'BATARDON Jérôme', phone: '30978' },
    { name: 'BOVO Nicolas', phone: '32095' },
    { name: 'BROCCO-AEBERHARD Anne-Lise', phone: '36652' },
    { name: 'BUCHS Elisa', phone: '32093' },
    { name: 'BURGAN Ryan', phone: '32141' },
    { name: 'CAHEN Daphne', phone: '32929' },
    { name: 'CHATELAIN Jean-Baptiste', phone: '38055' },
    { name: 'CHENG Mylène', phone: '32732' },
    { name: 'CHRISTEN Liv', phone: '39362' },
    { name: 'CIBOTTO Cédric', phone: '32122' },
    { name: 'COMTE Virginie', phone: '38452' },
    { name: 'DALLA POLA Angelica', phone: '36653' },
    { name: 'DUBOIS Natacha', phone: '33965' },
    { name: 'DUNAND Alexandra', phone: '32087' },
    { name: 'EZE Randy', phone: '38499' },
    { name: 'FARO BARROS Daniel', phone: '32059' },
    { name: 'FERNANDES Mariana', phone: '32065' },
    { name: 'GALLI Noemi', phone: '32061' },
    { name: 'GEISSMANN Prune', phone: '32936' },
    { name: 'GERCEKCI Cenan', phone: '36465' },
    { name: 'GIBONI Laurie', phone: '39739' },
    { name: 'GLAIZOT Lucie', phone: '32927' },
    { name: 'GRECO Lorenzo', phone: '32136' },
    { name: 'GRUNDHEBER Matis', phone: '32126' },
    { name: 'HIRSCHEL Tiffany', phone: '32172' },
    { name: 'KREYENBUHL BAPTISTA Viktor', phone: '32117' },
    { name: 'LAPAIRE Arnaud', phone: '36576' },
    { name: 'LAURENCET Matthieu', phone: '32068' },
    { name: 'LAZEYRAS Joaquim', phone: '32738' },
    { name: 'LEVY Camille', phone: '37903' },
    { name: 'MEHMETI Fortesa', phone: '39777' },
    { name: 'MESSAR-SPLINTER Camélia', phone: '32035' },
    { name: 'PAGURA Angelina', phone: '32718' },
    { name: 'PARK Chae Hyun', phone: '36468' },
    { name: 'PASCHE Christopher', phone: '32129' },
    { name: 'PASCHOUD Catherine', phone: '32931' },
    { name: 'PENATI Monica', phone: '32029' },
    { name: 'PFEIFFLE Natacha', phone: '38448' },
    { name: 'PRAPLAN Guillaume', phone: '36467' },
    { name: 'PREGERNIG Andreas', phone: '38053' },
    { name: 'REY-MILLET Quentin', phone: '38054' },
    { name: 'ROMELLI Timothy', phone: '32062' },
    { name: 'SAUDAN Margaux', phone: '36530' },
    { name: 'SAUVIN Margot', phone: '38449' },
    { name: 'SCHUTZBACH Kevin', phone: '36548' },
    { name: 'SHIBIB Ali', phone: '32073' },
    { name: 'STURNY Ludovic', phone: '32110' },
    { name: 'SUDY Roberta', phone: '36469' },
    { name: 'SYPNIEWSKA Paulina', phone: '32 149' },
    { name: 'TAFER Noah', phone: '36640' },
    { name: 'VALITON Vivian', phone: '30287' },
    { name: 'VIONNET Aurore', phone: '39740' },
  ]},
  { section: 'Bips d\'urgence & fonction', entries: [
    { name: 'Senior hors bloc', phone: '33 501' },
    { name: 'Senior répondant Julliard', phone: '35919' },
    { name: 'Chef de clinique BOU', phone: '33 500' },
    { name: 'Médecin interne Ortho', phone: '33 510' },
    { name: 'Médecin interne BOU', phone: '32 724' },
    { name: 'Médecin de garde Maternité', phone: '32 722' },
    { name: 'Médecin garde 2 Maternité', phone: '32 725' },
    { name: 'CDC jour Gynéco', phone: '32 731' },
    { name: 'CDC jour Obstétrique', phone: '32 727' },
    { name: 'Garde de jour Ophtalmo', phone: '34 033' },
    { name: 'Médecin de garde Pédiatrie', phone: '32 030' },
    { name: 'Médecin répondant BOCHA', phone: '32 729' },
    { name: 'Senior BOU', phone: '32 737' },
    { name: 'Médecin cadre Prévost', phone: '39016' },
    { name: 'Sénior répondant Hors-Bloc', phone: '36638' },
    { name: 'CDC SINPI', phone: '32 733' },
    { name: 'Médecin SSPI OPERA', phone: '32937' },
    { name: 'SSPI SIA-GH', phone: '39717' },
    { name: 'Méd. soins intermédiaires 6e étage', phone: '32 078' },
    { name: 'Médecin répondant Radiologie', phone: '30458' },
    { name: 'Médecin répondant Antalgie post-op', phone: '32 723' },
    { name: 'Méd. répondant Méd. Interventionnelle', phone: '32 717' },
    { name: 'Médecin répondant bloc 3e étage', phone: '32 044' },
    { name: 'Urgence DIG salle 11 / consultation', phone: '32 736' },
    { name: 'Médecin répondant Neurochirurgie', phone: '31 881' },
    { name: 'Médecin répondant Neurochirurgie GIBOR', phone: '31 882' },
    { name: 'Numéro fixe GIBOR', phone: '27 237' },
    { name: 'Médecin ortho électif OPERA', phone: '32 735' },
    { name: 'Médecin répondant VVC ETO cardioversion', phone: '32045' },
    { name: 'Garde Hélico (interne)', phone: '53797' },
    { name: 'Garde Hélico (externe)', phone: '0227980000' },
  ]},
  { section: 'Salles & Infirmiers', entries: [
    { name: 'GARDE BOU 1', phone: '32 783' },
    { name: 'GARDE BOU 2', phone: '32 763' },
    { name: 'GARDE BOU 3', phone: '32 784' },
    { name: 'GARDE MAT', phone: '32 757' },
    { name: 'GARDE PED', phone: '32 768' },
    { name: 'EXTOP TRAUMA ORTHO', phone: '32 771' },
    { name: 'EXTOP ORTHO', phone: '34 158' },
    { name: 'ORL Salle 2', phone: '38 687' },
    { name: 'ORL Salle 3', phone: '31857' },
    { name: 'ORL Salle 4', phone: '36684' },
    { name: 'ORL Salle 5', phone: '37854' },
    { name: 'ANTALGIE', phone: '34 434' },
    { name: 'OPERA CVT', phone: '34 159' },
    { name: 'CARDIO TAVI (Hors-Bloc)', phone: '32 238' },
    { name: 'NEURO', phone: '34 188' },
    { name: 'GIBOR', phone: '31 931' },
    { name: 'PHARMACIE', phone: '34 163' },
    { name: 'ENDO GASTRO (Hors-Bloc)', phone: '34 186' },
    { name: 'ENDO COLO (Hors-Bloc)', phone: '38 018' },
    { name: 'PNEUMO salle 7 (Hors-Bloc)', phone: '33 706' },
    { name: 'ENDOSCOPIE (Trois-Chênes)', phone: '30 778' },
    { name: 'SOINS DENTAIRE (Belle-Idée)', phone: '55 433' },
    { name: 'NEURO RADIO RX1 (Hors-Bloc)', phone: '34 165' },
    { name: 'NEURO RADIO RX2 (Hors-Bloc)', phone: '34 164' },
    { name: 'BOCHA UROLOGIE', phone: '30 335' },
    { name: 'BOCHA DIG', phone: '32 883' },
    { name: 'BOCHA ORTHO', phone: '31 859' },
    { name: 'VVC', phone: '39 816' },
    { name: 'JULLIARD salle 11', phone: '30 299' },
    { name: 'OPERA DIG', phone: '34 160' },
    { name: 'OPHTALMOLOGIE', phone: '34 182' },
    { name: 'GYNECOLOGIE', phone: '34 181' },
    { name: 'ANTALGIE PEDIATRIQUE', phone: '34 175' },
    { name: 'IRM / RADIO PEDIATRIE', phone: '34 177' },
    { name: 'POOL', phone: '32759' },
    { name: 'IRH SSPI Opéra', phone: '33734' },
    { name: 'SINPI', phone: '34884' },
    { name: 'AS PREVOST', phone: '34 156' },
    { name: 'AS BOU', phone: '34 036' },
    { name: 'AS BOCHA', phone: '34 167' },
    { name: 'AS HORS-BLOC', phone: '33 431' },
    { name: 'AS JULLIARD', phone: '34 157' },
    { name: 'AS SINPI', phone: '30 166' },
    { name: 'AS EXTOP', phone: '30 488' },
    { name: 'AS ORL', phone: '34 166' },
    { name: 'AS MAT/OPHTALMO', phone: '32 569' },
    { name: 'AS PEDIATRIE', phone: '34 176' },
    { name: 'SSPI OPERA', phone: '27 658' },
    { name: 'SSPI ORL', phone: '53426' },
    { name: 'SSPI BOCHA', phone: '31565' },
    { name: 'PCL DESK', phone: '27 972' },
    { name: 'PCL SALON', phone: '27 933' },
    { name: 'SSPI PEDIATRIE', phone: '53 703' },
    { name: 'SSPI GYNECOLOGIE', phone: '24 549' },
  ]},
  { section: 'Administratif & DMA', entries: [
    { name: 'BEAUVERD Eliane', phone: '27 402' },
    { name: 'VILLANT Florence', phone: '27 430' },
    { name: 'ITEN LE HYARIC Myriam', phone: '27 411' },
    { name: 'EL JAZIRI Firdaws', phone: '36544' },
    { name: 'Consultation antalgie — LE SEAUX Valérie', phone: '29933' },
    { name: 'BULA Grégoire (ARS-IRES)', phone: '31229' },
    { name: 'BRUNHOSA Laetitia (Soins-IRES)', phone: '27611' },
    { name: 'RUDAZ Myriam', phone: '27 421' },
    { name: 'Coordination IRES', phone: '32 778' },
    { name: 'DONGOIS Emmanuelle (EXTOP/ORL/Antalgie)', phone: '32 228' },
    { name: 'LECHAPPE Vincent (PED/GYN/Obst/Opht)', phone: '32 227' },
    { name: 'RICHARD Marie (DIG/URO/SSPI)', phone: '32225' },
    { name: 'LUISE Stéphane (DIG/URO/SSPI)', phone: '32979' },
    { name: 'BENMAMAS Dalila (BOCHA/Hors-Bloc)', phone: '32 226' },
    { name: 'BARNET Laurence (BOU/CVT/NEURO/GIBOR)', phone: '30 164' },
    { name: 'FONTAINE IAMPIERI Carole (SINPI)', phone: '37946' },
    { name: 'DOURERADJAM R. (chargé formation)', phone: '32 224' },
    { name: 'CANOVA Amandine (chargée de formation)', phone: '37602' },
    { name: 'GHANNOO Ehsaan (inf. spécialiste)', phone: '39305' },
    { name: 'ALBANEL Xavier (inf. expert)', phone: '37245' },
    { name: 'PIQUET IRES (week-end & jours fériés)', phone: '0794774218' },
    { name: 'TEXIER Isabelle (Cheffe secrétariats)', phone: '30449' },
    { name: 'MENOUD Jean-François (Resp. soins)', phone: '27610' },
    { name: 'FANCELLO Enzo (Administrateur)', phone: '27408' },
    { name: 'POURRET Max-Olivier (Resp. RH)', phone: '27503' },
    { name: 'ROTH Cinthia (Assistante Dpt)', phone: '30246' },
    { name: 'LAROCHE Thierry (Chef de projet DMA)', phone: '32222' },
    { name: 'IZAMBAYI Rissa (Séc. LEGO)', phone: '23024' },
  ]},
  { section: 'Médecins associés & consultants', entries: [
    { name: 'BALMER Christian', phone: '0787187713' },
    { name: 'CHATELLARD Ghislaine', phone: '32 055' },
  ]},
]

// Sections affichées dans le modal (sans les médecins, déjà dans l'onglet Med)
const CONTACTS_DISPLAY = CONTACTS.filter(s =>
  !['Médecins-chefs & Adjoints', 'Chefs de clinique', 'Internes', 'Médecins associés & consultants'].includes(s.section)
)

function findGsmPhone(fullName) {
  if (!fullName) return null
  const parts = fullName.toUpperCase().split(' ')
  for (const section of CONTACTS) {
    for (const entry of section.entries) {
      const entryUp = entry.name.toUpperCase()
      if (parts.some(p => p.length > 2 && entryUp.startsWith(p))) return entry.phone
    }
  }
  return null
}

export { CONTACTS, findGsmPhone }

export default function ContactsModal({ theme, onClose }) {
  const T = theme ?? WARM
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const filtered = q.length < 2
    ? CONTACTS_DISPLAY
    : CONTACTS_DISPLAY.map(s => ({
        ...s,
        entries: s.entries.filter(e =>
          e.name.toLowerCase().includes(q) || e.phone?.replace(/\s/g, '').includes(q)
        )
      })).filter(s => s.entries.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        style={{ background: T.pageBg, maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
          style={{ borderColor: T.border }}>
          <div className="flex items-center gap-2">
            <BookUser size={18} style={{ color: T.accentBar }} />
            <span className="font-bold text-base" style={{ color: T.text }}>Annuaire GSM</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl touch-manipulation" style={{ color: T.textSub }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0 border-b" style={{ borderColor: T.border }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textFaint }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un nom ou numéro..."
              style={{ background: T.surface, borderColor: T.border, color: T.text }}
              className="w-full border rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {filtered.length === 0 && (
            <p className="text-sm italic text-center py-8" style={{ color: T.textFaint }}>Aucun résultat</p>
          )}
          {filtered.map(section => (
            <div key={section.section}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2 py-1 sticky top-0"
                style={{ color: T.accentBar, background: T.pageBg }}>
                {section.section}
              </p>
              <div className="space-y-1">
                {section.entries.map((e, i) => {
                  const cleaned = tel(e.phone)
                  return (
                    <div key={i}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      <span className="text-sm flex-1 truncate pr-3" style={{ color: T.text }}>{e.name}</span>
                      {cleaned ? (
                        <a href={`tel:${cleaned}`}
                          className="flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold touch-manipulation active:scale-95 transition-transform"
                          style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                          <Phone size={12} />
                          {e.phone}
                        </a>
                      ) : (
                        <span className="text-xs italic flex-shrink-0" style={{ color: T.textFaint }}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
