// app/routes/webhooks.refunds.create.jsx
import { authenticate } from "../shopify.server";
import { GoogleSheetsAPI } from "../utils/google-sheets.js";
import { FelAPI } from "../utils/fel-api.js";

export const action = async ({ request }) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`📦 Received ${topic} webhook for ${shop}`);
  console.log('💸 Procesando devolución:', JSON.stringify(payload, null, 2));

  try {
    // Extraer información de la devolución
    const orderId = payload.order_id;
    const refundId = payload.id;
    const orderName = `#${orderId.split('/').pop()}`; // Convertir ID a número de orden
    
    console.log(`🔍 Buscando factura para orden: ${orderName}`);
    
    // Buscar la factura en Google Sheets
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEETS_ID) {
      const sheetsApi = new GoogleSheetsAPI({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }, process.env.GOOGLE_SHEETS_ID);

      await sheetsApi.authenticate();
      
      // Buscar la factura por número de orden
      const response = await sheetsApi.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: 'A2:P',
      });

      const rows = response.data.values || [];
      
      // Buscar la fila que corresponde a esta orden
      let invoiceFound = null;
      let rowIndex = null;
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const orderNumber = row[0]; // Columna A
        
        if (orderNumber === orderName || orderNumber === orderId) {
          invoiceFound = {
            orderNumber: row[0],
            uuid: row[6], // Columna G
            estado: row[10], // Columna K
            estadoAnulacion: row[15] || '' // Columna P
          };
          rowIndex = i + 2; // +2 porque empezamos desde la fila 2
          break;
        }
      }
      
      if (invoiceFound && invoiceFound.uuid) {
        console.log(`✅ Factura encontrada: UUID ${invoiceFound.uuid}`);
        
        // Verificar si ya está anulada
        if (invoiceFound.estadoAnulacion === 'ANULADO') {
          console.log('⚠️ La factura ya estaba anulada');
          return new Response("Invoice already cancelled", { status: 200 });
        }
        
        // Anular la factura en FEL
        const felApi = new FelAPI(
          "r578Ts7DCACpPkgyzToY9BTZGvEIJ7qCNomNQySE1adDihwBMEyJ6UOHKtNQxTfC",
          "4912",
          "production"
        );
        
        try {
          await felApi.cancelInvoice(invoiceFound.uuid, `Devolución automática - Refund ID: ${refundId}`);
          console.log('✅ Factura anulada en FEL exitosamente');
          
          // Actualizar estado en Google Sheets
          await sheetsApi.updateInvoiceStatus(rowIndex, "ANULADO - DEVOLUCIÓN");
          console.log('✅ Estado actualizado en Google Sheets');
          
        } catch (felError) {
          console.error('❌ Error anulando en FEL:', felError.message);
          // Continuar aunque FEL falle, al menos marcar en Sheets
          await sheetsApi.updateInvoiceStatus(rowIndex, "ANULADO - ERROR FEL");
        }
        
      } else {
        console.log(`⚠️ No se encontró factura para la orden ${orderName}`);
      }
    }

    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error('❌ Error procesando webhook de devolución:', error);
    // No lanzar error para evitar reintentos del webhook
    return new Response("Error processed", { status: 200 });
  }
};