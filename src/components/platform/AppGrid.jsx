import { getAllApps } from '../../config/apps';
import AppCard from './AppCard';

function AppGrid() {
  const apps = getAllApps();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {apps.map((app, index) => (
        <AppCard key={app.id} app={app} index={index} />
      ))}
    </div>
  );
}

export default AppGrid;
