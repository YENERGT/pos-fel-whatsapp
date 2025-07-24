// app/routes/app._index.jsx
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ ok: true });
};

export default function Index() {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
          Aplicación POS FEL WhatsApp
        </h1>
        
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <p style={{ marginBottom: '20px', fontSize: '16px' }}>
            Esta aplicación permite:
          </p>
          
          <ul style={{ 
            textAlign: 'left', 
            maxWidth: '400px', 
            margin: '0 auto 30px', 
            listStyle: 'none',
            padding: 0 
          }}>
            <li style={{ marginBottom: '8px' }}>✓ Buscar NITs en el sistema FEL</li>
            <li style={{ marginBottom: '8px' }}>✓ Crear facturas electrónicas</li>
            <li style={{ marginBottom: '8px' }}>✓ Enviar facturas por WhatsApp</li>
            <li style={{ marginBottom: '8px' }}>✓ Gestionar pedidos desde POS</li>
            <li style={{ marginBottom: '8px' }}>✓ Buscar y anular facturas</li>
          </ul>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              to="/pos" 
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#008060',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              🛒 Abrir POS
            </Link>
            
            <Link 
              to="/app/facturas" 
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#0066cc',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              📋 Buscar Facturas
            </Link>
            
            <Link 
              to="/app/settings" 
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#f4f4f4',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              ⚙️ Configuración
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}