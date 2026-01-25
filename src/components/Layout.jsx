import Sidebar from './Sidebar';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar />
      <div className="ml-64">
        {children}
      </div>
    </div>
  );
}

export default Layout;
