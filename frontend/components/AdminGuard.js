import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import Unauthorized from './Unauthorized';

/**
 * Higher Order Component (HOC) untuk proteksi halaman admin
 * Akan menampilkan halaman Unauthorized jika bukan admin
 */
export default function AdminGuard(WrappedComponent) {
  return function ProtectedComponent(props) {
    const { userData } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      // Check jika user bukan admin
      if (userData) {
        setIsAuthorized(userData.role === 'admin');
      }
      setIsChecking(false);
    }, [userData]);

    // Tampilkan loading sementara check role
    if (isChecking) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">Checking access...</p>
          </div>
        </div>
      );
    }

    // Tampilkan Unauthorized jika bukan admin
    if (!isAuthorized) {
      return <Unauthorized />;
    }

    // Render komponen jika user adalah admin
    return <WrappedComponent {...props} />;
  };
}

