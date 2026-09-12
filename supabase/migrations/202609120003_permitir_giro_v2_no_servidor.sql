begin;

-- A função continua inacessível ao navegador e aos usuários comuns. Somente
-- a credencial de servidor (service_role) pode executar o giro atômico.
grant execute on function public.girar_roleta_v2(
  text, text, bigint, boolean, text, text, text, numeric, text, text
) to service_role;

commit;
