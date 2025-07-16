// app/routes/app.settings.jsx
import { useState } from "react";
import { json } from "@remix-run/node";
import { Form, useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  
  return json({
    felApiKey: process.env.FEL_API_KEY || "",
    felEmpresaId: process.env.FEL_EMPRESA_ID || "",
    whatsappPhoneId: process.env.WHATSAPP_PHONE_ID || "",
    googleSheetsId: process.env.GOOGLE_SHEETS_ID || "",
  });
};

export default function Settings() {
  const data = useLoaderData();

  const cardStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    background: '#f4f4f4',
    cursor: 'not-allowed'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/app" style={{ color: '#008060', textDecoration: 'none' }}>
          ← Inicio
        </Link>
        <h1 style={{ fontSize: '24px', margin: 0 }}>Configuración</h1>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Configuración FEL</h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            FEL API Key
          </label>
          <input type="text" value={data.felApiKey} disabled style={inputStyle} />
          <small style={{ color: '#666', fontSize: '12px' }}>
            API Key proporcionada por FELplex
          </small>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            FEL Empresa ID
          </label>
          <input type="text" value={data.felEmpresaId} disabled style={inputStyle} />
          <small style={{ color: '#666', fontSize: '12px' }}>
            ID de tu empresa en FELplex
          </small>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Configuración WhatsApp</h2>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            WhatsApp Phone ID
          </label>
          <input type="text" value={data.whatsappPhoneId} disabled style={inputStyle} />
          <small style={{ color: '#666', fontSize: '12px' }}>
            ID del teléfono de WhatsApp Business
          </small>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Google Sheets</h2>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Google Sheets ID
          </label>
          <input type="text" value={data.googleSheetsId} disabled style={inputStyle} />
          <small style={{ color: '#666', fontSize: '12px' }}>
            ID de la hoja de cálculo de Google
          </small>
        </div>
      </div>

      <p style={{ color: '#666', fontStyle: 'italic', marginTop: '20px' }}>
        Nota: Las credenciales se configuran en las variables de entorno del servidor.
      </p>
    </div>
  );
}