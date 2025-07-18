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
        // VALIDACIÓN IMPORTANTE: Verificar si el teléfono ya existe
        if (phoneNumber) {
          const phoneCheck = await admin.graphql(`
            query checkPhone($phone: String!) {
              customers(first: 1, query: $phone) {
                edges {
                  node {
                    id
                    firstName
                    lastName
                    phone
                  }
                }
              }
            }
          `, {
            variables: {
              phone: phoneNumber
            }
          });

          const phoneCheckData = await phoneCheck.json();
          
          if (phoneCheckData.data.customers.edges.length > 0) {
            // El teléfono ya existe en otro cliente
            const existingCustomer = phoneCheckData.data.customers.edges[0].node;
            throw new Error(`El número de teléfono ${phoneNumber} ya está registrado para el cliente: ${existingCustomer.firstName || ''} ${existingCustomer.lastName || ''}`);
          }
        }

        // Si no existe, proceder a crear/actualizar
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
          // Este caso no debería ocurrir por la validación anterior
          throw new Error("El número de teléfono ya está registrado");
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
                tags: ["POS", "FEL", "NUEVO"],
                addresses: [{
                  address1: nit?.address?.street || "Ciudad",
                  city: nit?.address?.city || "Guatemala",
                  province: nit?.address?.state || "Guatemala",
                  zip: nit?.address?.zip || "01001",
                  country: "GT",
                  countryCode: "GT"
                }],
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
        throw new Error(error.message || "Error al crear/actualizar cliente");
      }
    }

    // Paso 2: Crear orden en Shopify
    let order;
    let finalOrderNumber; // ← AGREGAR ESTA LÍNEA
    try {
      const lineItems = products
        .filter(product => !product.isCustom) // Filtrar productos personalizados para Shopify
        .map(product => ({
          variantId: product.variantId,
          quantity: product.quantity
        }));

      // Agregar nota sobre productos personalizados si existen
      const customProducts = products.filter(p => p.isCustom);
      let customProductsNote = '';
      if (customProducts.length > 0) {
        customProductsNote = '\n\nPRODUCTOS PERSONALIZADOS:\n' +
          customProducts.map(p => `- ${p.title}: Q${p.price} x ${p.quantity}`).join('\n');
      }

      const orderInput = {
        customerId: customerId,
        lineItems: lineItems,
        tags: ["POS", "FEL", customerType === 'new' ? "CLIENTE_NUEVO" : "CLIENTE_EXISTENTE"],
        note: `NIT: ${customerData.nit}\nWhatsApp: ${phoneNumber}\nTipo: ${customerType}\nDescuento: Q${discountTotal}${customProductsNote}`
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

      // Aplicar descuento si existe
      if (discountTotal > 0) {
        console.log("💰 Aplicando descuento de Q" + discountTotal + " al draft order");
        
        const applyDiscountResponse = await admin.graphql(`
          mutation draftOrderUpdate($id: ID!, $input: DraftOrderInput!) {
            draftOrderUpdate(id: $id, input: $input) {
              draftOrder {
                id
                name
                totalPrice
                appliedDiscount {
                  value
                  valueType
                  title
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
            id: order.id,
            input: {
              appliedDiscount: {
                value: parseFloat(discountTotal),
                valueType: "FIXED_AMOUNT",
                title: "Descuento POS"
              }
            }
          }
        });

        const discountResult = await applyDiscountResponse.json();
        
        if (discountResult.data.draftOrderUpdate.userErrors.length > 0) {
          console.error("Error aplicando descuento:", discountResult.data.draftOrderUpdate.userErrors);
        } else {
          console.log("✅ Descuento aplicado correctamente");
          order = discountResult.data.draftOrderUpdate.draftOrder;
        }
      }

      finalOrderNumber = order.name;
      console.log("📝 Número inicial (draft):", finalOrderNumber);
    
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

    
    // Paso 5: Guardar en Google Sheets
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const sheetsApi = new GoogleSheetsAPI({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }, process.env.GOOGLE_SHEETS_ID);

    // Calcular el total real (con descuento aplicado)
    const totalConDescuento = products.reduce((sum, p) => sum + (parseFloat(p.price) * p.quantity), 0) - discountTotal;

    await sheetsApi.appendOrder({
      orderNumber: order.name,
      customerName: customerData.name,
      nit: customerData.nit,
      phone: phoneNumber,
      total: totalConDescuento.toFixed(2),
      invoiceNumber: `${invoice.sat.serie}-${invoice.sat.no}`,
      status: "Completado",
      customerType: customerType,
      discount: discountTotal
    });
  }
} catch (error) {
  console.error("Error guardando en Sheets:", error);
}

    // Paso 6: Completar la orden draft y marcarla como pagada/enviada
try {
  console.log("🚀 Intentando completar draft order con ID:", order.id);
  
  // Primero completar el draft
  const completeResponse = await admin.graphql(`
    mutation draftOrderComplete($id: ID!) {
      draftOrderComplete(id: $id) {
        draftOrder {
          id
          name
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
    variables: { id: order.id }
  });

  const completeResult = await completeResponse.json();
  console.log("🔍 Resultado completo:", JSON.stringify(completeResult, null, 2));

  // Verificar si hay errores
  if (completeResult.data?.draftOrderComplete?.userErrors?.length > 0) {
    console.error("❌ Errores al completar draft:", completeResult.data.draftOrderComplete.userErrors);
  }

  if (completeResult.data?.draftOrderComplete?.draftOrder?.order) {
    const completedOrder = completeResult.data.draftOrderComplete.draftOrder.order;
    const completedOrderId = completedOrder.id;
    finalOrderNumber = completedOrder.name;
    console.log("✅ Número de orden REAL obtenido:", finalOrderNumber);
    
    // Marcar como pagada
    await admin.graphql(`
      mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
        orderMarkAsPaid(input: $input) {
          order { id }
          userErrors { field message }
        }
      }
    `, {
      variables: { input: { id: completedOrderId } }
    });

    // Crear fulfillment para marcar como enviada
    await admin.graphql(`
      mutation fulfillmentCreate($fulfillment: FulfillmentV2Input!) {
        fulfillmentCreateV2(fulfillment: $fulfillment) {
          fulfillment { id status }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        fulfillment: {
          orderId: completedOrderId,
          notifyCustomer: false,
          trackingInfo: {
            company: "Entrega Local",
            number: `LOCAL-${new Date().getTime()}`
          },
          lineItemsByFulfillmentOrder: { fulfillmentOrderLineItems: [] }
        }
      }
    });
  } else if (completeResult.data?.draftOrderComplete?.draftOrder) {
    // Si no hay order, pero sí draftOrder, puede que ya esté completada
    console.log("⚠️ Draft order existe pero no tiene order asociada");
    console.log("Draft order data:", completeResult.data.draftOrderComplete.draftOrder);
  } else {
    console.log("❌ No se pudo obtener la orden completada");
  }
} catch (error) {
  console.error("Error completando orden:", error);
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
          finalOrderNumber, // ← USAR EL NÚMERO DE ORDEN REAL
          customerData.name // Nombre del cliente
        );
        
        console.log('WhatsApp enviado con número de orden:', finalOrderNumber);
        console.log('Datos enviados a WhatsApp:', {
          phoneNumber,
          orderNumber: finalOrderNumber,
          customerName: customerData.name
        });
      }
    } catch (error) {
      console.error("Error enviando WhatsApp:", error);
      // No lanzar error aquí, la factura ya fue creada
    }

    return json({
      success: true,
      order: {
        number: finalOrderNumber, // ← CAMBIAR DE order.name a finalOrderNumber
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


