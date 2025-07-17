// app/components/ProductSelector.jsx
import { useState, useEffect, useRef } from 'react';

export default function ProductSelector({ 
  onProductsChange, 
  onDiscountChange, 
  selectedProducts: initialProducts = [],
  onProcessSale,
  processing,
  canProcess 
}) {

  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('Q');
  const searchRef = useRef(null);
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');
  const [customProductPrice, setCustomProductPrice] = useState('');

  // Sincronizar con productos iniciales cuando cambien desde afuera
  useEffect(() => {
    if (initialProducts.length === 0 && selectedProducts.length > 0) {
      setSelectedProducts([]);
      setGlobalDiscount(0);
      setDiscountType('Q');
      setSearchTerm('');
      setSearchResults([]);
      setExpandedProduct(null);
    }
  }, [initialProducts]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (onDiscountChange) {
      onDiscountChange(0);
    }
  }, []);

  // Manejar clics fuera del buscador
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda predictiva
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = products.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.baseTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Agrupar por producto base con min/max price y total stock
      const grouped = filtered.reduce((acc, product) => {
        const baseTitle = product.baseTitle;
        if (!acc[baseTitle]) {
          acc[baseTitle] = {
            baseTitle,
            variants: [],
            firstImage: product.image,
            hasMultipleVariants: false,
            minPrice: Infinity,
            maxPrice: 0,
            totalStock: 0
          };
        }
        acc[baseTitle].variants.push(product);
        // Actualizar precio mínimo y máximo
        const price = parseFloat(product.price);
        if (price < acc[baseTitle].minPrice) acc[baseTitle].minPrice = price;
        if (price > acc[baseTitle].maxPrice) acc[baseTitle].maxPrice = price;
        // Sumar stock
        acc[baseTitle].totalStock += product.inventory;
        return acc;
      }, {});

      // Marcar productos con múltiples variantes
      Object.values(grouped).forEach(group => {
        group.hasMultipleVariants = group.variants.length > 1;
      });

      setSearchResults(Object.values(grouped));
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchTerm, products]);

  const handleProductClick = (productGroup) => {
    if (productGroup.hasMultipleVariants) {
      // Si tiene variantes, expandir para mostrarlas
      setExpandedProduct(expandedProduct === productGroup.baseTitle ? null : productGroup.baseTitle);
    } else {
      // Si no tiene variantes, agregar directamente
      addProduct(productGroup.variants[0]);
      setSearchTerm('');
      setShowResults(false);
      setExpandedProduct(null);
    }
  };

  const addProduct = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    
    if (existing) {
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      const newProduct = {
        ...product,
        quantity: 1
      };
      const updated = [...selectedProducts, newProduct];
      setSelectedProducts(updated);
      onProductsChange(updated);
    }
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }

    const updated = selectedProducts.map(p => 
      p.id === productId ? { ...p, quantity } : p
    );
    
    setSelectedProducts(updated);
    onProductsChange(updated);
  };

  const removeProduct = (productId) => {
    const updated = selectedProducts.filter(p => p.id !== productId);
    setSelectedProducts(updated);
    onProductsChange(updated);
  };

  const calculateSubtotal = () => {
    return selectedProducts.reduce((sum, p) => sum + (parseFloat(p.price) * p.quantity), 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === '%') {
      return subtotal * (globalDiscount / 100);
    }
    return parseFloat(globalDiscount) || 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    return (subtotal - discountAmount).toFixed(2);
  };

  const handleDiscountChange = (value, type) => {
    const numericValue = parseFloat(value) || 0;
    setGlobalDiscount(numericValue);
    setDiscountType(type);
    
    const discountAmount = type === '%' 
      ? calculateSubtotal() * (numericValue / 100)
      : numericValue;
    
    if (onDiscountChange) {
      onDiscountChange(discountAmount);
    }
  };

  // Función para agregar producto personalizado
  const addCustomProduct = () => {
    if (!customProductName || !customProductPrice) {
      alert('Por favor ingrese nombre y precio del producto');
      return;
    }

    const customProduct = {
      id: `custom-${Date.now()}`,
      productId: `custom-${Date.now()}`,
      title: customProductName,
      baseTitle: customProductName,
      variantTitle: 'Personalizado',
      description: 'Producto personalizado',
      price: customProductPrice,
      sku: 'CUSTOM',
      inventory: 999, // Inventario "ilimitado" para productos personalizados
      variantId: `custom-variant-${Date.now()}`,
      tracked: false,
      image: null,
      isCustom: true
    };

    addProduct(customProduct);
    setCustomProductName('');
    setCustomProductPrice('');
    setShowCustomProduct(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Buscador predictivo */}
      <div ref={searchRef} style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar productos por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#008060';
            if (searchTerm) setShowResults(true);
          }}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
        />

        {/* Resultados de búsqueda */}
        {showResults && searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '400px',
            overflowY: 'auto',
            background: 'white',
            border: '2px solid #e0e0e0',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            {searchResults.map((productGroup) => {
              // Calcular precio mínimo y máximo si hay múltiples variantes
              const prices = productGroup.variants.map(v => parseFloat(v.price));
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              
              // Verificar si hay ofertas
              const hasOffers = productGroup.variants.some(v => v.compareAtPrice && parseFloat(v.compareAtPrice) > parseFloat(v.price));
              
              // Calcular stock total
              const totalStock = productGroup.variants.reduce((sum, v) => sum + v.inventory, 0);
              const hasStock = totalStock > 0;
              
              return (
                <div key={productGroup.baseTitle}>
                  <div
                    onClick={() => handleProductClick(productGroup)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'white',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    {productGroup.firstImage && (
                      <img 
                        src={productGroup.firstImage}
                        alt={productGroup.baseTitle}
                        style={{
                          width: '40px',
                          height: '40px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{productGroup.baseTitle}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        {productGroup.hasMultipleVariants && `${productGroup.variants.length} variantes`}
                        {hasOffers && (
                          <span style={{ 
                            marginLeft: '8px',
                            padding: '2px 6px',
                            background: '#ff6600',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            OFERTA
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {minPrice === maxPrice ? (
                          <span style={{ color: '#333' }}>Q{minPrice}</span>
                        ) : (
                          <span style={{ color: '#333' }}>Q{minPrice} - Q{maxPrice}</span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        color: hasStock ? '#00aa00' : '#ff0000'
                      }}>
                        {hasStock ? `Stock: ${totalStock}` : 'AGOTADO'}
                      </div>
                      {productGroup.hasMultipleVariantes && (
                        <span style={{ color: '#008060', fontSize: '14px' }}>
                          {expandedProduct === productGroup.baseTitle ? '▼' : '▶'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Variantes expandidas */}
                  {expandedProduct === productGroup.baseTitle && (
                    <div style={{ background: '#f8f8f8' }}>
                      {productGroup.variants.map(variant => {
                        const isOutOfStock = variant.inventory <= 0;
                        const hasDiscount = variant.compareAtPrice && parseFloat(variant.compareAtPrice) > parseFloat(variant.price);
                        const discountPercentage = hasDiscount 
                          ? Math.round(((parseFloat(variant.compareAtPrice) - parseFloat(variant.price)) / parseFloat(variant.compareAtPrice)) * 100)
                          : 0;
                          
                        return (
                          <div
                            key={variant.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              addProduct(variant);
                              setSearchTerm('');
                              setShowResults(false);
                              setExpandedProduct(null);
                            }}
                            style={{
                              padding: '8px 16px 8px 60px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #e0e0e0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: isOutOfStock ? '#ffe6e6' : 'transparent',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isOutOfStock ? '#ffd4d4' : '#e8e8e8'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isOutOfStock ? '#ffe6e6' : 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              {variant.image && (
                                <img 
                                  src={variant.image}
                                  alt={variant.title}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    opacity: isOutOfStock ? 0.6 : 1
                                  }}
                                />
                              )}
                              <div>
                                <div style={{ fontWeight: '500', color: isOutOfStock ? '#ff4444' : '#333' }}>
                                  {variant.variantTitle !== 'Default Title' ? variant.variantTitle : 'Estándar'}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                {hasDiscount ? (
                                  <>
                                    <span style={{
                                      textDecoration: 'line-through',
                                      color: '#999',
                                      fontSize: '12px'
                                    }}>
                                      Q{variant.compareAtPrice}
                                    </span>
                                    <span style={{ 
                                      fontWeight: 'bold', 
                                      fontSize: '16px', 
                                      color: '#ff6600' 
                                    }}>
                                      Q{variant.price}
                                    </span>
                                    <span style={{
                                      padding: '2px 6px',
                                      background: '#ff6600',
                                      color: 'white',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}>
                                      -{discountPercentage}%
                                    </span>
                                  </>
                                ) : (
                                  <span style={{ 
                                    fontWeight: 'bold', 
                                    fontSize: '16px', 
                                    color: '#333' 
                                  }}>
                                    Q{variant.price}
                                  </span>
                                )}
                              </div>
                              <div style={{ 
                                fontSize: '12px', 
                                color: isOutOfStock ? '#ff0000' : variant.inventory > 5 ? '#00aa00' : '#ff8800',
                                fontWeight: 'bold',
                                marginTop: '4px'
                              }}>
                                {isOutOfStock ? '⚠️ AGOTADO' : `Stock: ${variant.inventory}`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sección de producto personalizado */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowCustomProduct(!showCustomProduct)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#f0f0f0',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e0e0e0';
            e.currentTarget.style.borderColor = '#008060';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f0f0';
            e.currentTarget.style.borderColor = '#e0e0e0';
          }}
        >
          <span style={{ fontSize: '20px' }}>➕</span>
          Agregar Producto Personalizado
        </button>

        {showCustomProduct && (
          <div style={{
            marginTop: '12px',
            padding: '16px',
            background: 'white',
            border: '2px solid #008060',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Producto Personalizado</h4>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                Nombre del producto
              </label>
              <input
                type="text"
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                placeholder="Ej: Servicio de instalación"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                Precio (Q)
              </label>
              <input
                type="number"
                value={customProductPrice}
                onChange={(e) => setCustomProductPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={addCustomProduct}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#008060',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Agregar
              </button>
              <button
                onClick={() => {
                  setShowCustomProduct(false);
                  setCustomProductName('');
                  setCustomProductPrice('');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de productos seleccionados */}
      <div style={{ 
        flex: 1, 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '500px'
      }}>
        {/* Descuento Global */}
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            Descuento Total
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              value={globalDiscount}
              onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0, discountType)}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              min="0"
              step="0.01"
            />
            <select
              value={discountType}
              onChange={(e) => handleDiscountChange(globalDiscount, e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                background: 'white'
              }}
            >
              <option value="Q">Q</option>
              <option value="%">%</option>
            </select>
            {globalDiscount > 0 && (
              <span style={{ color: '#ff6600', fontWeight: 'bold', fontSize: '16px' }}>
                -Q{calculateDiscountAmount().toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Contenedor scrolleable para productos */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
          {selectedProducts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#999', 
              padding: '60px 20px',
              fontSize: '16px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
              <p>No hay productos seleccionados</p>
              <p style={{ fontSize: '14px' }}>Usa el buscador para agregar productos</p>
            </div>
          ) : (
            <div>
              <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Productos Seleccionados</h3>
              {selectedProducts.map(product => {
                const isOutOfStock = product.quantity > product.inventory && !product.isCustom;
                const isCustomProduct = product.isCustom === true;
                return (
                  <div 
                    key={product.id}
                    style={{
                      padding: '16px',
                      marginBottom: '12px',
                      background: isOutOfStock ? '#ffe6e6' : isCustomProduct ? '#f0f8ff' : 'white',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      border: isOutOfStock ? '2px solid #ff4444' : isCustomProduct ? '2px solid #0066cc' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      position: 'relative'
                    }}
                  >
                    {/* Etiqueta de agotado */}
                    {isOutOfStock && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '10px',
                        background: '#ff4444',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        ⚠️ STOCK INSUFICIENTE
                      </div>
                    )}

                    {/* Etiqueta de producto personalizado */}
                    {isCustomProduct && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '10px',
                        background: '#0066cc',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        PERSONALIZADO
                      </div>
                    )}
                    
                    {product.image ? (
                      <img 
                        src={product.image}
                        alt={product.title}
                        style={{
                          width: '50px',
                          height: '50px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          opacity: isOutOfStock ? 0.6 : 1
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '50px',
                        height: '50px',
                        background: isCustomProduct ? '#0066cc' : '#e0e0e0',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: isCustomProduct ? 'white' : '#999'
                      }}>
                        {isCustomProduct ? '✏️' : '📦'}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: isOutOfStock ? '#ff4444' : '#333' }}>
                        {product.title}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                        {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) ? (
                          <>
                            <span style={{ textDecoration: 'line-through', marginRight: '8px' }}>
                              Q{product.compareAtPrice}
                            </span>
                            <span style={{ color: '#ff6600', fontWeight: 'bold' }}>
                              Q{product.price}
                            </span>
                            <span style={{ marginLeft: '8px', marginRight: '8px' }}>×</span>
                            <span>{product.quantity}</span>
                            <span style={{ marginLeft: '8px' }}>=</span>
                            <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>
                              Q{(product.price * product.quantity).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontWeight: 'bold' }}>Q{product.price}</span>
                            <span style={{ marginLeft: '8px', marginRight: '8px' }}>×</span>
                            <span>{product.quantity}</span>
                            <span style={{ marginLeft: '8px' }}>=</span>
                            <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>
                              Q{(product.price * product.quantity).toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                      {isOutOfStock && (
                        <div style={{ fontSize: '12px', color: '#ff4444', fontWeight: 'bold', marginTop: '4px' }}>
                          Solo hay {product.inventory} disponibles
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => updateQuantity(product.id, product.quantity - 1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          background: '#f0f0f0',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={product.quantity}
                        onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                        style={{
                          width: '50px',
                          textAlign: 'center',
                          border: isOutOfStock ? '2px solid #ff4444' : '1px solid #ddd',
                          borderRadius: '6px',
                          padding: '6px',
                          fontSize: '16px',
                          background: isOutOfStock ? '#ffe6e6' : 'white'
                        }}
                      />
                      <button
                        onClick={() => updateQuantity(product.id, product.quantity + 1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          background: '#f0f0f0',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeProduct(product.id)}
                        style={{
                          marginLeft: '8px',
                          width: '32px',
                          height: '32px',
                          background: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totales - Siempre visible al final */}
        <div style={{ 
          padding: '20px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          marginTop: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '16px' }}>
            <span>Subtotal:</span>
            <span>Q{calculateSubtotal().toFixed(2)}</span>
          </div>
          {globalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#ff6600', fontSize: '16px' }}>
              <span>Descuento:</span>
              <span>-Q{calculateDiscountAmount().toFixed(2)}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#008060',
            borderTop: '2px solid #e0e0e0',
            paddingTop: '12px',
            marginBottom: '16px'
          }}>
            <span>Total:</span>
            <span>Q{calculateTotal()}</span>
          </div>
        </div>

        {/* Botón de procesar */}
        <button
          onClick={onProcessSale}
          disabled={!canProcess || processing || selectedProducts.length === 0}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '16px',
            background: !canProcess || processing || selectedProducts.length === 0 ? '#ccc' : '#008060',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: !canProcess || processing || selectedProducts.length === 0 ? 'default' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (canProcess && !processing && selectedProducts.length > 0) {
              e.target.style.background = '#006644';
            }
          }}
          onMouseLeave={(e) => {
            if (canProcess && !processing && selectedProducts.length > 0) {
              e.target.style.background = '#008060';
            }
          }}
        >
          {processing ? 'Procesando...' : 'Procesar Venta'}
        </button>
      </div>
   </div>
  );
}