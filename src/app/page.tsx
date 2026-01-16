'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.href = '/consulta';  // rota nova
  }, []);

  return (
    <div style={{ padding: '50px', textAlign: 'center', background: '#2D1810', color: 'white', minHeight: '100vh' }}>
      <h1>Redirecionando para a consulta...</h1>
      <p>Se não redirecionar automaticamente em 2 segundos, <a href="/consulta" style={{ color: '#E63946' }}>clique aqui</a>.</p>
    </div>
  );
}