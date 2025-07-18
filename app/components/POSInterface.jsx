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
  const [phoneError, setPhoneError] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);
  
  // Estados para notificaciones
  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: '',
    details: ''
  });
  
  // Estados para el tema
const [isDarkMode, setIsDarkMode] = useState(false);

// Cargar preferencia del tema al iniciar (solo en cliente)
useEffect(() => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('pos-theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }
}, []);

// Función para cambiar tema
const toggleTheme = () => {
  const newTheme = !isDarkMode;
  setIsDarkMode(newTheme);
  if (typeof window !== 'undefined') {
    localStorage.setItem('pos-theme', newTheme ? 'dark' : 'light');
  }
};
 
// Definir temas
const themes = {
  light: {
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
    cardBackground: 'white',
    cardBorder: '#e0e0e0',
    text: '#1a1a1a',
    textSecondary: '#666',
    inputBackground: '#f8f9fa',
    inputBorder: '#e0e0e0',
    shadowColor: 'rgba(0,0,0,0.1)',
    dangerBackground: '#fee',
    successBackground: '#e3f4e8',
    warningBackground: '#fff3cd',
    primaryGradient: 'linear-gradient(135deg, #008060 0%, #00a67e 100%)',
    secondaryGradient: 'linear-gradient(135deg, #0066cc 0%, #0080ff 100%)',
    purpleGradient: 'linear-gradient(135deg, #f8f0ff 0%, #f0e6ff 100%)',
    orangeGradient: 'linear-gradient(135deg, #fff5e6 0%, #ffe0cc 100%)',
    grayGradient: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
  },
  dark: {
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
    cardBackground: '#2a2a2a',
    cardBorder: '#444',
    text: '#f0f0f0',
    textSecondary: '#b0b0b0',
    inputBackground: '#1e1e1e',
    inputBorder: '#444',
    shadowColor: 'rgba(0,0,0,0.5)',
    dangerBackground: '#4a1a1a',
    successBackground: '#1a3a2a',
    warningBackground: '#3a3a1a',
    primaryGradient: 'linear-gradient(135deg, #00a67e 0%, #008060 100%)',
    secondaryGradient: 'linear-gradient(135deg, #0080ff 0%, #0066cc 100%)',
    purpleGradient: 'linear-gradient(135deg, #2a1a3a 0%, #3a2a4a 100%)',
    orangeGradient: 'linear-gradient(135deg, #3a2a1a 0%, #4a3a2a 100%)',
    grayGradient: 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)',
  }
};

// Obtener el tema actual
const theme = isDarkMode ? themes.dark : themes.light;

// Estilos CSS mejorados
const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    background: theme.background,
    minHeight: '100vh',
    transition: 'background 0.3s ease'
  },
  
   header: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: '24px',
    textAlign: 'center',
    textShadow: isDarkMode ? '2px 2px 4px rgba(0,0,0,0.5)' : '2px 2px 4px rgba(0,0,0,0.1)'
  },
  
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '450px 1fr',
    gap: '24px',
    marginTop: '20px',
    '@media (max-width: 768px)': {
      display: 'flex',
      flexDirection: 'column',
      gridTemplateColumns: '1fr',
      gap: '16px'
    }
  },
  
  customerPanel: {
    background: theme.cardBackground,
    padding: '0',
    borderRadius: '16px',
    boxShadow: `0 10px 30px ${theme.shadowColor}`,
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    height: 'fit-content',
    border: `1px solid ${theme.cardBorder}`
  },
  
  customerHeader: {
    background: 'linear-gradient(135deg, #008060 0%, #00a67e 100%)',
    color: 'white',
    padding: '20px 24px',
    fontSize: '20px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  
  customerContent: {
    padding: '24px'
  },
  
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: '#f8f9fa',
    padding: '4px',
    borderRadius: '12px'
  },
  
  tab: (isActive) => ({
    flex: 1,
    padding: '12px 20px',
    background: isActive ? 'white' : 'transparent',
    color: isActive ? '#008060' : '#666',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : 'normal',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
    transform: isActive ? 'scale(1.02)' : 'scale(1)'
  }),
  
  inputGroup: {
    marginBottom: '20px'
  },
  
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: theme.text,
    fontSize: '14px',
    letterSpacing: '0.5px'
  },
  
  inputWrapper: {
    display: 'flex',
    gap: '8px',
    alignItems: 'stretch',  // ← AGREGAR ESTA LÍNEA
    width: '100%'  // ← AGREGAR ESTA LÍNEA
  },
  
  input: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '15px',
    transition: 'all 0.3s ease',
    outline: 'none',
    backgroundColor: '#f8f9fa',
    width: '100%',  // ← AGREGAR ESTA LÍNEA
  boxSizing: 'border-box'  // ← AGREGAR ESTA LÍNEA
  },
  
  button: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #008060 0%, #00a67e 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0,128,96,0.3)',
    whiteSpace: 'nowrap',  // ← AGREGAR ESTA LÍNEA
    flexShrink: 0  // ← AGREGAR ESTA LÍNEA
  },
  
  customerList: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    padding: '4px'
  },
  
  customerItem: {
    padding: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginBottom: '8px',
    background: '#f8f9fa',
    border: '1px solid transparent'
  },
  
  selectedCustomer: {
    padding: '16px',
    background: 'linear-gradient(135deg, #e3f4e8 0%, #d1ead8 100%)',
    borderRadius: '12px',
    border: '2px solid #00a67e',
    position: 'relative',
    animation: 'fadeIn 0.5s ease'
  },
  
  errorBox: {
    padding: '16px',
    background: '#fee',
    borderRadius: '12px',
    color: '#c00',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'shake 0.5s ease'
  },
  
  nitResult: {
    padding: '16px',
    background: 'linear-gradient(135deg, #e3f4e8 0%, #d1ead8 100%)',
    borderRadius: '12px',
    border: '2px solid #00a67e',
    animation: 'fadeIn 0.5s ease',
    position: 'relative'  // ← AGREGAR ESTA LÍNEA
  },
  // Estilos responsive
  mobileContainer: {
    '@media (max-width: 768px)': {
      padding: '10px',
      minHeight: '100vh'
    }
  },
  mobileGrid: {
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '16px'
    }
  },
  productPanelMobile: {
    '@media (max-width: 768px)': {
      marginTop: '16px'
    }
  }
};


// Agregar estas animaciones CSS
const animationStyles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// Agregar estas media queries CSS actualizadas
const responsiveStyles = `
  @media (max-width: 768px) {
    .pos-container {
      padding: 10px !important;
      background: #f5f7fa !important;
    }
    
    .pos-header {
      font-size: 24px !important;
      margin-bottom: 16px !important;
      padding: 10px !important;
    }
    
    .main-grid {
      display: flex !important;
      flex-direction: column !important;
      gap: 16px !important;
      grid-template-columns: 1fr !important;
    }
    
    .customer-panel {
      width: 100% !important;
      margin-bottom: 0 !important;
      transform: none !important;
    }
    
    .product-panel {
      width: 100% !important;
      margin-top: 0 !important;
      transform: none !important;
    }
    
    .tab-container {
      flex-direction: row !important;
      gap: 4px !important;
      padding: 2px !important;
    }
    
    .tab-button {
      font-size: 13px !important;
      padding: 10px 12px !important;
    }
    
    .input-wrapper {
      flex-direction: column !important;
      gap: 8px !important;
    }
    
    .search-button {
      width: 100% !important;
    }
    
    .customer-list {
      max-height: 200px !important;
    }
    
    .panel-header {
      padding: 16px 20px !important;
      font-size: 18px !important;
    }
    
    .customer-content {
      padding: 20px !important;
    }
  }
  
  @media (max-width: 480px) {
    .pos-container {
      padding: 5px !important;
    }
    
    .pos-header {
      font-size: 20px !important;
      margin-bottom: 12px !important;
      text-align: center !important;
    }
    
    .panel-header {
      font-size: 16px !important;
      padding: 14px 16px !important;
    }
    
    .panel-header span:first-child {
      font-size: 20px !important;
    }
    
    .tab-button {
      font-size: 12px !important;
      padding: 8px 10px !important;
    }
    
    .tab-button span:first-child {
      display: none !important;
    }
    
    .customer-content {
      padding: 16px !important;
    }
    
    .input-field {
      font-size: 14px !important;
      padding: 10px 12px !important;
    }
    
    .label-text {
      font-size: 13px !important;
    }
    
    .customer-item {
      padding: 12px !important;
      margin-bottom: 6px !important;
    }
    
    .customer-item > div:first-child {
      font-size: 14px !important;
    }
    
    .customer-item > div:nth-child(2) {
      font-size: 12px !important;
    }
    
    .selected-customer p {
      font-size: 16px !important;
    }
    
    .error-box {
      font-size: 13px !important;
      padding: 12px !important;
    }
  }

  /* Header responsive styles */
  @media (max-width: 768px) {
    .pos-header-container {
      padding: 0 10px !important;
      margin-bottom: 16px !important;
    }
    
    .pos-header-content {
      justify-content: center !important;
    }
    
    .pos-header-text {
      display: none !important;
    }
    
    .pos-logo {
      height: 50px !important;
    }
  }
  
  @media (max-width: 480px) {
    .pos-header-container {
      padding: 0 5px !important;
      margin-bottom: 12px !important;
    }
    
    .pos-logo {
      height: 45px !important;
    }
  }
`;
  
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

  // Verificar si el teléfono ya existe
const checkPhoneDuplicate = async (phoneToCheck) => {
  if (!phoneToCheck || phoneToCheck.length < 8) return;
  
  setCheckingPhone(true);
  setPhoneError('');
  
  try {
    const response = await fetch(`/api/check-phone?phone=${encodeURIComponent(phoneToCheck)}`);
    const data = await response.json();
    
    if (data.success && data.exists) {
      setPhoneError(`Este número ya pertenece a: ${data.customer.name}`);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error verificando teléfono:', err);
    return true; // En caso de error, permitir continuar
  } finally {
    setCheckingPhone(false);
  }
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
    setPhoneError('');
    setCheckingPhone(false);
    
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

  // Validar que no haya error de teléfono duplicado
  if (customerType === 'new' && phoneError) {
    showNotification('error', 'El número de WhatsApp ya está registrado');
    return;
  }

  // Verificar una vez más antes de procesar (para clientes nuevos)
  if (customerType === 'new' && phoneNumber) {
    const isPhoneValid = await checkPhoneDuplicate(phoneNumber);
    if (!isPhoneValid) {
      showNotification('error', 'El número de WhatsApp ya está registrado');
      return;
    }
  }

  setProcessing(true);
  setError('');

  // ... resto del código de processSale ...

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

  // --- Inicio del retorno del componente ---
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

        <div className="pos-container" style={{ ...styles.container, background: theme.background }}>
        <style>{animationStyles}</style>
        <style>{responsiveStyles}</style>
        <div className="pos-header-container" style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '24px',
  padding: '0 20px'
}}>
  <div className="pos-header-content" style={{
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    width: '100%'
  }}>
    <img 
      src="https://cdn.shopify.com/s/files/1/0289/7264/6460/files/Adobe_Express_20230423_1933570_1_4_-Photoroom.png?v=1735621193"
      alt="Logo"
      className="pos-logo"
      style={{
        height: '60px',
        width: 'auto',
        filter: 'drop-shadow(0 0 2px white) drop-shadow(0 0 2px white) drop-shadow(0 0 2px white)',
        objectFit: 'contain'
      }}
    />
    <h1 className="pos-header-text" style={{ 
      ...styles.header, 
      color: theme.text,
      margin: 0,
      fontSize: '32px',
      fontWeight: 'bold',
      textShadow: isDarkMode ? '2px 2px 4px rgba(0,0,0,0.5)' : '2px 2px 4px rgba(0,0,0,0.1)'
    }}>
      POS - Facturación FEL
    </h1>
  </div>
</div>
        {/* Botón de cambio de tema */}
        <div style={{ 
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '12px 20px',
              background: isDarkMode 
                ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' 
                : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              color: isDarkMode ? '#1a1a1a' : '#f0f0f0',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: `0 4px 12px ${theme.shadowColor}`,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = `0 6px 16px ${theme.shadowColor}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${theme.shadowColor}`;
            }}
          >
            <span style={{ fontSize: '20px' }}>
              {isDarkMode ? '☀️' : '🌙'}
            </span>
            <span>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        </div>
        
        <div className="main-grid" style={styles.mainGrid}>
          {/* Panel de cliente mejorado */}
          <div
            className="customer-panel"
            style={{
              ...styles.customerPanel,
              background: theme.cardBackground,
              border: `1px solid ${theme.cardBorder}`,
              boxShadow: `0 10px 30px ${theme.shadowColor}`
            }}
            onMouseEnter={(e) => {
              if (window.innerWidth > 768) {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            }}
          >
            <div className="panel-header" style={styles.customerHeader}>
              <span style={{ fontSize: '24px' }}>👤</span>
              <span>Información del Cliente</span>
            </div>
            
            <div className="customer-content" style={styles.customerContent}>
              {/* Tabs mejorados */}
              <div className="tab-container" style={styles.tabContainer}>
                <button
                  className="tab-button"
                  style={styles.tab(customerType === 'existing')}
                  onClick={() => {
                    setCustomerType('existing'); setError(''); setNitSearchResult(null); setSelectedCustomer(null); setPhoneError(''); setPhoneNumber('');
                  }}
                >
                  <span style={{ marginRight: '8px' }}>🔍</span>
                  <span>Cliente Existente</span>
                </button>
                <button
                  className="tab-button"
                  style={styles.tab(customerType === 'new')}
                  onClick={() => {
                    setCustomerType('new'); setError(''); setExistingCustomers([]); setSelectedCustomer(null); setPhoneError(''); setPhoneNumber('');
                  }}
                >
                  <span style={{ marginRight: '8px' }}>➕</span>
                  <span>Cliente Nuevo</span>
                </button>
              </div>

              {/* Panel de Cliente Existente mejorado */}
{customerType === 'existing' && (
  <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
          : theme.purpleGradient,
        padding: '20px',
        borderRadius: '12px',
        border: `2px solid ${theme.cardBorder}`,
        marginBottom: '20px'
    }}>
      <label style={{
        ...styles.label,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>🔍</span>
        <span>Buscar Cliente</span>
      </label>
      
      <div style={styles.inputWrapper}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o NIT..."
            style={{
              ...styles.input,
              paddingLeft: '48px',
              fontSize: '16px',
              backgroundColor: isDarkMode ? theme.inputBackground : 'white',
              borderColor: theme.inputBorder,
              color: theme.text
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                searchExistingCustomers();
              }
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#008060';
              e.target.style.boxShadow = '0 0 0 3px rgba(0,128,96,0.2)';
              e.target.style.transform = 'scale(1.01)';
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
            color: '#999'
          }}>
            🔍
          </div>
        </div>
        
        <button
          onClick={searchExistingCustomers}
          disabled={searching}
          style={{
            ...styles.button,
            opacity: searching ? 0.7 : 1,
            cursor: searching ? 'not-allowed' : 'pointer',
            minWidth: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (!searching) {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 6px 16px rgba(0,128,96,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,128,96,0.3)';
          }}
        >
          {searching ? (
            <>
              <span style={{ 
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }}>⏳</span>
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Buscar</span>
            </>
          )}
        </button>
      </div>
    </div>

                  {/* Lista de clientes mejorada */}
                  {existingCustomers.length > 0 && !selectedCustomer && (
                    <div style={{ marginBottom: '20px', animation: 'fadeIn 0.5s ease' }}>
                      <label style={styles.label}>
                        📋 Seleccionar Cliente:
                      </label>
                      <div style={styles.customerList}>
                        {existingCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => selectExistingCustomer(customer)}
                            style={styles.customerItem}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.borderColor = '#008060';
                              e.currentTarget.style.transform = 'scale(1.02)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#f8f9fa';
                              e.currentTarget.style.borderColor = 'transparent';
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>
                              {customer.displayName || 'Sin nombre'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                              <span style={{ marginRight: '12px' }}>📄 NIT: {customer.nit || 'CF'}</span>
                              <span>📱 Tel: {customer.phone || 'Sin teléfono'}</span>
                            </div>
                            {customer.email && (
                              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                                ✉️ {customer.email}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cliente seleccionado mejorado */}
{selectedCustomer && (
  <div style={{
    ...styles.selectedCustomer,
    animation: 'slideIn 0.3s ease'
  }}>
    <div style={{
      position: 'absolute',
      top: '-12px',
      right: '16px',
      background: 'linear-gradient(135deg, #00a67e 0%, #008060 100%)',
      color: 'white',
      padding: '6px 16px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      boxShadow: '0 2px 8px rgba(0,128,96,0.3)'
    }}>
      ✓ Cliente Seleccionado
    </div>
    
    <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
      <div style={{
        width: '60px',
        height: '60px',
        background: 'linear-gradient(135deg, #008060 0%, #00a67e 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,128,96,0.3)'
      }}>
        👤
      </div>
      
      <div style={{ flex: 1 }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '20px', 
          color: '#008060',
          fontWeight: 'bold' 
        }}>
          {selectedCustomer.displayName}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            📄 <strong>NIT:</strong> {selectedCustomer.nit}
          </p>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            📱 <strong>Tel:</strong> {selectedCustomer.phone || 'Sin teléfono'}
          </p>
          {selectedCustomer.email && (
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              ✉️ <strong>Email:</strong> {selectedCustomer.email}
            </p>
          )}
        </div>
      </div>
    </div>
    
    <button
      onClick={() => {
        setSelectedCustomer(null);
        setPhoneNumber('');
        setExistingCustomers([]);
        setSearchQuery('');
      }}
      style={{
        marginTop: '16px',
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #ff4444 0%, #ff6666 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(255,68,68,0.3)'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'scale(1.05)';
        e.target.style.boxShadow = '0 4px 12px rgba(255,68,68,0.4)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)';
        e.target.style.boxShadow = '0 2px 8px rgba(255,68,68,0.3)';
      }}
    >
      <span>✕</span>
      <span>Cambiar cliente</span>
    </button>
  </div>
)}
                </div>
              )}

              {/* Panel de Cliente Nuevo mejorado */}
{customerType === 'new' && (
  <div style={{ animation: 'fadeIn 0.5s ease' }}>
    <div style={{
      background: isDarkMode
        ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
        : 'linear-gradient(135deg, #fff5f0 0%, #ffe6e0 100%)',
      padding: '20px',
      borderRadius: '12px',
      border: '2px solid #e0e0e0',
      marginBottom: '20px'
    }}>
      <label style={{
        ...styles.label,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>📄</span>
        <span>NIT del Cliente</span>
        {nit && !nitSearchResult && !searching && (
          <span style={{
            marginLeft: 'auto',
            padding: '4px 8px',
            background: isDarkMode
              ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
              : 'linear-gradient(135deg, #f8f0ff 0%, #f0e6ff 100%)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            Pendiente validación
          </span>
        )}
      </label>
      
      <div style={styles.inputWrapper}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={nit}
            onChange={(e) => setNit(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej: 12345678"
            style={{
              ...styles.input,
              paddingLeft: '48px',
              fontSize: '16px',
              letterSpacing: '1px',
              backgroundColor: isDarkMode ? theme.inputBackground : 'white',
              borderColor: theme.inputBorder,
              color: theme.text
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && nit) {
                searchNIT();
              }
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#ff8800';
              e.target.style.boxShadow = '0 0 0 3px rgba(255,136,0,0.2)';
              e.target.style.transform = 'scale(1.01)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e0e0e0';
              e.target.style.boxShadow = 'none';
              e.target.style.transform = 'scale(1)';
            }}
          />
          
          {/* Icono de documento dentro del input */}
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '20px',
            color: '#ff8800'
          }}>
            📄
          </div>
        </div>
        
        <button
          onClick={searchNIT}
          disabled={!nit || searching}
          style={{
            ...styles.button,
            background: !nit || searching 
              ? '#ccc' 
              : 'linear-gradient(135deg, #ff8800 0%, #ff6600 100%)',
            opacity: !nit || searching ? 0.7 : 1,
            cursor: !nit || searching ? 'not-allowed' : 'pointer',
            minWidth: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (nit && !searching) {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 6px 16px rgba(255,136,0,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(255,136,0,0.3)';
          }}
        >
          {searching ? (
            <>
              <span style={{ 
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }}>⏳</span>
              <span>Validando...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Buscar</span>
            </>
          )}
        </button>
      </div>
      
      <small style={{ 
        color: '#666', 
        fontSize: '12px', 
        marginTop: '8px', 
        display: 'block',
        paddingLeft: '4px'
      }}>
        Ingrese el NIT sin guiones ni espacios (se validará automáticamente)
      </small>
    </div>

                  {/* Resultado de búsqueda NIT mejorado */}
                  {nitSearchResult && (
  <div style={styles.nitResult}>
    <div style={{
      position: 'absolute',
      top: '-12px',
      right: '16px',
      background: '#00a67e',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold'
    }}>
      ✓ Encontrado
    </div>
    <strong style={{ fontSize: '16px', color: '#008060' }}>Cliente encontrado:</strong>
    <p style={{ margin: '8px 0', fontSize: '18px', fontWeight: 'bold' }}>{nitSearchResult.tax_name}</p>
    <p style={{ margin: '4px 0', color: '#666' }}>📄 NIT: {nitSearchResult.tax_code}</p>
  </div>
)}
                </div>
              )}

              {/* Error mejorado */}
              {error && (
                <div style={styles.errorBox}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Número de WhatsApp mejorado */}
              {/* Número de WhatsApp mejorado */}
<div style={{ 
  marginTop: '24px',
  padding: '20px',
  background: isDarkMode
    ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
    : 'linear-gradient(135deg, #f0f8ff 0%, #e6f4ff 100%)',
  borderRadius: '12px',
  border: `2px solid ${theme.cardBorder}`
}}>
  <label style={{
    ...styles.label,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  }}>
    <span style={{ fontSize: '20px' }}>📱</span>
    <span>Número de WhatsApp</span>
    {phoneNumber && !phoneError && !checkingPhone && (
      <span style={{
        marginLeft: 'auto',
        padding: '4px 8px',
        background: '#00a67e',
        color: 'white',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        ✓ Válido
      </span>
    )}
    {checkingPhone && (
      <span style={{
        marginLeft: 'auto',
        padding: '4px 8px',
        background: '#ff8800',
        color: 'white',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        Verificando...
      </span>
    )}
  </label>
  
  <div style={{ position: 'relative' }}>
    <input
      type="tel"
      value={phoneNumber}
      onChange={(e) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
        setPhoneError(''); // Limpiar error al escribir
      }}
      onBlur={(e) => {
        // Verificar duplicado solo para clientes nuevos
        if (customerType === 'new' && phoneNumber) {
          checkPhoneDuplicate(phoneNumber);
        }
      }}
      placeholder="+502 12345678"
      disabled={customerType === 'existing' && selectedCustomer && selectedCustomer.phone}
      style={{
        ...styles.input,
        paddingLeft: '48px',
        fontSize: '16px',
        fontWeight: '500',
        backgroundColor: isDarkMode ? theme.inputBackground : 'white',
        borderColor: phoneError ? '#ff4444' : theme.inputBorder,
        color: theme.text,
        cursor: (customerType === 'existing' && selectedCustomer && selectedCustomer.phone) 
          ? 'not-allowed' 
          : 'text'
      }}
      onFocus={(e) => {
        if (!(customerType === 'existing' && selectedCustomer && selectedCustomer.phone)) {
          e.target.style.borderColor = phoneError ? '#ff4444' : '#008060';
          e.target.style.boxShadow = phoneError 
            ? '0 0 0 3px rgba(255,68,68,0.2)' 
            : '0 0 0 3px rgba(0,128,96,0.2)';
          e.target.style.transform = 'scale(1.01)';
        }
      }}
    />
    
    {/* Icono de WhatsApp dentro del input */}
    <div style={{
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '20px',
      color: phoneError ? '#ff4444' : '#25D366'
    }}>
      📱
    </div>
  </div>
  
  {/* Mensaje de error si el teléfono ya existe */}
  {phoneError && (
    <div style={{
      marginTop: '8px',
      padding: '8px 12px',
      background: '#fee',
      borderRadius: '6px',
      color: '#ff4444',
      fontSize: '13px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <span>⚠️</span>
      <span>{phoneError}</span>
    </div>
  )}
  
  <small style={{ 
    color: phoneError ? '#ff4444' : '#666', 
    fontSize: '12px', 
    marginTop: '8px', 
    display: 'block',
    paddingLeft: '4px'
  }}>
    {customerType === 'existing' && selectedCustomer && selectedCustomer.phone
      ? '✓ Usando el teléfono del cliente registrado'
      : 'Incluya el código de país (+502 para Guatemala)'}
  </small>
</div>
            </div>
          </div>

          {/* Panel de productos mejorado */}
          <div
            style={{
              background: theme.cardBackground,
              padding: '0',
              borderRadius: '16px',
              boxShadow: `0 10px 30px ${theme.shadowColor}`,
              overflow: 'hidden',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              border: `1px solid ${theme.cardBorder}`
            }}
            data-product-selector
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #0080ff 100%)',
              color: 'white',
              padding: '20px 24px',
              fontSize: '20px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '24px' }}>📦</span>
              <span>Productos</span>
            </div>
            <div style={{ padding: '24px' }}>
              <ProductSelector 
  onProductsChange={setSelectedProducts} 
  onDiscountChange={handleDiscountChange}
  selectedProducts={selectedProducts}
  onProcessSale={processSale}
  processing={processing}
  canProcess={
    selectedProducts.length > 0 && 
    ((customerType === 'existing' && selectedCustomer) ||
    (customerType === 'new' && nitSearchResult))
  }
  isDarkMode={isDarkMode}
  theme={theme}
/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}