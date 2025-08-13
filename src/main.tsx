import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css'; // Alterado para importar o arquivo de estilos global do Tailwind
import { Providers } from './components/Providers';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);