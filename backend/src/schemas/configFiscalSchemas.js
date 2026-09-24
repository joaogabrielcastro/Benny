import { z } from "zod";
import { REGIMES_FISCAIS } from "../domain/configuracaoFiscalTenant.js";

export const atualizarConfigFiscalSchema = z.object({
  regime_tributario: z.enum(Object.keys(REGIMES_FISCAIS)),
  icms_codigo: z.string().trim().min(2).max(3),
  uf: z.string().trim().length(2),
  cfop_interno: z.string().regex(/^\d{4}$/),
  cfop_interestadual: z.string().regex(/^\d{4}$/),
});
