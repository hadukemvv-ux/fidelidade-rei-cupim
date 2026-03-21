-- ================================================================
-- MIGRAÇÃO: Corrigir tipos das colunas em sorteios_ganhadores
-- ================================================================
-- Problema: sorteio_id era INTEGER mas sorteios.id é UUID
--           cliente_id era UUID mas base_clientes_saipos.id é INTEGER
--
-- Como aplicar: Cole no Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- 1. Limpar dados inválidos existentes (não referenciam registros válidos)
UPDATE sorteios_ganhadores 
SET sorteio_id = NULL, cliente_id = NULL
WHERE sorteio_id IS NOT NULL OR cliente_id IS NOT NULL;

-- 2. Remover colunas antigas
ALTER TABLE sorteios_ganhadores 
  DROP COLUMN IF EXISTS sorteio_id,
  DROP COLUMN IF EXISTS cliente_id;

-- 3. Adicionar colunas com tipos corretos
ALTER TABLE sorteios_ganhadores
  ADD COLUMN sorteio_id uuid REFERENCES sorteios(id) ON DELETE CASCADE,
  ADD COLUMN cliente_id bigint REFERENCES base_clientes_saipos(id) ON DELETE SET NULL;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sorteios_ganhadores_sorteio_id ON sorteios_ganhadores(sorteio_id);
CREATE INDEX IF NOT EXISTS idx_sorteios_ganhadores_cliente_id ON sorteios_ganhadores(cliente_id);

-- Verificar resultado
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'sorteios_ganhadores'
ORDER BY ordinal_position;
