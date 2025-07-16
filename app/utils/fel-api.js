// app/utils/fel-api.js
import axios from 'axios';

const FEL_API_BASE_URL_DEV = 'https://felplex.stage.plex.lat';
const FEL_API_BASE_URL_PROD = 'https://app.felplex.com';

class FelAPI {
  constructor(apiKey, empresaId, environment = 'development') {
    this.apiKey = apiKey;
    this.empresaId = empresaId;
    this.baseURL = environment === 'production' ? FEL_API_BASE_URL_PROD : FEL_API_BASE_URL_DEV;
  }

  async searchNIT(nit) {
    const url = `${this.baseURL}/api/entity/${this.empresaId}/find/NIT/${nit}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'X-Authorization': this.apiKey
        },
        timeout: 15000
      });
      
      return response.data;
      
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  async createInvoiceWithWhatsApp(invoiceData) {
    try {
      const url = `${this.baseURL}/api/entity/${this.empresaId}/invoices/await`;
      console.log('Creando factura en FEL:', url);
      console.log('Datos enviados:', JSON.stringify(invoiceData, null, 2));
      
      const response = await axios.post(url, invoiceData, {
        headers: {
          'Accept': 'application/json',
          'X-Authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Respuesta de factura FEL:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error en FelAPI.createInvoiceWithWhatsApp:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  formatInvoiceData(orderData, nitData, phoneNumber, discountTotal = 0) {
    // Calcular totales correctamente con descuento global
    let subtotal = 0;
    
    const items = orderData.line_items.map((item) => {
      const precio = parseFloat(item.price) || 0;
      const cantidad = parseInt(item.quantity) || 1;
      
      // Sin descuento por item
      const itemSubtotal = precio * cantidad;
      subtotal += itemSubtotal;
      
      return {
        qty: cantidad,
        type: "B", // Bien
        price: precio,
        description: item.name || "Producto",
        without_iva: 0, // Con IVA
        discount: 0, // Sin descuento por item
        is_discount_percentage: 0,
        taxes: {
          qty: null,
          tax_code: null,
          full_name: null,
          short_name: null,
          tax_amount: null,
          taxable_amount: null
        }
      };
    });

    // Aplicar descuento global
    const totalConDescuento = subtotal - discountTotal;
    
    // En Guatemala, el IVA es del 12%
    const totalConIVA = totalConDescuento;
    const totalSinIVA = totalConIVA / 1.12;
    const totalIVA = totalConIVA - totalSinIVA;

    const invoiceData = {
      type: "FACT",
      datetime_issue: new Date().toISOString().split('.')[0],
      items: items,
      total: parseFloat(totalConIVA.toFixed(2)),
      total_tax: totalIVA.toFixed(2),
      emails: orderData.email ? [{email: orderData.email}] : [],
      emails_cc: [{email: "info@gruporevisa.net"}],
      phones: [],
      to_cf: nitData ? 0 : 1,
      to: {
        tax_code_type: "NIT",
        tax_code: nitData?.tax_code || "CF",
        tax_name: nitData?.tax_name || "CONSUMIDOR FINAL",
        address: {
          street: nitData?.address?.street || orderData.shipping_address?.address1 || null,
          city: nitData?.address?.city || orderData.shipping_address?.city || null,
          state: nitData?.address?.state || orderData.shipping_address?.province || null,
          zip: nitData?.address?.zip || orderData.shipping_address?.zip || null,
          country: nitData?.address?.country || "GT"
        }
      },
      exempt_phrase: null
    };

    console.log('Cálculos de totales:');
    console.log('Subtotal:', subtotal);
    console.log('Descuento total:', discountTotal);
    console.log('Total con descuento:', totalConDescuento);
    console.log('Total con IVA:', totalConIVA);
    console.log('Total IVA:', totalIVA);
    
    return invoiceData;
  }
}

// Exportar la clase
export { FelAPI };