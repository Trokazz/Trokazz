import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, X, Camera } from 'lucide-react';
import { Button } from './ui/button';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client'; // Import supabase for public URLs
import { getOptimizedImageUrl } from '@/lib/utils'; // Explicitly import getOptimizedImageUrl

interface ImageItem {
  id: string; // Unique ID for React key and D&D
  type: 'file' | 'url'; // 'file' for new File objects, 'url' for existing image paths
  value: File | string; // The actual File object or the relative path string
  preview: string; // The URL for displaying the image
}

interface MultiImageUploaderProps {
  onChange: (files: (File | string)[]) => void; // Now returns File objects AND existing paths
  maxFiles?: number;
  initialImageUrls?: string[]; // Existing image paths (relative paths from Supabase)
}

const MultiImageUploader = ({ onChange, maxFiles = 5, initialImageUrls = [] }: MultiImageUploaderProps) => {
  const [items, setItems] = useState<ImageItem[]>([]);
  const isMobile = useIsMobile();
  const isInitialRender = useRef(true); // Flag para controlar a renderização inicial

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Efeito para inicializar items de initialImageUrls apenas na primeira renderização
  useEffect(() => {
    if (isInitialRender.current && initialImageUrls.length > 0) {
      const initialItems: ImageItem[] = initialImageUrls.map(url => ({
        id: url,
        type: 'url',
        value: url,
        preview: getOptimizedImageUrl(url, { width: 400, height: 400 }, 'advertisements') || '/placeholder.svg',
      }));
      console.log("MultiImageUploader: Initializing items from initialImageUrls (first render):", initialItems);
      setItems(initialItems);
      onChange(initialItems.map(item => item.value)); // Informa o pai sobre os itens iniciais
    }
    isInitialRender.current = false; // Marca como não sendo a renderização inicial após a primeira execução do efeito
  }, [initialImageUrls, onChange]); // Dependências para quando initialImageUrls pode realmente mudar (ex: em EditAd)

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    console.log("MultiImageUploader: onDrop called. Accepted files:", acceptedFiles);
    console.log("MultiImageUploader: File rejections:", fileRejections);

    if (items.length + acceptedFiles.length > maxFiles) {
      showError(`Você pode enviar no máximo ${maxFiles} imagens.`);
      return;
    }

    const newFileItems: ImageItem[] = acceptedFiles.map(file => {
      const objectUrl = URL.createObjectURL(file);
      console.log(`MultiImageUploader: New file accepted: ${file.name}, Object URL: ${objectUrl}`);
      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`, // Unique ID for new files
        type: 'file',
        value: file,
        preview: objectUrl,
      };
    });

    const updatedItems = [...items, ...newFileItems];
    console.log("MultiImageUploader: Updated items after drop:", updatedItems);
    setItems(updatedItems);
    onChange(updatedItems.map(item => item.value)); // Passa de volta objetos File e caminhos

    if (fileRejections.length > 0) {
      fileRejections.forEach(rejection => {
        rejection.errors.forEach(error => {
          if (error.code === 'file-too-large') {
            showError(`Arquivo muito grande: ${rejection.file.name}. O máximo é 5MB.`);
          } else {
            showError(`Erro no arquivo ${rejection.file.name}: ${error.message}`);
          }
        });
      });
    }
  }, [items, maxFiles, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleRemove = (idToRemove: string) => {
    console.log("MultiImageUploader: handleRemove called for ID:", idToRemove);
    const updatedItems = items.filter(item => item.id !== idToRemove);
    const removedItem = items.find(item => item.id === idToRemove);

    if (removedItem && removedItem.type === 'file') {
      URL.revokeObjectURL(removedItem.preview); // Limpa a URL do objeto para novos arquivos
    }
    
    console.log("MultiImageUploader: Updated items after remove:", updatedItems);
    setItems(updatedItems);
    onChange(updatedItems.map(item => item.value));
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      return;
    }

    const newItems = [...items];
    const draggedItem = newItems[dragItem.current];
    newItems.splice(dragItem.current, 1);
    newItems.splice(dragOverItem.current, 0, draggedItem);

    setItems(newItems);
    onChange(newItems.map(item => item.value));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Limpa as URLs de objeto quando o componente é desmontado ou os itens mudam
  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.type === 'file') {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [items]);

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        {isMobile ? (
          <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
        ) : (
          <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
        )}
        {isMobile ? (
          <>
            <p className="mt-4 font-semibold">Adicionar Fotos</p>
            <p className="text-sm text-muted-foreground">Toque para selecionar (até {maxFiles})</p>
          </>
        ) : (
          <>
            <p className="mt-4 font-semibold">Arraste e solte as imagens aqui</p>
            <p className="text-sm text-muted-foreground">ou clique para selecionar (até {maxFiles})</p>
          </>
        )}
      </div>
      {items.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="relative group aspect-square border rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <img src={item.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 rounded-full h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiImageUploader;