import { useLocation, useNavigate } from 'react-router';

export default function BackLink({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <button
        type="button"
        className="cursor-pointer text-primary hover:text-primary-dark"
        onClick={() => (location.key === 'default' ? navigate(fallback) : navigate(-1))}
      >
        ‹ zpět
      </button>
      <hr className="my-3 border-gray-300" />
    </>
  );
}
