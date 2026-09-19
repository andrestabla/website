/**
 * Comprueba que los imports relativos que acaban ejecutándose en Node lleven
 * extensión .js.
 *
 *   npx tsx scripts/check-esm-imports.ts
 *
 * Por qué existe: las funciones de /api corren como ESM nativo en Vercel, donde
 * `import './blocks'` no resuelve; en el navegador Vite sí lo resuelve, así que
 * el fallo no aparece ni en `tsc -b` (que solo revisa src) ni en `vite build`
 * ni en el puente local de desarrollo. Solo aparece en producción, y en forma
 * de 500 sin mensaje, porque la función muere al cargar el módulo.
 *
 * Alcance: todo api/, y los archivos de src que el API importa — hoy
 * src/learning/lib y src/data. Sale con código 1 si encuentra alguno, para
 * poder encadenarlo en un hook o en CI.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Carpetas cuyo código carga Node, no el navegador. */
const SCOPES = ['api', 'src/learning/lib', 'src/data']

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

// Captura la ruta de cualquier `from '…'` o `import('…')` relativo.
const SPECIFIER = /(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]/g

const offenders: Array<{ file: string; specifier: string; line: number }> = []

for (const scope of SCOPES) {
  for (const file of walk(path.join(ROOT, scope))) {
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, index) => {
      // Un `import type` se borra al compilar: nunca llega a Node.
      if (/^\s*import\s+type\s/.test(line)) return
      for (const match of line.matchAll(SPECIFIER)) {
        const specifier = match[1]
        if (specifier.endsWith('.js') || specifier.endsWith('.json')) continue
        offenders.push({ file: path.relative(ROOT, file), specifier, line: index + 1 })
      }
    })
  }
}

if (offenders.length) {
  console.error(`✗ ${offenders.length} import(s) relativos sin extensión .js — fallarían en Vercel:\n`)
  for (const row of offenders) {
    console.error(`  ${row.file}:${row.line}  →  '${row.specifier}'  (debe ser '${row.specifier}.js')`)
  }
  console.error('\nEn Node los imports relativos necesitan la extensión del archivo emitido (.js),')
  console.error('aunque el fuente sea .ts. Vite lo resuelve igual, así que el build no lo detecta.')
  process.exit(1)
}

console.log(`✓ imports correctos en ${SCOPES.join(', ')}`)
