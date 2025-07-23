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

  async getInvoices(searchQuery = '') {
    try {
      if (!this.sheets) {
        await this.authenticate();
      }

      console.log('📊 Obteniendo facturas de Google Sheets...');
      
      // Leer todas las filas de la hoja
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A2:O', // Desde la fila 2 para saltar headers
      });

      const rows = response.data.values || [];
      console.log(`📊 Total de facturas encontradas: ${rows.length}`);

      // Mapear los datos a objetos
      const invoices = rows.map((row, index) => ({
        id: index + 2, // ID de fila (empezando desde 2)
        orderNumber: row[0] || '',
        productosJSON: row[1] || '{}',
        totalGeneral: row[2] || '0',
        totalIVA: row[3] || '0',
        nit: row[4] || '',
        nombreNIT: row[5] || '',
        uuid: row[6] || '',
        serie: row[7] || '',
        noAutorizacion: row[8] || '',
        fecha: row[9] || '',
        estado: row[10] || '',
        pdfURL: row[11] || '',
        direccionJSON: row[12] || '{}',
        numeroTelefono: row[13] || '',
        canalVenta: row[14] || ''
      }));

      // Filtrar si hay búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return invoices.filter(invoice => 
          invoice.orderNumber.toLowerCase().includes(query) ||
          invoice.nit.toLowerCase().includes(query) ||
          invoice.nombreNIT.toLowerCase().includes(query)
        );
      }

      return invoices;
    } catch (error) {
      console.error('❌ Error obteniendo facturas:', error);
      throw error;
    }
  }

}