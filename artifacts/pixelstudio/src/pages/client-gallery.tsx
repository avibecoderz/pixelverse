import { useRoute } from "wouter";
import { useClient } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Camera, Download, DownloadCloud, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientGallery() {
  const [match, params] = useRoute("/gallery/:id");
  const { data: client, isLoading } = useClient(params?.id || "");
  const { toast } = useToast();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Camera className="w-8 h-8 text-primary opacity-50" />
        <p className="text-muted-foreground">Loading your gallery...</p>
      </div>
    </div>
  );
  
  if (!client) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h1 className="text-2xl font-bold">Gallery Not Found</h1>
      <p className="text-muted-foreground">This link may have expired or is invalid.</p>
    </div>
  );

  const handleDownload = (url: string) => {
    // In a real app this would trigger an actual download
    toast({ title: "Downloading image...", description: "Your photo will save shortly." });
  };

  const handleDownloadAll = () => {
    toast({ title: "Preparing ZIP...", description: "We are packing all your high-res photos." });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Gallery Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-xl font-bold text-primary">
            <Camera className="w-6 h-6" />
            PixelStudio
          </div>
          
          <Button onClick={handleDownloadAll} className="gap-2 hover-elevate shadow-md">
            <DownloadCloud className="w-4 h-4" />
            <span className="hidden sm:inline">Download All</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl text-center mx-auto mb-16 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
            {client.clientName}'s Gallery
          </h1>
          <p className="text-lg text-muted-foreground">
            Your photos are ready! We hope you love them as much as we loved capturing them.
          </p>
          <div className="flex items-center justify-center gap-2 pt-4 text-sm font-medium text-slate-400">
            <span>{new Date(client.date).toLocaleDateString()}</span>
            <span>•</span>
            <span>{client.photos.length} High-Res Photos</span>
          </div>
        </div>

        {/* Masonry-like Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {client.photos.map((photoUrl, i) => (
            <div 
              key={i} 
              className="break-inside-avoid relative group rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 animate-in fade-in zoom-in-95"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Note: Unsplash image configured in mock data */}
              {/* gallery masonry photo */}
              <img 
                src={photoUrl} 
                alt={`Gallery image ${i+1}`} 
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              
              {/* Overlay Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border-0"
                  onClick={() => toast({ title: "Favorited!", description: "Added to your favorites list."})}
                >
                  <Heart className="w-4 h-4" />
                </Button>
                <Button 
                  variant="default" 
                  className="rounded-full gap-2 font-semibold shadow-lg shadow-black/20"
                  onClick={() => handleDownload(photoUrl)}
                >
                  <Download className="w-4 h-4" /> Download
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="mt-32 pb-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/5 text-primary mb-6">
            <Camera className="w-8 h-8 opacity-80" />
          </div>
          <p className="font-display font-bold text-xl mb-2">PixelStudio</p>
          <p className="text-muted-foreground text-sm">Captured with passion by {client.staffName}</p>
        </div>
      </main>
    </div>
  );
}
