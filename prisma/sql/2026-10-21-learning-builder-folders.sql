-- Learning Builder · carpetas de la biblioteca.
--
-- Aditivo e idempotente. Hasta ahora la biblioteca se agrupaba por el campo
-- «curso» de cada recurso, sin carpetas de verdad. Esto crea las carpetas
-- (anidables) y la columna que dice en cuál está cada recurso. El script
-- scripts/apply-learning-builder-folders.ts, además de correr esto, convierte
-- cada curso existente en una carpeta para que nada cambie de sitio.

CREATE TABLE IF NOT EXISTS "LbFolder" (
  "id"          TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "parentId"    TEXT,
  "name"        TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbFolder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "LbWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LbFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LbFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LbFolder_workspaceId_parentId_idx" ON "LbFolder" ("workspaceId", "parentId");

ALTER TABLE "LbResource" ADD COLUMN IF NOT EXISTS "folderId" TEXT;
CREATE INDEX IF NOT EXISTS "LbResource_folderId_idx" ON "LbResource" ("folderId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LbResource_folderId_fkey') THEN
    ALTER TABLE "LbResource" ADD CONSTRAINT "LbResource_folderId_fkey"
      FOREIGN KEY ("folderId") REFERENCES "LbFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
