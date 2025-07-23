// app/routes/api.invoices.jsx
import { json } from "@remix-run/node";
import { GoogleSheetsAPI } from "../utils/google-sheets.js";

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEETS_ID) {
      return json({
        success: false,
        error: "Google Sheets no configurado"
      });
    }

    const sheetsApi = new GoogleSheetsAPI({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }, process.env.GOOGLE_SHEETS_ID);

    await sheetsApi.authenticate();
    
    // Obtener todas las facturas
    const invoices = await sheetsApi.getInvoices(search);
    
    return json({
      success: true,
      invoices: invoices
    });

  } catch (error) {
    console.error("Error obteniendo facturas:", error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};