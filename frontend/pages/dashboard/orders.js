import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/apiClient';
import { PAYMENT_METHOD_LABELS } from '../../constants/categories';
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS } from '../../constants/reports';

const STATUS_TEXT = {
  pending_meetup: 'Waiting for the meetup to happen',
  buyer_confirmed: 'Buyer confirmed receiving the item – waiting on seller',
  seller_confirmed: 'Seller confirmed receiving payment – waiting on buyer',
  complete: 'Both confirmed – transaction closed',
};

function deriveStatus(order) {
  if (order.buyer_confirmed && order.seller_confirmed) {
    return 'complete';
  }
  if (order.buyer_confirmed) {
    return 'buyer_confirmed';
  }
  if (order.seller_confirmed) {
    return 'seller_confirmed';
  }
  return 'pending_meetup';
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function OrderList({ title, orders, emptyMessage, role, onConfirm, confirmingMap, onReport }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2>{title}</h2>
      {orders.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <ul>
          {orders.map((order) => {
            const product = order.product;
            const paymentLabel = order.payment_method
              ? PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method
              : 'Not provided';
            const statusKey = order.status || deriveStatus(order);
            const statusText = STATUS_TEXT[statusKey] || STATUS_TEXT.pending_meetup;
            const buyerConfirmedAt = formatDate(order.buyer_confirmed_at);
            const sellerConfirmedAt = formatDate(order.seller_confirmed_at);
            const isBuyerList = role === 'buyer';
            const awaitingConfirmation = isBuyerList ? !order.buyer_confirmed : !order.seller_confirmed;
            const confirmLabel = isBuyerList ? 'Confirm I received the item' : 'Confirm I was paid';
            const isConfirming = Boolean(confirmingMap?.[order.id]);
            return (
              <li key={order.id} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <strong>{product?.name || `Listing #${order.listing_id}`}</strong>
                  {typeof product?.price === 'number' && (
                    <span>Price: ${product.price.toFixed(2)}</span>
                  )}
                  <span>Payment method: {paymentLabel}</span>
                  {order.created_at && (
                    <span>Created: {new Date(order.created_at).toLocaleString()}</span>
                  )}
                  <span>
                    <strong>Status:</strong> {statusText}
                  </span>
                  {buyerConfirmedAt && (
                    <span>Buyer confirmed receipt on {buyerConfirmedAt}</span>
                  )}
                  {sellerConfirmedAt && (
                    <span>Seller confirmed payment on {sellerConfirmedAt}</span>
                  )}
                  {awaitingConfirmation && onConfirm && (
                    <button
                      type="button"
                      onClick={() => onConfirm(order.id)}
                      disabled={isConfirming}
                      style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                    >
                      {isConfirming ? 'Confirming…' : confirmLabel}
                    </button>
                  )}
                  {onReport && (
                    <button
                      type="button"
                      onClick={() => onReport(order, role)}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: '0.25rem',
                        color: '#b00020',
                      }}
                    >
                      Report {isBuyerList ? 'seller' : 'buyer'}
                    </button>
                  )}
                  <Link href={`/items/${order.listing_id}`}>View listing</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function DashboardOrders() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirming, setConfirming] = useState({});
  const [filedReports, setFiledReports] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportCategory, setReportCategory] = useState('SCAM');
  const [reportDescription, setReportDescription] = useState('');
  const [reportEvidence, setReportEvidence] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMessage, setReportMessage] = useState(null);
  const [reportError, setReportError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !accessToken) return;

    async function fetchOrders() {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const [buyer, seller, reports] = await Promise.all([
          apiFetch('/orders?role=buyer', { accessToken }),
          apiFetch('/orders?role=seller', { accessToken }),
          apiFetch('/reports', { accessToken }),
        ]);
        setBuyerOrders(buyer || []);
        setSellerOrders(seller || []);
        setFiledReports(reports?.filed || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user, accessToken]);

  const handleConfirm = useCallback(
    async (orderId, role) => {
      if (!accessToken) return;
      setError(null);
      setSuccess(null);
      setConfirming((prev) => ({ ...prev, [orderId]: true }));
      const endpoint =
        role === 'buyer'
          ? `/orders/${orderId}/confirm-item`
          : `/orders/${orderId}/confirm-payment`;
      try {
        const updated = await apiFetch(endpoint, {
          method: 'POST',
          body: {},
          accessToken,
        });
        setBuyerOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
        setSellerOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
        setSuccess(
          role === 'buyer'
            ? 'Thanks! We saved that you received the item.'
            : 'Thanks! We saved that you received payment.'
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setConfirming((prev) => ({ ...prev, [orderId]: false }));
      }
    },
    [accessToken]
  );

  const resetReportForm = useCallback(() => {
    setReportTarget(null);
    setReportCategory('SCAM');
    setReportDescription('');
    setReportEvidence('');
    setReportSubmitting(false);
    setReportError(null);
  }, []);

  const handleReportSelect = useCallback((order, role) => {
    setReportMessage(null);
    setReportError(null);
    setReportTarget({ order, role });
    setReportCategory('SCAM');
    setReportDescription('');
    setReportEvidence('');
  }, []);

  const handleReportSubmit = useCallback(async () => {
    if (!reportTarget || !accessToken) {
      return;
    }
    const descriptionText = reportDescription.trim();
    if (descriptionText.length < 10) {
      setReportError('Please describe what happened (at least 10 characters).');
      return;
    }
    const evidenceList = reportEvidence
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
    const { order, role } = reportTarget;
    const reportedUserId =
      role === 'buyer'
        ? order.seller_id || order.product?.seller_id
        : order.buyer_id;
    if (!reportedUserId) {
      setReportError('Unable to determine which user to report.');
      return;
    }
    setReportSubmitting(true);
    setReportError(null);
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: {
          reported_user_id: reportedUserId,
          transaction_id: order.id,
          category: reportCategory,
          description: descriptionText,
          evidence_urls: evidenceList,
        },
        accessToken,
      });
      setReportMessage('Thanks. We recorded your report for review.');
      resetReportForm();
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportSubmitting(false);
    }
  }, [
    reportTarget,
    accessToken,
    reportDescription,
    reportEvidence,
    reportCategory,
    resetReportForm,
  ]);

  if (authLoading) {
    return (
      <Layout>
        <p>Loading orders…</p>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <h1>Transactions</h1>
      <p style={{ marginBottom: '1rem' }}>
        Payments are handled offline when you meet up. After the exchange, each side should confirm
        what happened so there’s a record if anything goes wrong.
      </p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      {reportMessage && <p style={{ color: 'green' }}>{reportMessage}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <OrderList
            title="Purchases I've made"
            orders={buyerOrders}
            emptyMessage="You haven’t purchased anything yet."
            role="buyer"
            onConfirm={(orderId) => handleConfirm(orderId, 'buyer')}
            confirmingMap={confirming}
            onReport={handleReportSelect}
          />
          <OrderList
            title="Purchases for my listings"
            orders={sellerOrders}
            emptyMessage="No one has purchased your listings yet."
            role="seller"
            onConfirm={(orderId) => handleConfirm(orderId, 'seller')}
            confirmingMap={confirming}
            onReport={handleReportSelect}
          />
          <section style={{ marginTop: '2rem' }}>
            <h2>Reports I filed</h2>
            <p style={{ marginBottom: '0.5rem' }}>
              Any report you submit from the order list will appear here for easy reference.
            </p>
            {filedReports.length === 0 ? (
              <p style={{ margin: 0 }}>No reports yet.</p>
            ) : (
              <ul>
                {filedReports.map((report) => (
                  <li key={report.id} style={{ marginBottom: '0.75rem' }}>
                    <strong>{REPORT_CATEGORY_LABELS[report.category] || report.category}</strong>
                    <div>Status: {REPORT_STATUS_LABELS[report.status] || report.status}</div>
                    <div style={{ fontSize: '0.9rem' }}>
                      Filed {new Date(report.created_at).toLocaleDateString()}
                    </div>
                    <p style={{ margin: '0.3rem 0 0' }}>{report.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {reportTarget && (
            <section style={{ marginTop: '2rem' }}>
              <h2>Report {reportTarget.role === 'buyer' ? 'seller' : 'buyer'}</h2>
              <p>
                You’re reporting the {reportTarget.role === 'buyer' ? 'seller' : 'buyer'} involved in{' '}
                <strong>{reportTarget.order.product?.name || reportTarget.order.listing_id}</strong>.
              </p>
              {reportError && <p style={{ color: 'red' }}>{reportError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 520 }}>
                <label>
                  Category
                  <select
                    value={reportCategory}
                    onChange={(event) => setReportCategory(event.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                  >
                    {REPORT_CATEGORIES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  What happened?
                  <textarea
                    value={reportDescription}
                    onChange={(event) => setReportDescription(event.target.value)}
                    rows={4}
                    style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                  />
                </label>
                <label>
                  Evidence URLs (optional, comma or newline separated)
                  <textarea
                    value={reportEvidence}
                    onChange={(event) => setReportEvidence(event.target.value)}
                    rows={3}
                    style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                  />
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="listing-summary__button listing-summary__button--primary"
                    onClick={handleReportSubmit}
                    disabled={reportSubmitting}
                  >
                    {reportSubmitting ? 'Sending…' : 'Submit report'}
                  </button>
                  <button
                    type="button"
                    className="listing-summary__button listing-summary__button--outline"
                    onClick={resetReportForm}
                    disabled={reportSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </Layout>
  );
}
