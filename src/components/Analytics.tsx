import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface AnalyticsProps {
  measurementId?: string;
}

const Analytics = ({ measurementId }: AnalyticsProps) => {
  const location = useLocation();

  // Efeito para inicializar o script do Google Analytics (gtag.js)
  useEffect(() => {
    if (!measurementId || window.gtag) {
      return;
    }

    // Cria o script principal do gtag
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    // Cria o script de inicialização
    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    `;
    document.head.appendChild(inlineScript);

  }, [measurementId]);

  // Efeito para rastrear as mudanças de página
  useEffect(() => {
    if (window.gtag && measurementId) {
      window.gtag('config', measurementId, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location, measurementId]);

  return null; // Este componente não renderiza nada visualmente
};

export default Analytics;