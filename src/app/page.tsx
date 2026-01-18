'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.href = '/resgate';
  }, []);

  return (
    <div className="min-h-screen bg-[#2D1810] text-white flex items-center justify-center">
      <p className="text-2xl">Redirecionando para resgate...</p>
    </div>
  );
}