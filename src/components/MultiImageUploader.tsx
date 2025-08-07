import { useCallback, useState, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, X, Camera } from 'lucide-react';
import { Button } from './ui/button';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MultiImageUploaderProps {
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

const MultiImageUploader = ({ onChange, maxFiles = 5 }: MultiImageUploaderProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const isMobile = useIsMobile();

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      showError(`Você pode enviar no máximo ${maxFiles} imagens.`);
      return;
    }

    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    onChange(newFiles);

    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);

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
  }, [files, maxFiles, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleRemove = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    
    URL.revokeObjectURL(newPreviews[index]);
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);

    setFiles(newFiles);
    setPreviews(newPreviews);
    onChange(newFiles);
  };

  useEffect(() => {
    return () => previews.forEach(url => URL.revokeObjectURL(url));
  }, [previews]);

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
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square">
              <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 rounded-full h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
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