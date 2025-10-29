import { useEffect, useMemo, useState } from 'react';
import {
  deleteProductImage,
  fetchProductImages,
  setPrimaryProductImage,
  uploadProductImages,
} from '../utils/listingImages';

export default function ListingPhotoEditor({ productId, userId, maxPhotos = 5 }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const remaining = Math.max(0, maxPhotos - photos.length);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const items = await fetchProductImages(productId);
        if (!cancelled) {
          setPhotos(items);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const sortedPhotos = useMemo(
    () =>
      [...photos].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.position ?? 0) - (b.position ?? 0);
      }),
    [photos],
  );

  async function handleSelect(event) {
    if (!productId || !userId) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    event.target.value = '';
    const allowed = files.slice(0, remaining);
    if (!allowed.length) return;
    setUploading(true);
    setError(null);
    setActionMessage(null);
    try {
      await uploadProductImages(productId, allowed, userId);
      const updated = await fetchProductImages(productId);
      setPhotos(updated);
      setActionMessage(
        allowed.length === 1 ? 'Photo uploaded.' : `${allowed.length} photos uploaded.`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(image) {
    if (!productId || !image) return;
    const confirmed = window.confirm('Delete this photo?');
    if (!confirmed) return;
    setActionMessage(null);
    setError(null);
    try {
      await deleteProductImage(productId, image.id, image.storage_path);
      const updated = await fetchProductImages(productId);
      setPhotos(updated);
      setActionMessage('Photo removed.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetPrimary(image) {
    if (!productId || !image) return;
    setActionMessage(null);
    setError(null);
    try {
      await setPrimaryProductImage(productId, image.id);
      const updated = await fetchProductImages(productId);
      setPhotos(updated);
      setActionMessage('Cover photo updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="listing-photos listing-photos--editor">
      <header className="listing-photos__header">
        <div>
          <h2>Listing photos</h2>
          <p>Highlight your item with up to {maxPhotos} photos. Set a cover to control the preview.</p>
        </div>
        <label className="listing-photos__upload">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleSelect}
            disabled={remaining === 0 || uploading}
          />
          {uploading ? 'Uploading…' : remaining === 0 ? 'Limit reached' : 'Add photos'}
        </label>
      </header>
      {loading ? (
        <div className="listing-photos__empty">
          <p>Loading photos…</p>
        </div>
      ) : sortedPhotos.length === 0 ? (
        <div className="listing-photos__empty">
          <p>No photos yet.</p>
          <p>Upload your first photo to bring this listing to life.</p>
        </div>
      ) : (
        <ul className="listing-photos__grid">
          {sortedPhotos.map((photo, index) => (
            <li
              key={photo.id}
              className={`listing-photos__item${photo.is_primary ? ' listing-photos__item--cover' : ''}`}
            >
              <span className="listing-photos__label">
                {photo.is_primary ? 'Cover photo' : `Photo ${index + 1}`}
              </span>
              <div className="listing-photos__image">
                {photo.url ? (
                  <img src={photo.url} alt={`Listing photo ${index + 1}`} />
                ) : (
                  <div className="listing-photos__placeholder" />
                )}
              </div>
              <div className="listing-photos__actions listing-photos__actions--editor">
                {!photo.is_primary && (
                  <button type="button" onClick={() => handleSetPrimary(photo)}>
                    Set as cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(photo)}
                  className="listing-photos__danger"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <footer className="listing-photos__footer">
        {error && <span className="listing-photos__error">{error}</span>}
        {actionMessage && <span className="listing-photos__status">{actionMessage}</span>}
        <span>
          {sortedPhotos.length}/{maxPhotos} photos in gallery
        </span>
      </footer>
    </section>
  );
}
