-- Learning Builder · identificadores jerárquicos.
--
-- Cada workspace recibe un código raíz corto y estable (UNICAFAM, UNISALLE) y
-- cada recurso uno derivado de él (UNICAFAM-OVA-001), de modo que cualquier
-- recurso se rastrea hasta su cliente con solo leerlo.
--
-- El código NO sustituye a publicId en el enlace público: publicId sigue siendo
-- un token no adivinable, porque un enlace abierto que se pudiera deducir
-- contando recursos dejaría de ser privado.
--
-- Aditivo e idempotente: las columnas nacen NULL, se rellenan aquí mismo y solo
-- al final se vuelven obligatorias y únicas, para no romper lo que ya existe.

ALTER TABLE "LbWorkspace" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "LbResource"  ADD COLUMN IF NOT EXISTS "code" TEXT;

-- Raíz: del slug, que ya es único y ASCII.
UPDATE "LbWorkspace"
   SET "code" = left(upper(regexp_replace("slug", '[^a-zA-Z0-9]', '', 'g')), 12)
 WHERE "code" IS NULL;

-- Derivado: <RAÍZ>-<TIPO>-<consecutivo por tipo, en orden de creación>.
WITH numbered AS (
  SELECT r."id",
         w."code" AS wcode,
         CASE r."kind"
           WHEN 'OVA'         THEN 'OVA'
           WHEN 'LECTURA'     THEN 'LEC'
           WHEN 'INTERACTIVE' THEN 'INT'
           WHEN 'PODCAST'     THEN 'POD'
           WHEN 'VIDEO'       THEN 'VID'
           WHEN 'ROUTE'       THEN 'RUT'
           WHEN 'IMPORT'      THEN 'IMP'
           ELSE 'REC'
         END AS prefix,
         row_number() OVER (
           PARTITION BY r."workspaceId", r."kind"
           ORDER BY r."createdAt", r."id"
         ) AS n
    FROM "LbResource" r
    JOIN "LbWorkspace" w ON w."id" = r."workspaceId"
   WHERE r."code" IS NULL
)
UPDATE "LbResource" r
   SET "code" = numbered.wcode || '-' || numbered.prefix || '-' || lpad(numbered.n::text, 3, '0')
  FROM numbered
 WHERE r."id" = numbered."id";

CREATE UNIQUE INDEX IF NOT EXISTS "LbWorkspace_code_key" ON "LbWorkspace" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "LbResource_code_key"  ON "LbResource"  ("code");

ALTER TABLE "LbWorkspace" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "LbResource"  ALTER COLUMN "code" SET NOT NULL;
