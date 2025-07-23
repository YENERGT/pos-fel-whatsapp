// app/components/PrintTicket.jsx
import { useEffect } from 'react';

export default function PrintTicket({ ticketData, onClose }) {
  useEffect(() => {
    // Auto-imprimir cuando el componente se monta
    if (ticketData) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [ticketData]);

  if (!ticketData) return null;

  console.log('Datos del ticket:', ticketData);
  console.log('Descuento recibido:', ticketData.discount);

  const {
  orderNumber,
  customerName,
  nit,
  phoneNumber,
  products,
  subtotal,
  discount,
  iva,
  total,
  invoice,
  paymentMethod,
  creditEnabled,
  creditTerms,
  createdAt
} = ticketData;

  // Formatear fecha y hora
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('es-GT', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <style>{`
  @media print {
    body * {
      visibility: hidden;
    }
    #print-ticket, #print-ticket * {
      visibility: visible;
    }
    #print-ticket {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      font-weight: bold;
    }
    .no-print {
      display: none !important;
    }
    @page {
      margin: 0;
      size: 80mm auto;
    }
  }
  
  .ticket-container {
    width: 80mm;
    max-width: 300px;
    margin: 0 auto;
    padding: 10px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: 600;
    background: white;
    color: black;
  }
  
  .ticket-header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 10px;
    font-weight: bold;
  }
  
  .company-name {
    font-size: 18px;
    font-weight: 900;
    margin-bottom: 5px;
    letter-spacing: 1px;
  }
  
  .ticket-section {
    margin: 10px 0;
    padding: 5px 0;
    border-bottom: 2px solid #000;
    font-weight: bold;
  }
  
  .ticket-row {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    font-weight: bold;
  }
  
  .ticket-label {
    font-weight: 900;
    text-transform: uppercase;
  }
  
  .product-item {
    margin: 5px 0;
    padding-left: 10px;
    font-weight: bold;
  }
  
  .ticket-totals {
    margin-top: 10px;
    border-top: 3px solid #000;
    padding-top: 10px;
    font-weight: bold;
  }
  
  .total-row {
    display: flex;
    justify-content: space-between;
    font-size: 16px;
    font-weight: 900;
    margin: 8px 0;
    padding: 5px 0;
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
  }
  
  .fel-section {
    margin-top: 15px;
    padding: 10px;
    border: 3px solid #000;
    text-align: center;
    font-weight: bold;
  }
  
  .fel-title {
    font-weight: 900;
    margin-bottom: 5px;
    font-size: 14px;
  }
  
  .authorization-text {
    font-size: 11px;
    word-break: break-all;
    margin: 5px 0;
    font-weight: bold;
  }
  
  .footer-text {
    text-align: center;
    margin-top: 20px;
    font-size: 12px;
    font-weight: bold;
  }
  
  .footer-text p {
    margin: 5px 0;
    font-weight: bold;
  }
  
  .credit-warning {
    background: #000;
    color: #fff;
    padding: 10px;
    margin: 10px 0;
    border: 3px solid #000;
    text-align: center;
    font-weight: 900;
    font-size: 14px;
  }
`}</style>

      <div id="print-ticket" className="ticket-container">
        {/* Header */}
        <div className="ticket-header">
          <div className="company-name">GRUPO REVISA</div>
          <div>NIT: 117387487</div>
          <div>Tel: 22931894</div>
          <div>ZONA 7 TIKAL 1 13-46 ANILLO PERIFERICO</div>
        </div>

        {/* Orden Info */}
        <div className="ticket-section">
          <div className="ticket-row">
            <span className="ticket-label">ORDEN #:</span>
            <span>{orderNumber}</span>
          </div>
          <div className="ticket-row">
            <span className="ticket-label">FECHA:</span>
            <span>{formatDateTime(createdAt)}</span>
          </div>
        </div>

        {/* Cliente Info */}
        <div className="ticket-section">
          <div className="ticket-row">
            <span className="ticket-label">CLIENTE:</span>
            <span>{customerName}</span>
          </div>
          <div className="ticket-row">
            <span className="ticket-label">NIT:</span>
            <span>{nit}</span>
          </div>
          <div className="ticket-row">
            <span className="ticket-label">TEL:</span>
            <span>{phoneNumber}</span>
          </div>
        </div>

        {/* Productos */}
        <div className="ticket-section">
          <div className="ticket-label">PRODUCTOS:</div>
          {products.map((product, index) => (
            <div key={index} className="product-item">
              <div>{product.quantity} x {product.title}</div>
              <div className="ticket-row">
                <span>Q{product.price} c/u</span>
                <span>Q{(product.price * product.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
<div className="ticket-totals">
  <div className="ticket-row">
    <span>SUBTOTAL:</span>
    <span>Q{subtotal.toFixed(2)}</span>
  </div>
  {discount > 0 && (
    <div className="ticket-row">
  <span>DESCUENTO:</span>
  <span>-Q{(discount || 0).toFixed(2)}</span>
</div>
  )}
  <div className="ticket-row">
    <span>IVA (12%):</span>
    <span>Q{iva}</span>
  </div>
  <div className="total-row">
    <span>TOTAL:</span>
    <span>Q{total}</span>
  </div>
</div>

        {/* Método de Pago */}
        <div className="ticket-section">
          <div className="ticket-row">
            <span className="ticket-label">PAGO:</span>
            <span>{creditEnabled ? `CRÉDITO ${creditTerms} DÍAS` : paymentMethod}</span>
          </div>
        </div>

        {/* Advertencia de Crédito */}
        {creditEnabled && (
          <div className="credit-warning">
            ¡VENTA A CRÉDITO!<br/>
            PLAZO: {creditTerms} DÍAS
          </div>
        )}

        {/* Información FEL */}
        <div className="fel-section">
          <div className="fel-title">FACTURA ELECTRÓNICA FEL</div>
          <div className="ticket-row">
            <span>SERIE:</span>
            <span>{invoice.serie}</span>
          </div>
          <div className="ticket-row">
            <span>NÚMERO:</span>
            <span>{invoice.number}</span>
          </div>
          <div className="authorization-text">
            AUTORIZACIÓN SAT:<br/>
            {invoice.authorization}
          </div>
        </div>

        {/* Footer */}
        <div className="footer-text">
          <p>¡GRACIAS POR SU COMPRA!</p>
          <p>Factura enviada por WhatsApp</p>
          <p>----------------------------</p>
          <p>CONSERVE ESTE COMPROBANTE</p>
        </div>
      </div>

      {/* Botón de cerrar (no se imprime) */}
      <div className="no-print" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            background: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Cerrar Vista Previa
        </button>
      </div>
    </>
  );
}