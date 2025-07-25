// app/routes/api.invoices.jsx
import { json } from "@remix-run/node";
import { GoogleSheetsAPI } from "../utils/google-sheets.js";
import { isDateInRange } from "../utils/date-utils.js";

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
    
    console.log('📊 Obteniendo facturas de Google Sheets...');
    
    // Leer hasta columna O (no necesitamos P)
    const response = await sheetsApi.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'A2:O',
    });

    const rows = response.data.values || [];
    console.log(`📊 Total de facturas encontradas: ${rows.length}`);

    // Mapear los datos a objetos
    const invoices = rows.map((row, index) => {
      // El estado viene de la columna K (índice 10)
      const estado = row[10] || 'paid';
      
      return {
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
        estado: estado, // Directamente de columna K
        pdfURL: row[11] || '',
        direccionJSON: row[12] || '{}',
        numeroTelefono: row[13] || '',
        canalVenta: row[14] || ''
      };
    });

    // Filtrar si hay búsqueda
    let filteredInvoices = invoices;
if (search) {
  const query = search.toLowerCase();
  filteredInvoices = invoices.filter(invoice => 
    invoice.orderNumber.toLowerCase().includes(query) ||
    invoice.nit.toLowerCase().includes(query) ||
    invoice.nombreNIT.toLowerCase().includes(query) ||
    isDateInRange(invoice.fecha, query) // ← NUEVA LÍNEA: Búsqueda por fecha
  );
}
    
    // Ordenar facturas por número de orden (más recientes primero)
 const sortedInvoices = invoices.sort((a, b) => {
      // Extraer el número de la orden (ej: #1005 -> 1005)
      const getOrderNumber = (orderStr) => {
        const match = orderStr.match(/#?(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const orderA = getOrderNumber(a.orderNumber);
      const orderB = getOrderNumber(b.orderNumber);
      
      return orderB - orderA; // Orden descendente (más recientes primero)
    });

    let finalInvoices;
    let isSearching = false;

    // Si hay búsqueda, buscar en TODAS las facturas (sin límite)
    if (search) {
      isSearching = true;
      const query = search.toLowerCase();
      finalInvoices = sortedInvoices.filter(invoice => 
        invoice.orderNumber.toLowerCase().includes(query) ||
        invoice.nit.toLowerCase().includes(query) ||
        invoice.nombreNIT.toLowerCase().includes(query) ||
        isDateInRange(invoice.fecha, query)
      );
      console.log(`🔍 Búsqueda "${search}": ${finalInvoices.length} resultados de ${sortedInvoices.length} facturas totales`);
    } else {
      // Sin búsqueda, mostrar solo las 20 más recientes
      finalInvoices = sortedInvoices.slice(0, 20);
      console.log(`📊 Mostrando ${finalInvoices.length} facturas más recientes de ${sortedInvoices.length} totales`);
    }
    
    return json({
      success: true,
      invoices: finalInvoices,
      total: sortedInvoices.length,
      showing: finalInvoices.length,
      isSearching: isSearching
    });

  } catch (error) {
    console.error("Error obteniendo facturas:", error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};