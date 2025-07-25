// app/routes/app.facturas.jsx
import { useState, useEffect } from 'react';
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import PrintTicket from '../components/PrintTicket';
import { isDateInRange } from '../utils/date-utils';
import { parseDateFormats, formatDateForSearch } from '../utils/date-utils';

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ ok: true });
};

export default function Facturas() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [showPrintTicket, setShowPrintTicket] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // Función para cargar facturas
  // REEMPLAZAR la función loadInvoices en app/routes/app.facturas.jsx (líneas ~27-45)

const loadInvoices = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/invoices');
    const data = await response.json();
    
    if (data.success) {
      // Ya no necesitamos ordenar aquí, el backend ya ordena y limita
      console.log(`📊 Cargadas ${data.showing} facturas de ${data.total} totales`);
      
      setInvoices(data.invoices);
      setFilteredInvoices(data.invoices);
    }
  } catch (error) {
    console.error('Error cargando facturas:', error);
  } finally {
    setLoading(false);
  }
};

  // Cargar facturas al iniciar
  useEffect(() => {
    loadInvoices();
  }, []);

  // Filtrar facturas cuando cambie el término de búsqueda
  // Función para hacer búsqueda en el servidor
const searchInvoices = async (searchTerm) => {
  if (!searchTerm.trim()) {
    // Si no hay término de búsqueda, usar las facturas iniciales (20 más recientes)
    setFilteredInvoices(invoices);
    return;
  }

  setLoading(true);
  try {
    const response = await fetch(`/api/invoices?search=${encodeURIComponent(searchTerm)}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`🔍 Búsqueda "${searchTerm}": ${data.showing} resultados encontrados`);
      setFilteredInvoices(data.invoices);
    } else {
      console.error('Error en búsqueda:', data.error);
      setFilteredInvoices([]);
    }
  } catch (error) {
    console.error('Error buscando facturas:', error);
    setFilteredInvoices([]);
  } finally {
    setLoading(false);
  }
};

// Efecto que se ejecuta con delay cuando cambia el término de búsqueda
useEffect(() => {
  const timeoutId = setTimeout(() => {
    searchInvoices(searchTerm);
  }, 300); // Delay de 300ms para evitar búsquedas excesivas mientras el usuario escribe

  return () => clearTimeout(timeoutId);
}, [searchTerm, invoices]);

  const handlePrint = (invoice) => {
    try {
      // Parsear los JSONs
      const productos = JSON.parse(invoice.productosJSON || '{}');
      const direccion = JSON.parse(invoice.direccionJSON || '{}');
      
      // Calcular el descuento total desde los items
      let descuentoTotal = 0;
      if (productos.items && Array.isArray(productos.items)) {
        productos.items.forEach(item => {
          if (item.discount) {
            descuentoTotal += parseFloat(item.discount);
          }
        });
      }
      
      console.log('Productos del invoice:', productos);
      console.log('Descuento calculado:', descuentoTotal);
      console.log('Items con descuento:', productos.items);

      // Definir las variables
      const totalConIVA = parseFloat(invoice.totalGeneral);
      const montoIVA = parseFloat(invoice.totalIVA);
      
      // Calcular el subtotal (total + descuento, ya que el total tiene el descuento aplicado)
      const subtotalOriginal = totalConIVA + descuentoTotal;

      // Preparar datos para el ticket
      const printData = {
        orderNumber: invoice.orderNumber,
        customerName: invoice.nombreNIT,
        nit: invoice.nit,
        phoneNumber: invoice.numeroTelefono,
        products: productos.items?.map(item => ({
          title: item.description,
          price: item.price,
          quantity: item.qty
        })) || [],
        subtotal: subtotalOriginal,
        discount: descuentoTotal,
        iva: montoIVA,
        total: totalConIVA,
        invoice: {
          serie: invoice.serie,
          number: invoice.orderNumber.split('#')[1] || invoice.orderNumber,
          authorization: invoice.noAutorizacion
        },
        paymentMethod: invoice.canalVenta,
        creditEnabled: invoice.canalVenta.includes('CRÉDITO'),
        creditTerms: invoice.canalVenta.match(/(\d+) DÍAS/)?.[1] || '',
        createdAt: invoice.fecha
      };
      
      setTicketData(printData);
      setShowPrintTicket(true);
    } catch (error) {
      console.error('Error preparando ticket:', error);
      alert('Error al preparar el ticket de impresión');
    }
  };

  const handleCancel = async (invoice) => {
    if (!confirm(`¿Está seguro de anular la factura ${invoice.orderNumber}?`)) {
      return;
    }

    setCancellingId(invoice.uuid);
    try {
      const response = await fetch('/api/cancel-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: invoice.uuid,
          reason: `Anulación de factura ${invoice.orderNumber}`,
          sheetRowId: invoice.id // Pasar el ID de la fila
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Factura anulada exitosamente');
        loadInvoices(); // Recargar lista
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al anular la factura');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .responsive-table {
            font-size: 12px;
          }
          
          .responsive-table th,
          .responsive-table td {
            padding: 8px 4px;
          }
          
          .mobile-hide {
            display: none;
          }
          
          .action-buttons {
            flex-direction: column;
            gap: 4px !important;
          }
          
          .action-button {
            padding: 4px 8px !important;
            font-size: 12px !important;
            white-space: nowrap;
          }
        }
        
        @media (max-width: 480px) {
          .responsive-table {
            display: block;
            overflow-x: auto;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
          }
          
          .responsive-table table {
            min-width: 600px;
          }
        }
      `}</style>

      <div style={{
        padding: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        background: '#f5f7fa',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#333',
            margin: 0
          }}>
            📋 Búsqueda de Facturas
          </h1>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/pos" style={{
              padding: '12px 24px',
              background: '#008060',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}>
              🛒 Ir al POS
            </Link>
            <Link to="/app" style={{
              padding: '12px 24px',
              background: '#666',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}>
              ← Volver
            </Link>
          </div>
        </div>

        {/* Buscador */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por número de orden o NIT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px 16px 50px',
                fontSize: '16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#008060';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
              }}
            />
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '20px'
            }}>
              🔍
            </span>
          </div>

          {/* Indicador de cantidad de facturas */}
          <div style={{ 
  textAlign: 'center', 
  margin: '10px 0', 
  padding: '8px 16px',
  background: searchTerm ? '#f0f9ff' : '#e8f4fd',
  border: `1px solid ${searchTerm ? '#0ea5e9' : '#0066cc'}`,
  borderRadius: '6px',
  fontSize: '14px',
  color: searchTerm ? '#0369a1' : '#0066cc'
}}>
  {loading ? (
    <>⏳ Buscando...</>
  ) : searchTerm ? (
    <>🔍 <strong>{filteredInvoices.length}</strong> resultados encontrados para "{searchTerm}"</>
  ) : (
    <>📊 Mostrando las <strong>{filteredInvoices.length}</strong> facturas más recientes</>
  )}
</div>
        </div>

        {/* Tabla de facturas */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
              <p>Cargando facturas...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
              <p>No se encontraron facturas</p>
            </div>
          ) : (
            <div className="responsive-table">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={thStyle}>Orden</th>
                    <th style={thStyle} className="mobile-hide">Fecha</th>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle} className="mobile-hide">NIT</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle} className="mobile-hide">Serie</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, index) => (
                    <tr key={invoice.uuid || index} style={{
                      borderBottom: '1px solid #e0e0e0',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <td style={tdStyle}>
                        <strong>{invoice.orderNumber}</strong>
                      </td>
                      <td style={tdStyle} className="mobile-hide">
                         {(() => {
    const parsedDate = parseDateFormats(invoice.fecha);
    if (parsedDate) {
      return formatDateForSearch(parsedDate);
    }
    // Fallback si no se puede parsear
    return invoice.fecha || 'Sin fecha';
  })()}
                      </td>
                      <td style={tdStyle}>{invoice.nombreNIT}</td>
                      <td style={tdStyle} className="mobile-hide">{invoice.nit}</td>
                      <td style={tdStyle}>
                        <strong>Q{invoice.totalGeneral}</strong>
                      </td>
                      <td style={tdStyle} className="mobile-hide">{invoice.serie}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: invoice.estado === 'paid' ? '#e3f4e8' : '#fee',
                          color: invoice.estado === 'paid' ? '#00aa00' : '#ff0000'
                        }}>
                          {invoice.estado === 'paid' ? 'PAGADA' : 
 invoice.estado === 'ANULADO - DEVOLUCIÓN' ? 'DEVUELTA' : 'ANULADA'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="action-button"
                            onClick={() => handlePrint(invoice)}
                            style={{
                              padding: '6px 12px',
                              background: '#0066cc',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            title="Imprimir ticket"
                          >
                            🖨️ Imprimir
                          </button>
                          {invoice.estado === 'paid' && (
                            <button
                              className="action-button"
                              onClick={() => handleCancel(invoice)}
                              disabled={cancellingId === invoice.uuid}
                              style={{
                                padding: '6px 12px',
                                background: cancellingId === invoice.uuid ? '#ccc' : '#ff4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: cancellingId === invoice.uuid ? 'default' : 'pointer',
                                fontSize: '14px'
                              }}
                              title="Anular factura"
                            >
                              {cancellingId === invoice.uuid ? '⏳' : '❌'} Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Componente de impresión de ticket */}
      {showPrintTicket && (
        <PrintTicket
          ticketData={ticketData}
          onClose={() => {
            setShowPrintTicket(false);
            setTicketData(null);
          }}
        />
      )}
    </>
  );
}

// Estilos para la tabla
const thStyle = {
  padding: '16px',
  textAlign: 'left',
  fontWeight: 'bold',
  color: '#666',
  fontSize: '14px'
};

const tdStyle = {
  padding: '16px',
  fontSize: '14px'
};