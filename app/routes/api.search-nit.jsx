// app/routes/api.search-nit.jsx
import { json } from "@remix-run/node";
import { FelAPI } from "../utils/fel-api.js";

// Usar producción para las credenciales
const FEL_CREDENTIALS = {
  API_KEY: "r578Ts7DCACpPkgyzToY9BTZGvEIJ7qCNomNQySE1adDihwBMEyJ6UOHKtNQxTfC",
  EMPRESA_ID: "4912",
  ENVIRONMENT: "production"
};

export const loader = async ({ request }) => {
  console.log("=== BÚSQUEDA DE NIT (PRODUCCIÓN) ===");
  
  try {
    const url = new URL(request.url);
    const nit = url.searchParams.get("nit");
    
    if (!nit) {
      return json({ success: false, error: "NIT es requerido" }, { status: 400 });
    }

    const felApi = new FelAPI(
      FEL_CREDENTIALS.API_KEY,
      FEL_CREDENTIALS.EMPRESA_ID,
      FEL_CREDENTIALS.ENVIRONMENT
    );

    const result = await felApi.searchNIT(nit);

    if (result && result.length > 0) {
      return json({ success: true, data: result });
    } else {
      return json({ success: false, error: "NIT no encontrado", data: [] });
    }
  } catch (error) {
    console.error("ERROR:", error.message);
    
    return json(
      { 
        success: false, 
        error: error.message || "Error al buscar NIT",
        details: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      },
      { status: 500 }
    );
  }
};