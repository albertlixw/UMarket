import { useEffect, useState } from 'react';
import {
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
  CLOTHING_GENDER_OPTIONS,
  CLOTHING_SIZE_OPTIONS,
  CLOTHING_TYPE_OPTIONS,
  DECOR_TYPE_OPTIONS,
  TICKET_TYPE_OPTIONS,
} from '../constants/categories';

const CATEGORY_FIELD_DEFAULTS = {
  clothingGender: '',
  clothingSize: '',
  clothingType: '',
  clothingColor: '',
  clothingUsed: false,
  decorType: '',
  decorColor: '',
  decorUsed: false,
  decorLength: '',
  decorWidth: '',
  decorHeight: '',
  ticketType: '',
};

const DEFAULT_VALUES = {
  name: '',
  description: '',
  price: '',
  quantity: '1',
  sold: false,
  category: '',
  ...CATEGORY_FIELD_DEFAULTS,
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
    if (field === 'category') {
      setValues((prev) => ({
        ...prev,
        ...CATEGORY_FIELD_DEFAULTS,
        category: value,
      }));
      return;
    }
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError(null);

    const trimmedName = values.name.trim();
    const trimmedDescription = typeof values.description === 'string' ? values.description.trim() : '';
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
      description: trimmedDescription,
      price: parsedPrice,
      quantity: parsedQuantity,
      category: selectedCategory,
    };

    if (allowSoldToggle) {
      payload.sold = Boolean(values.sold);
    }

    const categoryDetails = buildCategoryDetails(values, selectedCategory, setLocalError);
    if (categoryDetails === false) {
      return;
    }
    if (categoryDetails) {
      payload.details = categoryDetails;
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
        <div className="listing-form__field">
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
        </div>
        <div className="listing-form__field listing-form__field--textarea listing-form__field--full">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={values.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Share condition, dimensions, pickup details, or anything a buyer should know."
            rows={6}
            maxLength={1500}
          />
          <div className="listing-form__hint">
            {values.description.length}/1500 characters
          </div>
        </div>
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
      <CategorySpecificFields values={values} onChange={handleChange} />
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
  if (!initialValues) return { ...CATEGORY_FIELD_DEFAULTS };
  const normalized = {
    ...CATEGORY_FIELD_DEFAULTS,
    ...initialValues,
  };
  if (normalized.price !== undefined && normalized.price !== null) {
    normalized.price = normalized.price.toString();
  }
  if (normalized.quantity !== undefined && normalized.quantity !== null) {
    normalized.quantity = normalized.quantity.toString();
  }
  if (normalized.description === undefined || normalized.description === null) {
    normalized.description = '';
  } else {
    normalized.description = normalized.description.toString();
  }
  if (normalized.category !== undefined && normalized.category !== null) {
    normalized.category = normalized.category.toString();
  }
  Object.assign(normalized, CATEGORY_FIELD_DEFAULTS);
  if (normalized.details && typeof normalized.details === 'object') {
    const { details } = normalized;
    switch (details.category) {
      case 'clothing':
        normalized.clothingGender = details.gender || '';
        normalized.clothingSize = details.size || '';
        normalized.clothingType = details.type || '';
        normalized.clothingColor = details.color || '';
        normalized.clothingUsed = Boolean(details.used);
        break;
      case 'decor':
        normalized.decorType = details.type || '';
        normalized.decorColor = details.color || '';
        normalized.decorUsed = Boolean(details.used);
        normalized.decorLength =
          details.length === 0 || details.length ? String(details.length) : '';
        normalized.decorWidth =
          details.width === 0 || details.width ? String(details.width) : '';
        normalized.decorHeight =
          details.height === 0 || details.height ? String(details.height) : '';
        break;
      case 'tickets':
        normalized.ticketType = details.type || '';
        break;
      default:
        break;
    }
  }
  delete normalized.details;
  return normalized;
}

function buildCategoryDetails(values, category, setError) {
  if (category === 'clothing') {
    if (!values.clothingGender) {
      setError("Select the item's target gender");
      return false;
    }
    if (!values.clothingSize) {
      setError('Select a clothing size');
      return false;
    }
    if (!values.clothingType) {
      setError('Select a clothing type');
      return false;
    }
    if (!values.clothingColor) {
      setError('Select a color');
      return false;
    }
    return {
      category: 'clothing',
      gender: values.clothingGender,
      size: values.clothingSize,
      type: values.clothingType,
      color: values.clothingColor,
      used: Boolean(values.clothingUsed),
    };
  }
  if (category === 'decor') {
    if (!values.decorType) {
      setError('Select a decor type');
      return false;
    }
    if (!values.decorColor) {
      setError('Select a color');
      return false;
    }
    const details = {
      category: 'decor',
      type: values.decorType,
      color: values.decorColor,
      used: Boolean(values.decorUsed),
    };
    const dimensionFields = [
      { name: 'decorLength', key: 'length', label: 'Length' },
      { name: 'decorWidth', key: 'width', label: 'Width' },
      { name: 'decorHeight', key: 'height', label: 'Height' },
    ];
    for (const { name, key, label } of dimensionFields) {
      const raw = values[name];
      if (raw === '' || raw === null || raw === undefined) continue;
      const parsed = parseInt(raw, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError(`${label} must be a whole number greater than or equal to 0`);
        return false;
      }
      details[key] = parsed;
    }
    return details;
  }
  if (category === 'tickets') {
    if (!values.ticketType) {
      setError('Select a ticket type');
      return false;
    }
    return {
      category: 'tickets',
      type: values.ticketType,
    };
  }
  return null;
}

function CategorySpecificFields({ values, onChange }) {
  if (values.category === 'clothing') {
    return (
      <div className="listing-form__section">
        <h2>Clothing details</h2>
        <div className="listing-form__grid">
          <div className="listing-form__field">
            <label htmlFor="clothingGender">Gender</label>
            <select
              id="clothingGender"
              value={values.clothingGender}
              onChange={(event) => onChange('clothingGender', event.target.value)}
              required
            >
              <option value="">Select gender</option>
              {CLOTHING_GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="listing-form__field">
            <label htmlFor="clothingSize">Size</label>
            <select
              id="clothingSize"
              value={values.clothingSize}
              onChange={(event) => onChange('clothingSize', event.target.value)}
              required
            >
              <option value="">Select size</option>
              {CLOTHING_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="listing-form__field">
            <label htmlFor="clothingType">Type</label>
            <select
              id="clothingType"
              value={values.clothingType}
              onChange={(event) => onChange('clothingType', event.target.value)}
              required
            >
              <option value="">Select type</option>
              {CLOTHING_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="listing-form__field">
            <label htmlFor="clothingColor">Color</label>
            <select
              id="clothingColor"
              value={values.clothingColor}
              onChange={(event) => onChange('clothingColor', event.target.value)}
              required
            >
              <option value="">Select color</option>
              {COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="listing-form__field listing-form__field--checkbox">
            <label htmlFor="clothingUsed">
              <input
                id="clothingUsed"
                type="checkbox"
                checked={Boolean(values.clothingUsed)}
                onChange={(event) => onChange('clothingUsed', event.target.checked)}
              />
              Item is used
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (values.category === 'decor') {
    return (
      <div className="listing-form__section">
        <h2>Decor details</h2>
        <div className="listing-form__grid">
          <div className="listing-form__field">
            <label htmlFor="decorType">Type</label>
            <select
              id="decorType"
              value={values.decorType}
              onChange={(event) => onChange('decorType', event.target.value)}
              required
            >
              <option value="">Select type</option>
              {DECOR_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="listing-form__field">
            <label htmlFor="decorColor">Color</label>
            <select
              id="decorColor"
              value={values.decorColor}
              onChange={(event) => onChange('decorColor', event.target.value)}
              required
            >
              <option value="">Select color</option>
              {COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="listing-form__field listing-form__field--checkbox">
            <label htmlFor="decorUsed">
              <input
                id="decorUsed"
                type="checkbox"
                checked={Boolean(values.decorUsed)}
                onChange={(event) => onChange('decorUsed', event.target.checked)}
              />
              Item is used
            </label>
          </div>
          <div className="listing-form__field">
            <label htmlFor="decorLength">Length (inches)</label>
            <input
              id="decorLength"
              type="number"
              min="0"
              step="1"
              value={values.decorLength}
              onChange={(event) => onChange('decorLength', event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="listing-form__field">
            <label htmlFor="decorWidth">Width (inches)</label>
            <input
              id="decorWidth"
              type="number"
              min="0"
              step="1"
              value={values.decorWidth}
              onChange={(event) => onChange('decorWidth', event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="listing-form__field">
            <label htmlFor="decorHeight">Height (inches)</label>
            <input
              id="decorHeight"
              type="number"
              min="0"
              step="1"
              value={values.decorHeight}
              onChange={(event) => onChange('decorHeight', event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
      </div>
    );
  }

  if (values.category === 'tickets') {
    return (
      <div className="listing-form__section">
        <h2>Ticket details</h2>
        <div className="listing-form__grid">
          <div className="listing-form__field">
            <label htmlFor="ticketType">Type</label>
            <select
              id="ticketType"
              value={values.ticketType}
              onChange={(event) => onChange('ticketType', event.target.value)}
              required
            >
              <option value="">Select type</option>
              {TICKET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
