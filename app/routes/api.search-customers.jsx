// app/routes/api.search-customers.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("query");

    if (!query) {
      return json({ success: false, error: "Query es requerido" }, { status: 400 });
    }

    console.log("Buscando clientes con query:", query);

    // Construir query de búsqueda para Shopify
    // Buscar en firstName (tax_name) o lastName (tax_code/NIT)
    const searchQuery = `first_name:*${query}* OR last_name:*${query}* OR phone:*${query}* OR email:*${query}*`;
    
    console.log("Query de Shopify:", searchQuery);

    // Buscar clientes
    const response = await admin.graphql(`
      query searchCustomers($query: String!) {
        customers(first: 25, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              tags
              defaultAddress {
                address1
                city
                province
                zip
                country
              }
            }
          }
        }
      }
    `, {
      variables: {
        query: searchQuery
      }
    });

    const data = await response.json();
    console.log("Respuesta de Shopify:", JSON.stringify(data, null, 2));
    
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
        // firstName = tax_name, lastName = tax_code/NIT
        displayName: customer.firstName || "SIN NOMBRE",
        email: customer.email || "",
        phone: customer.phone || "",
        nit: customer.lastName || "CF", // lastName contiene el NIT
        tags: customer.tags || [],
        address: customer.defaultAddress || null
      };
    });

    console.log(`Encontrados ${customers.length} clientes`);

    // Si no encontramos con la búsqueda compleja, intentar búsqueda simple
    if (customers.length === 0) {
      console.log("Intentando búsqueda simple...");
      
      const simpleResponse = await admin.graphql(`
        query {
          customers(first: 100, sortKey: CREATED_AT, reverse: true) {
            edges {
              node {
                id
                firstName
                lastName
                email
                phone
                tags
                defaultAddress {
                  address1
                  city
                  province
                  zip
                  country
                }
              }
            }
          }
        }
      `);

      const simpleData = await simpleResponse.json();
      
      // Filtrar manualmente
      const allCustomers = simpleData.data.customers.edges.map(edge => {
        const customer = edge.node;
        return {
          id: customer.id,
          firstName: customer.firstName || "",
          lastName: customer.lastName || "",
          displayName: customer.firstName || "SIN NOMBRE",
          email: customer.email || "",
          phone: customer.phone || "",
          nit: customer.lastName || "CF",
          tags: customer.tags || [],
          address: customer.defaultAddress || null
        };
      });

      // Filtrar por query
      const queryLower = query.toLowerCase();
      const filteredCustomers = allCustomers.filter(customer => 
        (customer.firstName && customer.firstName.toLowerCase().includes(queryLower)) ||
        (customer.lastName && customer.lastName.toLowerCase().includes(queryLower)) ||
        (customer.nit && customer.nit.toLowerCase().includes(queryLower)) ||
        (customer.phone && customer.phone.includes(query)) ||
        (customer.email && customer.email.toLowerCase().includes(queryLower))
      );

      return json({ success: true, customers: filteredCustomers });
    }

    return json({ success: true, customers });
  } catch (error) {
    console.error("Error completo:", error);
    console.error("Stack:", error.stack);
    return json(
      { 
        success: false, 
        error: "Error al buscar clientes",
        details: error.message 
      },
      { status: 500 }
    );
  }
};