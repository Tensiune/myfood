import { supabase } from "./supabase";
import { showError } from "@/utils/toast";

/**
 * Faz o upload de um arquivo para um bucket específico do Supabase Storage.
 * @param file O arquivo a ser enviado.
 * @param path O caminho dentro do bucket (ex: 'userId/docs').
 * @param bucket O nome do bucket (padrão: 'merchant-images').
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

    // Se o bucket for público, pegamos a URL pública.
    // Se for privado (como o de documentos), pegamos o caminho relativo para salvar no banco.
    // No caso de documentos privados, o ideal é salvar o path e gerar uma URL assinada quando for visualizar.
    
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