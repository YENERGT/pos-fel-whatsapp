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
    discountTotal = 0,  // Valor por defecto 0
    paymentMethod = 'cash',  // Método de pago con valor por defecto
    creditEnabled = false,      // AGREGAR
    creditTerms = ''            // AGREGAR
  } = formData;

  // Variables que necesitaremos más adelante
  let finalOrderNumber = "";

  // Mapear método de pago a nombre de gateway
  const paymentMethodNames = {
    'cash': 'Efectivo',
    'gift_card': 'Tarjeta de regalo',
    'store_credit': 'Crédito en tienda',
    'bank_deposit': 'Depósito bancario',
    'ebay': 'eBay',
    'stripe': 'Stripe',
    'visanet_pos': 'VISANET POS',
    'credit': 'Crédito - Pendiente de pago'  // AGREGAR ESTA LÍNEA
  };
  
  let paymentGatewayName = paymentMethodNames[paymentMethod] || "POS";

  console.log("Datos recibidos:", {
    customerType,
    discountTotal,
    productCount: products?.length,
    paymentMethod,
    paymentGatewayName  // Agregar para verificar
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
    try {
      // Combinar todos los productos en lineItems
const lineItems = products.map(product => {
  if (product.isCustom) {
    // Productos personalizados usan title y originalUnitPrice
    return {
      title: product.title,
      originalUnitPrice: product.price,
      quantity: product.quantity,
      requiresShipping: false,
      taxable: true
    };
  } else {
    // Productos regulares usan variantId
    return {
      variantId: product.variantId,
      quantity: product.quantity
    };
  }
});

      // Agregar nota sobre productos personalizados si existen
let customProductsNote = '';
const customProducts = products.filter(p => p.isCustom);
if (customProducts.length > 0) {
  customProductsNote = '\n\nPRODUCTOS PERSONALIZADOS:\n' +
    customProducts.map(p => `- ${p.title}: Q${p.price} x ${p.quantity}`).join('\n');
}

      const orderInput = {
  customerId: customerId,
  lineItems: lineItems,
  tags: [
    "POS", 
    "FEL", 
    customerType === 'new' ? "CLIENTE_NUEVO" : "CLIENTE_EXISTENTE", 
    `PAGO_${paymentMethod.toUpperCase()}`,
    creditEnabled ? `CREDITO_${creditTerms}_DIAS` : "CONTADO"
  ],
  note: `NIT: ${customerData.nit}\nWhatsApp: ${phoneNumber}\nTipo: ${customerType}\nMétodo de Pago: ${paymentGatewayName}\nDescuento: Q${discountTotal}${creditEnabled ? `\nCRÉDITO: ${creditTerms} días` : ''}${customProductsNote}`,
  paymentTerms: creditEnabled ? {  // AGREGAR ESTE BLOQUE
    paymentTermsType: "NET",
    paymentSchedules: [{
      dueAt: new Date(Date.now() + parseInt(creditTerms) * 24 * 60 * 60 * 1000).toISOString(),
      issuedAt: new Date().toISOString()
    }]
  } : null,
  metafields: [
    {
      namespace: "pos",
      key: "payment_method",
      value: paymentGatewayName,
      type: "single_line_text_field"
    },
    {
      namespace: "pos",
      key: "credit_enabled",
      value: creditEnabled ? "true" : "false",
      type: "single_line_text_field"
    },
    {
      namespace: "pos",
      key: "credit_terms",
      value: creditTerms || "0",
      type: "single_line_text_field"
    }
  ]
};

console.log("LineItems a enviar:", JSON.stringify(lineItems, null, 2));
      console.log("OrderInput completo:", JSON.stringify(orderInput, null, 2));

      // Crear borrador de orden
const createOrder = await admin.graphql(`
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        totalPrice
        paymentTerms {
          paymentTermsType
          dueInDays
          paymentSchedules {
            edges {
              node {
                dueAt
                issuedAt
              }
            }
          }
        }
        lineItems(first: 50) {
          edges {
            node {
              title
              quantity
              originalUnitPrice
              discountedUnitPrice
              discountedTotal
              customAttributes {
                key
                value
              }
              custom
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
  console.error("Detalles del error:", {
    message: error.message,
    stack: error.stack
  });
  throw new Error(`Error al crear la orden: ${error.message}`);
}

    // Paso 3: Crear factura en FEL (usando producción)
    let invoice;
    let invoiceData; // AGREGAR ESTA LÍNEA
    let calculatedTotal = 0; // AGREGAR ESTA LÍNEA
    let calculatedIVA = 0; // AGREGAR ESTA LÍNEA
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
invoiceData = felApi.formatInvoiceData(orderData, nit, null, discount);

      // Guardar los valores calculados
const subtotal = products.reduce((sum, p) => sum + (parseFloat(p.price) * p.quantity), 0);
const totalConDescuento = subtotal - (parseFloat(discountTotal) || 0);
calculatedTotal = totalConDescuento.toFixed(2);
// IVA es el 12% en Guatemala
const totalSinIVA = totalConDescuento / 1.12;
calculatedIVA = (totalConDescuento - totalSinIVA).toFixed(2);

console.log('💰 Valores calculados para la factura:', {
  subtotal: subtotal,
  descuento: discountTotal,
  totalConDescuento: calculatedTotal,
  iva: calculatedIVA
});
      
      invoice = await felApi.createInvoiceWithWhatsApp(invoiceData);

      console.log('📋 Factura creada - Estructura completa:', JSON.stringify(invoice, null, 2));
console.log('🔍 Buscando totales en invoice:', {
  direct_total: invoice.total,
  direct_total_tax: invoice.total_tax,
  direct_tax: invoice.tax,
  totals_object: invoice.totals,
  sat_object: invoice.sat,
  invoice_keys: Object.keys(invoice)
});

      if (!invoice.valid) {
        throw new Error(invoice.errors?.join(", ") || "Error en FEL");
      }
    } catch (error) {
      console.error("Error creando factura:", error);
      throw new Error("Error al crear la factura electrónica: " + error.message);
    }

    // Paso 6: Completar la orden draft según el tipo de pago
try {
  console.log("🚀 Intentando completar draft order con ID:", order.id);
  console.log("💳 Tipo de pago:", creditEnabled ? `CRÉDITO ${creditTerms} días` : "CONTADO");
  
  let completedOrderId;
  
  if (creditEnabled) {
    // Para ventas a crédito, completar con paymentPending = true
    console.log("💳 Completando orden a CRÉDITO (sin marcar como pagada)");
    
    const completeResponse = await admin.graphql(`
      mutation draftOrderComplete($id: ID!, $paymentPending: Boolean) {
        draftOrderComplete(id: $id, paymentPending: $paymentPending) {
          draftOrder {
            id
            name
            order {
              id
              name
              displayFinancialStatus
              paymentTerms {
                paymentTermsType
                dueInDays
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
        id: order.id,
        paymentPending: true  // ESTO ES CLAVE - evita que se marque como pagada
      }
    });

    const completeResult = await completeResponse.json();
    console.log("🔍 Resultado completo (crédito):", JSON.stringify(completeResult, null, 2));
    
    if (completeResult.data?.draftOrderComplete?.draftOrder?.order) {
      const completedOrder = completeResult.data.draftOrderComplete.draftOrder.order;
      completedOrderId = completedOrder.id;
      finalOrderNumber = completedOrder.name;
      
      console.log("✅ Orden a crédito completada:", finalOrderNumber);
      console.log("💳 Estado financiero:", completedOrder.displayFinancialStatus);
      console.log("📅 Términos de pago:", completedOrder.paymentTerms);
    }
    
  } else {
    // Para ventas de contado, completar normalmente
    console.log("💰 Completando orden de CONTADO");
    
    const completeResponse = await admin.graphql(`
      mutation draftOrderComplete($id: ID!) {
        draftOrderComplete(id: $id) {
          draftOrder {
            id
            name
            order {
              id
              name
              paymentGatewayNames
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
    console.log("🔍 Resultado completo (contado):", JSON.stringify(completeResult, null, 2));
    
    if (completeResult.data?.draftOrderComplete?.draftOrder?.order) {
      const completedOrder = completeResult.data.draftOrderComplete.draftOrder.order;
      completedOrderId = completedOrder.id;
      finalOrderNumber = completedOrder.name;
      
      // Solo para ventas de contado: Marcar como pagada
      console.log("💰 Marcando orden de contado como PAGADA");
      
      const markPaidResponse = await admin.graphql(`
        mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
          orderMarkAsPaid(input: $input) {
            order { 
              id 
              displayFinancialStatus
            }
            userErrors { field message }
          }
        }
      `, {
        variables: { input: { id: completedOrderId } }
      });
      
      const paidResult = await markPaidResponse.json();
      console.log("💰 Resultado de marcar como pagada:", paidResult);
      
      if (paidResult.data?.orderMarkAsPaid?.userErrors?.length > 0) {
        console.error("Error marcando como pagada:", paidResult.data.orderMarkAsPaid.userErrors);
      } else {
        console.log("✅ Orden de contado marcada como PAGADA");
      }
    }
  }
  
  // SIEMPRE crear fulfillment (marcar como ENVIADA) - solo si tenemos completedOrderId
  if (completedOrderId) {
    console.log("📦 Creando fulfillment (marcando como ENVIADA)");

    try {
      // Primero obtener los fulfillment orders
      const fulfillmentOrdersResponse = await admin.graphql(`
        query getFulfillmentOrders($orderId: ID!) {
          order(id: $orderId) {
            fulfillmentOrders(first: 10) {
              edges {
                node {
                  id
                  status
                  lineItems(first: 50) {
                    edges {
                      node {
                        id
                        remainingQuantity
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { orderId: completedOrderId }
      });

      const fulfillmentOrdersResult = await fulfillmentOrdersResponse.json();
      console.log("📦 Fulfillment Orders encontrados:", JSON.stringify(fulfillmentOrdersResult, null, 2));

      const fulfillmentOrders = fulfillmentOrdersResult.data?.order?.fulfillmentOrders?.edges || [];
      
      if (fulfillmentOrders.length > 0) {
        // Preparar los line items para fulfillment
        const lineItemsToFulfill = [];
        
        for (const edge of fulfillmentOrders) {
          const fulfillmentOrder = edge.node;
          if (fulfillmentOrder.status === 'OPEN') {
            const fulfillmentOrderLineItems = [];
            
            for (const lineItemEdge of fulfillmentOrder.lineItems.edges) {
              const lineItem = lineItemEdge.node;
              if (lineItem.remainingQuantity > 0) {
                fulfillmentOrderLineItems.push({
                  id: lineItem.id,
                  quantity: lineItem.remainingQuantity
                });
              }
            }
            
            if (fulfillmentOrderLineItems.length > 0) {
              lineItemsToFulfill.push({
                fulfillmentOrderId: fulfillmentOrder.id,
                fulfillmentOrderLineItems: fulfillmentOrderLineItems
              });
            }
          }
        }

        console.log("📦 Line items para fulfillment:", JSON.stringify(lineItemsToFulfill, null, 2));

        if (lineItemsToFulfill.length > 0) {
          // Crear el fulfillment
          const createFulfillmentResponse = await admin.graphql(`
            mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
              fulfillmentCreateV2(fulfillment: $fulfillment) {
                fulfillment {
                  id
                  status
                  displayStatus
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              fulfillment: {
                lineItemsByFulfillmentOrder: lineItemsToFulfill,
                trackingInfo: {
                  company: creditEnabled ? `Crédito ${creditTerms} días` : "Entrega Local",
                  number: `${creditEnabled ? 'CRED' : 'LOCAL'}-${new Date().getTime()}`
                },
                notifyCustomer: false
              }
            }
          });

          const fulfillmentResult = await createFulfillmentResponse.json();
          console.log("📦 Resultado de crear fulfillment:", JSON.stringify(fulfillmentResult, null, 2));

          if (fulfillmentResult.data?.fulfillmentCreateV2?.userErrors?.length > 0) {
            console.error("❌ Errores al crear fulfillment:", fulfillmentResult.data.fulfillmentCreateV2.userErrors);
          } else if (fulfillmentResult.data?.fulfillmentCreateV2?.fulfillment) {
            console.log("✅ Orden marcada como ENVIADA exitosamente");
            console.log("📦 Estado de fulfillment:", fulfillmentResult.data.fulfillmentCreateV2.fulfillment.displayStatus);
          }
        } else {
          console.log("⚠️ No hay line items disponibles para fulfillment");
        }
      } else {
        console.log("⚠️ No se encontraron fulfillment orders");
      }
    } catch (fulfillmentError) {
      console.error("❌ Error creando fulfillment:", fulfillmentError);
      console.error("Detalles del error:", fulfillmentError.message);
    }

    // Log final del estado
    console.log("📊 RESUMEN FINAL:");
    console.log(`- Número de orden: ${finalOrderNumber}`);
    console.log(`- Tipo de venta: ${creditEnabled ? 'CRÉDITO' : 'CONTADO'}`);
    console.log(`- Estado de pago: ${creditEnabled ? 'PENDIENTE' : 'PAGADA'}`);
    console.log(`- Estado de envío: ENVIADA`);
    if (creditEnabled) {
      console.log(`- Términos de crédito: ${creditTerms} días`);
    }
  } else {
    console.log("❌ No se pudo obtener la orden completada");
  }
} catch (error) {
  console.error("Error completando orden:", error);
}

 // Paso 5: Guardar en Google Sheets (AHORA DESPUÉS DE COMPLETAR ORDEN)
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && finalOrderNumber && invoice) {
    console.log('🔍 Preparando datos para Google Sheets:', {
      orderNumber: finalOrderNumber,
      totalCalculado: calculatedTotal,
      ivaCalculado: calculatedIVA,
      uuid: invoice.uuid
    });

    const sheetsApi = new GoogleSheetsAPI({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }, process.env.GOOGLE_SHEETS_ID);

    // Construir el JSON de productos según el formato FEL
    const productosJSON = JSON.stringify({
      to: {
        address: {
          zip: nit?.address?.zip || null,
          city: nit?.address?.city || null,
          state: nit?.address?.state || null,
          street: nit?.address?.street || null,
          country: nit?.address?.country || null
        },
        tax_code: nit?.tax_code || "CF",
        tax_name: nit?.tax_name || "CONSUMIDOR FINAL",
        tax_code_type: "NIT"
      },
      type: "FACT",
      items: products.map((item) => ({
        qty: item.quantity,
        type: "B",
        price: parseFloat(item.price),
        taxes: {
          quantity: null,
          tax_code: null,
          full_name: null,
          short_name: null,
          tax_amount: null,
          taxable_amount: null
        },
        discount: 0,
        description: item.title || item.name || "Producto",
        without_iva: 0,
        is_discount_percentage: 0
      })),
      to_cf: nit ? 0 : 1,
      total: parseFloat(calculatedTotal), // USAR VALOR CALCULADO
      emails: [{email: null}],
      emails_cc: [{email: "info@gruporevisa.net"}],
      total_tax: calculatedIVA, // USAR VALOR CALCULADO
      exempt_phrase: null,
      datetime_issue: new Date().toISOString().slice(0, 19)
    });

    // Construir JSON de dirección
    const direccionJSON = JSON.stringify({
      first_name: customerData.name?.split(' ')[0] || "",
      address1: nit?.address?.street || "",
      phone: phoneNumber || "",
      city: nit?.address?.city || "",
      zip: nit?.address?.zip || "",
      province: nit?.address?.state || "",
      country: "Guatemala",
      last_name: customerData.name?.split(' ').slice(1).join(' ') || "",
      address2: "",
      company: nit?.tax_code || "",
      latitude: null,
      longitude: null,
      name: customerData.name || "",
      country_code: "GT",
      province_code: ""
    });

    await sheetsApi.appendOrder({
      orderNumber: finalOrderNumber,
      productosJSON: productosJSON,
      totalGeneral: calculatedTotal,     // USAR VALOR CALCULADO
      totalIVA: calculatedIVA,           // USAR VALOR CALCULADO
      nit: customerData.nit || "CF",
      nombreNIT: customerData.name || "CONSUMIDOR FINAL",
      uuid: invoice.uuid || "",
      serie: invoice.sat?.serie || "",
      noAutorizacion: invoice.sat?.authorization || "",
      estado: "paid",
      pdfURL: `https://app.felplex.com/pdf/${invoice.uuid}`,
      direccionJSON: direccionJSON,
      numeroTelefono: phoneNumber || "",
      canalVenta: creditEnabled ? `${paymentGatewayName} - CRÉDITO ${creditTerms} DÍAS` : paymentGatewayName
    });

    console.log('✅ Datos guardados en Google Sheets correctamente');
  }
} catch (error) {
  console.error("Error guardando en Sheets:", error);
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
    number: finalOrderNumber,
    total: order.totalPrice,
    creditEnabled: creditEnabled,
    creditTerms: creditTerms
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


