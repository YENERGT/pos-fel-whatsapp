// app/components/ProductSelector.jsx
import { useState, useEffect } from 'react';

export default function ProductSelector({ onProductsChange, onDiscountChange, selectedProducts: initialProducts = [] }) {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('Q');

  // Sincronizar con productos iniciales cuando cambien desde afuera
  useEffect(() => {
    if (initialProducts.length === 0 && selectedProducts.length > 0) {
      // Solo limpiar si explícitamente se pasan productos vacíos (después de venta exitosa)
      setSelectedProducts([]);
      setGlobalDiscount(0);
      setDiscountType('Q');
      setSearchTerm('');
    }
  }, [initialProducts]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    // Inicializar descuento en 0
    if (onDiscountChange) {
      onDiscountChange(0);
    }
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

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const baseTitle = product.baseTitle;
    if (!acc[baseTitle]) {
      acc[baseTitle] = [];
    }
    acc[baseTitle].push(product);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Buscar productos por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '500px' }}>
        {/* Lista de productos disponibles */}
        <div style={{ background: '#f8f8f8', padding: '16px', borderRadius: '8px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Productos Disponibles</h3>
          {loading ? (
            <p>Cargando productos...</p>
          ) : (
            <div>
              {Object.entries(groupedProducts).map(([baseTitle, variants]) => (
                <div key={baseTitle} style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    padding: '8px',
                    background: '#e0e0e0',
                    borderRadius: '4px'
                  }}>
                    {baseTitle}
                  </div>
                  {variants.map(product => (
                    <div 
                      key={product.id}
                      style={{
                        padding: '8px',
                        marginBottom: '4px',
                        marginLeft: '16px',
                        background: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: product.inventory <= 0 ? '1px solid #ff4444' : '1px solid #ddd'
                      }}
                      onClick={() => product.inventory > 0 && addProduct(product)}
                    >
                      {product.image && (
                        <img 
                          src={product.image}
                          alt={product.imageAlt || product.title}
                          style={{
                            width: '50px',
                            height: '50px',
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500' }}>
                          {product.variantTitle !== 'Default Title' ? product.variantTitle : ''}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Q{product.price} | SKU: {product.sku || 'N/A'}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: product.inventory > 5 ? '#00aa00' : product.inventory > 0 ? '#ff8800' : '#ff0000',
                          fontWeight: 'bold'
                        }}>
                          Stock: {product.inventory}
                        </div>
                      </div>
                      <button
                        disabled={product.inventory <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          product.inventory > 0 && addProduct(product);
                        }}
                        style={{
                          padding: '4px 12px',
                          background: product.inventory > 0 ? '#008060' : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: product.inventory > 0 ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {product.inventory > 0 ? 'Agregar' : 'Sin Stock'}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de productos seleccionados */}
        <div style={{ background: '#f0f8ff', padding: '16px', borderRadius: '8px', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Productos Seleccionados</h3>
          
          {/* Descuento Global */}
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'white',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Descuento Total
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={globalDiscount}
                onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0, discountType)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
                min="0"
                step="0.01"
              />
              <select
                value={discountType}
                onChange={(e) => handleDiscountChange(globalDiscount, e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="Q">Q</option>
                <option value="%">%</option>
              </select>
              {globalDiscount > 0 && (
                <span style={{ color: '#ff6600', fontWeight: 'bold' }}>
                  -Q{calculateDiscountAmount().toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {selectedProducts.length === 0 ? (
            <p style={{ color: '#666' }}>No hay productos seleccionados</p>
          ) : (
            <div>
              {selectedProducts.map(product => (
                <div 
                  key={product.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: 'white',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  {product.image && (
                    <img 
                      src={product.image}
                      alt={product.title}
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{product.title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Q{product.price} x {product.quantity} = Q{(product.price * product.quantity).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      onClick={() => updateQuantity(product.id, product.quantity - 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        background: '#ddd',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 0)}
                      style={{
                        width: '40px',
                        textAlign: 'center',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '2px'
                      }}
                    />
                    <button
                      onClick={() => updateQuantity(product.id, product.quantity + 1)}
                      disabled={product.quantity >= product.inventory}
                      style={{
                        width: '24px',
                        height: '24px',
                        background: product.quantity >= product.inventory ? '#ccc' : '#ddd',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: product.quantity >= product.inventory ? 'not-allowed' : 'pointer'
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeProduct(product.id)}
                      style={{
                        marginLeft: '8px',
                        padding: '2px 8px',
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              
              <div style={{ marginTop: '16px', borderTop: '2px solid #ddd', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Subtotal:</span>
                  <span>Q{calculateSubtotal().toFixed(2)}</span>
                </div>
                {globalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#ff6600' }}>
                    <span>Descuento:</span>
                    <span>-Q{calculateDiscountAmount().toFixed(2)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#008060'
                }}>
                  <span>Total:</span>
                  <span>Q{calculateTotal()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}