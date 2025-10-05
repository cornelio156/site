import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const parseHashQuery = (): URLSearchParams => {
  // Works with HashRouter: e.g. #/video/123?payment_success=true
  const hash = window.location.hash || '';
  const idx = hash.indexOf('?');
  if (idx >= 0) {
    return new URLSearchParams(hash.substring(idx + 1));
  }
  // Also consider normal search in case of direct route
  return new URLSearchParams(window.location.search);
};

const stripHashQuery = () => {
  const hash = window.location.hash || '';
  const idx = hash.indexOf('?');
  if (idx >= 0) {
    const base = hash.substring(0, idx);
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}${base}`);
  }
};

const PaymentSuccessToast: FC = () => {
  const [open, setOpen] = useState(false);

  const isSuccess = useMemo(() => {
    const params = parseHashQuery();
    return params.get('payment_success') === 'true';
  }, []);

  useEffect(() => {
    if (isSuccess) {
      setOpen(true);
      // Clean URL so it doesn't show again on refresh
      stripHashQuery();
    }
  }, [isSuccess]);

  if (!isSuccess) return null;

  return (
    <Snackbar open={open} autoHideDuration={6000} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert onClose={() => setOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
        Payment successful. Click "Get Content" on the video card to access your product link.
      </Alert>
    </Snackbar>
  );
};

export default PaymentSuccessToast;


