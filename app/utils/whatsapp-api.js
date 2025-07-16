// app/utils/whatsapp-api.js
import axios from 'axios';
import { WHATSAPP_API_URL } from '../config/constants.js';

export class WhatsAppAPI {
  constructor(phoneId, accessToken) {
    this.phoneId = phoneId;
    this.accessToken = accessToken;
    this.baseURL = WHATSAPP_API_URL;
  }

  async sendInvoice(phoneNumber, invoiceData, felUuid, orderNumber, customerName) {
    try {
      // Formatear número de teléfono (quitar + y espacios)
      const formattedPhone = phoneNumber.replace(/[\s+]/g, '');
      
      // URL del PDF de FELplex
      const pdfUrl = `https://app.felplex.com/pdf/${felUuid}`;
      
      console.log('Enviando WhatsApp con plantilla a:', formattedPhone);
      console.log('URL del PDF:', pdfUrl);
      console.log('Datos para plantilla:', { customerName, orderNumber });

      // Plantilla configurable desde variables de entorno
      const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "purchase_receipt_1";
      const templateId = process.env.WHATSAPP_TEMPLATE_ID || "578636165222079";
      console.log(`Usando plantilla: ${templateName} (ID: ${templateId})`);

      // Mensaje usando plantilla de WhatsApp
      const templateMessage = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "es"
          },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    link: pdfUrl,
                    filename: `Factura_${invoiceData.sat.no}.pdf`
                  }
                }
              ]
            },
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: customerName || "Cliente"
                },
                {
                  type: "text",
                  text: customerName || "Cliente"
                },
                {
                  type: "text",
                  text: orderNumber || "N/A"
                }
              ]
            }
          ]
        }
      };

      console.log('Enviando mensaje con plantilla:', JSON.stringify(templateMessage, null, 2));

      const response = await axios.post(
        `${this.baseURL}/${this.phoneId}/messages`,
        templateMessage,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp enviado exitosamente:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('Error enviando WhatsApp:', error.response?.data || error.message);
      
      // Si falla la plantilla, intentar con mensaje simple como fallback
      if (error.response?.status === 400) {
        console.log('Intentando envío con mensaje simple como fallback...');
        return this.sendSimpleMessage(phoneNumber, invoiceData, felUuid);
      }
      
      throw error;
    }
  }

  // Método de fallback con mensaje simple
  async sendSimpleMessage(phoneNumber, invoiceData, felUuid) {
    try {
      const formattedPhone = phoneNumber.replace(/[\s+]/g, '');
      const pdfUrl = `https://app.felplex.com/pdf/${felUuid}`;
      
      const textMessage = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          body: `🧾 *FACTURA ELECTRÓNICA*\n\n` +
                `*Serie:* ${invoiceData.sat.serie}\n` +
                `*Número:* ${invoiceData.sat.no}\n` +
                `*Autorización SAT:* ${invoiceData.sat.authorization}\n` +
                `*Total:* Q${invoiceData.total || '0.00'}\n\n` +
                `📄 *Descarga tu factura aquí:*\n${pdfUrl}\n\n` +
                `_Gracias por tu compra_`
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneId}/messages`,
        textMessage,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp simple enviado como fallback:', response.data);
      return response.data;
    } catch (fallbackError) {
      console.error('Error en fallback:', fallbackError);
      throw fallbackError;
    }
  }
}