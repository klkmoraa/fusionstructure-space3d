import './styles.css';
import Space3DWorkspace from './features/space3d/Space3DWorkspace';

/** Standalone entry point for the extracted Space 3D product. */
const App = () => (
  <Space3DWorkspace
    language="es"
    onOpenHome={() => { window.location.hash = '#home'; }}
    onOpen2D={() => { window.location.hash = '#fstructure'; }}
  />
);

export default App;
