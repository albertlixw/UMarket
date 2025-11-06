import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ListingForm from '../../components/ListingForm';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/apiClient';
import ListingPhotoPicker from '../../components/ListingPhotoPicker';
import { uploadProductImages } from '../../utils/listingImages';

// form for creating new item listing. the user has to be logged in to access this page.

export default function NewListing() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [photoQueue, setPhotoQueue] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  async function handleCreate(payload) {
    if (!accessToken) {
      setError('You must be logged in to create a listing');
      return;
    }
    setSubmitting(true);
    setError(null);
    setPhotoError(null);
    try {
      const created = await apiFetch('/listings', {
        method: 'POST',
        body: payload,
        accessToken,
      });
      if (created?.id && photoQueue.length > 0) {
        setUploadingPhotos(true);
        try {
          const files = photoQueue.map((item) => item.file);
          await uploadProductImages(created.id, files, user.id);
        } catch (uploadErr) {
          console.error('Listing photo upload failed', uploadErr);
          setPhotoError(uploadErr.message);
          setError(uploadErr.message || 'Listing saved, but we could not upload your photos. You can edit the listing to try again.');
          router.replace(`/items/${created.id}/edit`);
          return;
        } finally {
          setUploadingPhotos(false);
        }
      }
      router.replace('/dashboard/listings');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <Layout>
        <p>Checking authentication…</p>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Create a listing</h1>
        <p>Share high-quality photos and details so buyers know exactly what to expect.</p>
      </div>
      <ListingForm
        onSubmit={handleCreate}
        submitting={submitting || uploadingPhotos}
        error={error || photoError}
        submitLabel={uploadingPhotos ? 'Uploading photos…' : 'Create listing'}
      >
        <ListingPhotoPicker files={photoQueue} onChange={setPhotoQueue} maxPhotos={5} />
      </ListingForm>
    </Layout>
  );
}
