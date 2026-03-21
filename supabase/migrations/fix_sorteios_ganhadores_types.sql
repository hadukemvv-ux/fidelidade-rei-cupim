-- ================================================================
-- AJUSTE OPCIONAL: Corrigir apenas cliente_id em sorteios_ganhadores
-- ================================================================
-- Contexto real do schema:
-- - sorteios.id = UUID
-- - sorteios.id_new = INTEGER legado
-- - sorteios_ganhadores.sorteio_id = INTEGER e deve continuar usando sorteios.id_new
-- - sorteios_ganhadores.cliente_id = UUID no banco, mas base_clientes_saipos.id = INTEGER
--
-- O código agora já usa sorteio.id_new e grava cliente_id = NULL para não quebrar.
-- Rode este SQL apenas se quiser restaurar a relação cliente_id corretamente.
-- ================================================================

UPDATE sorteios_ganhadores
SET cliente_id = NULL
WHERE cliente_id IS NOT NULL;

ALTER TABLE sorteios_ganhadores
  DROP COLUMN IF EXISTS cliente_id;

ALTER TABLE sorteios_ganhadores
  ADD COLUMN cliente_id bigint REFERENCES base_clientes_saipos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sorteios_ganhadores_cliente_id ON sorteios_ganhadores(cliente_id);

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'sorteios_ganhadores'
ORDER BY ordinal_position;
