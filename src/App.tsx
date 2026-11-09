import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import { useApp } from './state/AppContext';
import Dashboard from './pages/Dashboard';
import ExamSetup from './pages/ExamSetup';
import ExamRun from './pages/ExamRun';
import Results from './pages/Results';
import Practice from './pages/Practice';
import Subjects from './pages/Subjects';
import Weak from './pages/Weak';
import Saved from './pages/Saved';
import History from './pages/History';
import Admin from './pages/Admin';
import Sources from './pages/Sources';

export default function App() {
  const { loading, error } = useApp();
  if (loading) return <LoadingScreen />;
  if (error)
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="card max-w-md p-6 text-center">
          <p className="font-bold text-red-600">The question bank could not be loaded</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button className="btn-primary mt-4" onClick={() => location.reload()}>Try again</button>
        </div>
      </div>
    );
  return (
    <Routes>
      <Route path="/exam/run" element={<ExamRun />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="exam" element={<ExamSetup />} />
        <Route path="results/:id" element={<Results />} />
        <Route path="practice" element={<Practice />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="weak" element={<Weak />} />
        <Route path="saved" element={<Saved />} />
        <Route path="history" element={<History />} />
        <Route path="sources" element={<Sources />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
