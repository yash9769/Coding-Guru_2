import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import CodePreview from "@/pages/code-preview";
import BackendBuilder from "@/pages/backend-builder";
import Deploy from "@/pages/deploy";
import AIOutput from "@/pages/ai-output";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect } from "react";

// Temporarily disabled localStorage clearing for debugging
// Clear localStorage on app start to prevent React object errors
if (typeof window !== 'undefined') {
  console.log('DEBUG: Skipping localStorage clearing for debugging');
  // localStorage.removeItem('aibuilder-canvas-nodes');
  // localStorage.removeItem('aibuilder-canvas-edges');
  // console.log('localStorage cleared successfully');
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('Router render:', { isAuthenticated, isLoading, user });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/ai-output" component={AIOutput} />
          <Route path="/code-preview" component={CodePreview} />
          <Route path="/backend-builder" component={BackendBuilder} />
          <Route path="/deploy" component={Deploy} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  console.log('App rendering...');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
