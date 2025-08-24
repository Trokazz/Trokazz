import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css'; // Alterado para importar o arquivo de estilos global do Tailwind
import { Providers } from './components/Providers';
import ErrorBoundary from './components/ErrorBoundary'; // Importando o ErrorBoundary

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary> {/* Envolvendo o App com o ErrorBoundary */}
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>,
);