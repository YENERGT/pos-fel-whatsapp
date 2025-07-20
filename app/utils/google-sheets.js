// app/utils/google-sheets.js
import { google } from 'googleapis';

export class GoogleSheetsAPI {
  constructor(credentials, sheetId) {
    console.log('🔧 Creando GoogleSheetsAPI con:', {
      email: credentials.email,
      hasPrivateKey: !!credentials.privateKey,
      privateKeyLength: credentials.privateKey?.length || 0,
      sheetId: sheetId
    });
    
    this.sheetId = sheetId;
    
    try {
      this.auth = new google.auth.JWT({
        email: credentials.email,
        key: credentials.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      console.log('✅ JWT creado exitosamente');
    } catch (error) {
      console.error('❌ Error creando JWT:', error);
      throw error;
    }
    
    this.sheets = null;
  }

  async authenticate() {
    try {
      console.log('🔐 Intentando autorizar JWT...');
      await this.auth.authorize();
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Autenticación con Google Sheets exitosa');
    } catch (error) {
      console.error('❌ Error de autenticación con Google Sheets:', error);
      throw error;
    }
  }

  async appendOrder(orderData) {
    try {
      // Autenticar si no lo hemos hecho
      if (!this.sheets) {
        await this.authenticate();
      }

      // Formatear fecha para Guatemala
      const fechaActual = new Date().toLocaleString('es-GT', { 
        timeZone: 'America/Guatemala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '');

      const values = [[
        orderData.orderNumber,           // A: PEDIDOS
        orderData.productosJSON,         // B: PRODUCTOS (JSON)
        orderData.totalGeneral,          // C: TOTAL GENERAL
        orderData.totalIVA,              // D: TOTAL IVA
        orderData.nit,                   // E: NIT
        orderData.nombreNIT,             // F: NOMBRE NIT
        orderData.uuid,                  // G: UUID
        orderData.serie,                 // H: SERIE
        orderData.noAutorizacion,        // I: NO autorizacion
        fechaActual,                     // J: FECHA
        orderData.estado || 'paid',      // K: ESTADO
        orderData.pdfURL,                // L: PDF URL
        orderData.direccionJSON,         // M: DIRECCION (JSON)
        orderData.numeroTelefono,        // N: NUMERO TELEFONO
        orderData.canalVenta || 'POS'   // O: CANAL DE VENTA
      ]];

      console.log('📊 Intentando guardar en Google Sheets...');
      console.log('Sheet ID:', this.sheetId);

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: 'A:O',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values
        }
      });

      console.log('✅ Respuesta de Google Sheets:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error detallado de Google Sheets:', {
        message: error.message,
        code: error.code,
        status: error.status
      });
      throw error;
    }
  }
}