import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { ClienteSchema, validarDados } from '../src/lib/validations.ts';
import { signupResultResponse } from '../src/lib/customerSignupResult.ts';
import { BONUS_CADASTRO_PONTOS } from '../src/lib/fidelidade-rules.ts';

// Execute the real route with injected adapters, no Next server/network/keys.
// SQL authorization/transactions are tested separately in a PostgreSQL engine.
async function fixture(options: { enabled?:boolean; allowed?:boolean; proof?:boolean; rows?:Record<string,unknown>[];
  result?:unknown; error?:unknown; auth?:boolean; validPin?:boolean } = {}) {
  const source = await readFile(new URL('../src/app/api/cadastro/route.ts',import.meta.url),'utf8');
  const calls: { name:string; args:Record<string,unknown> }[] = [];
  const api = {
    from: () => ({ select: () => ({ eq: async () => ({data:options.rows || [],error:null}) }) }),
    rpc: async (name:string,args:Record<string,unknown>) => {
      calls.push({name,args});
      return {data: options.result === undefined ? {ok:true,criado:true,bonus:BONUS_CADASTRO_PONTOS} : options.result,error:options.error || null};
    },
  };
  const response = (message: unknown, status=200) => Response.json(message,{status});
  const adapters: Record<string,unknown> = {
    '@/lib/supabaseAdmin': {supabaseAdmin:api},
    '@/lib/validations': {ClienteSchema,validarDados},
    '@/lib/api-utils': {getRequestId:()=> 'fixture-id',logInfo:()=>{},
      successResponse:(data:unknown)=>response({ok:true,data}),
      errorResponse:(error:string,code:string,status=400)=>response({error,code},status),
      validationErrorResponse:()=>response({error:'validation'},400)},
    '@/app/api/_utils/validateCustomerAuth': {validateCustomerAuth:async()=>options.auth?null:response({error:'unauthorized'},401)},
    '@/lib/pin': {hashPin:async()=> 'derived-fixture-only',verifyPin:async()=>({valid:options.validPin,needsRehash:false})},
    '@/lib/customerSession': {attachCustomerSession:(r:Response)=>{r.headers.set('x-fixture-session','yes');return r;}},
    '@/lib/whatsappOtp': {isOtpEnabled:()=>options.enabled!==false,isBetaPhoneAllowed:()=>options.allowed!==false,
      getOtpGrantHashes:()=>options.proof===false?null:{p_grant_hash:'a'.repeat(64),p_telefone_hash:'b'.repeat(64)},
      clearOtpGrant:(r:Response)=>{r.headers.set('x-fixture-clear-proof','yes');return r;}},
    '@/lib/customerRegistration': {isPreCadastro:(r:Record<string,unknown>)=>!r.pin_hash},
    '@/lib/fidelidade-rules': {BONUS_CADASTRO_PONTOS},
    '@/lib/operationalContainment': {bloquearSeContencaoAtiva:async()=>null},
    '@/lib/customerSignupResult': {signupResultResponse},
  };
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {} as {POST:(req:Request)=>Promise<Response>};
  new Function('exports','require',compiled)(exports,(name:string)=>{
    assert.ok(name in adapters,`Unexpected route dependency: ${name}`);return adapters[name];
  });
  const body={telefone:'85988887777',nome:'Pessoa de fixture',pin:'4321',bonus:999999};
  return {calls,run:(overrides:Record<string,unknown>={})=>exports.POST(new Request('https://fixture.invalid/api/cadastro',
    {method:'POST',body:JSON.stringify({...body,...overrides}),headers:{'Content-Type':'application/json'}}))};
}

test('cadastro: um único RPC usa bônus do servidor; sessão só após sucesso',async()=>{
  const f=await fixture(); const r=await f.run(); assert.equal(r.status,200);
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'concluir_cadastro_otp');
  assert.equal(f.calls[0].args.p_bonus_pontos,BONUS_CADASTRO_PONTOS);
  assert.equal(f.calls[0].args.p_consentimento_aniversario,false);
  assert.equal(r.headers.get('x-fixture-session'),'yes');assert.equal(r.headers.get('x-fixture-clear-proof'),'yes');
});
test('cadastro: piloto desligado, destino fora da lista ou ausência de prova não chama banco de gravação',async()=>{
  for(const options of [{enabled:false},{allowed:false},{proof:false}]) {
    const f=await fixture(options);const r=await f.run();assert.equal(r.status,403);
    assert.equal(f.calls.length,0);assert.equal(r.headers.get('x-fixture-session'),null);
  }
});
test('cadastro: conflito, contenção e retorno inesperado não apagam prova nem abrem sessão',async()=>{
  for(const result of [null,{ok:false,motivo:'conflict'},{ok:false,motivo:'paused'},{ok:true}]) {
    const f=await fixture({result});const r=await f.run();assert.ok(r.status>=400);
    assert.equal(r.headers.get('x-fixture-session'),null);assert.equal(r.headers.get('x-fixture-clear-proof'),null);
  }
});
test('cadastro: erro do banco não expõe detalhes pessoais em resposta/log',async t=>{
  const logger=t.mock.method(console,'error',()=>{});
  const f=await fixture({error:{code:'23505',message:'PII-fixture',details:'PII-fixture',hint:'PII-fixture'}});
  const r=await f.run();assert.equal(r.status,503);assert.equal((await r.text()).includes('PII-fixture'),false);
  assert.equal(JSON.stringify(logger.mock.calls).includes('PII-fixture'),false);
});
test('cadastro: conta completa não é assumida nem bonificada só por grant; exige sessão e PIN',async()=>{
  const rows=[{nome:'Pessoa de fixture',pin_hash:'existing-fixture'}];
  const rejected=await fixture({rows});assert.equal((await rejected.run()).status,401);assert.equal(rejected.calls.length,0);
  const allowed=await fixture({rows,auth:true,validPin:true});assert.equal((await allowed.run()).status,200);assert.equal(allowed.calls.length,0);
});
