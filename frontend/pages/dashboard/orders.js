import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/apiClient';
import { PAYMENT_METHOD_LABELS } from '../../constants/categories';
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS } from '../../constants/reports';
import { supabase } from '../../utils/supabaseClient';


const REPORT_EVIDENCE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_REPORT_BUCKET || 'report-evidence';
const MAX_REPORT_EVIDENCE = 5;
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
    <section className="dashboard-listings" style={{ marginBottom: '2rem' }}>
      <h2>{title}</h2>

      {orders.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <ul className="dashboard-listings__grid">
          {orders.map((order) => {
            const product = order.product || {};

            // Ensure we never render placeholder/seed values that aren't real names
            const rawName = typeof product.name === 'string' ? product.name.trim() : '';
            const itemTitle = rawName || 'Untitled item';

            const price =
              typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : 'Not set';

            const paymentLabel = order.payment_method
              ? PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method
              : 'Not provided';

            const statusKey = order.status || deriveStatus(order);
            const isClosed = statusKey === 'complete';
            const statusLabel = isClosed ? 'Closed' : 'Pending';

            const buyerConfirmed = formatDate(order.buyer_confirmed_at) || '-';
            const sellerConfirmed = formatDate(order.seller_confirmed_at) || '-';
            const orderedRaw =
              order.created_at ||
              order.buyer_confirmed_at ||
              order.seller_confirmed_at ||
              product.created_at;
            const createdAt = formatDate(orderedRaw) || '-';

            const isBuyer = role === 'buyer';
            const hasConfirmed = isBuyer ? !!order.buyer_confirmed : !!order.seller_confirmed;
            const confirmLabel = isBuyer ? 'Confirm I received the item' : 'Confirm I was paid';
            const isConfirming = Boolean(confirmingMap?.[order.id]);

            return (
              <li key={order.id} className="dashboard-listings__card">
                {/* HEADER: item name + status */}
                <div className="dashboard-listings__card-header">
                  <h3>{itemTitle}</h3>
                  <span
                    className={`dashboard-listings__badge ${
                      isClosed
                        ? 'dashboard-listings__badge--closed'
                        : 'dashboard-listings__badge--pending'
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* PRICE */}
                <p className="dashboard-listings__price">{price}</p>

                {/* META INFO */}
                <ul className="dashboard-listings__meta">
                  <li>
                    Item: <strong>{itemTitle}</strong>
                  </li>
                  <li>
                    Payment: <strong>{paymentLabel}</strong>
                  </li>
                  <li>
                    Ordered: <strong>{createdAt}</strong>
                  </li>
                  <li>
                    Buyer confirmed: <strong>{buyerConfirmed}</strong>
                  </li>
                  <li>
                    Seller confirmed: <strong>{sellerConfirmed}</strong>
                  </li>
                </ul>

                {/* ACTIONS */}
                <div className="dashboard-listings__card-actions">
                  <Link
                    href={`/items/${order.listing_id}`}
                    className="dashboard-listings__link"
                  >
                    View listing
                  </Link>

                  <button
                    className="dashboard-listings__link dashboard-listings__link--muted"
                    disabled={isConfirming || hasConfirmed}
                    onClick={() => onConfirm(order.id)}
                    type="button"
                  >
                    {hasConfirmed ? 'Confirmed' : isConfirming ? 'Saving…' : confirmLabel}
                  </button>

                  <button
                    type="button"
                    className="dashboard-listings__link dashboard-listings__link--muted"
                    style={{ color: '#b00020' }}
                    onClick={() => onReport(order, role)}
                  >
                    Report {isBuyer ? 'seller' : 'buyer'}
                  </button>
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
  const [reportEvidenceFiles, setReportEvidenceFiles] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
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

  const deleteEvidenceUploads = useCallback(async (files) => {
    if (!files || files.length === 0) {
      return;
    }
    try {
      await supabase.storage
        .from(REPORT_EVIDENCE_BUCKET)
        .remove(files.map((file) => file.path));
    } catch (err) {
      console.error('Failed to delete evidence uploads', err);
    }
  }, []);

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

  const resetReportForm = useCallback(
    (options = { keepUploads: false }) => {
      if (!options.keepUploads && reportEvidenceFiles.length) {
        deleteEvidenceUploads(reportEvidenceFiles);
      }
      setReportTarget(null);
      setReportCategory('SCAM');
      setReportDescription('');
      setReportEvidenceFiles([]);
      setUploadingEvidence(false);
      setReportSubmitting(false);
      setReportError(null);
    },
    [deleteEvidenceUploads, reportEvidenceFiles]
  );

  const handleReportSelect = useCallback(
    (order, role) => {
      setReportMessage(null);
      setReportError(null);
      if (reportEvidenceFiles.length) {
        deleteEvidenceUploads(reportEvidenceFiles);
        setReportEvidenceFiles([]);
      }
      setReportTarget({ order, role });
      setReportCategory('SCAM');
      setReportDescription('');
    },
    [deleteEvidenceUploads, reportEvidenceFiles]
  );

  const handleEvidenceUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (!files.length) return;
      if (!user) {
        setReportError('You must be signed in to upload evidence.');
        return;
      }
      const remaining = MAX_REPORT_EVIDENCE - reportEvidenceFiles.length;
      if (remaining <= 0) {
        setReportError(`You can upload up to ${MAX_REPORT_EVIDENCE} photos.`);
        return;
      }
      const queue = files.slice(0, remaining);
      setUploadingEvidence(true);
      setReportError(null);
      try {
        for (const file of queue) {
          if (!file.type.toLowerCase().startsWith('image/')) {
            setReportError('Evidence must be image files.');
            continue;
          }
          const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'evidence.jpg';
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from(REPORT_EVIDENCE_BUCKET)
            .upload(path, file, { upsert: false });
          if (uploadError) {
            throw uploadError;
          }
          const { data: publicData, error: publicError } = supabase.storage
            .from(REPORT_EVIDENCE_BUCKET)
            .getPublicUrl(path);
          if (publicError || !publicData?.publicUrl) {
            throw publicError || new Error('Unable to fetch evidence URL');
          }
          setReportEvidenceFiles((prev) => [
            ...prev,
            { name: file.name, url: publicData.publicUrl, path },
          ]);
        }
      } catch (err) {
        setReportError(err.message || 'Failed to upload evidence.');
      } finally {
        setUploadingEvidence(false);
      }
    },
    [reportEvidenceFiles.length, user]
  );

  const handleEvidenceRemove = useCallback(async (path) => {
    try {
      await supabase.storage.from(REPORT_EVIDENCE_BUCKET).remove([path]);
    } catch (err) {
      console.error('Failed to delete evidence photo', err);
      setReportError('Unable to remove one of the photos. Try again.');
    } finally {
      setReportEvidenceFiles((prev) => prev.filter((file) => file.path !== path));
    }
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
    const evidenceList = reportEvidenceFiles.map((file) => file.url);
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
      resetReportForm({ keepUploads: true });
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportSubmitting(false);
    }
  }, [
    reportTarget,
    accessToken,
    reportDescription,
    reportEvidenceFiles,
    reportCategory,
    resetReportForm,
  ]);

  const evidenceRemaining = MAX_REPORT_EVIDENCE - reportEvidenceFiles.length;

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
                <div>
                  <label style={{ display: 'block' }}>
                    Evidence photos (optional, up to {MAX_REPORT_EVIDENCE})
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEvidenceUpload}
                      disabled={uploadingEvidence || evidenceRemaining <= 0}
                      style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                    />
                  </label>
                  <small style={{ display: 'block', marginTop: '0.25rem' }}>
                    {evidenceRemaining > 0
                      ? `${evidenceRemaining} photo${evidenceRemaining === 1 ? '' : 's'} remaining`
                      : 'Maximum uploads reached'}
                  </small>
                  {uploadingEvidence && <p>Uploading evidence…</p>}
                  {reportEvidenceFiles.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
                      {reportEvidenceFiles.map((file) => (
                        <li
                          key={file.path}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <img
                            src={file.url}
                            alt={file.name}
                            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '0.4rem' }}
                          />
                          <span style={{ flex: 1, fontSize: '0.9rem' }}>{file.name}</span>
                          <button type="button" onClick={() => handleEvidenceRemove(file.path)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
                    onClick={() => resetReportForm()}
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
