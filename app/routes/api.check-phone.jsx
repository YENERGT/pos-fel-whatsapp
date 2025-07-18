// app/routes/api.check-phone.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      return json({ success: false, error: "Teléfono es requerido" }, { status: 400 });
    }

    console.log("Verificando número de teléfono:", phone);

    // Buscar clientes con este número de teléfono
    const response = await admin.graphql(`
      query checkPhone($phone: String!) {
        customers(first: 5, query: $phone) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
            }
          }
        }
      }
    `, {
      variables: {
        phone: phone
      }
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error("Errores de GraphQL:", data.errors);
      throw new Error("Error en consulta GraphQL");
    }

    // Verificar si algún cliente tiene exactamente este número
    const customers = data.data.customers.edges;
    const existingCustomer = customers.find(edge => 
      edge.node.phone === phone
    );

    if (existingCustomer) {
      const customer = existingCustomer.node;
      return json({
        success: true,
        exists: true,
        customer: {
          id: customer.id,
          name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Sin nombre',
          email: customer.email || '',
          phone: customer.phone
        }
      });
    }

    return json({
      success: true,
      exists: false
    });

  } catch (error) {
    console.error("Error verificando teléfono:", error);
    return json(
      { 
        success: false, 
        error: "Error al verificar teléfono",
        details: error.message 
      },
      { status: 500 }
    );
  }
};