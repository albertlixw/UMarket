const REPORT_CATEGORIES = [
  { value: 'SCAM', label: 'Scam / fraud' },
  { value: 'PAYMENT_ISSUE', label: 'Payment issue' },
  { value: 'NO_SHOW', label: 'No-show at meetup' },
  { value: 'ITEM_NOT_AS_DESCRIBED', label: 'Item not as described' },
  { value: 'OTHER', label: 'Other' },
];

const REPORT_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

const toLabelMap = (options) =>
  options.reduce((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

const REPORT_CATEGORY_LABELS = toLabelMap(REPORT_CATEGORIES);
const REPORT_STATUS_LABELS = toLabelMap(REPORT_STATUSES);

export { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS };
