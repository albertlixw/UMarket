const CATEGORY_OPTIONS = [
  { value: 'decor', label: 'Decor' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'school-supplies', label: 'School Supplies' },
  { value: 'tickets', label: 'Tickets' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const CATEGORY_LABELS = CATEGORY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const COLOR_OPTIONS = [
  { value: 'RED', label: 'Red' },
  { value: 'ORANGE', label: 'Orange' },
  { value: 'YELLOW', label: 'Yellow' },
  { value: 'GREEN', label: 'Green' },
  { value: 'BLUE', label: 'Blue' },
  { value: 'PURPLE', label: 'Purple' },
  { value: 'PINK', label: 'Pink' },
  { value: 'BLACK', label: 'Black' },
  { value: 'WHITE', label: 'White' },
  { value: 'BROWN', label: 'Brown' },
  { value: 'GREY', label: 'Grey' },
  { value: 'OTHER', label: 'Other' },
];

const CLOTHING_GENDER_OPTIONS = [
  { value: 'MENS', label: "Men's" },
  { value: 'WOMENS', label: "Women's" },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'KIDS', label: 'Kids' },
];

const CLOTHING_SIZE_OPTIONS = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
  { value: 'PLUS', label: 'Plus' },
  { value: 'US_5', label: 'US 5' },
  { value: 'US_5.5', label: 'US 5.5' },
  { value: 'US_6', label: 'US 6' },
  { value: 'US_6.5', label: 'US 6.5' },
  { value: 'US_7', label: 'US 7' },
  { value: 'US_7.5', label: 'US 7.5' },
  { value: 'US_8', label: 'US 8' },
  { value: 'US_8.5', label: 'US 8.5' },
  { value: 'US_9', label: 'US 9' },
  { value: 'US_9.5', label: 'US 9.5' },
  { value: 'US_10', label: 'US 10' },
  { value: 'US_10.5', label: 'US 10.5' },
  { value: 'US_11', label: 'US 11' },
  { value: 'US_11.5', label: 'US 11.5' },
  { value: 'US_12', label: 'US 12' },
  { value: 'US_12.5', label: 'US 12.5' },
  { value: 'OTHER', label: 'Other' },
];

const CLOTHING_TYPE_OPTIONS = [
  { value: 'SHIRTS', label: 'Shirts' },
  { value: 'BOTTOMS', label: 'Bottoms' },
  { value: 'SWEATERS', label: 'Sweaters' },
  { value: 'TOPS', label: 'Tops' },
  { value: 'SHOES', label: 'Shoes' },
  { value: 'FORMALS', label: 'Formals' },
  { value: 'ACCESSORY', label: 'Accessory' },
  { value: 'OTHER', label: 'Other' },
];

const DECOR_TYPE_OPTIONS = [
  { value: 'LIGHTS', label: 'Lights' },
  { value: 'RUGS', label: 'Rugs' },
  { value: 'DISPLAY_ITEMS', label: 'Display items' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'ORGANIZERS', label: 'Organizers' },
  { value: 'LAMPS', label: 'Lamps' },
  { value: 'OTHER', label: 'Other' },
];

const TICKET_TYPE_OPTIONS = [
  { value: 'SPORT', label: 'Sport' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'MOVIES', label: 'Movies' },
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'OTHER', label: 'Other' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'STRIPE', label: 'Stripe (Card, Apple Pay, etc.)' },
];

const toLabelMap = (options) =>
  options.reduce((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

const COLOR_LABELS = toLabelMap(COLOR_OPTIONS);
const CLOTHING_GENDER_LABELS = toLabelMap(CLOTHING_GENDER_OPTIONS);
const CLOTHING_SIZE_LABELS = toLabelMap(CLOTHING_SIZE_OPTIONS);
const CLOTHING_TYPE_LABELS = toLabelMap(CLOTHING_TYPE_OPTIONS);
const DECOR_TYPE_LABELS = toLabelMap(DECOR_TYPE_OPTIONS);
const TICKET_TYPE_LABELS = toLabelMap(TICKET_TYPE_OPTIONS);
const PAYMENT_METHOD_LABELS = toLabelMap(PAYMENT_METHOD_OPTIONS);

export {
  CATEGORY_OPTIONS,
  CATEGORY_LABELS,
  COLOR_OPTIONS,
  COLOR_LABELS,
  CLOTHING_GENDER_OPTIONS,
  CLOTHING_GENDER_LABELS,
  CLOTHING_SIZE_OPTIONS,
  CLOTHING_SIZE_LABELS,
  CLOTHING_TYPE_OPTIONS,
  CLOTHING_TYPE_LABELS,
  DECOR_TYPE_OPTIONS,
  DECOR_TYPE_LABELS,
  TICKET_TYPE_OPTIONS,
  TICKET_TYPE_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_LABELS,
};

export default CATEGORY_OPTIONS;
