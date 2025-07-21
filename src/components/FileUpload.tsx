import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, X, CheckCircle } from "lucide-react";

interface FileUploadProps {
  baseId: string;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  id: string;
}

export const FileUpload = ({ baseId, onUploadComplete }: FileUploadProps) => {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
      id: crypto.randomUUID()
    }));

    setUploads(prev => [...prev, ...newUploads]);

    for (const upload of newUploads) {
      try {
        // Create document record first
        const { data: document, error: docError } = await supabase
          .from('documents')
          .insert({
            case_id: baseId,
            file_name: upload.file.name,
            file_size: upload.file.size,
            mime_type: upload.file.type,
            file_path: `${baseId}/${upload.id}/${upload.file.name}`,
            status: 'uploaded'
          })
          .select()
          .single();

        if (docError) throw docError;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('case-documents')
          .upload(`${baseId}/${upload.id}/${upload.file.name}`, upload.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Update upload status
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, progress: 100, status: 'completed' }
            : u
        ));

        toast({
          title: "Success",
          description: `${upload.file.name} uploaded successfully`,
        });

      } catch (error) {
        console.error('Upload error:', error);
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error' }
            : u
        ));

        toast({
          title: "Error",
          description: `Failed to upload ${upload.file.name}`,
          variant: "destructive",
        });
      }
    }

    onUploadComplete();
  }, [baseId, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md']
    }
  });

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card 
        {...getRootProps()} 
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-lg font-medium">Drop files here...</p>
          ) : (
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Drag & drop files here</p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse (PDF, DOC, DOCX, TXT, MD)
              </p>
              <Button variant="outline">Choose Files</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {uploads.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Upload Progress</h3>
          {uploads.map((upload) => (
            <Card key={upload.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <File className="h-4 w-4" />
                  <span className="text-sm font-medium">{upload.file.name}</span>
                  {upload.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUpload(upload.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {upload.status === 'uploading' && (
                <Progress value={upload.progress} className="h-2" />
              )}
              {upload.status === 'error' && (
                <p className="text-sm text-red-600">Upload failed</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};