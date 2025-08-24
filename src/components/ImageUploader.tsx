import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
import { Button } from './ui/button';

interface ImageUploaderProps {
  onFileChange: (file: File | null) => void;
  title: string;
  initialImageUrl?: string; // Novo prop para a URL da imagem inicial
}

const ImageUploader = ({ onFileChange, title, initialImageUrl }: ImageUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(initialImageUrl || null);

  useEffect(() => {
    // Atualiza o preview se initialImageUrl mudar e não houver um arquivo novo selecionado
    if (initialImageUrl && !preview) {
      setPreview(initialImageUrl);
    } else if (!initialImageUrl && preview && !preview.startsWith('blob:')) {
      // Se initialImageUrl for removido e o preview não for um blob (novo arquivo), limpa
      setPreview(null);
    }
  }, [initialImageUrl, preview]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Revoga a URL do preview anterior se for um blob
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
      setPreview(URL.createObjectURL(file));
      onFileChange(file);
    }
  }, [onFileChange, preview]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    multiple: false,
  });

  const handleRemove = () => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onFileChange(null);
  };

  return (
    <div>
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-auto rounded-lg border" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">Arraste e solte ou clique para selecionar</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;