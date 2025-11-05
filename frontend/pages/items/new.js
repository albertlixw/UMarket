import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ListingForm from '../../components/ListingForm';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/apiClient';
import ListingPhotoPicker from '../../components/ListingPhotoPicker';
import { uploadProductImages } from '../../utils/listingImages';

// Define category-specific fields
const categoryFields = {
  Clothing: ['type', 'gender', 'size', 'color', 'used'],
  'School Supplies': ['type', 'used'],
  Tickets: ['type'],
  Decor: ['type', 'color', 'dimensions', 'used'],
  Miscellaneous: ['type'],
};

export default function NewListing() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [photoQueue, setPhotoQueue] = useState([]);
  const [photoError, setPhotoError] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [category, setCategory] = useState('');
  const [dynamicFields, setDynamicFields] = useState({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // Update dynamic fields whenever category changes
  useEffect(() => {
    if (category) {
      const fields = categoryFields[category] || [];
      const initialValues = {};
      fields.forEach((f) => (initialValues[f] = ''));
      setDynamicFields(initialValues);
      console.log(`New fields for ${category}:`, fields);
    } else {
      setDynamicFields({});
    }
  }, [category]);

  // Handle form submission
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
          setError(
            uploadErr.message ||
              'Listing saved, but we could not upload your photos. You can edit the listing to try again.'
          );
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

  if (!user) return null;

  return (
    <Layout>
      <div className="page-header">
        <h1>Create a listing</h1>
        <p>Share high-quality photos and details so buyers know exactly what to expect.</p>
      </div>

      <ListingForm
        onSubmit={(formData) =>
          handleCreate({ ...formData, ...dynamicFields, category })
        }
        submitting={submitting || uploadingPhotos}
        error={error || photoError}
        submitLabel={uploadingPhotos ? 'Uploading photos…' : 'Create listing'}
        hideCategoryField={true} // important: prevents internal ListingForm dropdown
      >
        {/* Only category dropdown at the top */}
        <div className="form-group">
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-control"
          >
            <option value="">Select category</option>
            {Object.keys(categoryFields).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            )
            )}
          </select>
        </div>

        {/* Render dynamic fields below */}
        {Object.keys(dynamicFields).map((field) => (
          <div key={field} className="form-group">
            <label>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input
              type="text"
              value={dynamicFields[field]}
              onChange={(e) =>
                setDynamicFields((prev) => ({ ...prev, [field]: e.target.value }))
              }
              className="form-control"
            />
          </div>
        ))}

        {/* Photo picker */}
        <ListingPhotoPicker files={photoQueue} onChange={setPhotoQueue} maxPhotos={5} />
      </ListingForm>
    </Layout>
  );
}
