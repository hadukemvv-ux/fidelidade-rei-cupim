-- Prepared only. Depends on 202609290001_entregas_premios (eligibility/giro).
-- No gate is enabled, no prize weight/name/value is changed and no file deleted.
begin;

alter table public.premios_roleta drop constraint premios_roleta_imagem_url_segura;
alter table public.premios_roleta add constraint premios_roleta_imagem_url_segura
  check (imagem_url is null or (length(imagem_url) <= 1024 and (
    imagem_url ~ '^/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.(png|webp|jpg|jpeg)$'
    or imagem_url ~ ('^https://asjoubgoccbvftyggunz\.supabase\.co/storage/v1/object/public/premios/roleta/' || id::text || '/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$')
  )));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('premios', 'premios', true, 524288, array['image/webp'])
on conflict (id) do nothing;
-- Never turn an existing private bucket public or silently change its limits.
do $$ begin
  if not exists (select 1 from storage.buckets where id = 'premios' and public
    and file_size_limit between 1 and 524288 and allowed_mime_types = array['image/webp']::text[]) then
    raise exception 'Bucket premios existente incompatível; revisar sem expor arquivos';
  end if;
end $$;

-- Public serving is intentional; authenticated/anon writes and listing still
-- cannot bypass the API, even if another permissive storage policy exists.
create policy premios_somente_backend on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'premios') with check (bucket_id <> 'premios');

-- Image reference + audit are one transaction; neither is a best-effort write.
create function public.atualizar_imagem_premio(
  p_premio_id bigint, p_actor_id uuid, p_imagem_url text, p_imagem_anterior text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.perfis_operacionais%rowtype;
  v_anterior text;
  v_nome text;
  v_path text;
begin
  select * into v_actor from public.perfis_operacionais
    where user_id = p_actor_id and ativo and papel = 'superadmin' for share;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'Sem permissão para trocar fotos.'); end if;
  perform 1 from public.seguranca_configuracoes where id = 1 and not modo_contencao for share;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'Operação pausada.'); end if;
  if p_premio_id is null or p_premio_id <= 0 or p_imagem_url is null or length(p_imagem_url) > 1024 or p_imagem_url !~ (
    '^https://asjoubgoccbvftyggunz\.supabase\.co/storage/v1/object/public/premios/roleta/' || p_premio_id::text || '/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$'
  ) then return jsonb_build_object('ok', false, 'motivo', 'Foto inválida.'); end if;
  v_path := substring(p_imagem_url from length('https://asjoubgoccbvftyggunz.supabase.co/storage/v1/object/public/premios/') + 1);
  if not exists (select 1 from storage.objects where bucket_id = 'premios' and name = v_path
    and metadata->>'mimetype' = 'image/webp'
    and case when metadata->>'size' ~ '^[0-9]{1,7}$' then (metadata->>'size')::integer between 1 and 524288 else false end
  ) then return jsonb_build_object('ok', false, 'motivo', 'Foto ainda não disponível no armazenamento.'); end if;
  select imagem_url, nome into v_anterior, v_nome from public.premios_roleta where id = p_premio_id for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'Prêmio não encontrado.'); end if;
  if v_anterior is distinct from p_imagem_anterior then
    return jsonb_build_object('ok', false, 'motivo', 'Foto alterada por outra operação. Atualize o painel.'); end if;
  update public.premios_roleta set imagem_url = p_imagem_url where id = p_premio_id;
  insert into public.administracao_eventos(entidade, entidade_id, acao, actor_user_id, actor_email, detalhes)
    values ('configuracao', 'premio:' || p_premio_id::text, 'premio_roleta_imagem_atualizada', v_actor.user_id, v_actor.email,
      jsonb_build_object('premio_id', p_premio_id, 'nome', v_nome, 'imagem_anterior', v_anterior, 'imagem_url', p_imagem_url));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.atualizar_imagem_premio(bigint,uuid,text,text) from public, anon, authenticated;
grant execute on function public.atualizar_imagem_premio(bigint,uuid,text,text) to service_role;
commit;
