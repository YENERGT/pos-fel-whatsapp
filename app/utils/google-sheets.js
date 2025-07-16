// app/utils/google-sheets.js
import { google } from 'googleapis';

export class GoogleSheetsAPI {
  constructor(credentials, sheetId) {
    this.sheetId = sheetId;
    this.auth = new google.auth.JWT(
      credentials.email,
      null,
      credentials.privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async appendOrder(orderData) {
    try {
      const values = [[
        new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' }),
        orderData.orderNumber,
        orderData.customerName,
        orderData.nit,
        orderData.phone,
        orderData.total,
        orderData.invoiceNumber,
        orderData.status,
        orderData.customerType || 'N/A'
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: 'Pedidos!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error guardando en Google Sheets:', error);
      throw error;
    }
  }

  async createSheetIfNotExists() {
    try {
      // Verificar si la hoja existe
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetId
      });

      const sheets = response.data.sheets || [];
      const pedidosSheet = sheets.find(s => s.properties.title === 'Pedidos');

      if (!pedidosSheet) {
        // Crear la hoja 'Pedidos'
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.sheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Pedidos'
                }
              }
            }]
          }
        });

        // Agregar encabezados
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetId,
          range: 'Pedidos!A1:I1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'Fecha',
              'Número de Orden',
              'Cliente',
              'NIT',
              'Teléfono',
              'Total',
              'Número de Factura',
              'Estado',
              'Tipo Cliente'
            ]]
          }
        });
      }
    } catch (error) {
      console.error('Error creando hoja:', error);
      throw error;
    }
  }
}