import type { ComponentType } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './layout/DashboardLayout';
import RequireAuth from './layout/RequireAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import Passengers from './pages/Passengers';
import Trips from './pages/Trips';
import Bookings from './pages/Bookings';
import Earnings from './pages/Earnings';
import Payments from './pages/Payments';
import PromoCodes from './pages/PromoCodes';
import Complaints from './pages/Complaints';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import UsersRoles from './pages/UsersRoles';
import { navItems } from './layout/navItems';

const BUILT_PAGES: Record<string, ComponentType> = {
  '/drivers': Drivers,
  '/passengers': Passengers,
  '/trips': Trips,
  '/bookings': Bookings,
  '/earnings': Earnings,
  '/payments': Payments,
  '/promo-codes': PromoCodes,
  '/complaints': Complaints,
  '/notifications': Notifications,
  '/analytics': Analytics,
  '/settings': Settings,
  '/users-roles': UsersRoles,
};

function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          {navItems
            .filter((item) => item.path !== '/')
            .map((item) => {
              const Page = BUILT_PAGES[item.path];
              if (!Page) return null;
              return <Route key={item.path} path={item.path.slice(1)} element={<Page />} />;
            })}
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
