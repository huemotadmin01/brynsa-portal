import { useAuth } from '../context/AuthContext';
import AppGrid from '../components/platform/AppGrid';

function AppLauncherPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-3xl w-full">
        {/* Welcome — fade in + slide up */}
        <div className="text-center mb-10" style={{ animation: 'fadeSlideUp 0.5s ease-out both' }}>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {firstName}
          </h1>
          <p className="text-dark-400 text-lg">
            Your staffing agency command center
          </p>
        </div>

        {/* App Grid */}
        <AppGrid />
      </div>

      {/* Keyframes for animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default AppLauncherPage;
