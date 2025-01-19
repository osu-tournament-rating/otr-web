'use client';

import { useAdminViewContext } from '@/components/Context/AdminViewContext';

export default function AdminViewToggle() {
  const { isAdminView, setIsAdminView } = useAdminViewContext();

  return (
    <div>
      <input
        type={'checkbox'}
        checked={isAdminView}
        onChange={() => setIsAdminView(!isAdminView)}
      />
      <span
        style={{ cursor: 'pointer' }}
        onClick={() => setIsAdminView(!isAdminView)}
      >
        Admin view
      </span>
    </div>
  );
}
