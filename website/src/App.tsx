import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Toast, { useToast } from './components/Toast'
import Home from './pages/Home'
import Services from './pages/Services'
import Order from './pages/Order'
import Track from './pages/Track'
import Contact from './pages/Contact'

export default function App() {
  const { toasts, showToast, removeToast } = useToast()
  return (
    <>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/"         element={<Home />} />
          <Route path="/services" element={<Services showToast={showToast} />} />
          <Route path="/order"    element={<Order showToast={showToast} />} />
          <Route path="/track"    element={<Track showToast={showToast} />} />
          <Route path="/contact"  element={<Contact showToast={showToast} />} />
        </Routes>
      </main>
      <Footer />
      <Toast toasts={toasts} remove={removeToast} />
    </>
  )
}
