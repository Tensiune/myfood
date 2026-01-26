import { supabase } from "./supabase";
import { showSuccess, showError } from "@/utils/toast";

const BUCKET_NAME = "merchant-images";

/**
 * Faz o upload de um arquivo para o Supabase Storage com definição explícita de MIME Type.
 */
export async function uploadImage(file: File, path: string): Promise<string | null> {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const sanitizedName = file.name
    .split('.')[0]
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  const fileName = `${Date.now()}-${sanitizedName}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  try {
    console.log(`[Storage] Iniciando upload: ${filePath} | Tipo: ${file.type}`);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream' // Força o envio do tipo do arquivo
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl;

  } catch (error: any) {
    console.error("[Storage] Erro no processo de upload:", error);
    
    if (error.status === 404 || error.message?.includes('bucket not found')) {
      showError(`Erro: O bucket '${BUCKET_NAME}' não foi encontrado no Supabase.`);
    } else {
      showError(`Falha ao enviar arquivo: ${error.message || 'Verifique as permissões do Storage'}`);
    }
    
    return null;
  }
}