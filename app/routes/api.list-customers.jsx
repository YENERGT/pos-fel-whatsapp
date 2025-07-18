// app/routes/api.list-customers.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    console.log("Cargando lista de clientes...");

    // Cargar los últimos 50 clientes
    const response = await admin.graphql(`
      query {
        customers(first: 50, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              tags
            }
          }
        }
      }
    `);

    const data = await response.json();
    
    if (data.errors) {
      console.error("Errores de GraphQL:", data.errors);
      throw new Error("Error en consulta GraphQL");
    }

    // Formatear los resultados
    const customers = data.data.customers.edges.map(edge => {
      const customer = edge.node;
      
      return {
        id: customer.id,
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        displayName: customer.firstName || "SIN NOMBRE",
        email: customer.email || "",
        phone: customer.phone || "",
        nit: customer.lastName || "CF",
        tags: customer.tags || []
      };
    });

    console.log(`Cargados ${customers.length} clientes`);

    return json({ success: true, customers });
  } catch (error) {
    console.error("Error cargando clientes:", error);
    return json(
      { 
        success: false, 
        error: "Error al cargar clientes",
        details: error.message 
      },
      { status: 500 }
    );
  }
};