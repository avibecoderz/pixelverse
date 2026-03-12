import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Camera, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 rotate-12">
        <Camera className="w-10 h-10 -rotate-12" />
      </div>
      
      <h1 className="text-5xl font-display font-bold tracking-tight mb-4 text-foreground">404</h1>
      <h2 className="text-2xl font-semibold mb-6 text-foreground">Page not found</h2>
      
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        We couldn't find the page you're looking for. It might have been moved, deleted, or perhaps the URL is incorrect.
      </p>
      
      <Button asChild size="lg" className="hover-elevate shadow-md gap-2">
        <Link href="/">
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
