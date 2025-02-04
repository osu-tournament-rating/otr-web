'use client';

import { createContext, ReactNode, useContext, useState } from 'react';
import { useUser } from '@/util/hooks';
import { isAdmin } from '@/lib/api';

type AdminViewContextProps = {
  /** If the admin interface should be used */
  readonly isAdminView: boolean;

  /** Enable or disable the admin view */
  setIsAdminView: (isAdminView: boolean) => void;
};

const AdminViewContext = createContext<AdminViewContextProps>({
  isAdminView: false,
  setIsAdminView: (_) => {},
});

export default function AdminViewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useUser();
  const [isAdminView, setIsAdminViewState] = useState(isAdmin(user?.scopes));

  const setIsAdminView = (isAdminView: boolean) =>
    setIsAdminViewState(isAdminView);

  const props: AdminViewContextProps = { isAdminView, setIsAdminView };

  return (
    <AdminViewContext.Provider value={props}>
      {children}
    </AdminViewContext.Provider>
  );
}

/** Hook for accessing the {@link AdminViewContext} */
export function useAdminViewContext() {
  return useContext(AdminViewContext);
}
