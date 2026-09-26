/** Digitação monetária estilo maquininha: os dois últimos dígitos são centavos. */
export function normalizarDigitosDeMoeda(valor: string) {
  return valor.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 8);
}

export function formatarCentavos(digitos: string) {
  if (!digitos) return '';
  return (Number(digitos) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function atualizarDigitosDeMoeda(atual: string, entrada: string, tipoDeEntrada = '') {
  if (!entrada) return '';
  if (tipoDeEntrada.startsWith('delete') || (!tipoDeEntrada && entrada.length < formatarCentavos(atual).length)) {
    return atual.slice(0, -1);
  }
  return normalizarDigitosDeMoeda(entrada);
}
