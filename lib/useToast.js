import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, type = 'info', duration = 4000) => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, []);

  const ToastComponent = () => {
    if (!toast) return null;
    const bg = {
      success: '#E8F5E9', successText: '#2E7D32',
      error: '#FFEBEE', errorText: '#C62828',
      info: '#E3F2FD', infoText: '#1565C0'
    }[toast.type];
    return (
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        background: bg, color: bg ? {successText:'#2E7D32',errorText:'#C62828',infoText:'#1565C0'}[toast.type] : '#000',
        padding: '12px 20px', borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: 14, fontWeight: 600, maxWidth: 320, animation: 'slideIn 0.3s ease'
      }}>
        {toast.message}
      </div>
    );
  };

  return { show, ToastComponent };
}
