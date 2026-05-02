import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PanelPage from './pages/PanelPage.jsx'
import BatteryPage from './pages/BatteryPage.jsx'
import LightingPage from './pages/LightingPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<PanelPage />} />
          <Route path="bateria" element={<BatteryPage />} />
          <Route path="iluminacion" element={<LightingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
