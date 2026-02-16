import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, Send, Users, List, Settings, LogOut,
  ChevronRight, Crown, BarChart3, UsersRound
} from 'lucide-react';
import RivvraLogo from './BrynsaLogo';
import ComingSoonModal from './ComingSoonModal';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isPro = user?.plan === 'pro' || user?.plan === 'premium';
  const [showWipModal, setShowWipModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/engage', label: 'Engage', icon: Send },
    { path: '/leads', label: 'My Contacts', icon: Users },
    { path: '/lists', label: 'My Lists', icon: List },
    ...((user?.role === 'admin' || user?.role === 'team_lead')
      ? [
          { path: '/team-dashboard', label: 'Team Dashboard', icon: BarChart3 },
          { path: '/team-contacts', label: 'Team Contacts', icon: UsersRound },
        ]
      : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 min-h-screen bg-dark-900 border-r border-dark-800 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-4 border-b border-dark-800">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-dark-800 flex items-center justify-center">
            <RivvraLogo className="w-6 h-6" />
          </div>
          <span className="text-lg font-bold text-white">Rivvra</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-rivvra-500/10 text-rivvra-400'
                : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rivvra-500 text-dark-950">
                {item.badge}
              </span>
            )}
            {isActive(item.path) && (
              <ChevronRight className="w-4 h-4" />
            )}
          </Link>
        ))}
      </nav>

      {/* Upgrade Banner (for free users) */}
      {!isPro && (
        <div className="p-4 border-t border-dark-800">
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Upgrade to Pro</span>
            </div>
            <p className="text-sm text-dark-400 mb-3">
              Unlock AI emails, CRM exports & more
            </p>
            <button
              onClick={() => setShowWipModal(true)}
              className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-dark-950 font-semibold text-sm hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* User Menu */}
      <div className="p-4 border-t border-dark-800">
        <div className="flex items-center gap-3 mb-3">
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rivvra-400 to-rivvra-600 flex items-center justify-center">
              <span className="text-sm font-bold text-dark-950">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-dark-400 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/settings"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <ComingSoonModal
        isOpen={showWipModal}
        onClose={() => setShowWipModal(false)}
        feature="Pro Plan"
      />
    </aside>
  );
}

export default Sidebar;
