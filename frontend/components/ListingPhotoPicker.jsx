import { useEffect, useMemo, useRef } from 'react';

function createPreview(file) {
  return URL.createObjectURL(file);
}

export default function ListingPhotoPicker({
  files,
  onChange,
  maxPhotos = 5,
  title = 'Listing photos',
  description = 'Upload up to five high-quality photos. The first one becomes the cover.',
}) {
  const filesRef = useRef(files || []);

  useEffect(() => {
    filesRef.current = files || [];
  }, [files]);

  useEffect(() => {
    return () => {
      (filesRef.current || []).forEach((item) => {
        if (item?.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, []);

  const remaining = Math.max(0, maxPhotos - (files?.length || 0));

  function handleSelect(event) {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    const existing = Array.isArray(files) ? files : [];
    const available = Math.max(0, maxPhotos - existing.length);
    const limited = selected.slice(0, available);
    const mapped = limited.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      preview: createPreview(file),
    }));
    onChange([...existing, ...mapped]);
    event.target.value = '';
  }

  function handleRemove(id) {
    const existing = Array.isArray(files) ? files : [];
    const filtered = existing.filter((item) => item.id !== id);
    const removed = existing.find((item) => item.id === id);
    if (removed?.preview) {
      URL.revokeObjectURL(removed.preview);
    }
    onChange(filtered);
  }

  function move(id, direction) {
    const existing = Array.isArray(files) ? [...files] : [];
    const index = existing.findIndex((item) => item.id === id);
    if (index === -1) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= existing.length) return;
    const clone = [...existing];
    const [item] = clone.splice(index, 1);
    clone.splice(nextIndex, 0, item);
    onChange(clone);
  }

  const previewItems = useMemo(
    () =>
      (files || []).map((item, index) => ({
        ...item,
        position: index,
        isCover: index === 0,
      })),
    [files],
  );

  return (
    <section className="listing-photos">
      <header className="listing-photos__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <label className="listing-photos__upload">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleSelect}
            disabled={remaining === 0}
          />
          {remaining === maxPhotos ? 'Upload photos' : remaining === 0 ? 'Limit reached' : 'Add more'}
        </label>
      </header>
      {previewItems.length === 0 ? (
        <div className="listing-photos__empty">
          <p>No photos selected yet.</p>
          <p>Add up to {maxPhotos} photos to showcase your listing.</p>
        </div>
      ) : (
        <ul className="listing-photos__grid">
          {previewItems.map((item, index) => (
            <li
              key={item.id}
              className={`listing-photos__item${item.isCover ? ' listing-photos__item--cover' : ''}`}
            >
              <span className="listing-photos__label">
                {item.isCover ? 'Cover' : `Photo ${index + 1}`}
              </span>
              <div className="listing-photos__image">
                <img src={item.preview} alt={`Selected photo ${index + 1}`} />
              </div>
              <div className="listing-photos__actions">
                <button type="button" onClick={() => handleRemove(item.id)}>
                  Remove
                </button>
                <div className="listing-photos__reorder">
                  <button type="button" onClick={() => move(item.id, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(item.id, 1)}
                    disabled={index === previewItems.length - 1}
                  >
                    ↓
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <footer className="listing-photos__footer">
        <span>
          {previewItems.length}/{maxPhotos} photos selected
        </span>
      </footer>
    </section>
  );
}
