import React, { useState } from 'react';
import { supabaseSystemUI } from '../../config/supabaseSystemUI';
import { userProfileEvents } from '../../utils/userProfileEvents';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  userId, 
  currentAvatarUrl, 
  onAvatarUpdated 
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('El archivo es muy grande. Máximo 5MB permitido');
      return;
    }

    // Mostrar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      
      // Subir archivo al storage de PQNC (donde está el bucket)
      const { data: uploadData, error: uploadError } = await supabaseSystemUI.storage
        .from('user-avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseSystemUI.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      // La función RPC está en System UI, no en PQNC
      const { error: dbError } = await supabaseSystemUI.rpc('upload_user_avatar', {
        p_user_id: userId,
        p_avatar_url: publicUrl,
        p_filename: file.name,
        p_file_size: file.size,
        p_mime_type: file.type
      });

      if (dbError) throw dbError;

      onAvatarUpdated(publicUrl);
      setPreview(null);
      
      // Notificar actualización global del perfil
      userProfileEvents.notifyUpdate();

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert('Error al subir avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar el avatar?')) return;

    setUploading(true);
    try {
      // Eliminar de base de datos (tabla está en System UI)
      const { error } = await supabaseSystemUI
        .from('user_avatars')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      onAvatarUpdated('');
      
      // Notificar actualización global del perfil
      userProfileEvents.notifyUpdate();
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      alert('Error al eliminar avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Avatar actual o preview */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {preview || currentAvatarUrl ? (
            <img 
              src={preview || currentAvatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-col space-y-2">
        {/* Input file oculto */}
        <input
          type="file"
          id={`avatar-upload-${userId}`}
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        {/* Botón subir */}
        <label
          htmlFor={`avatar-upload-${userId}`}
          className="cursor-pointer inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {uploading ? 'Subiendo...' : 'Cambiar'}
        </label>

        {/* Botón eliminar */}
        {(currentAvatarUrl || preview) && !uploading && (
          <button
            onClick={removeAvatar}
            className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 shadow-sm text-xs font-medium rounded text-red-700 dark:text-red-300 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;
