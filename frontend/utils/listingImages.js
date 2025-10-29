import { supabase } from './supabaseClient';

const LISTING_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LISTING_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_LISTING_PHOTO_BUCKET ||
  'listing_photos';

const SIGNED_URL_TTL = Number(process.env.NEXT_PUBLIC_LISTING_IMAGE_TTL || 60 * 60); // seconds

function getExtension(file) {
  const name = typeof file?.name === 'string' ? file.name : '';
  const parts = name.split('.');
  if (parts.length <= 1) return '';
  return parts.pop().toLowerCase();
}

export async function fetchProductImages(productId) {
  if (!productId) return [];
  const { data, error } = await supabase
    .from('product_images')
    .select('*, product:Product(prod_id, seller_id)')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(error.message || 'Failed to load product images');
  }

  const withUrls = await Promise.all(
    (data || []).map(async (image) => {
      const { data: signed } = await supabase.storage
        .from(LISTING_BUCKET)
        .createSignedUrl(image.storage_path, SIGNED_URL_TTL);
      return {
        ...image,
        url: signed?.signedUrl || null,
        product: image.product || null,
      };
    }),
  );
  return withUrls;
}

export async function fetchListingGalleryImage(productId) {
  if (!productId) return null;
  const { data, error } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message || 'Failed to load listing photo');
  }
  if (!data?.storage_path) {
    return null;
  }
  const { data: signed, error: signedError } = await supabase.storage
    .from(LISTING_BUCKET)
    .createSignedUrl(data.storage_path, SIGNED_URL_TTL, {
      transform: {
        width: 1200,
        height: 800,
        resize: 'contain',
        quality: 90,
        background: 'rgba(0,0,0,0)',
      },
    });
  if (signedError) {
    throw new Error(signedError.message || 'Failed to load listing photo');
  }
  return signed?.signedUrl || null;
}

export async function uploadProductImages(productId, files, userId) {
  if (!productId || !Array.isArray(files) || files.length === 0) {
    return [];
  }
  const vettedFiles = files.filter((file) => file instanceof File);
  if (!vettedFiles.length) return [];

  const { data: existing, error: existingError } = await supabase
    .from('product_images')
    .select('id, position, is_primary')
    .eq('product_id', productId)
    .order('position', { ascending: true });
  if (existingError) {
    throw new Error(existingError.message || 'Failed to prepare image upload');
  }

  let nextPosition =
    existing && existing.length
      ? Math.max(...existing.map((item) => item.position ?? 0)) + 1
      : 0;
  const hasPrimary = Boolean(existing?.some((item) => item.is_primary));

  const insertedRecords = [];

  for (const file of vettedFiles) {
    const extension = getExtension(file);
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      throw new Error(`Unsupported file type: ${extension || 'unknown'}`);
    }
    const fileName =
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`) + `.${extension}`;
    const storagePath = `listings/${productId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(LISTING_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
    if (uploadError) {
      console.error('Storage upload failed', uploadError);
      throw new Error(uploadError.message || 'Failed to upload photo');
    }

    const { data: inserted, error: insertError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        storage_path: storagePath,
        position: nextPosition,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert product image metadata', insertError);
      throw new Error(insertError.message || 'Failed to save photo metadata');
    }

    insertedRecords.push(inserted);
    nextPosition += 1;
  }

  if (!hasPrimary && insertedRecords.length > 0) {
    await setPrimaryProductImage(productId, insertedRecords[0].id);
  }

  return insertedRecords;
}

export async function deleteProductImage(productId, imageId, storagePath) {
  if (!productId || !imageId) return;

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(LISTING_BUCKET)
      .remove([storagePath]);
    if (storageError) {
      console.error('Storage delete failed', storageError);
      throw new Error(storageError.message || 'Failed to remove file from storage');
    }
  }

  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', productId);
  if (error) {
    throw new Error(error.message || 'Failed to delete listing photo');
  }
}

export async function setPrimaryProductImage(productId, imageId) {
  if (!productId || !imageId) return;
  const { error } = await supabase.rpc('set_primary_image', {
    p_product: productId,
    p_image_id: imageId,
  });
  if (error) {
    console.error('Failed to set primary product image', error);
    throw new Error(error.message || 'Failed to update primary photo');
  }
}

export async function fetchPrimaryImageMap(productIds) {
  const ids = Array.from(new Set((productIds || []).filter(Boolean)));
  if (!ids.length) {
    return {};
  }
  const { data, error } = await supabase
    .from('product_images')
    .select('product_id,id,storage_path,is_primary')
    .in('product_id', ids)
    .order('is_primary', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(error.message || 'Failed to load listing previews');
  }

  const mapping = {};
  for (const row of data || []) {
    if (mapping[row.product_id]) {
      continue;
    }
    const { data: signed } = await supabase.storage
      .from(LISTING_BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL, {
        transform: {
          width: 480,
          height: 360,
          resize: 'contain',
          quality: 80,
          background: 'rgba(0,0,0,0)',
        },
      });
    if (signed?.signedUrl) {
      mapping[row.product_id] = signed.signedUrl;
    }
  }
  return mapping;
}
