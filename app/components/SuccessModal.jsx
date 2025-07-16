// app/components/SuccessModal.jsx
export default function SuccessModal({ isOpen, onClose, saleData }) {
  if (!isOpen || !saleData) return null;

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
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    textAlign: 'center'
  };

  const checkmarkStyle = {
    width: '60px',
    height: '60px',
    background: '#00aa00',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '30px',
    color: 'white'
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={checkmarkStyle}>✓</div>
        
        <h2 style={{ marginTop: 0, color: '#008060' }}>
          ¡Venta Procesada Exitosamente!
        </h2>
        
        <div style={{ textAlign: 'left', margin: '20px 0' }}>
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f8f8f8', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Detalles de la Orden</h3>
            <p style={{ margin: '4px 0' }}><strong>Número:</strong> {saleData.order.number}</p>
            <p style={{ margin: '4px 0' }}><strong>Total:</strong> Q{saleData.order.total}</p>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#f8f8f8', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Factura Electrónica</h3>
            <p style={{ margin: '4px 0' }}><strong>Número:</strong> {saleData.invoice.number}</p>
            <p style={{ margin: '4px 0' }}><strong>Autorización SAT:</strong></p>
            <p style={{ margin: '4px 0', fontSize: '12px', wordBreak: 'break-all' }}>
              {saleData.invoice.authorization}
            </p>
          </div>

          <div style={{
            padding: '12px',
            background: '#e3f4e8',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📱</span>
              La factura fue enviada por WhatsApp al cliente
            </p>
          </div>
        </div>

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
          Cerrar y Nueva Venta
        </button>
      </div>
    </div>
  );
}