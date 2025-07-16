// app/routes/api.test-env.jsx
import { json } from "@remix-run/node";

export const loader = async () => {
  return json({
    hasApiKey: !!process.env.FEL_API_KEY,
    empresaId: process.env.FEL_EMPRESA_ID,
    environment: process.env.FEL_ENVIRONMENT,
    whatsappConfigured: !!process.env.WHATSAPP_ACCESS_TOKEN
  });
};