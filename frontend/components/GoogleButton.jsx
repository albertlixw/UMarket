import { useAuth } from '../context/AuthContext';

export default function GoogleButton({ label = 'Continue with Google' }) {
  const { signInWithGoogle } = useAuth();

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error('Google sign-in failed', error);
        }
      }}
    >
      {label}
    </button>
  );
}
