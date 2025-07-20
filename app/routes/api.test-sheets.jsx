// app/routes/api.test-sheets.jsx
import { json } from "@remix-run/node";
import { GoogleSheetsAPI } from "../utils/google-sheets.js";

export const loader = async () => {
  try {
    console.log("🔍 Verificando configuración de Google Sheets...");
    
    // Verificar variables de entorno
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    
    console.log("Email:", email);
    console.log("Sheet ID:", sheetId);
    console.log("Private Key existe:", !!privateKey);
    console.log("Private Key longitud:", privateKey?.length || 0);
    console.log("Private Key empieza con:", privateKey?.substring(0, 50) + "...");
    
    if (!email || !privateKey || !sheetId) {
      return json({
        success: false,
        error: "Faltan credenciales",
        details: {
          hasEmail: !!email,
          hasPrivateKey: !!privateKey,
          privateKeyLength: privateKey?.length || 0,
          hasSheetId: !!sheetId
        }
      });
    }

    // Procesar la clave privada
    const processedKey = privateKey.replace(/\\n/g, '\n');
    console.log("Clave procesada empieza con:", processedKey.substring(0, 50) + "...");

    // Intentar crear la instancia con más debugging
    console.log("Creando instancia de GoogleSheetsAPI...");
    const sheetsApi = new GoogleSheetsAPI({
      email: email,
      privateKey: processedKey
    }, sheetId);

    console.log("Intentando autenticar...");
    await sheetsApi.authenticate();

    return json({
      success: true,
      message: "Conexión exitosa a Google Sheets"
    });

  } catch (error) {
    console.error("Error completo:", error);
    return json({
      success: false,
      error: error.message,
      stack: error.stack,
      details: {
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0
      }
    });
  }
};