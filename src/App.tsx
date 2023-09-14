import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Landing from './components/pages/Landing';
import NoPage from './components/pages/NoPage';
import Auth from './components/pages/Auth';
import Dashboard from './components/pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />}>
          <Route path="*" element={<NoPage />} />
        </Route>
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
