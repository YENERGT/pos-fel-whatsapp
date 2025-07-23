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
    
    // AGREGAR ESTE LOG DETALLADO
    console.log('🔍 ESTRUCTURA COMPLETA DE LA RESPUESTA FEL:', JSON.stringify(response.data, null, 2));
    
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
  // Calcular totales correctamente
  let subtotal = 0;
  const discountGlobal = parseFloat(discountTotal) || 0;
  
  // Primero calcular el subtotal
  orderData.line_items.forEach((item) => {
    const precio = parseFloat(item.price) || 0;
    const cantidad = parseInt(item.quantity) || 1;
    subtotal += precio * cantidad;
  });

  // Calcular el porcentaje de descuento global
  const porcentajeDescuento = subtotal > 0 ? (discountGlobal / subtotal) : 0;
  
  const items = orderData.line_items.map((item) => {
    const precio = parseFloat(item.price) || 0;
    const cantidad = parseInt(item.quantity) || 1;
    
    // Calcular el descuento proporcional para este item
    const itemSubtotal = precio * cantidad;
    const itemDescuento = itemSubtotal * porcentajeDescuento;
    
    return {
      qty: cantidad,
      type: "B", // Bien
      price: precio,
      description: item.name || "Producto",
      without_iva: 0, // Con IVA (0 = incluye IVA)
      discount: parseFloat(itemDescuento.toFixed(2)), // Descuento proporcional
      is_discount_percentage: 0, // 0 = monto fijo, 1 = porcentaje
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

  // Calcular totales finales
  const totalConDescuento = subtotal - discountGlobal;
  
  // En Guatemala, los precios ya incluyen IVA del 12%
  // Total con IVA = totalConDescuento (porque los precios ya incluyen IVA)
  // Total sin IVA = totalConDescuento / 1.12
  // Monto del IVA = totalConDescuento - (totalConDescuento / 1.12)
  
  const totalConIVA = totalConDescuento;
  const totalSinIVA = totalConIVA / 1.12;
  const montoIVA = totalConIVA - totalSinIVA;

  // Formatear la fecha actual
  const fechaActual = new Date();
  const año = fechaActual.getFullYear();
  const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaActual.getDate()).padStart(2, '0');
  const hora = String(fechaActual.getHours()).padStart(2, '0');
  const minuto = String(fechaActual.getMinutes()).padStart(2, '0');
  const segundo = String(fechaActual.getSeconds()).padStart(2, '0');
  const fechaFormateada = `${año}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;

  const invoiceData = {
    type: "FACT",
    currency: "GTQ",
    datetime_issue: fechaFormateada,
    items: items,
    total: parseFloat(totalConIVA.toFixed(2)),
    total_tax: parseFloat(montoIVA.toFixed(2)),
    emails: orderData.email ? [{email: orderData.email}] : [],
    emails_cc: [{email: "info@gruporevisa.net"}],
    phones: phoneNumber ? [{phone: phoneNumber}] : [],
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

  console.log('===== CÁLCULOS DE TOTALES FEL =====');
  console.log('Subtotal sin descuento:', subtotal.toFixed(2));
  console.log('Descuento global:', discountGlobal.toFixed(2));
  console.log('Porcentaje de descuento:', (porcentajeDescuento * 100).toFixed(2) + '%');
  console.log('Total con descuento:', totalConDescuento.toFixed(2));
  console.log('Total con IVA (total):', totalConIVA.toFixed(2));
  console.log('Monto del IVA (total_tax):', montoIVA.toFixed(2));
  console.log('Total sin IVA:', totalSinIVA.toFixed(2));
  console.log('Items con descuento:', items);
  console.log('===================================');
  
  return invoiceData;
}

async cancelInvoice(uuid, reason = "Anulación") {
    try {
      const url = `${this.baseURL}/api/entity/${this.empresaId}/invoices/${uuid}`;
      console.log('🚫 Anulando factura en FEL:', url);
      
      const response = await axios.delete(url, {
        headers: {
          'Accept': 'application/json',
          'X-Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: {
          reason: reason
        }
      });
      
      console.log('✅ Respuesta de anulación:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error anulando factura en FEL:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 404) {
        throw new Error('Factura no encontrada');
      } else if (error.response?.status === 400) {
        throw new Error('La factura ya fue anulada o no puede ser anulada');
      }
      
      throw error;
    }
  }

}

// Exportar la clase
export { FelAPI };