// app/components/PrintTicket.jsx
import { useEffect } from 'react';

export default function PrintTicket({ ticketData, onClose }) {
  useEffect(() => {
    // Auto-imprimir cuando el componente se monta
    if (ticketData) {
      setTimeout(() => {
        window.print();
      }, 800); // Aumentado el tiempo para asegurar que el logo cargue
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
        /* Resetear márgenes globales para impresión */
        * {
          box-sizing: border-box;
        }
        
        @media print {
          /* Ocultar todo excepto el ticket */
          body * {
            visibility: hidden;
          }
          
          #print-ticket, #print-ticket * {
            visibility: visible;
          }
          
          /* Configuración de página para impresión térmica 88mm (10% más ancho) */
          @page {
            size: 88mm auto;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Contenedor principal del ticket */
          #print-ticket {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 88mm !important;
            max-width: 88mm !important;
            font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            line-height: 1.3 !important;
            color: black !important;
            background: white !important;
            padding: 2mm !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            letter-spacing: 0.5px !important;
            font-stretch: expanded !important;
          }
          
          /* Evitar saltos de página no deseados */
          .ticket-header,
          .ticket-section,
          .ticket-totals,
          .fel-section,
          .footer-text {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Ocultar elementos que no deben imprimirse */
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Asegurar que las imágenes se mantengan en proporción */
          .company-logo {
            max-width: 75mm !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto 6px auto !important;
          }
        }
        
        /* Estilos para vista en pantalla */
        .ticket-container {
          width: 88mm;
          max-width: 88mm;
          margin: 20px auto;
          padding: 8px;
          font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.3;
          background: white;
          color: black;
          letter-spacing: 0.5px;
          font-stretch: expanded;
        }
        
        .company-logo {
          max-width: 75mm;
          height: auto;
          display: block;
          margin: 0 auto 8px auto;
        }
        
        .ticket-header {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
          font-weight: 900;
        }
        
        .company-name {
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 4px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-stretch: ultra-expanded;
        }
        
        .company-info {
          font-size: 11px;
          line-height: 1.2;
          margin: 2px 0;
          font-weight: 900;
          letter-spacing: 0.3px;
        }
        
        .ticket-section {
          margin: 8px 0;
          padding: 4px 0;
          border-bottom: 2px solid #000;
          font-weight: 900;
        }
        
        .ticket-section:last-of-type {
          border-bottom: none;
        }
        
        .ticket-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin: 3px 0;
          font-weight: 900;
          word-wrap: break-word;
          min-height: 16px;
          letter-spacing: 0.3px;
        }
        
        .ticket-label {
          font-weight: 900;
          text-transform: uppercase;
          flex-shrink: 0;
          margin-right: 8px;
          font-size: 12px;
          letter-spacing: 0.5px;
          font-stretch: expanded;
        }
        
        .ticket-value {
          text-align: right;
          word-break: break-word;
          max-width: 55%;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.3px;
        }
        
        .product-item {
          margin: 4px 0;
          padding: 4px 0 4px 6px;
          font-weight: 900;
          border-left: 3px solid #000;
          background: #f8f8f8;
        }
        
        .product-title {
          font-size: 11px;
          margin-bottom: 2px;
          word-wrap: break-word;
          font-weight: 900;
          line-height: 1.2;
          letter-spacing: 0.3px;
        }
        
        .product-price-row {
          display: flex;
          justify-content: space-between;
          font-weight: 900;
          font-size: 11px;
          margin-top: 2px;
          letter-spacing: 0.3px;
        }
        
        .ticket-totals {
          margin-top: 8px;
          border-top: 3px double #000;
          padding-top: 6px;
          font-weight: 900;
          background: #f0f0f0;
          padding: 6px 4px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 900;
          margin: 4px 0;
          padding: 6px 4px;
          border: 3px double #000;
          background: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-stretch: expanded;
        }
        
        .subtotal-row, .discount-row, .iva-row {
          display: flex;
          justify-content: space-between;
          font-weight: 900;
          margin: 3px 0;
          padding: 2px 0;
          font-size: 12px;
          letter-spacing: 0.3px;
        }
        
        .fel-section {
          margin-top: 8px;
          padding: 6px;
          border: 3px double #000;
          text-align: center;
          font-weight: 900;
          background: #f8f8f8;
        }
        
        .fel-title {
          font-weight: 900;
          margin-bottom: 4px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-stretch: expanded;
        }
        
        .fel-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 0.3px;
        }
        
        .authorization-text {
          font-size: 10px;
          word-break: break-all;
          margin: 4px 0;
          font-weight: 900;
          line-height: 1.2;
          padding: 4px;
          border: 2px solid #000;
          background: white;
          letter-spacing: 0.2px;
        }
        
        .footer-text {
          text-align: center;
          margin-top: 10px;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.3;
          letter-spacing: 0.4px;
        }
        
        .footer-text p {
          margin: 4px 0;
          font-weight: 900;
          padding: 2px 0;
        }
        
        .separator-line {
          border-top: 2px solid #000;
          margin: 3px 0;
          padding-top: 3px;
        }
        
        .credit-warning {
          background: #000;
          color: #fff;
          padding: 8px;
          margin: 8px 0;
          border: 3px solid #000;
          text-align: center;
          font-weight: 900;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Botón de cerrar para vista en pantalla */
        .close-button {
          position: fixed;
          top: 10px;
          right: 10px;
          background: #ff4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          z-index: 1000;
          font-weight: bold;
        }
        
        .close-button:hover {
          background: #cc0000;
        }
        
        @media print {
          .close-button {
            display: none !important;
          }
        }
      `}</style>

      <div id="print-ticket" className="ticket-container">
        {/* Logo de la empresa */}
        <img 
          src="https://cdn.shopify.com/s/files/1/0289/7264/6460/files/Adobe_Express_20230423_1933570_1_5abf345d-a84c-46f9-8b04-97f43ef89251.png?v=1731103054"
          alt="Logo Grupo Revisa"
          className="company-logo"
          onError={(e) => {
            // Si el logo no carga, ocultar el elemento
            e.target.style.display = 'none';
          }}
        />

        {/* Header */}
        <div className="ticket-header">
          <div className="company-name">GRUPO REVISA</div>
          <div className="company-info">NIT: 117387487</div>
          <div className="company-info">TEL: 22931894</div>
          <div className="company-info">ZONA 7 TIKAL 1 13-46</div>
          <div className="company-info">ANILLO PERIFERICO</div>
        </div>

        {/* Orden Info */}
        <div className="ticket-section">
          <div className="ticket-row">
            <span className="ticket-label">ORDEN #:</span>
            <span className="ticket-value">{orderNumber}</span>
          </div>
          <div className="ticket-row">
            <span className="ticket-label">FECHA:</span>
            <span className="ticket-value">{formatDateTime(createdAt || new Date())}</span>
          </div>
        </div>

        {/* Cliente Info */}
        <div className="ticket-section">
          <div className="ticket-row">
            <span className="ticket-label">CLIENTE:</span>
            <span className="ticket-value">{customerName}</span>
          </div>
          <div className="ticket-row">
            <span className="ticket-label">NIT:</span>
            <span className="ticket-value">{nit}</span>
          </div>
          {phoneNumber && (
            <div className="ticket-row">
              <span className="ticket-label">TELÉFONO:</span>
              <span className="ticket-value">{phoneNumber}</span>
            </div>
          )}
        </div>

        {/* Productos */}
        <div className="ticket-section">
          <div className="ticket-label" style={{ marginBottom: '4px', fontSize: '13px' }}>
            PRODUCTOS VENDIDOS:
          </div>
          {products && products.map((product, index) => (
            <div key={index} className="product-item">
              <div className="product-title">
                {product.quantity} x {product.title}
              </div>
              <div className="product-price-row">
                <span>Q{Number(product.price).toFixed(2)} c/u</span>
                <span>Q{(Number(product.price) * Number(product.quantity)).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="ticket-totals">
          <div className="subtotal-row">
            <span>SUBTOTAL:</span>
            <span>Q{Number(subtotal || 0).toFixed(2)}</span>
          </div>
          
          {discount > 0 && (
            <div className="discount-row">
              <span>DESCUENTO:</span>
              <span>-Q{Number(discount || 0).toFixed(2)}</span>
            </div>
          )}
          
          <div className="iva-row separator-line">
            <span>IVA (12%):</span>
            <span>Q{Number(iva || 0).toFixed(2)}</span>
          </div>
          
          <div className="total-row">
            <span>TOTAL A PAGAR:</span>
            <span>Q{Number(total || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Método de Pago */}
        <div className="ticket-section">
          <div className="ticket-row">
            <span className="ticket-label">FORMA DE PAGO:</span>
            <span className="ticket-value">
              {creditEnabled ? `CRÉDITO ${creditTerms} DÍAS` : (paymentMethod || 'CONTADO')}
            </span>
          </div>
        </div>

        {/* Advertencia de Crédito */}
        {creditEnabled && (
          <div className="credit-warning">
            ¡ATENCIÓN - VENTA A CRÉDITO!<br/>
            PLAZO MÁXIMO: {creditTerms} DÍAS
          </div>
        )}

        {/* Información FEL */}
        {invoice && (
          <div className="fel-section">
            <div className="fel-title">FACTURA ELECTRÓNICA FEL</div>
            <div className="fel-row">
              <span>SERIE:</span>
              <span>{invoice.serie}</span>
            </div>
            <div className="fel-row">
              <span>NÚMERO:</span>
              <span>{invoice.number}</span>
            </div>
            {invoice.authorization && (
              <div className="authorization-text">
                <strong>AUTORIZACIÓN SAT:</strong><br/>
                {invoice.authorization}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="footer-text">
          <p>¡GRACIAS POR SU COMPRA!</p>
          <p>FACTURA ENVIADA POR WHATSAPP</p>
          <p>══════════════════════════</p>
          <p><strong>CONSERVE ESTE COMPROBANTE</strong></p>
          <p>PARA CUALQUIER RECLAMO</p>
        </div>
      </div>
    </>
  );
}