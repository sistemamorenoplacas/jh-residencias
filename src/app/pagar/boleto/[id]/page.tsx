import { redirect } from "next/navigation";

/**
 * Boleto ainda não é emitido (a integração Mercado Pago gera apenas Pix).
 * Enquanto isso, o link de boleto redireciona para a página de Pix da mesma
 * cobrança, para o inquilino conseguir pagar. Quando o boleto for implementado,
 * esta rota passa a renderizar a 2ª via.
 */
export default async function PagarBoletoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/pagar/pix/${id}`);
}
