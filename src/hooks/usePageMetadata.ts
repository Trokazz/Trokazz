import { useEffect } from 'react';

interface PageMetadata {
  title: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
}

const usePageMetadata = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
}: PageMetadata) => {
  useEffect(() => {
    document.title = title;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description || "Sua nova forma de negociar. Compre, venda e troque com segurança na maior comunidade de classificados de Dourados e região.";

    // Update meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = keywords || "trokazz, classificados, dourados, ms, compra, venda, troca, anúncios, usados, novos";

    // Update Open Graph tags for social sharing
    const updateOrCreateMeta = (property: string, content: string | undefined, isHttpEquiv = false) => {
      let metaTag = document.querySelector(`meta[${isHttpEquiv ? 'http-equiv' : 'property'}="${property}"]`) as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        if (isHttpEquiv) metaTag.setAttribute('http-equiv', property);
        else metaTag.setAttribute('property', property);
        document.head.appendChild(metaTag);
      }
      metaTag.content = content || '';
    };

    updateOrCreateMeta('og:title', ogTitle || title);
    updateOrCreateMeta('og:description', ogDescription || description);
    updateOrCreateMeta('og:image', ogImage || `${window.location.origin}/logo.png`);
    updateOrCreateMeta('og:url', ogUrl || window.location.href);
    updateOrCreateMeta('og:type', 'website'); // Default to website type

    // Clean up on unmount (optional, but good practice for dynamic tags)
    return () => {
      // For simplicity, we'll let the next page's useEffect overwrite them.
      // If a tag is truly unique to a page and should be removed,
      // you would add logic here to remove it.
    };
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl]);
};

export default usePageMetadata;