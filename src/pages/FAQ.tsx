import GenericPage from './GenericPage';
import usePageMetadata from "@/hooks/usePageMetadata";

const FAQ = () => {
  usePageMetadata({
    title: "Perguntas Frequentes - Trokazz",
    description: "Encontre respostas para as perguntas mais comuns sobre o Trokazz.",
    keywords: "faq, perguntas frequentes, ajuda, suporte, trokazz",
    ogUrl: window.location.href,
  });
  return <GenericPage slug="faq" />;
};

export default FAQ;