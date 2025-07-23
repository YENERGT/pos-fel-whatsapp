// app/routes/api.products.jsx
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  try {
    console.log("🔄 Iniciando carga de productos con paginación...");
    
    const allProducts = [];
    let hasNextPage = true;
    let cursor = null;
    let pageCount = 0;
    
    // Cargar productos en lotes de 50
    while (hasNextPage) {
      pageCount++;
      console.log(`📦 Cargando página ${pageCount} de productos...`);
      
      const query = cursor ? `
        query getProducts($cursor: String!) {
          products(first: 50, after: $cursor) {
            edges {
              cursor
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
                      compareAtPrice
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
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      ` : `
        query {
          products(first: 50) {
            edges {
              cursor
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
                      compareAtPrice
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
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
      
      const variables = cursor ? { cursor } : {};
      const response = await admin.graphql(query, { variables });
      const data = await response.json();
      
      if (data.errors) {
        console.error("❌ Error en GraphQL:", data.errors);
        throw new Error("Error cargando productos");
      }
      
      // Agregar productos de esta página
      allProducts.push(...data.data.products.edges);
      
      // Preparar para siguiente página
      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;
      
      console.log(`✅ Página ${pageCount}: ${data.data.products.edges.length} productos cargados`);
    }
    
    console.log(`🎉 Total de productos cargados: ${allProducts.length}`);
    
    // Formatear productos incluyendo todas las variantes
    const products = [];
    
    allProducts.forEach(edge => {
      const product = edge.node;
      
      // Si el producto tiene variantes
      if (product.variants.edges.length > 0) {
        product.variants.edges.forEach(variantEdge => {
          const variant = variantEdge.node;
          const variantTitle = variant.title !== 'Default Title' 
            ? `${product.title} - ${variant.title}`
            : product.title;
          
          // Crear términos de búsqueda optimizados
          const searchTerms = [
            product.title?.toLowerCase() || '',
            variant.title?.toLowerCase() || '',
            product.description?.toLowerCase() || '',
            variant.sku?.toLowerCase() || '',
            product.handle?.toLowerCase() || ''
          ].join(' ');
          
          products.push({
            id: variant.id,
            productId: product.id,
            title: variantTitle,
            baseTitle: product.title,
            variantTitle: variant.title,
            description: product.description || '',
            compareAtPrice: variant.compareAtPrice || null,
            price: variant.price || "0",
            sku: variant.sku || "",
            inventory: variant.inventoryQuantity || 0,
            variantId: variant.id,
            tracked: variant.inventoryItem?.tracked || false,
            image: variant.image?.url || product.featuredImage?.url || null,
            imageAlt: variant.image?.altText || product.featuredImage?.altText || "",
            searchTerms: searchTerms // Campo optimizado para búsqueda
          });
        });
      } else {
        // Producto sin variantes
        const searchTerms = [
          product.title?.toLowerCase() || '',
          product.description?.toLowerCase() || '',
          product.handle?.toLowerCase() || ''
        ].join(' ');
        
        products.push({
          id: product.id,
          productId: product.id,
          title: product.title,
          baseTitle: product.title,
          variantTitle: 'Default',
          description: product.description || '',
          price: "0",
          sku: "",
          inventory: 0,
          variantId: null,
          tracked: false,
          image: product.featuredImage?.url || null,
          imageAlt: product.featuredImage?.altText || "",
          searchTerms: searchTerms
        });
      }
    });

    console.log(`📊 Total de variantes procesadas: ${products.length}`);
    
    return json({ 
      success: true, 
      products,
      totalProducts: allProducts.length,
      totalVariants: products.length
    });
    
  } catch (error) {
    console.error("❌ Error cargando productos:", error);
    return json({ 
      success: false, 
      error: error.message,
      products: [] 
    }, { status: 500 });
  }
}
