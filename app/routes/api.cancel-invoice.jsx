// app/routes/api.cancel-invoice.jsx
import { json } from "@remix-run/node";
import { FelAPI } from "../utils/fel-api.js";
import { GoogleSheetsAPI } from "../utils/google-sheets.js";

export const action = async ({ request }) => {
  try {
    const formData = await request.json();
    const { uuid, reason = "Anulación solicitada desde POS", sheetRowId } = formData;
    
    if (!uuid) {
      return json({
        success: false,
        error: "UUID de factura es requerido"
      }, { status: 400 });
    }

    console.log("🚫 Anulando factura con UUID:", uuid);
    console.log("📝 ID de fila en Sheets:", sheetRowId);

    const felApi = new FelAPI(
      "r578Ts7DCACpPkgyzToY9BTZGvEIJ7qCNomNQySE1adDihwBMEyJ6UOHKtNQxTfC",
      "4912",
      "production"
    );

    // Llamar al método de anulación en FEL
    const result = await felApi.cancelInvoice(uuid, reason);
    
    console.log("✅ Factura anulada exitosamente en FEL");
    
    // Actualizar estado en Google Sheets
    if (sheetRowId && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEETS_ID) {
      try {
        console.log("📊 Actualizando estado en Google Sheets...");
        
        const sheetsApi = new GoogleSheetsAPI({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }, process.env.GOOGLE_SHEETS_ID);

        await sheetsApi.authenticate();
        await sheetsApi.updateInvoiceStatus(sheetRowId, "ANULADO");
        
        console.log("✅ Estado actualizado en Google Sheets");
      } catch (sheetsError) {
        console.error("⚠️ Error actualizando Google Sheets (no crítico):", sheetsError);
        // No fallar la operación si Google Sheets falla
      }
    }
    
    return json({
      success: true,
      message: "Factura anulada exitosamente",
      data: result
    });

  } catch (error) {
    console.error("Error anulando factura:", error);
    return json({
      success: false,
      error: error.message || "Error al anular la factura"
    }, { status: 500 });
  }
};