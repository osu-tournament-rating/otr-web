'use client';
import { loginIntoWebsite } from '@/app/actions';
import { useUser } from '@/util/hooks';

export default function LoginButton() {
  const user = useUser();

  if (!user?.osuId)
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          return loginIntoWebsite();
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
    );
}
