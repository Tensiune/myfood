import { supabase } from "./supabase";
import { showSuccess, showError } from "@/utils/toast";

const BUCKET_NAME = "merchant-images";

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * NOTE: Requires a bucket named 'merchant-images' to exist in Supabase Storage.
 */
export async function uploadImage(file: File, path: string): Promise<string | null> {
  if (!file) return null;

  // Use a unique path based on the current timestamp and filename
  const filePath = `${path}/${Date.now()}-${file.name}`;

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    showSuccess("Imagem enviada com sucesso!");
    return publicUrlData.publicUrl;

  } catch (error: any) {
    console.error("Erro ao fazer upload da imagem:", error);
    showError(`Erro ao enviar imagem: Verifique se o bucket '${BUCKET_NAME}' existe e se as permissões estão corretas.`);
    return null;
  }
}