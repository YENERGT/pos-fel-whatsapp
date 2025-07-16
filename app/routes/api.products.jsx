// app/routes/api.products.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(`
      query {
        products(first: 100) {
          edges {
            node {
              id
              title
              description
              handle
              featuredImage {
                url
                altText
              }
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                    inventoryItem {
                      id
                      tracked
                    }
                    image {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    const data = await response.json();
    
    // Formatear productos incluyendo todas las variantes
    const products = [];
    
    data.data.products.edges.forEach(edge => {
      const product = edge.node;
      
      // Si el producto tiene variantes
      if (product.variants.edges.length > 0) {
        product.variants.edges.forEach(variantEdge => {
          const variant = variantEdge.node;
          const variantTitle = variant.title !== 'Default Title' 
            ? `${product.title} - ${variant.title}`
            : product.title;
          
          products.push({
            id: variant.id,
            productId: product.id,
            title: variantTitle,
            baseTitle: product.title,
            variantTitle: variant.title,
            description: product.description,
            price: variant.price || "0",
            sku: variant.sku || "",
            inventory: variant.inventoryQuantity || 0,
            variantId: variant.id,
            tracked: variant.inventoryItem?.tracked || false,
            image: variant.image?.url || product.featuredImage?.url || null,
            imageAlt: variant.image?.altText || product.featuredImage?.altText || ""
          });
        });
      } else {
        // Producto sin variantes
        products.push({
          id: product.id,
          productId: product.id,
          title: product.title,
          baseTitle: product.title,
          variantTitle: 'Default',
          description: product.description,
          price: "0",
          sku: "",
          inventory: 0,
          variantId: null,
          tracked: false,
          image: product.featuredImage?.url || null,
          imageAlt: product.featuredImage?.altText || ""
        });
      }
    });

    return json({ success: true, products });
  } catch (error) {
    console.error("Error cargando productos:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}