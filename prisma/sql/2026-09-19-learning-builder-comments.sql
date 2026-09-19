-- Learning Builder · comentarios de revisión (rol Auditor).
--
-- Aditivo e idempotente: crea una sola tabla y no toca ninguna existente.
--
-- Cada comentario se ancla a una pieza del recurso (resource, cover,
-- cover.<campo>, lesson:<id>, block:<id>) y guarda la etiqueta que tenía esa
-- pieza al comentarla, para que el hilo siga siendo legible si después la
-- borran. Un comentario con parentId es una respuesta dentro del hilo; el
-- estado (OPEN/RESOLVED) vive en el comentario raíz.

CREATE TABLE IF NOT EXISTS "LbComment" (
  "id"           TEXT PRIMARY KEY,
  "resourceId"   TEXT NOT NULL,
  "anchor"       TEXT NOT NULL DEFAULT 'resource',
  "anchorLabel"  TEXT,
  "parentId"     TEXT,
  "authorId"     TEXT NOT NULL,
  "body"         TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'OPEN',
  "resolvedAt"   TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbComment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LbComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LbComment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LbComment_resourceId_createdAt_idx" ON "LbComment" ("resourceId", "createdAt");
CREATE INDEX IF NOT EXISTS "LbComment_resourceId_anchor_idx" ON "LbComment" ("resourceId", "anchor");
CREATE INDEX IF NOT EXISTS "LbComment_parentId_idx" ON "LbComment" ("parentId");
