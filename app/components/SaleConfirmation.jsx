// app/components/SaleConfirmation.jsx
export default function SaleConfirmation({ isOpen, onClose, saleData }) {
  if (!isOpen) return null;

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const contentStyle = {
    background: 'white',
    padding: '32px',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, color: '#008060' }}>
          ✓ Venta Procesada Exitosamente
        </h2>
        
        {saleData && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3>Detalles de la Orden</h3>
              <p><strong>Número:</strong> {saleData.order.number}</p>
              <p><strong>Total:</strong> Q{saleData.order.total}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>Factura Electrónica</h3>
              <p><strong>Número:</strong> {saleData.invoice.number}</p>
              <p><strong>Autorización SAT:</strong> {saleData.invoice.authorization}</p>
            </div>

            <div style={{
              padding: '12px',
              background: '#e3f4e8',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0 }}>
                📱 La factura fue enviada por WhatsApp al cliente
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            background: '#008060',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}