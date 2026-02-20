import { getAllApps } from '../../config/apps';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import AppCard from './AppCard';

function AppGrid() {
  const { user } = useAuth();
  const { hasAppAccess, currentOrg } = useOrg();
  const apps = getAllApps(user);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {apps.map((app, index) => {
        // If org context exists, check access. Settings always accessible. No org = show all.
        const hasAccess = !currentOrg || app.id === 'settings' || hasAppAccess(app.id);
        return <AppCard key={app.id} app={app} index={index} locked={!hasAccess} />;
      })}
    </div>
  );
}

export default AppGrid;
