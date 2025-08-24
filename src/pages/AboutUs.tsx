import GenericPage from './GenericPage';
import usePageMetadata from "@/hooks/usePageMetadata";

const AboutUs = () => {
  usePageMetadata({
    title: "Sobre Nós - Trokazz",
    description: "Conheça a história e a missão do Trokazz, sua plataforma de classificados em Dourados e região.",
    keywords: "sobre nós, quem somos, missão, trokazz",
    ogUrl: window.location.href,
  });
  return <GenericPage slug="about-us" />;
};

export default AboutUs;