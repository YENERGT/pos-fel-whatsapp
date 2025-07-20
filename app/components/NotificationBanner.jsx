// app/components/NotificationBanner.jsx
import { useEffect } from 'react';

export default function NotificationBanner({ type, message, details, onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  const bannerStyles = {
    success: {
      background: '#e3f4e8',
      borderColor: '#00aa00',
      iconColor: '#00aa00',
      icon: '✓'
    },
    error: {
      background: '#fee',
      borderColor: '#ff0000',
      iconColor: '#ff0000',
      icon: '✕'
    },
    warning: {
      background: '#fff3cd',
      borderColor: '#ff8800',
      iconColor: '#ff8800',
      icon: '⚠'
    }
  };

  const style = bannerStyles[type] || bannerStyles.success;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      maxWidth: '500px',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: `2px solid ${style.borderColor}`,
      overflow: 'hidden',
      animation: 'slideIn 0.3s ease-out',
      zIndex: 1000
    }}>
      <style>{`
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
      `}</style>
      
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: style.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: style.iconColor,
          marginRight: '12px',
          flexShrink: 0
        }}>
          {style.icon}
        </div>
        
        <div style={{ flex: 1, marginRight: '12px' }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            {type === 'success' ? 'Facturación Exitosa' : type === 'error' ? 'Error al Facturar' : 'Advertencia'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            {message}
          </p>
          {details && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              {details}
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#999',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => e.target.style.color = '#666'}
          onMouseLeave={(e) => e.target.style.color = '#999'}
        >
          ×
        </button>
      </div>
      
      {type === 'success' && (
  <div style={{
    background: style.background,
    padding: '12px 16px',
    borderTop: '1px solid #e0e0e0',
    fontSize: '13px',
    color: '#666'
  }}>
    <div style={{ marginBottom: details && details.includes('CRÉDITO') ? '8px' : '0' }}>
      📱 La factura fue enviada por WhatsApp al cliente
    </div>
    {details && details.includes('CRÉDITO') && (
      <div style={{
        padding: '8px',
        background: '#fff3cd',
        borderRadius: '4px',
        color: '#856404',
        fontWeight: 'bold'
      }}>
        ⚠️ Venta a crédito - La orden NO fue marcada como pagada
      </div>
    )}
  </div>
)}
    </div>
  );
}