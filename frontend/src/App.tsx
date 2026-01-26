import "./App.css";
import MainRouter from "./router/mainRouter";
import { ErrorBoundary } from "./components/errorBoundary";

function App() {
  return (
    <ErrorBoundary showDetails={import.meta.env.DEV}>
      <MainRouter />
    </ErrorBoundary>
  );
}

export default App;
