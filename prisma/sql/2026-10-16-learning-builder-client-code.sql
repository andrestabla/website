-- Learning Builder · la codificación del cliente.
--
-- Un proyecto como el de La Salle ya trae su propia nomenclatura —FE_RED5_ACT,
-- la del CSV de seguimiento— y es la que su equipo conoce, busca y escribe en
-- los correos. El código de la plataforma (UNISALLE-IMP-003) sigue siendo el
-- identificador del recurso, pero deja de ser lo que se lee primero.
--
-- No se mete en `tags` a propósito: una etiqueta es para agrupar, no para
-- nombrar, y una codificación que importa no puede depender de que nadie la
-- borre de una lista.
--
-- Aditivo e idempotente: nace NULL y así se queda para los workspaces que no
-- tienen codificación propia.

ALTER TABLE "LbResource" ADD COLUMN IF NOT EXISTS "clientCode" TEXT;

-- Se busca por ella, así que conviene indexada. No es única entre workspaces:
-- dos clientes distintos podrían usar la misma cadena sin saberlo.
CREATE INDEX IF NOT EXISTS "LbResource_clientCode_idx"
    ON "LbResource" ("workspaceId", "clientCode");
