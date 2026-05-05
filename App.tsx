import React, { useState } from 'react';
import { AppView, UserProfile } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthPage } from './components/auth/AuthPage';
import { Navigation } from './components/Navigation';
import { RecentGenerations } from './components/Dashboard';
import { MyAssets } from './components/MyAssets';
import { Notes } from './components/Notes';
import { ImageGen } from './components/ImageGen';
import { VideoStudio } from './components/VideoStudio';
import { TextEngine } from './components/TextEngine';
import { ThumbnailEngine } from './components/ThumbnailEngine';
import { StoryStudio } from './components/StoryStudio';
import { SketchStudio } from './components/SketchStudio/SketchStudio';
import { ChatBot } from './components/ChatBot';
import { Studio3D } from './components/Studio3D';
import { VoiceStudio } from './components/VoiceStudio';
import MusicStudio from './components/MusicStudio';
import I2AudioStudio from './components/I2AudioStudio';
import { Settings } from './components/Settings';
import { InventarApp } from './components/InventarApp';
import { PxCreativeApp } from './components/px-creative/PxCreativeApp';
import { SocialAuditApp } from './components/SocialAudit/SocialAuditApp';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  // Helper to navigate to a view with a selected item
  const navigateToItem = (view: AppView, itemId: string) => {
    setSelectedItemId(itemId);
    setCurrentView(view);
  };

  // Convert Supabase profile to UserProfile format
  const userProfile: UserProfile = {
    name: profile?.full_name || user?.email?.split('@')[0] || 'User',
    avatarUrl: profile?.avatar_url || undefined,
    role: profile?.role || undefined
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background text-foreground">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!user) {
    return <AuthPage />;
  }

  // Prevent clients from accessing PX-Studio
  if (userProfile.role === 'client') {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-background text-foreground p-8">
        <div className="max-w-md text-center space-y-6 bg-card p-10 rounded-2xl border border-border mt-[-10vh]">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-icons-round text-4xl text-red-500">block</span>
          </div>
          <h1 className="text-3xl font-bold">Zugriff verweigert</h1>
          <p className="text-muted-foreground">
            PX-Studio ist ein internes Kreativ-Tool. Bitte nutze PX-Flow, um deine Projekte und Freigaben zu verwalten.
          </p>
          <a
            href="https://flow.labs-schickeria.com"
            className="inline-block mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Zu PX-Flow
          </a>
        </div>
      </div>
    );
  }

  // Prevent freelancers from accessing PX-Studio
  if (userProfile.role === 'freelancer') {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-background text-foreground p-8">
        <div className="max-w-md text-center space-y-6 bg-card p-10 rounded-2xl border border-border mt-[-10vh]">
          <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-icons-round text-4xl text-orange-500">lock</span>
          </div>
          <h1 className="text-3xl font-bold">Account nicht freigeschaltet</h1>
          <p className="text-muted-foreground">
            Dein Account ist für PX-Studio nicht freigeschaltet. Bitte logge dich bei PX-Flow ein.
          </p>
          <a
            href="https://flow.labs-schickeria.com"
            className="inline-block mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Zu PX-Flow
          </a>
        </div>
      </div>
    );
  }

  // Show main app if authenticated
  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground font-display overflow-hidden transition-colors duration-200">
      <Navigation currentView={currentView} setView={setCurrentView} userProfile={userProfile} dashboardPath={dashboardPath} setDashboardPath={setDashboardPath} />

      {/* 
        Main Content Area 
        We use CSS visibility (hidden/block) instead of conditional rendering (switch/case).
        This keeps all components mounted, preserving their state (chat history, generated images, inputs)
        while the user navigates between tools.
      */}
      <div className="flex-1 relative w-full overflow-hidden">

        <div className={`w-full h-full ${currentView === AppView.DASHBOARD ? 'block' : 'hidden'}`}>
          <InventarApp onBack={() => {}} setView={setCurrentView} navigateToItem={navigateToItem} dashboardPath={dashboardPath} />
        </div>

        <div className={`w-full h-full overflow-y-auto ${currentView === AppView.MY_ASSETS ? 'block' : 'hidden'}`}>
          <MyAssets setView={setCurrentView} navigateToItem={navigateToItem} isActive={currentView === AppView.MY_ASSETS} />
        </div>

        <div className={`w-full h-full ${currentView === AppView.NOTES ? 'block' : 'hidden'}`}>
          <Notes />
        </div>

        <div className={`w-full h-full ${currentView === AppView.IMAGE_GEN ? 'block' : 'hidden'}`}>
          <ImageGen selectedItemId={selectedItemId} onItemLoaded={() => setSelectedItemId(null)} isActive={currentView === AppView.IMAGE_GEN} />
        </div>

        <div className={`w-full h-full ${currentView === AppView.VIDEO_STUDIO ? 'block' : 'hidden'}`}>
          <VideoStudio selectedItemId={selectedItemId} onItemLoaded={() => setSelectedItemId(null)} isActive={currentView === AppView.VIDEO_STUDIO} />
        </div>

        <div className={`w-full h-full ${currentView === AppView.TEXT_ENGINE ? 'block' : 'hidden'}`}>
          <TextEngine />
        </div>

        <div className={`w-full h-full ${currentView === AppView.THUMBNAIL_ENGINE ? 'block' : 'hidden'}`}>
          <ThumbnailEngine selectedItemId={selectedItemId} onItemLoaded={() => setSelectedItemId(null)} isActive={currentView === AppView.THUMBNAIL_ENGINE} />
        </div>

        <div className={`w-full h-full ${currentView === AppView.STORY_STUDIO ? 'block' : 'hidden'}`}>
          <StoryStudio isActive={currentView === AppView.STORY_STUDIO} />
        </div>

        <div className={`w-full h-full ${currentView === AppView.SKETCH_STUDIO ? 'block' : 'hidden'}`}>
          <SketchStudio isActive={currentView === AppView.SKETCH_STUDIO} />
        </div>

        <div className={`w-full h-full ${currentView === AppView.PX_CREATIVE ? 'block' : 'hidden'}`}>
          <PxCreativeApp />
        </div>

        <div className={`w-full h-full ${currentView === AppView.SOCIAL_AUDIT ? 'block' : 'hidden'}`}>
          <SocialAuditApp />
        </div>

        <div className={`w-full h-full ${currentView === AppView.CHAT_BOT ? 'block' : 'hidden'}`}>
          <ChatBot />
        </div>

        <div className={`w-full h-full ${currentView === AppView.STUDIO_3D ? 'block' : 'hidden'}`}>
          <Studio3D />
        </div>

        <div className={`w-full h-full ${currentView === AppView.VOICE_STUDIO ? 'block' : 'hidden'}`}>
          <VoiceStudio />
        </div>

        <div className={`w-full h-full ${currentView === AppView.MUSIC_STUDIO ? 'block' : 'hidden'}`}>
          {userProfile.role === 'admin' && <MusicStudio isActive={currentView === AppView.MUSIC_STUDIO} />}
        </div>

        <div className={`w-full h-full ${currentView === AppView.I2AUDIO_STUDIO ? 'block' : 'hidden'}`}>
          {userProfile.role === 'admin' && <I2AudioStudio isActive={currentView === AppView.I2AUDIO_STUDIO} />}
        </div>

        <div className={`w-full h-full ${currentView === AppView.SETTINGS ? 'block' : 'hidden'}`}>
          <Settings userProfile={userProfile} />
        </div>


      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;