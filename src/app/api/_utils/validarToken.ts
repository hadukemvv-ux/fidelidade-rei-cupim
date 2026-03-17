import { NextResponse } from "next/server";

export function validarToken(url: URL) {
  const token = url.searchParams.get("token");
  const secret = process.env.ADMIN_SECRET_TOKEN;

  if (!secret) {
    return NextResponse.json({ erro: "Token secreto não configurado no servidor." }, { status: 500 });
  }

  if (!token || token !== secret) {
    return new NextResponse("Acesso negado", { status: 403 });
  }

  return null; // válido
}