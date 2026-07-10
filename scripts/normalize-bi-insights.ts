/**
 * Normaliza el dataset 'insights' (SNIES) en Postgres:
 *   1. Restaura las tildes/ñ/ü en los nombres de programa y NBC, que en la
 *      fuente MEN vienen corruptas (el carácter «¿» sustituye a á/é/í/ó/ú/ñ/ü).
 *   2. Reubica los programas con área de conocimiento «Sin clasificar» en el
 *      área más pertinente, inferida por palabras clave del nombre del programa.
 *
 * Ejecutar:
 *   npx tsx scripts/normalize-bi-insights.ts --dry      (solo reporta, no escribe)
 *   npx tsx scripts/normalize-bi-insights.ts            (aplica en la BD)
 *   npx tsx scripts/normalize-bi-insights.ts --write-source   (además reescribe dataset_web.js)
 *
 * Idempotente: correrlo dos veces no cambia nada (los textos ya no tienen «¿»
 * y las filas reubicadas ya no están en «Sin clasificar»).
 * Lee DATABASE_URL del entorno o de .env. No imprime la cadena de conexión.
 */
import fs from 'node:fs'
import { Pool } from 'pg'

function readDatabaseUrl(): string {
  let url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()
  if (!url && fs.existsSync('.env')) {
    const line = fs.readFileSync('.env', 'utf8').split('\n').find((l) => l.trim().startsWith('DATABASE_URL='))
    if (line) url = line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
  }
  const m = url.match(/postgres(?:ql)?:\/\/[^'"\s]+/i)
  return m ? m[0] : url
}

// Mapa de fragmentos corruptos → forma correcta (cubre los 148 tokens observados
// en la fuente; se aplican los más largos primero para evitar solapamientos).
const ACCENT_MAP: Record<string, string> = {
  'Acompa¿amiento': 'Acompañamiento', 'Actuar¿a': 'Actuaría', 'Administraci¿n': 'Administración',
  'Agr¿cola': 'Agrícola', 'Anal¿tic': 'Analític', 'An¿lisis': 'Análisis', 'An¿litic': 'Analític',
  'Arquitect¿nico': 'Arquitectónico', 'Auditor¿a': 'Auditoría', 'Automatizaci¿n': 'Automatización',
  'Biling¿ismo': 'Bilingüismo', 'Biling¿e': 'Bilingüe', 'Biol¿gico': 'Biológico', 'Biom¿dica': 'Biomédica',
  'Biotecnolog¿a': 'Biotecnología', 'Bio¿tica': 'Bioética', 'Bogot¿': 'Bogotá', 'B¿sica': 'Básica',
  'Caf¿': 'Café', 'Cart¿n': 'Cartón', 'Certificaci¿n': 'Certificación', 'Cient¿fic': 'Científic',
  'Cirug¿a': 'Cirugía', 'Cl¿nica': 'Clínica', 'Cl¿sica': 'Clásica', 'Computaci¿n': 'Computación',
  'Comunicaci¿n': 'Comunicación', 'Confecci¿n': 'Confección', 'Configuraci¿n': 'Configuración',
  'Construcci¿n': 'Construcción', 'Contempor¿nea': 'Contemporánea', 'Contrataci¿n': 'Contratación',
  'Coordinaci¿n': 'Coordinación', 'Creaci¿n': 'Creación', 'Criminol¿gica': 'Criminológica',
  'C¿maras': 'Cámaras', 'Danc¿stica': 'Dancística', 'Diagn¿stica': 'Diagnóstica', 'Did¿ctica': 'Didáctica',
  'Direcci¿n': 'Dirección', 'Dise¿ador': 'Diseñador', 'Dise¿o': 'Diseño', 'Econom¿a': 'Economía',
  'Educaci¿n': 'Educación', 'Electr¿nico': 'Electrónico', 'El¿ctrico': 'Eléctrico', 'Energ¿as': 'Energías',
  'Energ¿tico': 'Energético', 'Ense¿anza': 'Enseñanza', 'Epidemiolog¿a': 'Epidemiología',
  'Esc¿nica': 'Escénica', 'Espa¿ol': 'Español', 'Especializaci¿n': 'Especialización',
  'Estad¿stica': 'Estadística', 'Estrat¿gic': 'Estratégic', 'Farmac¿utica': 'Farmacéutica',
  'Filosof¿a': 'Filosofía', 'Fonoaudi¿logo': 'Fonoaudiólogo', 'Formaci¿n': 'Formación',
  'Fotograf¿a': 'Fotografía', 'Franc¿s': 'Francés', 'F¿sica': 'Física', 'Ganader¿a': 'Ganadería',
  'Gastroenterolog¿a': 'Gastroenterología', 'Geom¿tica': 'Geomática', 'Ginecolog¿a': 'Ginecología',
  'Gesti¿n': 'Gestión', 'Gr¿fico': 'Gráfico', 'Gu¿a': 'Guía', 'Int¿rprete': 'Intérprete',
  'int¿rprete': 'intérprete', 'G¿nero': 'Género', 'Hidr¿ulico': 'Hidráulico', 'H¿brido': 'Híbrido', 'H¿drico': 'Hídrico',
  'Implementaci¿n': 'Implementación', 'Im¿genes': 'Imágenes', 'Inal¿mbrica': 'Inalámbrica',
  'Informaci¿n': 'Información', 'Inform¿tico': 'Informático', 'Ingenier¿a': 'Ingeniería', 'Ingl¿s': 'Inglés',
  'Innovaci¿n': 'Innovación', 'Instalaci¿n': 'Instalación', 'Intervenci¿n': 'Intervención',
  'Inversi¿n': 'Inversión', 'Investigaci¿n': 'Investigación', 'Log¿stic': 'Logístic', 'L¿rico': 'Lírico',
  'Maestr¿a': 'Maestría', 'Mag¿ster': 'Magíster', 'Marroquiner¿a': 'Marroquinería',
  'Mecatr¿nico': 'Mecatrónico', 'Mec¿nica': 'Mecánica', 'Mec¿nico': 'Mecánico', 'M¿quinas': 'Máquinas',
  'M¿sico': 'Músico', 'Nefrolog¿a': 'Nefrología', 'Negociaci¿n': 'Negociación', 'Ni¿ez': 'Niñez',
  'Num¿rico': 'Numérico', 'Nutrici¿n': 'Nutrición', 'Organizaci¿n': 'Organización', 'Pedagog¿a': 'Pedagogía',
  'Pedi¿trica': 'Pediátrica', 'Planeaci¿n': 'Planeación', 'Pol¿tica': 'Política', 'Pol¿tico': 'Político',
  'Prevenci¿n': 'Prevención', 'Producci¿n': 'Producción', 'Promoci¿n': 'Promoción',
  'Psicolog¿a': 'Psicología', 'Psic¿logo': 'Psicólogo', 'P¿blica': 'Pública', 'P¿blico': 'Público',
  'Radiolog¿a': 'Radiología', 'Recreaci¿n': 'Recreación', 'Regeneraci¿n': 'Regeneración',
  'Reproducci¿n': 'Reproducción', 'Rob¿tica': 'Robótica', 'Se¿as': 'Señas', 'Supervisi¿n': 'Supervisión',
  'Tecnolog¿as': 'Tecnologías', 'Tecnolog¿a': 'Tecnología', 'Tecnol¿gica': 'Tecnológica',
  'Tecnol¿gico': 'Tecnológico', 'Tecnol¿go': 'Tecnólogo', 'Tecn¿logo': 'Tecnólogo',
  'Televisi¿n': 'Televisión', 'Tesorer¿a': 'Tesorería', 'Topogr¿fico': 'Topográfico',
  'Transformaci¿n': 'Transformación', 'Traumatolog¿a': 'Traumatología', 'Tributaci¿n': 'Tributación',
  'Tur¿stic': 'Turístic', 'T¿cnico': 'Técnico', 'Veh¿culo': 'Vehículo',
  '¿nfasis': 'énfasis', '¿reas': 'áreas', '¿rea': 'área',
}
const MAP_KEYS = Object.keys(ACCENT_MAP).sort((a, b) => b.length - a.length)

function restoreAccents(s: string): string {
  if (!s || s.indexOf('¿') === -1) return s
  let out = s
  for (const k of MAP_KEYS) if (out.indexOf(k) !== -1) out = out.split(k).join(ACCENT_MAP[k])
  // Red de seguridad para sufijos regulares y el guion largo.
  out = out.split('ci¿n').join('ción').split('si¿n').join('sión')
  out = out.split(' ¿ ').join(' – ')
  return out
}

// Áreas SNIES y sus palabras clave (nombre de programa sin tildes, minúsculas).
// El orden define la prioridad ante coincidencias múltiples.
const AREA_RULES: { area: string; kw: string[] }[] = [
  { area: 'Ciencias de la salud', kw: ['medicin', 'enfermer', 'enfermedades', 'odontolog', 'farmac', 'fisioterap', 'nutricion', 'bacteriolog', 'optometr', 'quirurg', 'cirugia', 'epidemiolog', 'radiolog', 'ginecolog', 'nefrolog', 'traumatolog', 'gastroenterolog', 'pediatr', 'biomedic', 'terapia', 'anestesi', 'cardiolog', 'dermatolog', 'oncolog', 'salud', 'clinic', 'higiene oral', 'regencia de farmacia', 'histolog', 'hematolog', 'fonoaudiolog', 'gerontolog', 'psiquiatr', 'ortodon', 'endodon', 'periodoncia', 'reumatolog', 'neurocienc', 'neurolog', 'oftalmolog', 'urolog', 'patolog', 'endocrin', 'ortopedi', 'audiolog', 'paliativos', 'coloproctolog', 'infecciosas'] },
  { area: 'Agronomía veterinaria y afines', kw: ['agronom', 'agricol', 'agropecuar', 'veterinar', 'zootec', 'forestal', 'pesquer', 'acuicultur', 'ganaderi', 'cultivo', 'suelos', 'sanidad animal', 'cafe', 'rural', 'floricultura', 'hortofrut'] },
  { area: 'Ciencias de la educación', kw: ['educaci', 'educativ', 'licenciad', 'pedagog', 'docente', 'docencia', 'ensenanza', 'didactic', 'preescolar', 'escolar', 'etnoeducacion', 'bilingue', 'bilinguismo', 'deport', 'futbol', 'recreacion'] },
  { area: 'Ingeniería arquitectura urbanismo y afines', kw: ['ingenier', 'arquitect', 'computaci', 'sistemas', 'software', 'informatic', 'electronic', 'electric', 'mecanic', 'mecatronic', 'industrial', 'civil', 'telecomunic', 'redes', 'automatiz', 'produccion', 'construccion', 'topograf', 'minas', 'petrol', 'geomatic', 'hidraulic', 'robotic', 'energ', 'vehiculo', 'maquina', 'manufactura', 'materiales', 'catastr', 'geodes', 'electromecanic', 'urbanism', 'urbano', 'soldadura', 'aeronautic', 'naval', 'textil', 'saneamiento', 'obras civiles', 'topografia', 'geotecn', 'hidrocarbur', 'mantenimiento', 'inteligencia artificial', 'artificial', 'seguridad de la informacion', 'ciberseg', 'internet de las cosas', 'big data', 'base de datos', 'bases de datos', 'aplicaciones', 'desarrollo de software', 'movil', 'sistemas de informacion', 'alimento', 'empaque'] },
  { area: 'Bellas artes', kw: ['arte', 'music', 'disen', 'danza', 'teatro', 'plastic', 'audiovisual', 'cine', 'fotografia', 'escenic', 'lirico', 'coreograf', 'canto', 'artistic', 'creativ', 'dramaturg', 'ilustracion', 'animacion', 'moda', 'calzado', 'marroquiner', 'colecciones', 'decoracion', 'interiores', 'sonido', 'grabacion', 'television', 'transmedia'] },
  { area: 'Matemáticas y ciencias naturales', kw: ['matematic', 'fisica', 'quimic', 'biolog', 'geolog', 'estadistic', 'astronom', 'ecolog', 'oceanograf', 'ciencias naturales', 'ambiental', 'meteorolog', 'geografia', 'biotecnolog', 'ciencia de datos', 'cientifico de datos', 'analitic', 'geocienc', 'sistema tierra'] },
  { area: 'Economía administración contaduría y afines', kw: ['administraci', 'administrad', 'contad', 'contabil', 'negoci', 'gerenci', 'financ', 'finanz', 'mercadeo', 'marketing', 'mercadotecnia', 'economi', 'tributac', 'costos', 'comercio', 'comercial', 'banca', 'empresa', 'mercad', 'talento humano', 'recursos humanos', 'auditor', 'proyectos', 'calidad', 'logistic', 'turism', 'turistic', 'hoteler', 'gastronom', 'aduanas', 'seguros', 'actuaria', 'revisoria', 'gestion', 'emprendi', 'operaciones', 'liderazgo', 'organizacional', 'coaching', 'business', 'analytics', 'prospectiva', 'fintech', 'administrat', 'contab', 'productividad'] },
  { area: 'Ciencias sociales y humanas', kw: ['derecho', 'abogad', 'juridic', 'judicial', 'psicolog', 'sociolog', 'trabajo social', 'social', 'socio', 'comunicaci', 'comunicad', 'comunitari', 'periodis', 'publicidad', 'publicis', 'filosof', 'histor', 'antropolog', 'politic', 'politolog', 'relaciones internacional', 'teolog', 'religios', 'linguistic', 'criminolog', 'criminal', 'gobierno', 'gobernanza', 'territorial', 'genero', 'sexualidad', 'cultural', 'humanidades', 'bibliotec', 'archiv', 'paz', 'conflicto', 'convivencia', 'seguridad ciudadana', 'ciudadan', 'lenguas', 'idiomas', 'literatura', 'lenguaje', 'sociedad', 'arbitraje', 'familia', 'contratacion', 'propiedad intelectual', 'interprete', 'sordos', 'discapacidad', 'desarrollo humano'] },
]

function strip(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
function inferArea(name: string): string | null {
  const n = strip(name)
  for (const r of AREA_RULES) if (r.kw.some((k) => n.includes(k))) return r.area
  return null
}

async function main() {
  const dry = process.argv.includes('--dry')
  const writeSource = process.argv.includes('--write-source')
  const url = readDatabaseUrl()
  if (!url) throw new Error('DATABASE_URL no encontrada')
  const pool = new Pool({ connectionString: url })

  const { rows } = await pool.query(`SELECT "data" FROM "BiDataset" WHERE "key"='insights'`)
  if (!rows.length) throw new Error('No existe el dataset insights')
  const payload = rows[0].data as { meta: unknown; dataset: { n: number; dicts: Record<string, string[]>; data: Record<string, number[]> } }
  const ds = payload.dataset

  // 1) Tildes en programa y NBC.
  let progFixed = 0
  ds.dicts.programa = ds.dicts.programa.map((l) => { const f = restoreAccents(l); if (f !== l) progFixed++; return f })
  let nbcFixed = 0
  if (ds.dicts.nbc) ds.dicts.nbc = ds.dicts.nbc.map((l) => { const f = restoreAccents(l); if (f !== l) nbcFixed++; return f })
  const remaining = ds.dicts.programa.filter((l) => l.indexOf('¿') !== -1)

  // 2) Reubicación de «Sin clasificar».
  const areas = ds.dicts.area_conocimiento
  const sinIdx = areas.indexOf('Sin clasificar')
  const areaIndex = new Map<string, number>()
  areas.forEach((a, i) => areaIndex.set(a, i))
  const aData = ds.data.area_conocimiento
  const pData = ds.data.programa
  let reassigned = 0
  let unresolved = 0
  const byTarget: Record<string, number> = {}
  const unresolvedSamples: string[] = []
  if (sinIdx !== -1) {
    for (let i = 0; i < ds.n; i++) {
      if (aData[i] !== sinIdx) continue
      const name = ds.dicts.programa[pData[i]] || ''
      const target = inferArea(name)
      if (target && areaIndex.has(target)) {
        aData[i] = areaIndex.get(target)!
        reassigned++
        byTarget[target] = (byTarget[target] || 0) + 1
      } else {
        unresolved++
        if (unresolvedSamples.length < 40) unresolvedSamples.push(name)
      }
    }
  }

  console.log('— Normalización dataset insights —')
  console.log(`Tildes restauradas: ${progFixed} programas, ${nbcFixed} NBC. Restan con «¿»: ${remaining.length}`)
  if (remaining.length) console.log('  Ejemplos sin resolver:', remaining.slice(0, 8))
  console.log(`«Sin clasificar»: ${reassigned} reubicados, ${unresolved} sin resolver.`)
  console.log('  Reubicaciones por área:', byTarget)
  if (unresolvedSamples.length) console.log('  Sin resolver (muestra):', unresolvedSamples.slice(0, 40))

  if (dry) {
    console.log('\n(--dry) No se escribió nada.')
  } else {
    await pool.query(`UPDATE "BiDataset" SET "data"=$1::jsonb, "version"='2', "updatedAt"=NOW() WHERE "key"='insights'`, [JSON.stringify(payload)])
    console.log('\n✓ BiDataset.insights actualizado en Postgres.')
    if (writeSource) {
      const src = process.env.BI_DATA_FILE || '/Users/andrestabla/Documents/Estudio mercado/modulo_insights/data/dataset_web.js'
      if (fs.existsSync(src)) {
        fs.writeFileSync(src, '// Autogenerado por build_insights.py — normalizado (tildes + áreas).\nwindow.SNIES_INSIGHTS = ' + JSON.stringify(payload) + ';\n', 'utf8')
        console.log(`✓ Fuente reescrita: ${src}`)
      }
    }
  }
  await pool.end()
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1) })
