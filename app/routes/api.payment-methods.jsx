// app/routes/api.payment-methods.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    console.log("Obteniendo métodos de pago configurados...");

    // Lista manual de métodos de pago utilizados en la tienda
    const paymentMethods = [
      { id: "cash", name: "Efectivo", type: "CASH" },
      { id: "gift_card", name: "Tarjeta de regalo", type: "GIFT_CARD" },
      { id: "store_credit", name: "Crédito en tienda", type: "STORE_CREDIT" },
      { id: "bank_deposit", name: "Depósito bancario", type: "BANK_DEPOSIT" },
      { id: "ebay", name: "eBay", type: "EBAY" },
      { id: "stripe", name: "Stripe", type: "STRIPE" },
      { id: "visanet_pos", name: "VISANET POS", type: "VISANET_POS" }
    ];

    console.log(`Métodos de pago disponibles: ${paymentMethods.length}`);

    return json({ 
      success: true, 
      paymentMethods
    });
    
  } catch (error) {
    console.error("Error obteniendo métodos de pago:", error);
    return json(
      { 
        success: false, 
        error: "Error al obtener métodos de pago",
        details: error.message 
      },
      { status: 500 }
    );
  }
};