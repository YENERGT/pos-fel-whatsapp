// app/routes/api.process-sale.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { FelAPI } from "../utils/fel-api.js";
import { WhatsAppAPI } from "../utils/whatsapp-api.js";
import { GoogleSheetsAPI } from "../utils/google-sheets.js";

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.json();
  
  // Extraer correctamente todos los datos incluyendo discountTotal
  const { 
    customerType, 
    existingCustomerId, 
    nit, 
    phoneNumber, 
    products,
    discountTotal = 0  // Valor por defecto 0
  } = formData;

  console.log("Datos recibidos:", {
    customerType,
    discountTotal,
    productCount: products?.length
  });

  try {
    let customerId;
    let customerData;

    // Paso 1: Manejar cliente según el tipo
    if (customerType === 'existing') {
      // Cliente existente
      customerId = existingCustomerId;
      
      // Actualizar teléfono si es necesario
      if (phoneNumber) {
        try {
          await admin.graphql(`
            mutation customerUpdate($input: CustomerInput!) {
              customerUpdate(input: $input) {
                customer {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              input: {
                id: customerId,
                phone: phoneNumber
              }
            }
          });
        } catch (error) {
          console.error("Error actualizando teléfono:", error);
        }
      }
      
      customerData = {
        id: customerId,
        nit: nit.tax_code,
        name: nit.tax_name
      };
      
    } else {
      // Cliente nuevo
      try {
        // Primero buscar si ya existe un cliente con este teléfono
        const existingCustomers = await admin.graphql(`
          query {
            customers(first: 1, query: "phone:${phoneNumber}") {
              edges {
                node {
                  id
                }
              }
            }
          }
        `);

        const existingData = await existingCustomers.json();
        
        if (existingData.data.customers.edges.length > 0) {
          // Cliente ya existe, actualizar datos
          customerId = existingData.data.customers.edges[0].node.id;
          
          await admin.graphql(`
            mutation customerUpdate($input: CustomerInput!) {
              customerUpdate(input: $input) {
                customer {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              input: {
                id: customerId,
                firstName: nit?.tax_name || "CONSUMIDOR FINAL",
                lastName: nit?.tax_code || "CF",
                phone: phoneNumber,
                tags: ["POS", "FEL"],
                metafields: [
                  {
                    namespace: "custom",
                    key: "nit",
                    value: nit?.tax_code || "CF",
                    type: "single_line_text_field"
                  }
                ]
              }
            }
          });
        } else {
          // Crear nuevo cliente
          const createCustomer = await admin.graphql(`
            mutation customerCreate($input: CustomerInput!) {
              customerCreate(input: $input) {
                customer {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              input: {
                firstName: nit?.tax_name || "CONSUMIDOR FINAL",
                lastName: nit?.tax_code || "CF",
                phone: phoneNumber,
                tax_exempt: false,
                tags: ["POS", "FEL", "NUEVO"],
                addresses: nit?.address ? [{
                  address1: nit.address.street || "",
                  city: nit.address.city || "Guatemala",
                  province: nit.address.state || "Guatemala",
                  zip: nit.address.zip || "01001",
                  country: "GT"
                }] : [],
                metafields: [
                  {
                    namespace: "custom",
                    key: "nit",
                    value: nit?.tax_code || "CF",
                    type: "single_line_text_field"
                  }
                ]
              }
            }
          });

          const createResult = await createCustomer.json();
          if (createResult.data.customerCreate.userErrors.length > 0) {
            throw new Error(createResult.data.customerCreate.userErrors[0].message);
          }
          customerId = createResult.data.customerCreate.customer.id;
        }
        
        customerData = {
          id: customerId,
          nit: nit?.tax_code || "CF",
          name: nit?.tax_name || "CONSUMIDOR FINAL"
        };
        
      } catch (error) {
        console.error("Error con cliente:", error);
        throw new Error("Error al crear/actualizar cliente");
      }
    }

    // Paso 2: Crear orden en Shopify
    let order;
    try {
      const lineItems = products.map(product => ({
        variantId: product.variantId,
        quantity: product.quantity
      }));

      const orderInput = {
        customerId: customerId,
        lineItems: lineItems,
        tags: ["POS", "FEL", customerType === 'new' ? "CLIENTE_NUEVO" : "CLIENTE_EXISTENTE"],
        note: `NIT: ${customerData.nit}\nWhatsApp: ${phoneNumber}\nTipo: ${customerType}\nDescuento: Q${discountTotal}`
      };

      // Crear borrador de orden
      const createOrder = await admin.graphql(`
        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
              name
              totalPrice
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    quantity
                    originalUnitPrice
                    discountedUnitPrice
                    discountedTotal
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          input: orderInput
        }
      });

      const orderResult = await createOrder.json();
      if (orderResult.data.draftOrderCreate.userErrors.length > 0) {
        throw new Error(orderResult.data.draftOrderCreate.userErrors[0].message);
      }
      
      order = orderResult.data.draftOrderCreate.draftOrder;
    } catch (error) {
      console.error("Error creando orden:", error);
      throw new Error("Error al crear la orden");
    }

    // Paso 3: Crear factura en FEL (usando producción)
    let invoice;
    try {
      const felApi = new FelAPI(
        "r578Ts7DCACpPkgyzToY9BTZGvEIJ7qCNomNQySE1adDihwBMEyJ6UOHKtNQxTfC",
        "4912",
        "production"
      );

      // Formatear datos para FEL con descuento global
      const orderData = {
        line_items: products.map(product => ({
          name: product.title,
          quantity: product.quantity,
          price: product.price
        })),
        total_price: products.reduce((sum, p) => sum + (parseFloat(p.price) * p.quantity), 0),
        email: "",
        shipping_address: nit?.address || {
          address1: "",
          city: "Guatemala",
          province: "Guatemala",
          zip: "01001",
          country_code: "GT"
        }
      };

      // Asegurarse de que discountTotal sea un número válido
      const discount = parseFloat(discountTotal) || 0;
      
      console.log("Enviando a FEL con descuento:", discount);
      
      // Pasar el descuento global al formatear los datos
      const invoiceData = felApi.formatInvoiceData(orderData, nit, null, discount);
      
      invoice = await felApi.createInvoiceWithWhatsApp(invoiceData);

      if (!invoice.valid) {
        throw new Error(invoice.errors?.join(", ") || "Error en FEL");
      }
    } catch (error) {
      console.error("Error creando factura:", error);
      throw new Error("Error al crear la factura electrónica: " + error.message);
    }

    // Paso 4: Enviar por WhatsApp usando nuestra API con plantilla
    try {
      if (phoneNumber && invoice.uuid) {
        const whatsappApi = new WhatsAppAPI(
          process.env.WHATSAPP_PHONE_ID,
          process.env.WHATSAPP_ACCESS_TOKEN
        );

        // Pasar todos los datos necesarios para la plantilla
        await whatsappApi.sendInvoice(
          phoneNumber,
          invoice,
          invoice.uuid,
          order.name, // Número de orden de Shopify
          customerData.name // Nombre del cliente
        );
        
        console.log('WhatsApp con plantilla enviado correctamente');
      }
    } catch (error) {
      console.error("Error enviando WhatsApp:", error);
      // No lanzar error aquí, la factura ya fue creada
    }

    // Paso 5: Guardar en Google Sheets
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        const sheetsApi = new GoogleSheetsAPI({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }, process.env.GOOGLE_SHEETS_ID);

        await sheetsApi.appendOrder({
          orderNumber: order.name,
          customerName: customerData.name,
          nit: customerData.nit,
          phone: phoneNumber,
          total: order.totalPrice,
          invoiceNumber: `${invoice.sat.serie}-${invoice.sat.no}`,
          status: "Completado",
          customerType: customerType,
          discount: discount
        });
      }
    } catch (error) {
      console.error("Error guardando en Sheets:", error);
      // No lanzar error aquí
    }

    // Paso 6: Completar la orden draft
    try {
      await admin.graphql(`
        mutation draftOrderComplete($id: ID!) {
          draftOrderComplete(id: $id) {
            draftOrder {
              order {
                id
                name
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          id: order.id
        }
      });
    } catch (error) {
      console.error("Error completando orden:", error);
    }

    return json({
      success: true,
      order: {
        number: order.name,
        total: order.totalPrice
      },
      invoice: {
        number: `${invoice.sat.serie}-${invoice.sat.no}`,
        authorization: invoice.sat.authorization,
        uuid: invoice.uuid
      }
    });

  } catch (error) {
    console.error("Error procesando venta:", error);
    return json(
      { 
        success: false, 
        error: error.message || "Error al procesar la venta" 
      },
      { status: 500 }
    );
  }
}