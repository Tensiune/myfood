import { supabase } from "./supabase";
import { showError } from "@/utils/toast";

/**
 * Faz o upload de um arquivo para um bucket específico do Supabase Storage.
 */
export async function uploadFile(
  file: File, 
  path: string, 
  bucket: string = "merchant-images"
): Promise<string | null> {
  if (!file) return null;

  // Sanitiza o nome do arquivo
  const fileExt = file.name.split('.').pop();
  const sanitizedBaseName = file.name
    .split('.')[0]
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  const fileName = `${Date.now()}-${sanitizedBaseName}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;

  } catch (error: any) {
    console.error(`[Storage] Erro no upload para o bucket ${bucket}:`, error);
    
    if (error.status === 404 || error.message?.includes('bucket not found')) {
      showError(`Configuração Necessária: Crie o bucket '${bucket}' no seu Supabase.`);
    } else {
      showError(`Erro ao enviar arquivo: ${error.message || 'Verifique as permissões.'}`);
    }
    
    return null;
  }
}

// Alias para manter compatibilidade com o componente de produtos
export const uploadImage = uploadFile;