// app/routes/api.test-env.jsx
import { json } from "@remix-run/node";

export const loader = async () => {
  // Verificar configuración de Google Sheets
  const hasGoogleSheets = !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
    process.env.GOOGLE_PRIVATE_KEY && 
    process.env.GOOGLE_SHEETS_ID
  );
  
  return json({
    hasApiKey: !!process.env.FEL_API_KEY,
    empresaId: process.env.FEL_EMPRESA_ID,
    environment: process.env.FEL_ENVIRONMENT,
    whatsappConfigured: !!process.env.WHATSAPP_ACCESS_TOKEN,
    googleSheetsConfigured: hasGoogleSheets,
    googleSheetsId: hasGoogleSheets ? process.env.GOOGLE_SHEETS_ID : "Not configured"
  });
};