import { NavLink } from 'react-router-dom';

function NavBar({ user, onLogout }) {
  const role = user?.role || localStorage.getItem('role') || 'pastor';
  return (
    <aside className="navbar">
      <div>
        <h2>Mizpah {role === 'elder' ? 'Elder' : 'Admin'}</h2>
        <p>Welcome, {user?.username || 'Admin'}</p>
      </div>

      <nav className="nav-links">
        {role !== 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/dashboard">Dashboard</NavLink>}
        {role === 'pastor' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/members">Members</NavLink>}
        {role === 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/member-details">My Details</NavLink>}
        {role === 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/my-tithe">My Tithe</NavLink>}
        {role === 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/my-project">My Project</NavLink>}
        {role === 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/welfare">Welfare</NavLink>}
        {(role === 'pastor' || role === 'elder') && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/givings">Offerings</NavLink>}
        {role !== 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/projects">Project</NavLink>}
        {(role === 'pastor' || role === 'elder') && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/welfare">Welfare</NavLink>}
        {role === 'pastor' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/reports">Tithe</NavLink>}
        {(role === 'pastor' || role === 'elder') && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/expenses">Expenses</NavLink>}
        {role !== 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/attendance">Attendance</NavLink>}
        {role !== 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/inventory">Inventory</NavLink>}
        {role !== 'member' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/departments">Departments</NavLink>}
        {role === 'pastor' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/export">Export</NavLink>}
        {role === 'pastor' && <NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/bulk-sms">Bulk SMS</NavLink>}
      </nav>

      <button className="button-primary logout-button" onClick={onLogout}>Logout</button>
    </aside>
  );
}

export default NavBar;
