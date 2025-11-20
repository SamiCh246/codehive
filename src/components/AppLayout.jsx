import { Outlet } from 'react-router-dom'

import Navbar from './Navbar.jsx'
import { Footer } from './UI.jsx'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-shell__content">
        <main className="page">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
