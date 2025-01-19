'use client';

import { prepareLogin } from '@/app/actions/login';
import { useUser } from '@/util/hooks';

export default function LoginButton() {
  const { user } = useUser();

  return (
    <>
      {!user && (
        <button
          onClick={(e) => {
            e.preventDefault();
            return prepareLogin();
          }}
          style={{
            padding: '1.2rem 5rem',
            backgroundColor: 'hsla(var(--blue-500))',
            border: '0',
            borderRadius: 'var(--main-borderRadius)',
            fontSize: '1.2rem',
            fontWeight: 500,
            color: '#fff',
            width: 'fit-content',
            cursor: 'pointer',
          }}
        >
          Login
        </button>
      )}
    </>
  );
}
