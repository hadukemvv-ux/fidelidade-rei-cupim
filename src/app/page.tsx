export default function Home() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', background: '#2D1810', color: 'white', minHeight: '100vh' }}>
      <h1>Bem-vindo ao Programa de Fidelidade O Rei do Cupim!</h1>
      <p>A tela de consulta está em: <a href="/consultar" style={{ color: '#E63946' }}>/consultar</a></p>
      <p>Se você chegou aqui, o loop de redirect foi quebrado temporariamente.</p>
    </div>
  );
}