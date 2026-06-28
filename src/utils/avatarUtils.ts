import { createClient } from '@/utils/supabase/client';

export async function uploadCustomAvatar(file: File): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not logged in');
  }

  // 1. Upload to Supabase Storage
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    throw new Error('Failed to upload avatar: ' + uploadError.message);
  }

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

  // 3. Update Auth Metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { avatar_url: urlWithCacheBuster }
  });

  if (authError) {
    throw new Error('Failed to update auth metadata: ' + authError.message);
  }

  // 4. Update Profile Table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: urlWithCacheBuster })
    .eq('id', user.id);

  if (profileError) {
    throw new Error('Failed to update profile: ' + profileError.message);
  }

  return urlWithCacheBuster;
}
