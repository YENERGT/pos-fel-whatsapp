// app/components/POSInterface.jsx
import { useState, useEffect } from 'react';
import { Form, useLoaderData } from '@remix-run/react';
import ProductSelector from './ProductSelector';
import NotificationBanner from './NotificationBanner';

export default function POSInterface() {
  const [customerType, setCustomerType] = useState('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [nit, setNit] = useState('');
  const [nitSearchResult, setNitSearchResult] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Estados para notificaciones
  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: '',
    details: ''
  });

  // Función para mostrar notificación
  const showNotification = (type, message, details = '') => {
    setNotification({
      show: true,
      type,
      message,
      details
    });
  };

  // Función para cerrar notificación
  const closeNotification = () => {
    setNotification({
      show: false,
      type: 'success',
      message: '',
      details: ''
    });
  };

  // Buscar clientes existentes
  const searchExistingCustomers = async () => {
    if (!searchQuery) {
      try {
        setSearching(true);
        setError('');
        const response = await fetch('/api/list-customers');
        const data = await response.json();
        
        if (data.success) {
          setExistingCustomers(data.customers.slice(0, 10));
          if (data.customers.length === 0) {
            setError('No hay clientes registrados');
          }
        } else {
          setError('Error al cargar clientes');
        }
      } catch (err) {
        setError('Error al cargar clientes');
        console.error(err);
      } finally {
        setSearching(false);
      }
      return;
    }
    
    setSearching(true);
    setError('');
    
    try {
      const response = await fetch(`/api/search-customers?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      console.log('Respuesta de búsqueda:', data);
      
      if (data.success) {
        setExistingCustomers(data.customers);
        if (data.customers.length === 0) {
          setError('No se encontraron clientes con ese criterio');
        }
      } else {
        setError(`Error al buscar clientes: ${data.details || 'Error desconocido'}`);
        console.error('Error detallado:', data);
      }
    } catch (err) {
      setError('Error de conexión al buscar clientes');
      console.error('Error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Seleccionar cliente existente
  const selectExistingCustomer = (customer) => {
    setSelectedCustomer(customer);
    setPhoneNumber(customer.phone || '');
    setError('');
  };

  // Buscar NIT (para cliente nuevo)
  const searchNIT = async () => {
    if (!nit) return;
    
    setSearching(true);
    setError('');
    
    try {
      const response = await fetch(`/api/search-nit?nit=${nit}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setNitSearchResult(data.data[0]);
      } else {
        setError('NIT no encontrado');
        setNitSearchResult(null);
      }
    } catch (err) {
      setError('Error al buscar NIT');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Formatear número de teléfono
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.startsWith('502')) {
      return '+' + numbers;
    }
    
    if (numbers.length === 8) {
      return '+502' + numbers;
    }
    
    return value;
  };

  // Limpiar formulario completamente
  const resetForm = () => {
    // Resetear todos los estados
    setCustomerType('existing');
    setSearchQuery('');
    setExistingCustomers([]);
    setSelectedCustomer(null);
    setNit('');
    setNitSearchResult(null);
    setPhoneNumber('');
    setSelectedProducts([]);
    setGlobalDiscount(0);
    setError('');
    setSearching(false);
    setProcessing(false);
    
    // Forzar re-render del ProductSelector
    // Esto asegura que se limpie completamente
    const productSelector = document.querySelector('[data-product-selector]');
    if (productSelector) {
      productSelector.style.display = 'none';
      setTimeout(() => {
        productSelector.style.display = 'block';
      }, 10);
    }
  };

  // Procesar venta
  const processSale = async () => {
    if (selectedProducts.length === 0) {
      showNotification('error', 'Debe seleccionar al menos un producto');
      return;
    }

    // Validar cliente
    if (customerType === 'existing' && !selectedCustomer) {
      showNotification('error', 'Debe seleccionar un cliente');
      return;
    }

    if (customerType === 'new' && !phoneNumber) {
      showNotification('error', 'Debe ingresar un número de WhatsApp');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const requestData = {
        customerType: customerType,
        phoneNumber: phoneNumber,
        products: selectedProducts,
        discountTotal: globalDiscount || 0
      };

      // Agregar datos según el tipo de cliente
      if (customerType === 'existing') {
        requestData.existingCustomerId = selectedCustomer.id;
        requestData.nit = {
          tax_code: selectedCustomer.nit,
          tax_name: selectedCustomer.displayName
        };
      } else {
        requestData.nit = nitSearchResult;
      }

      const response = await fetch('/api/process-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        // Mostrar notificación de éxito con detalles
        const successMessage = `Orden: ${result.order.number} | Total: Q${result.order.total}`;
        const successDetails = `Factura: ${result.invoice.number} | Autorización: ${result.invoice.authorization}`;
        
        showNotification('success', successMessage, successDetails);
        
        // Limpiar el formulario inmediatamente
        resetForm();
        
      } else {
        // Mostrar notificación de error
        showNotification('error', result.error || 'Error al procesar la venta');
        setProcessing(false);
      }
    } catch (err) {
      // Mostrar notificación de error
      showNotification('error', 'Error de conexión al procesar la venta', err.message);
      console.error(err);
      setProcessing(false);
    }
  };

  // Handler para cambios en el descuento
  const handleDiscountChange = (discount) => {
    setGlobalDiscount(discount);
  };

  const tabStyle = (isActive) => ({
    padding: '10px 20px',
    background: isActive ? '#008060' : '#f4f4f4',
    color: isActive ? 'white' : '#333',
    border: 'none',
    borderRadius: '4px 4px 0 0',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginRight: '4px'
  });

  return (
    <>
      {/* Banner de notificación */}
      {notification.show && (
        <NotificationBanner
          type={notification.type}
          message={notification.message}
          details={notification.details}
          onClose={closeNotification}
          duration={notification.type === 'success' ? 5000 : 8000}
        />
      )}

      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1>POS - Facturación FEL</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', marginTop: '20px' }}>
          {/* Panel de cliente */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2>Información del Cliente</h2>
            
            {/* Tabs para tipo de cliente */}
            <div style={{ marginTop: '16px', marginBottom: '20px' }}>
              <button
                style={tabStyle(customerType === 'existing')}
                onClick={() => {
                  setCustomerType('existing');
                  setError('');
                  setNitSearchResult(null);
                  setSelectedCustomer(null);
                }}
              >
                Cliente Existente
              </button>
              <button
                style={tabStyle(customerType === 'new')}
                onClick={() => {
                  setCustomerType('new');
                  setError('');
                  setExistingCustomers([]);
                  setSelectedCustomer(null);
                }}
              >
                Cliente Nuevo
              </button>
            </div>

            {/* Panel de Cliente Existente */}
            {customerType === 'existing' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                    Buscar Cliente
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre (firstName) o NIT (lastName)"
                      style={{ 
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      onClick={searchExistingCustomers}
                      disabled={searching}
                      style={{
                        padding: '8px 16px',
                        background: searching ? '#ccc' : '#008060',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: searching ? 'default' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>

                {/* Lista de clientes encontrados */}
                {existingCustomers.length > 0 && !selectedCustomer && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      Seleccionar Cliente:
                    </label>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                      {existingCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => selectExistingCustomer(customer)}
                          style={{
                            padding: '12px',
                            borderBottom: '1px solid #eee',
                            cursor: 'pointer',
                            ':hover': { background: '#f8f8f8' }
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f8f8f8'}
                          onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                          <div style={{ fontWeight: 'bold' }}>
                            {customer.displayName || 'Sin nombre'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            NIT: {customer.nit || 'CF'} | Tel: {customer.phone || 'Sin teléfono'}
                          </div>
                          {customer.email && (
                            <div style={{ fontSize: '12px', color: '#666' }}>{customer.email}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cliente seleccionado */}
                {selectedCustomer && (
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#e3f4e8', borderRadius: '4px' }}>
                    <strong>Cliente seleccionado:</strong>
                    <p style={{ margin: '4px 0' }}>{selectedCustomer.displayName}</p>
                    <p style={{ margin: '4px 0' }}>NIT: {selectedCustomer.nit}</p>
                    <p style={{ margin: '4px 0' }}>Tel: {selectedCustomer.phone || 'Sin teléfono'}</p>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setPhoneNumber('');
                        setExistingCustomers([]);
                        setSearchQuery('');
                      }}
                      style={{
                        marginTop: '8px',
                        padding: '4px 12px',
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Cambiar cliente
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Panel de Cliente Nuevo */}
            {customerType === 'new' && (
              <div>
                {/* Búsqueda de NIT */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>NIT</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      placeholder="Ej: 12345678"
                      style={{ 
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      onClick={searchNIT}
                      disabled={!nit || searching}
                      style={{
                        padding: '8px 16px',
                        background: searching ? '#ccc' : '#008060',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: searching ? 'default' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  <small style={{ color: '#666', fontSize: '12px' }}>Ingrese el NIT sin guiones</small>
                </div>

                {/* Resultado de búsqueda NIT */}
                {nitSearchResult && (
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#e3f4e8', borderRadius: '4px' }}>
                    <strong>Cliente encontrado:</strong>
                    <p style={{ margin: '4px 0' }}>{nitSearchResult.tax_name}</p>
                    <p style={{ margin: '4px 0' }}>NIT: {nitSearchResult.tax_code}</p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginBottom: '16px', padding: '12px', background: '#fee', borderRadius: '4px', color: '#c00' }}>
                {error}
              </div>
            )}

            {/* Número de WhatsApp (para ambos tipos) */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Número de WhatsApp
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                placeholder="+502 12345678"
                disabled={customerType === 'existing' && selectedCustomer && selectedCustomer.phone}
                style={{ 
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  background: (customerType === 'existing' && selectedCustomer && selectedCustomer.phone) ? '#f4f4f4' : 'white'
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                {customerType === 'existing' && selectedCustomer && selectedCustomer.phone
                  ? 'Usando el teléfono del cliente'
                  : 'Incluya el código de país (+502 para Guatemala)'}
              </small>
            </div>

            {/* Botón de procesar */}
            <button
              onClick={processSale}
              disabled={processing || selectedProducts.length === 0 || 
                (customerType === 'existing' && !selectedCustomer) ||
                (customerType === 'new' && !nitSearchResult)}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '12px',
                background: processing || selectedProducts.length === 0 || 
                  (customerType === 'existing' && !selectedCustomer) ||
                  (customerType === 'new' && !nitSearchResult) ? '#ccc' : '#008060',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: processing || selectedProducts.length === 0 || 
                  (customerType === 'existing' && !selectedCustomer) ||
                  (customerType === 'new' && !nitSearchResult) ? 'default' : 'pointer'
              }}
            >
              {processing ? 'Procesando...' : 'Procesar Venta'}
            </button>
          </div>

          {/* Panel de productos con descuento global */}
          <div 
            style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            data-product-selector
          >
            <h2>Productos</h2>
          {/* Quitar el key que causa el re-render */}
          <ProductSelector 
            onProductsChange={setSelectedProducts} 
            onDiscountChange={handleDiscountChange}
            selectedProducts={selectedProducts} // Pasar los productos seleccionados
          />
          </div>
        </div>
      </div>
    </>
  );
}