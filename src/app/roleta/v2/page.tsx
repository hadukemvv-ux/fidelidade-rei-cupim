"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Session = { nivel: number; expira_em: string };
type Result = {
  premio: { nome: string; descricao_vitoria: string; emoji: string; canal_uso: string };
  cupom: string;
  expira_em: string;
  modo_teste: boolean;
};

const levelNames = ["", "Conta até R$ 100", "Conta entre R$ 100 e R$ 200", "Conta entre R$ 200 e R$ 300", "Conta entre R$ 300 e R$ 400", "Conta entre R$ 400 e R$ 500", "Conta acima de R$ 500"];
const wheelLabels = ["SORTE", "CUPIM", "GIRO", "BÔNUS", "REI", "CLUBE"];

function RoletaVisual({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  return <div className="roleta-visual" aria-label={spinning ? "A roleta está girando" : "Roleta pronta para girar"}>
    <span className="roleta-ponteiro" aria-hidden />
    <div className={`roleta-disco${spinning ? " girando" : ""}`} style={{ transform: `rotate(${rotation}deg)` }}>
      {wheelLabels.map((label, index) => {
        const angle = index * 60 + 30;
        return <span key={label} className="roleta-fatia" style={{ transform: `rotate(${angle}deg) translateY(-108px) rotate(${-angle}deg)` }}>{label}</span>;
      })}
      <span className="roleta-miolo" aria-hidden>♛</span>
    </div>
  </div>;
}

function RoletaV2Content() {
  const params = useSearchParams();
  const token = params?.get("token") || "";
  const [session, setSession] = useState<Session | null>(null);
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [notice, setNotice] = useState("Preparando sua chance...");
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  useEffect(() => {
    if (!token) {
      setNotice("Este QR é inválido. Peça ajuda à equipe.");
      setLoading(false);
      return;
    }
    fetch(`/api/roleta-v2/sessao?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível abrir a roleta.");
        setSession(data);
        setNotice("");
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Não foi possível abrir a roleta."))
      .finally(() => setLoading(false));
  }, [token]);

  async function spin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || loading || spinning) return;
    setSpinning(true);
    setNotice("");
    try {
      setWheelRotation((current) => current + 1_800 + Math.floor(Math.random() * 720));
      const request = fetch("/api/roleta-v2/girar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, telefone: phone, receber_marketing: marketing, consentimento_versao: "marketing-roleta-v1" }),
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível concluir o giro.");
        return data as Result;
      });
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const waitForAnimation = new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 3_200));
      const [data] = await Promise.all([request, waitForAnimation]);
      setResult(data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível concluir o giro.");
    } finally {
      setSpinning(false);
    }
  }

  return (
    <main className="operations-page min-h-screen bg-[#280404] px-5 py-10 text-white">
      <section className="mx-auto max-w-xl rounded-3xl border border-[#c5a059]/50 bg-[#1a0a0a] p-7 text-center shadow-2xl sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#c5a059]">Clube Cupim</p>
        <h1 className="mt-3 text-3xl font-black">A Roleta do Rei</h1>
        {loading && !result && <p className="mt-8 text-zinc-300">{notice || "Carregando..."}</p>}
        {!loading && notice && <p className="mt-8 rounded-xl border border-red-500/50 bg-red-950/40 p-4 font-semibold text-red-100">{notice}</p>}
        {!loading && session && !result && !notice && (
          <form className="mt-8 space-y-5 text-left" onSubmit={spin}>
            <RoletaVisual rotation={wheelRotation} spinning={spinning} />
            <div className="rounded-2xl bg-[#311414] p-4 text-center"><span className="text-sm text-zinc-300">Faixa da sua compra</span><strong className="mt-1 block text-2xl text-[#eabf67]">{levelNames[session.nivel] || "Clube"}</strong><small className="mt-2 block text-xs text-zinc-400">Esta faixa define apenas as chances deste giro.</small></div>
            <label className="block"><span className="mb-2 block text-sm font-bold">Seu WhatsApp</span><input required disabled={spinning} inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(85) 99999-9999" className="w-full rounded-xl border border-zinc-600 bg-zinc-950 px-4 py-3 text-lg outline-none focus:border-[#c5a059]" /></label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/5 p-4 text-sm text-zinc-200"><input disabled={spinning} className="mt-1 size-4" type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Quero receber promoções e cupons pelo WhatsApp. É opcional e posso cancelar quando quiser.</span></label>
            <p className="text-xs leading-relaxed text-zinc-400">Seu telefone é usado para registrar o prêmio e evitar mais de um giro por QR. O giro é único. <a className="font-bold text-[#f4ce83] underline underline-offset-2" href="/privacidade">Como tratamos seus dados</a>.</p>
            <button className="w-full rounded-xl bg-[#e31e24] py-4 text-lg font-black transition hover:bg-[#c1191f] disabled:opacity-60" type="submit" disabled={spinning}>{spinning ? "Girando…" : "Girar a roleta"}</button>
          </form>
        )}
        {result && <section className="mt-8"><span className="text-6xl" aria-hidden>{result.premio.emoji}</span><p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-[#c5a059]">Você ganhou</p><h2 className="mt-2 text-3xl font-black">{result.premio.nome}</h2><p className="mt-3 text-zinc-300">{result.premio.descricao_vitoria}</p><div className="mt-6 rounded-2xl border border-[#c5a059]/40 bg-[#311414] p-5"><span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Código do benefício</span><strong className="mt-2 block break-all text-2xl tracking-wider text-[#f4ce83]">{result.cupom}</strong><p className="mt-3 text-sm text-zinc-300">Apresente este código no caixa ou no atendimento até {new Date(result.expira_em).toLocaleDateString("pt-BR")}.</p>{result.modo_teste && <p className="mt-3 rounded-lg bg-amber-950/60 p-3 text-sm text-amber-100">Modo de teste: este benefício não pode ser usado na operação real.</p>}</div></section>}
      </section>
    </main>
  );
}

export default function RoletaV2Page() {
  return (
    <Suspense fallback={<main className="operations-page min-h-screen bg-[#280404] p-10 text-center text-white">Preparando a roleta...</main>}>
      <RoletaV2Content />
    </Suspense>
  );
}
