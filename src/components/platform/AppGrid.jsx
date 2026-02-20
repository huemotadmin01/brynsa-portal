import { getAllApps } from '../../config/apps';
import { useAuth } from '../../context/AuthContext';
import AppCard from './AppCard';

function AppGrid() {
  const { user } = useAuth();
  const apps = getAllApps(user);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {apps.map((app, index) => (
        <AppCard key={app.id} app={app} index={index} />
      ))}
    </div>
  );
}

export default AppGrid;
