-- Learning Builder · papelera de recursos.
--
-- Aditivo e idempotente. Eliminar un recurso deja de borrarlo en el acto: se
-- marca con la fecha y quien lo eliminó, desaparece de la biblioteca, del
-- enlace público y de la revisión, y queda en la papelera del workspace para
-- restaurarlo o eliminarlo definitivamente. A los 30 días se borra solo.

ALTER TABLE "LbResource" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "LbResource" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
CREATE INDEX IF NOT EXISTS "LbResource_workspaceId_deletedAt_idx" ON "LbResource" ("workspaceId", "deletedAt");
