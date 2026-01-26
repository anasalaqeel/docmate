import { ThemeToggle } from '../components/ui/themeToggle';

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Home Page</h1>
          <ThemeToggle showLabel />
        </div>
        <div className="p-6 rounded-lg shadow-medium">
          <p className="text-foreground-600 mb-4">
            Welcome to the documentation platform. This page supports both light and dark modes.
          </p>
          <p className="text-foreground-500">
            Use the theme toggle above to switch between light, dark, and system themes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
