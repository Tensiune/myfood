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

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;
    
    // Se for público, retorna a URL pública. Se for privado, retorna apenas o caminho (path)
    if (bucket === 'merchant-images') {
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    }
    
    // Para buckets privados, retornamos o caminho relativo para ser usado com Signed URLs
    return filePath;

  } catch (error: any) {
    console.error(`[Storage] Erro no upload:`, error);
    showError(`Erro ao enviar arquivo. Verifique se o bucket '${bucket}' existe.`);
    return null;
  }
}

/**
 * Gera uma URL temporária (assinada) para arquivos privados.
 * O link expira em 5 minutos (300 segundos).
 */
export async function getSecureUrl(bucket: string, path: string): Promise<string | null> {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 300); // Expira em 5 min

        if (error) throw error;
        return data.signedUrl;
    } catch (error) {
        console.error("[Storage] Erro ao gerar URL segura:", error);
        return null;
    }
}

export const uploadImage = uploadFile;