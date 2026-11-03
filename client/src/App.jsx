import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate, useMatch } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logout } from './store/authSlice'

import styles from './App.module.css'
import './styles/globals.css'

import Home from './pages/Home/Home'
import PinDetail from './pages/PinDetail/PinDetail'
import BoardDetail from './pages/BoardDetail/BoardDetail'
import PinUpload from './pages/PinUpload/PinUpload'

import AuthModal from './components/AuthModal/AuthModal'
import NavBar from './components/NavBar/NavBar'
import SideBar from './components/SideBar/SideBar'
import SidePanel from './components/SidePanel/SidePanel'
import UploadPanel from './components/SidePanel/panel/UploadPanel/UploadPanel'
import AlarmPanel from './components/SidePanel/panel/AlarmPanel/AlarmPanel'
import MessagePanel from './components/SidePanel/panel/MessagePanel/MessagePanel'
import SettingsPanel from './components/SidePanel/panel/SettingsPanel/SettingsPanel'
import ProtectedRoute from './components/ProtectedRoute'
import Profile from './pages/Profile/Profile'
import { ModalProvider } from './contexts/ModalProvider'
import { Toaster } from 'react-hot-toast';
import Search from './pages/Search/Search'
import { BASE_URL } from './api/config'

function App() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const match = useMatch('/:username');
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [activePanel, setActivePanel] = useState(null)
  const [renderedPanel, setRenderedPanel] = useState(null)
  const [state, setState] = useState('home');

  async function handleLogout() {
    try {
      const res = await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) {
        console.log('로그아웃에 실패했습니다.')
        return;
      }

      dispatch(logout())
      localStorage.removeItem('auth')
      navigate('/')
      setActivePanel(null);
    } catch (err) {
      console.log('네트워크 연결을 확인해주세요.')
    }
  }

  function handleRouteChange(pathname) {
    if (pathname === '/') setState('home')
    else if (match) setState('board')
    else setState(null)
    setActivePanel(null)
  }

  useEffect(() => {
    if (activePanel) {
      setRenderedPanel(activePanel)           // 열릴 때/전환될 때 즉시 반영
    } else { // 닫힐 때
      const t = setTimeout(() => setRenderedPanel(null), 300) // transition 시간과 맞춤
      return () => clearTimeout(t)
    }
  }, [activePanel])

  return (
    <>
      <ModalProvider showLogin={() => setShowLogin(true)}>
        <SideBar state={state} activePanel={activePanel} onSelect={setActivePanel}></SideBar>
        <SidePanel isOpen={!!activePanel}>
          {renderedPanel === 'upload' && <UploadPanel onClose={() => setActivePanel(null)} />}
          {renderedPanel === 'alarm' && <AlarmPanel onClose={() => setActivePanel(null)} />}
          {renderedPanel === 'message' && <MessagePanel onClose={() => setActivePanel(null)} />}
          {renderedPanel === 'settings' && <SettingsPanel onClose={() => setActivePanel(null)} />}
        </SidePanel>
        <NavBar isShifted={!!activePanel} onLoginClick={() => setShowLogin(true)} onRegisterClick={() => setShowRegister(true)} onLogoutClick={() => handleLogout()} />
        {showLogin && <AuthModal mode='login' onClose={() => setShowLogin(false)} />}
        {showRegister && <AuthModal mode='register' onClose={() => setShowRegister(false)} />}
        <div><Toaster /></div>
        <div className={`${styles.container} ${activePanel ? styles.shifted : ''}`}>
          <RouteWatcher onRouteChange={handleRouteChange} />
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/pins/:id' element={<PinDetail />} />
            <Route path='/:username/:boardname' element={<BoardDetail />} />
            <Route path='/pin-creation-tool' element={
              <ProtectedRoute showLogin={() => setShowLogin(true)}>
                <PinUpload showLogin={() => setShowLogin(true)} />
              </ProtectedRoute>
            } />
            <Route path='/:username' element={<Profile />} />
            <Route path='/search/:type' element={<Search />} />
          </Routes>
        </div>
      </ModalProvider>
    </>
  )
}

function RouteWatcher({ onRouteChange }) {
  const location = useLocation()
  useEffect(() => {
    onRouteChange(location.pathname)
  }, [location.pathname])
  return null
}

export default App
