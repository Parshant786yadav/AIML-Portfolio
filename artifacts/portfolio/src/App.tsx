import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Navbar from "@/components/Navbar";
import ScrollProgress from "@/components/ScrollProgress";
import Profile from "@/components/sections/Profile";
import Experience from "@/components/sections/Experience";
import Projects from "@/components/sections/Projects";
import Skills from "@/components/sections/Skills";
import Education from "@/components/sections/Education";
import Certificates from "@/components/sections/Certificates";
import LeetCode from "@/components/sections/LeetCode";
import Contact from "@/components/sections/Contact";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground dot-grid transition-colors duration-200">
          <ScrollProgress />
          <Navbar />
          <main className="max-w-2xl mx-auto px-5 pb-20">
            <Profile />
            <Experience />
            <Projects />
            <Skills />
            <Education />
            <Certificates />
            <LeetCode />
            <Contact />
          </main>
          <footer className="max-w-2xl mx-auto px-5 py-6 section-divider">
            <p className="text-muted-foreground text-xs font-mono">
              © 2026 Parshant Yadav · Built with purpose
            </p>
          </footer>
        </div>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
