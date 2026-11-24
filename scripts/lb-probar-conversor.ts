/**
 * Convierte documentos de Word o PowerPoint a la lectura HTML de las etapas,
 * en local y sin tocar la base ni el almacenamiento: sirve para ver cómo
 * quedará un guion antes de subirlo.
 *
 *   npx tsx scripts/lb-probar-conversor.ts <carpeta-de-salida> <archivo.docx|.pptx>…
 *
 * Deja un .html por archivo y sus imágenes en una carpeta al lado.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { OFFICE_CSS, officeToHtml } from '../api/_lib/lb-office.js'

const [out, ...files] = process.argv.slice(2)
if (!out || !files.length) {
  console.error('Uso: npx tsx scripts/lb-probar-conversor.ts <carpeta-de-salida> <archivo>…')
  process.exit(1)
}
mkdirSync(out, { recursive: true })

for (const file of files) {
  const name = path.basename(file).normalize('NFC')
  const format = name.toLowerCase().endsWith('.pptx') ? 'pptx' : 'docx'
  const slug = name.replace(/\.[a-z]+$/i, '').replace(/[^\w.-]+/g, '_')
  const started = Date.now()
  try {
    const result = await officeToHtml({
      data: readFileSync(file),
      format,
      putImage: async (image) => {
        mkdirSync(path.join(out, slug), { recursive: true })
        writeFileSync(path.join(out, slug, image.name), image.bytes)
        return `${slug}/${image.name}`
      },
    })
    writeFileSync(
      path.join(out, `${slug}.html`),
      `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name}</title>` +
        `<style>body{margin:0;padding:24px 16px 80px;background:#f1f5f9}${OFFICE_CSS}</style></head><body>${result.html}</body></html>`
    )
    console.log(`✓ ${name} · ${format} · ${result.units} unidad(es) · ${result.images} imagen(es) · ${(result.html.length / 1024).toFixed(0)} KB · ${Date.now() - started} ms`)
    for (const warning of result.warnings) console.log(`    aviso: ${warning}`)
  } catch (error: any) {
    console.log(`✗ ${name}: ${error?.message || error}`)
  }
}
