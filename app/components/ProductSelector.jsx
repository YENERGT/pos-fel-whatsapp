// app/components/ProductSelector.jsx
import { useState, useEffect, useRef } from 'react';

export default function ProductSelector({ 
  onProductsChange, 
  onDiscountChange, 
  selectedProducts: initialProducts = [],
  onProcessSale,
  processing,
  canProcess,
  isDarkMode = false,  // ← AGREGAR
  theme = null  // ← AGREGAR 
}) {

  // Tema por defecto si no se pasa
  const defaultTheme = {
    cardBackground: 'white',
    cardBorder: '#e0e0e0',
    text: '#333', // text principal
    textSecondary: '#666', // texto secundario
    inputBackground: 'white',
    inputBorder: '#e0e0e0',
    shadowColor: 'rgba(0,0,0,0.1)'
  };
  
  
  const currentTheme = theme || defaultTheme;
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
      {/* Buscador predictivo mejorado */}
<div ref={searchRef} style={{ 
  position: 'relative', 
  marginBottom: '20px',
  background: currentTheme.cardBackground,
  padding: '16px',
  borderRadius: '12px',
  border: `2px solid ${currentTheme.cardBorder}`
}}>
  <label style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontWeight: 'bold',
    color: isDarkMode ? 'white' : currentTheme.text,
    fontSize: '14px'
  }}>
    <span style={{ fontSize: '20px' }}>🔍</span>
    <span>Buscar Productos</span>
    {searchTerm && (
      <span style={{
        marginLeft: 'auto',
        padding: '4px 8px',
        background: '#0066cc',
        color: 'white',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {searchResults.length} resultados
      </span>
    )}
  </label>
  
  <div style={{ position: 'relative' }}>
    <input
      type="text"
      placeholder="Buscar por nombre o SKU..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      style={{
        width: '100%',
        padding: '14px 16px 14px 48px',
        border: `2px solid ${currentTheme.inputBorder}`,
        borderRadius: '10px',
        fontSize: '16px',
        outline: 'none',
        transition: 'all 0.3s ease',
        background: currentTheme.inputBackground,
        color: isDarkMode ? 'white' : currentTheme.text,
        boxSizing: 'border-box'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#0066cc';
        e.target.style.boxShadow = '0 0 0 3px rgba(0,102,204,0.2)';
        e.target.style.transform = 'scale(1.01)';
        if (searchTerm) setShowResults(true);
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#e0e0e0';
        e.target.style.boxShadow = 'none';
        e.target.style.transform = 'scale(1)';
      }}
    />
    
    {/* Icono de búsqueda dentro del input */}
    <div style={{
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '20px',
      color: '#0066cc'
    }}>
      🔍
    </div>
    
    {/* Botón de limpiar búsqueda */}
    {searchTerm && (
      <button
        onClick={() => {
          setSearchTerm('');
          setShowResults(false);
        }}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-50%) scale(1.1)';
          e.target.style.background = '#ff6666';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(-50%) scale(1)';
          e.target.style.background = '#ff4444';
        }}
      >
        ✕
      </button>
    )}
  </div>

        {/* Resultados de búsqueda */}
        {showResults && searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '400px',
            overflowY: 'auto',
            background: currentTheme.cardBackground,
            border: `2px solid ${currentTheme.cardBorder}`,
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            boxShadow: `0 4px 12px ${currentTheme.shadowColor}`,
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
                      borderBottom: `1px solid ${currentTheme.cardBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: currentTheme.cardBackground,
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentTheme.cardBackground}
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
                      <div style={{ fontWeight: 'bold', color: isDarkMode ? 'white' : currentTheme.text }}>
                        {productGroup.baseTitle}
                      </div>
  <div style={{ fontSize: '12px', color: currentTheme.textSecondary, marginTop: '2px' }}>
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
                      <span style={{ color: currentTheme.text }}>Q{minPrice}</span>
                        ) : (
                          <span style={{ color: currentTheme.text }}>Q{minPrice} - Q{maxPrice}</span>
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
                    <div style={{ background: currentTheme.cardBackground }}>
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
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
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
        <div style={{ fontWeight: '500', color: isOutOfStock ? '#ff4444' : currentTheme.text }}>
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
                                      color: currentTheme.textSecondary,
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
                                    color: currentTheme.text 
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

      {/* Sección de producto personalizado mejorada */}
<div style={{ marginBottom: '20px' }}>
  <button
    onClick={() => setShowCustomProduct(!showCustomProduct)}
    style={{
      width: '100%',
      padding: '16px',
      background: showCustomProduct 
        ? 'linear-gradient(135deg, #6a1b9a 0%, #8e24aa 100%)' 
        : 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
      color: showCustomProduct ? 'white' : '#333',
      border: '2px solid',
      borderColor: showCustomProduct ? '#6a1b9a' : '#e0e0e0',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      transition: 'all 0.3s ease',
      boxShadow: showCustomProduct 
        ? '0 4px 12px rgba(106,27,154,0.3)' 
        : '0 2px 8px rgba(0,0,0,0.1)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = showCustomProduct 
        ? '0 6px 16px rgba(106,27,154,0.4)' 
        : '0 4px 12px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = showCustomProduct 
        ? '0 4px 12px rgba(106,27,154,0.3)' 
        : '0 2px 8px rgba(0,0,0,0.1)';
    }}
  >
    <span style={{ 
      fontSize: '24px',
      animation: showCustomProduct ? 'spin 2s linear infinite' : 'none'
    }}>
      {showCustomProduct ? '✏️' : '➕'}
    </span>
    <span>
      {showCustomProduct ? 'Cerrar Producto Personalizado' : 'Agregar Producto Personalizado'}
    </span>
  </button>

  {/* Formulario de producto personalizado continúa aquí... */}

        {showCustomProduct && (
  <div style={{
    marginTop: '16px',
    padding: '24px',
    background: 'linear-gradient(135deg, #f8f0ff 0%, #f0e6ff 100%)',
    border: '2px solid #8e24aa',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(142,36,170,0.15)',
    animation: 'slideIn 0.3s ease'
  }}>
    <h4 style={{ 
      margin: '0 0 20px 0', 
      color: '#6a1b9a',
      fontSize: '18px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{ fontSize: '24px' }}>✏️</span>
      Producto Personalizado
    </h4>
    
    <div style={{ marginBottom: '16px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '14px', 
        fontWeight: 'bold',
        color: '#333'
      }}>
        Nombre del producto
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={customProductName}
          onChange={(e) => setCustomProductName(e.target.value)}
          placeholder="Ej: Servicio de instalación"
          style={{
            width: '100%',
            padding: '12px 16px 12px 44px',
            border: '2px solid #e0e0e0',
            borderRadius: '10px',
            fontSize: '16px',
            outline: 'none',
            transition: 'all 0.3s ease',
            background: 'white',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#8e24aa';
            e.target.style.boxShadow = '0 0 0 3px rgba(142,36,170,0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e0e0e0';
            e.target.style.boxShadow = 'none';
          }}
        />
        <div style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '18px',
          color: '#8e24aa'
        }}>
          📝
        </div>
      </div>
    </div>
    
    <div style={{ marginBottom: '20px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '14px', 
        fontWeight: 'bold',
        color: '#333'
      }}>
        Precio (Q)
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          value={customProductPrice}
          onChange={(e) => setCustomProductPrice(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          style={{
            width: '100%',
            padding: '12px 16px 12px 44px',
            border: '2px solid #e0e0e0',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            outline: 'none',
            transition: 'all 0.3s ease',
            background: 'white',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#8e24aa';
            e.target.style.boxShadow = '0 0 0 3px rgba(142,36,170,0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e0e0e0';
            e.target.style.boxShadow = 'none';
          }}
        />
        <div style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '18px',
          color: '#8e24aa'
        }}>
          💰
        </div>
      </div>
    </div>
    
    <div style={{ display: 'flex', gap: '12px' }}>
      <button
        onClick={addCustomProduct}
        disabled={!customProductName || !customProductPrice}
        style={{
          flex: 1,
          padding: '14px 24px',
          background: !customProductName || !customProductPrice
            ? 'linear-gradient(135deg, #ccc 0%, #999 100%)'
            : 'linear-gradient(135deg, #008060 0%, #00a67e 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: !customProductName || !customProductPrice ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: !customProductName || !customProductPrice
            ? '0 2px 4px rgba(0,0,0,0.1)'
            : '0 4px 12px rgba(0,128,96,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          if (customProductName && customProductPrice) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,128,96,0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = customProductName && customProductPrice
            ? '0 4px 12px rgba(0,128,96,0.3)'
            : '0 2px 4px rgba(0,0,0,0.1)';
        }}
      >
        <span style={{ fontSize: '18px' }}>✓</span>
        <span>Agregar</span>
      </button>
      
      <button
        onClick={() => {
          setShowCustomProduct(false);
          setCustomProductName('');
          setCustomProductPrice('');
        }}
        style={{
          padding: '14px 24px',
          background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
          color: '#666',
          border: '2px solid #e0e0e0',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minWidth: '120px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)';
        }}
      >
        <span style={{ fontSize: '18px' }}>✕</span>
        <span>Cancelar</span>
      </button>
    </div>
    
    {/* Texto de ayuda */}
    <div style={{
      marginTop: '16px',
      padding: '12px',
      background: 'rgba(142,36,170,0.1)',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#6a1b9a',
      display: 'flex',
      alignItems: 'start',
      gap: '8px'
    }}>
      <span style={{ fontSize: '16px' }}>💡</span>
      <span>
        Los productos personalizados se agregarán a la factura pero no afectarán el inventario de Shopify.
      </span>
    </div>
  </div>
)}
      </div>

      {/* Lista de productos seleccionados */}
      <div style={{ 
        flex: 1,
        background: currentTheme.cardBackground,
        padding: '20px',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '500px'
      }}>
        {/* Descuento Global mejorado */}
        <div style={{
          marginBottom: '20px',
          padding: '20px',
          background: 'linear-gradient(135deg, #fff5e6 0%, #ffe0cc 100%)',
          borderRadius: '12px',
          border: '2px solid #ffcc80',
          boxShadow: '0 2px 8px rgba(255,152,0,0.15)'
        }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            fontWeight: 'bold',
            color: '#333',
            fontSize: '16px'
          }}>
            <span style={{ fontSize: '20px' }}>🎯</span>
            <span>Descuento Total</span>
            {globalDiscount > 0 && (
              <span style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #ff6600 0%, #ff8800 100%)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(255,102,0,0.3)'
              }}>
                -Q{calculateDiscountAmount().toFixed(2)}
              </span>
            )}
          </label>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                value={globalDiscount}
                onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0, discountType)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingLeft: '48px',
                  border: '2px solid #ffcc80',
                  borderRadius: '10px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
                min="0"
                step="0.01"
                onFocus={(e) => {
                  e.target.style.borderColor = '#ff6600';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255,102,0,0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ffcc80';
                  e.target.style.boxShadow = 'none';
                }}
              />
              
              {/* Icono de descuento dentro del input */}
              <div style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '20px',
                color: '#ff6600'
              }}>
                🏷️
              </div>
            </div>
            
            <select
              value={discountType}
              onChange={(e) => handleDiscountChange(globalDiscount, e.target.value)}
              style={{
                padding: '12px 20px',
                border: '2px solid #ffcc80',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'white',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.3s ease',
                minWidth: '80px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ff6600';
                e.target.style.boxShadow = '0 0 0 3px rgba(255,102,0,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#ffcc80';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="Q">Q</option>
              <option value="%">%</option>
            </select>
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
              <h3 style={{ margin: '0 0 16px 0', color: currentTheme.text }}>Productos Seleccionados</h3>
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
                  <div style={{ fontSize: '14px', color: currentTheme.textSecondary, marginTop: '4px' }}>
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

        {/* Botón de procesar mejorado */}
<button
  onClick={onProcessSale}
  disabled={!canProcess || processing || selectedProducts.length === 0}
  style={{
    width: '100%',
    marginTop: '16px',
    padding: '18px',
    background: !canProcess || processing || selectedProducts.length === 0 
      ? 'linear-gradient(135deg, #ccc 0%, #999 100%)' 
      : 'linear-gradient(135deg, #008060 0%, #00a67e 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: !canProcess || processing || selectedProducts.length === 0 ? 'default' : 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: !canProcess || processing || selectedProducts.length === 0
      ? '0 2px 4px rgba(0,0,0,0.1)'
      : '0 4px 12px rgba(0,128,96,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  }}
  onMouseEnter={(e) => {
    if (canProcess && !processing && selectedProducts.length > 0) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,128,96,0.4)';
    }
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = canProcess && !processing && selectedProducts.length > 0
      ? '0 4px 12px rgba(0,128,96,0.3)'
      : '0 2px 4px rgba(0,0,0,0.1)';
  }}
>
  {processing ? (
    <>
      <span style={{ 
        display: 'inline-block',
        animation: 'spin 1s linear infinite',
        fontSize: '20px'
      }}>⏳</span>
      <span>Procesando...</span>
    </>
  ) : (
    <>
      <span style={{ fontSize: '20px' }}>🛒</span>
      <span>Procesar Venta</span>
    </>
  )}
</button>
      </div>
   </div>
  );
}