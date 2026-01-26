import { supabase } from "./supabase";
import { showSuccess, showError } from "@/utils/toast";

const BUCKET_NAME = "merchant-images";

/**
 * Faz o upload de um arquivo para o Supabase Storage.
 * IMPORTANTE: Você deve criar um bucket chamado 'merchant-images' no painel do Supabase
 * e configurá-lo como 'Public'.
 */
export async function uploadImage(file: File, path: string): Promise<string | null> {
  if (!file) return null;

  // Sanitiza o nome do arquivo para evitar problemas com caracteres especiais
  const fileExt = file.name.split('.').pop();
  const sanitizedName = file.name
    .split('.')[0]
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  const fileName = `${Date.now()}-${sanitizedName}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  try {
    console.log(`[Storage] Iniciando upload: ${filePath} (${file.type})`);

    const { error: uploadError, data } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error("[Storage] Erro no upload do Supabase:", uploadError);
      throw uploadError;
    }

    // Busca a URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!publicUrl) throw new Error("Não foi possível gerar a URL pública.");

    return publicUrl;

  } catch (error: any) {
    console.error("[Storage] Erro fatal no upload:", error);
    
    // Erros comuns de bucket
    if (error.status === 404 || error.message?.includes('bucket not found')) {
      showError(`Configuração Necessária: Crie o bucket '${BUCKET_NAME}' no seu Supabase e deixe-o como Público.`);
    } else if (error.status === 403 || error.status === 401) {
      showError("Erro de Permissão: Verifique as políticas de RLS do seu bucket de Storage.");
    } else {
      showError(`Erro ao enviar arquivo: ${error.message || 'Erro desconhecido'}`);
    }
    
    return null;
  }
}