'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BONUS_CADASTRO_PONTOS } from '@/lib/fidelidade-rules';

/** Convite que acompanha a rolagem: aparece depois do topo e some quando o convite final entra na tela. */
export default function StickyJoin() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('.hero'), final = document.querySelector('.final-cta');
    if (!hero || !('IntersectionObserver' in window)) return;
    const seen = new Map<Element, boolean>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target, entry.isIntersecting);
      setVisible(!seen.get(hero) && !(final && seen.get(final)));
    }, { threshold: 0.05 });
    observer.observe(hero);
    if (final) observer.observe(final);
    return () => observer.disconnect();
  }, []);

  return <div className={`sticky-join${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
    <p><strong>Ganhe {BONUS_CADASTRO_PONTOS} pontos</strong><span>ao entrar para o clube</span></p>
    <Link href="/cadastro" className="button button-primary" tabIndex={visible ? 0 : -1}>Entrar <span aria-hidden="true">→</span></Link>
  </div>;
}
