'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Dish = { src: string; name: string; tag: string; position?: string };

/** Fileira de pratos para arrastar: dedo no celular (rolagem nativa) e mouse no computador. */
export default function DishCarousel({ dishes }: { dishes: Dish[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);

  const cards = () => Array.from(rail.current?.children ?? []) as HTMLElement[];

  // A carta mais perto do centro é a "ativa": fica em destaque e acende o ponto correspondente.
  const nearest = useCallback(() => {
    const element = rail.current;
    if (!element) return 0;
    const center = element.scrollLeft + element.clientWidth / 2;
    let best = 0, distance = Infinity;
    cards().forEach((card, index) => {
      const gap = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (gap < distance) { distance = gap; best = index; }
    });
    return best;
  }, []);
  const sync = useCallback(() => setActive(nearest()), [nearest]);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    let frame = 0;
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); };
    element.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); element.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [sync]);

  function goTo(index: number) {
    const element = rail.current, card = cards()[Math.max(0, Math.min(dishes.length - 1, index))];
    if (!element || !card) return;
    element.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - element.clientWidth / 2, behavior: 'smooth' });
  }

  // Mouse: arrasta a fileira. Toque fica com a rolagem nativa, que já tem inércia.
  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !rail.current) return;
    drag.current = { x: event.clientX, left: rail.current.scrollLeft, moved: false };
  }
  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || !rail.current) return;
    const delta = event.clientX - state.x;
    if (!state.moved && Math.abs(delta) < 6) return;
    if (!state.moved) { state.moved = true; setDragging(true); }
    rail.current.scrollLeft = state.left - delta;
  }
  function endDrag() {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (!moved) return;
    setDragging(false);
    // Devolve o encaixe e pousa na carta mais próxima.
    goTo(nearest());
  }

  return <div className="dish-carousel" data-reveal="right">
    <div ref={rail} className={`dish-rail${dragging ? ' is-dragging' : ''}`} role="group" aria-roledescription="carrossel" aria-label="Pratos da casa"
      tabIndex={0} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag} onPointerCancel={endDrag}
      onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); goTo(active + 1); } if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(active - 1); } }}>
      {dishes.map((dish, index) => (
        <article className={`dish-card${index === active ? ' is-active' : ''}`} key={dish.name} aria-label={`${dish.name} (${index + 1} de ${dishes.length})`}>
          <Image src={dish.src} alt={dish.name} fill sizes="(max-width: 699px) 80vw, 26rem" draggable={false} style={{ objectPosition: dish.position }} />
          <div><span>{dish.tag}</span><h3>{dish.name}</h3></div>
        </article>
      ))}
    </div>
    <div className="dish-controls">
      <button type="button" aria-label="Prato anterior" disabled={active === 0} onClick={() => goTo(active - 1)}>←</button>
      <div className="dish-dots" aria-hidden="true">{dishes.map((dish, index) => <i key={dish.name} className={index === active ? 'on' : ''} />)}</div>
      <button type="button" aria-label="Próximo prato" disabled={active === dishes.length - 1} onClick={() => goTo(active + 1)}>→</button>
    </div>
    <p className="dish-hint" aria-hidden="true">Arraste para o lado</p>
  </div>;
}
