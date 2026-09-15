import Link from "next/link";

export default function SorteioAdminPage() {
  return (
    <section className="admin-notice">
      <strong>Sorteios estão pausados.</strong>
      <span>
        Tickets não serão usados, zerados ou divulgados enquanto a modalidade não tiver
        regulamento, enquadramento jurídico, privacidade e auditoria próprios. O Clube
        segue com pontos e benefícios definidos.
      </span>
      <Link href="/admin/roleta">Ir para a Roleta V2 em preparação →</Link>
    </section>
  );
}
