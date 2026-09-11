import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, BarChart3, Settings as SettingsIcon, AlertTriangle, LogOut } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inquiries', label: 'Inquiries', icon: ListChecks },
    { to: '/scorecard', label: 'Scorecard', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
    { to: '/danger-zone', label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #2d3748', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700' }}>BRL TAT Portal</h2>
          <p style={{ fontSize: '11px', color: '#a0aec0' }}>Best Roadways</p>
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={({ isActive }) => isActive ? 'active' : ''}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}

        <div style={{ marginTop: 'auto', padding: '20px' }}>
          <button onClick={handleLogout} className="secondary" style={{ width: '100%', background: '#2d3748', color: '#cbd5e0' }}>
            <LogOut size={14} style={{ marginRight: '8px' }} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
