-- Cotizador: los totales de Quote pasan de INTEGER a DOUBLE PRECISION. INTEGER
-- llega a 2.147.483.647 y una licencia por volumen en COP lo supera. DOUBLE
-- PRECISION guarda pesos enteros exactos hasta 9.000 billones y Prisma lo sigue
-- entregando como number (BigInt rompería el JSON de las respuestas).
-- Idempotente: repetirlo no cambia nada. Conserva los valores y el DEFAULT 0.
ALTER TABLE "Quote" ALTER COLUMN "totalBase" TYPE DOUBLE PRECISION;
ALTER TABLE "Quote" ALTER COLUMN "totalFinal" TYPE DOUBLE PRECISION;
