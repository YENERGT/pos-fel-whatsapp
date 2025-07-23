// app/routes/api.cancel-invoice.jsx
import { json } from "@remix-run/node";
import { FelAPI } from "../utils/fel-api.js";

export const action = async ({ request }) => {
  try {
    const formData = await request.json();
    const { uuid, reason = "Anulación solicitada desde POS" } = formData;
    
    if (!uuid) {
      return json({
        success: false,
        error: "UUID de factura es requerido"
      }, { status: 400 });
    }

    console.log("🚫 Anulando factura con UUID:", uuid);

    const felApi = new FelAPI(
      "r578Ts7DCACpPkgyzToY9BTZGvEIJ7qCNomNQySE1adDihwBMEyJ6UOHKtNQxTfC",
      "4912",
      "production"
    );

    // Llamar al método de anulación
    const result = await felApi.cancelInvoice(uuid, reason);
    
    console.log("✅ Factura anulada exitosamente");
    
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