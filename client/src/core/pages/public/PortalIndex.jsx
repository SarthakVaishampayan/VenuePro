import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PortalIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a player token
    const playerToken = localStorage.getItem('playerAccessToken');
    if (playerToken) {
      navigate('/play/dashboard', { replace: true });
    } else {
      navigate('/portal', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
