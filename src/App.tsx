import { Scene } from './components/Three/Scene';
import { Dashboard } from './components/UI/Dashboard';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <Scene />
      <Dashboard />
    </div>
  );
}

export default App;
