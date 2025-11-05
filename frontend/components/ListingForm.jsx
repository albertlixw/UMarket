import { useEffect, useState } from 'react';

const CATEGORY_OPTIONS = [
  { value: 'decor', label: 'Decor' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'school-supplies', label: 'School Supplies' },
  { value: 'tickets', label: 'Tickets' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const DEFAULT_VALUES = {
  name: '',
  price: '',
  quantity: '1',
  sold: false,
  category: '',
};

export default function ListingForm({
  initialValues,
  onSubmit,
  submitting = false,
  error,
  allowSoldToggle = false,
  submitLabel = 'Save listing',
  children = null,
}) {
  const [values, setValues] = useState(() => ({
    ...DEFAULT_VALUES,
    ...normalizeInitial(initialValues),
  }));
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    setValues({
      ...DEFAULT_VALUES,
      ...normalizeInitial(initialValues),
    });
  }, [initialValues]);

  function handleChange(field, value) {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError(null);

    const trimmedName = values.name.trim();
    const parsedPrice = parseFloat(values.price);
    const parsedQuantity = parseInt(values.quantity, 10);
    const selectedCategory = values.category;

    if (!trimmedName) {
      setLocalError('Name is required');
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setLocalError('Enter a price greater than 0');
      return;
    }
    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      setLocalError('Enter a quantity of 0 or greater');
      return;
    }
    if (!selectedCategory) {
      setLocalError('Select a category');
      return;
    }

    const payload = {
      name: trimmedName,
      price: parsedPrice,
      quantity: parsedQuantity,
      category: selectedCategory,
    };

    if (allowSoldToggle) {
      payload.sold = Boolean(values.sold);
    }

    await onSubmit(payload);
  }

  return (
    <form className="listing-form" onSubmit={handleSubmit}>
      <div className="listing-form__grid">
        <div className="listing-form__field">
          <label htmlFor="name">Listing title</label>
          <input
            id="name"
            type="text"
            value={values.name}
            onChange={(event) => handleChange('name', event.target.value)}
            placeholder="Vintage desk lamp"
            required
          />
        </div>
        <div className="listing-form__field">
          <label htmlFor="price">Price (USD)</label>
          <input
            id="price"
            type="number"
            value={values.price}
            onChange={(event) => handleChange('price', event.target.value)}
            required
            step="0.01"
            min="0"
            placeholder="25.00"
          />
        </div>
        <div className="listing-form__field">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            value={values.quantity}
            onChange={(event) => handleChange('quantity', event.target.value)}
            required
            min="0"
            step="1"
            placeholder="1"
          />
        </div>
        {/* <div className="listing-form__field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={values.category}
            onChange={(event) => handleChange('category', event.target.value)}
            required
          >
            <option value="">Select a category</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div> */}
        {allowSoldToggle && (
          <div className="listing-form__field listing-form__field--checkbox">
            <label htmlFor="sold">
              <input
                id="sold"
                type="checkbox"
                checked={Boolean(values.sold)}
                onChange={(event) => handleChange('sold', event.target.checked)}
              />
              Mark as sold
            </label>
          </div>
        )}
      </div>
      {children && <div className="listing-form__section">{children}</div>}
      {(localError || error) && <p className="listing-form__error">{localError || error}</p>}
      <div className="listing-form__footer">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function normalizeInitial(initialValues) {
  if (!initialValues) return {};
  const normalized = { ...initialValues };
  if (normalized.price !== undefined && normalized.price !== null) {
    normalized.price = normalized.price.toString();
  }
  if (normalized.quantity !== undefined && normalized.quantity !== null) {
    normalized.quantity = normalized.quantity.toString();
  }
  if (normalized.category !== undefined && normalized.category !== null) {
    normalized.category = normalized.category.toString();
  }
  return normalized;
}
