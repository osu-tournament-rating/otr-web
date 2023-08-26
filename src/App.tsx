import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Landing from './components/pages/Landing';
import NoPage from './components/pages/NoPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />}>
          <Route path="*" element={<NoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
