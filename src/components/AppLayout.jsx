import { Outlet, useLocation } from 'react-router-dom'

import Navbar from './Navbar.jsx'
import { Footer } from './UI.jsx'

export default function AppLayout() {
  const location = useLocation()
  const isChatPage = location.pathname === '/chat'

  return (
    <div className={`app-shell ${isChatPage ? 'app-shell--chat' : ''}`}>
      <Navbar />
      <div className="app-shell__content">
        <main className={`page ${isChatPage ? 'page--chat' : ''}`}>
          <Outlet />
        </main>
        {!isChatPage && <Footer />}
      </div>
    </div>
  )
}
