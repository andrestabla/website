/**
 * Learning Builder · empaquetado SCORM 1.2.
 *
 * Arma un paquete de un solo SCO con el mismo HTML que ve el diseñador en la
 * vista previa. El puente con el LMS (scorm-api.js) implementa lo que pide
 * SCORM 1.2 para un objeto de contenido: localizar la API, inicializar, marcar
 * completado, guardar el marcador de reanudación y cerrar la sesión.
 *
 * Nota sobre Rise: el reproductor de Articulate es software propietario y no se
 * puede redistribuir, así que el paquete lleva nuestro propio reproductor. Los
 * bloques son equivalentes (mismos tipos y comportamiento) y el paquete cumple
 * SCORM 1.2, de modo que el campus lo trata igual que a un paquete de Rise.
 */
import { createZip, type ZipEntry } from './lb-zip.js'
import { escapeHtml, type LbRenderMeta } from './lb-render.js'
import { renderResourceHtml } from './lb-render-any.js'
import { screenTitles, type LbResourceContent } from '../../src/learning/lib/content.js'
import type { LbDirectives } from '../../src/learning/lib/directives.js'

/** Identificador del manifiesto: ASCII, sin espacios, como pide el esquema. */
export function scormIdentifier(prefix: string, title: string, publicId: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .toUpperCase()
  return `${prefix}-${slug || 'OVA'}-${publicId.slice(0, 8).toUpperCase()}`
}

export function safeFileName(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'OVA'
  )
}

function manifest(options: { identifier: string; title: string; lessons: string[] }): string {
  const { identifier, title, lessons } = options
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${escapeHtml(identifier)}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${escapeHtml(title)}</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true">
        <title>${escapeHtml(title)}</title>
        <adlcp:masteryscore>100</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-api.js"/>
    </resource>
  </resources>
  <!-- Índice de la unidad (informativo):
${lessons.map((lesson, i) => `       ${i + 1}. ${lesson.replace(/--+/g, '-')}`).join('\n')}
  -->
</manifest>`
}

/** Puente SCORM 1.2: descubre la API del LMS y expone lo mínimo al reproductor. */
const SCORM_API_JS = `(function(){
  var api = null;
  var initialized = false;

  function find(win, depth){
    while (win && depth-- > 0) {
      if (win.API) return win.API;
      if (win.parent && win.parent !== win) { win = win.parent; continue; }
      return null;
    }
    return null;
  }

  function locate(){
    var found = find(window, 12);
    if (!found && window.opener) found = find(window.opener, 12);
    return found;
  }

  function set(key, value){
    if (!api || !initialized) return;
    try { api.LMSSetValue(key, value); api.LMSCommit(''); } catch (e) { /* el LMS decide */ }
  }

  window.LBSCORM = {
    start: function(){
      api = locate();
      if (!api) return '';
      try {
        initialized = api.LMSInitialize('') === 'true' || api.LMSInitialize('') === true;
      } catch (e) { initialized = false; }
      if (!initialized) return '';
      var status = '';
      try { status = api.LMSGetValue('cmi.core.lesson_status'); } catch (e) { status = ''; }
      if (!status || status === 'not attempted') set('cmi.core.lesson_status', 'incomplete');
      var bookmark = '';
      try { bookmark = api.LMSGetValue('cmi.core.lesson_location'); } catch (e) { bookmark = ''; }
      return bookmark || '';
    },
    bookmark: function(value){ set('cmi.core.lesson_location', String(value)); },
    complete: function(){
      set('cmi.core.lesson_status', 'completed');
      set('cmi.core.score.raw', '100');
    },
    finish: function(){
      if (!api || !initialized) return;
      try { api.LMSFinish(''); } catch (e) { /* el LMS decide */ }
      initialized = false;
    }
  };
})();
`

export function buildScormPackage(options: {
  meta: LbRenderMeta
  content: LbResourceContent
  directives: LbDirectives
  publicId: string
  kind: string
}): { buffer: Buffer; fileName: string } {
  const { meta, content, directives, publicId, kind } = options
  const title = content.cover?.title || meta.title
  const identifier = scormIdentifier(directives.exports.scormPrefix, title, publicId)

  const index = renderResourceHtml({ kind, meta, content, directives, mode: 'scorm' })
  const entries: ZipEntry[] = [
    { path: 'imsmanifest.xml', data: manifest({ identifier, title, lessons: screenTitles(kind, content) }) },
    { path: 'index.html', data: index },
    { path: 'scorm-api.js', data: SCORM_API_JS },
  ]

  return {
    buffer: createZip(entries),
    fileName: `${safeFileName(title)}-SCORM12.zip`,
  }
}
