// app/routes/api.test-fel.jsx
import { json } from "@remix-run/node";
import axios from 'axios';

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const nit = url.searchParams.get("nit") || "1607421"; // NIT de prueba
  
  const felUrl = `https://felplex.stage.plex.lat/api/entity/4912/find/NIT/${nit}`;
  
  try {
    console.log("Probando conexión directa a FEL...");
    const response = await axios.get(felUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Authorization': 'r578Ts7DCACpPkgyzToY9BTZGvEIJ7qCNomNQySE1adDihwBMEyJ6UOHKtNQxTfC'
      }
    });
    
    return json({
      success: true,
      data: response.data,
      url: felUrl
    });
  } catch (error) {
    return json({
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: felUrl
    });
  }
};