import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        <Topbar />
        <main className="dash-content">
          {children}
        </main>
      </div>
    </div>
  );
}
