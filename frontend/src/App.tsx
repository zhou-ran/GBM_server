import { Header } from './components/layout/Header';
import { Breadcrumb } from './components/navigation/Breadcrumb';
import { LevelRouter } from './components/navigation/LevelRouter';
import { LevelTransition } from './components/navigation/LevelTransition';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { useInitData } from './hooks/useInitData';
import { useNavigationStore } from './stores/navigationStore';

function App() {
  useInitData();
  const currentLevel = useNavigationStore((s) => s.currentLevel);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <Breadcrumb />
      <LevelTransition level={currentLevel}>
        <LevelRouter />
      </LevelTransition>
      <LoadingOverlay />
    </div>
  );
}

export default App;
