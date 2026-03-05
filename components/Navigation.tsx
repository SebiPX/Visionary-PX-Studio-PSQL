import React from 'react';
import { AppView, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  userProfile: UserProfile;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView, userProfile }) => {
  const { signOut } = useAuth();

  const navItems = [
    { view: AppView.DASHBOARD, icon: 'grid_view', label: 'Home' },
    { view: AppView.IMAGE_GEN, icon: 'image', label: 'Image' },
    { view: AppView.VIDEO_STUDIO, icon: 'videocam', label: 'Video' },
    { view: AppView.TEXT_ENGINE, icon: 'description', label: 'Text' },
    { view: AppView.THUMBNAIL_ENGINE, icon: 'dashboard_customize', label: 'Thumb' },
    { view: AppView.STORY_STUDIO, icon: 'movie_creation', label: 'Story' },
    { view: AppView.SKETCH_STUDIO, icon: 'brush', label: 'Sketch' },
    { view: AppView.PX_CREATIVE, icon: 'tips_and_updates', label: 'Agent' },
    { view: AppView.CHAT_BOT, icon: 'chat_bubble', label: 'Chat' },
    { view: AppView.STUDIO_3D, icon: 'view_in_ar', label: '3D' },
    { view: AppView.VOICE_STUDIO, icon: 'record_voice_over', label: 'Voice' },
    ...(userProfile.role === 'admin' ? [
      { view: AppView.MUSIC_STUDIO, icon: 'music_note', label: 'Music' },
      { view: AppView.I2AUDIO_STUDIO, icon: 'graphic_eq', label: 'i2Audio' },
    ] : []),
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut();
    }
  };

  return (
    <nav className="flex-shrink-0 bg-[#101622] border-b border-white/5 z-50">
      {/* Top Bar: Logo & Profile */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center neon-glow">
            <span className="material-icons-round text-white text-lg">auto_awesome</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white hidden md:block">
            PX <span className="text-primary">Studio</span>
          </h1>
        </div>

        {/* Desktop Tabs (Integrated in top bar for wider screens) */}
        <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="material-icons-round text-sm">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <span className="material-icons-round text-lg">notifications</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Logout"
          >
            <span className="material-icons-round text-lg">logout</span>
          </button>

          <button
            onClick={() => setView(AppView.SETTINGS)}
            className={`flex items-center gap-3 pl-1 pr-1 py-1 rounded-full border transition-all ${currentView === AppView.SETTINGS ? 'bg-white/10 border-primary/50' : 'border-transparent hover:bg-white/5'}`}
            title="User Settings"
          >
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-white leading-none">{userProfile.name}</p>
            </div>
            <div className="w-8 h-8 rounded-full border border-white/10 p-0.5 overflow-hidden relative group">
              <img
                src={userProfile.avatarUrl}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="material-icons-round text-[10px] text-white">settings</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Tabs (Bottom row for small screens) */}
      <div className="md:hidden flex overflow-x-auto hide-scrollbar border-t border-white/5 bg-[#0a0e17]">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex-1 flex flex-col items-center justify-center py-3 min-w-[70px] relative transition-colors ${isActive ? 'text-primary' : 'text-slate-500'
                }`}
            >
              <span className="material-icons-round text-xl mb-1">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(19,91,236,0.5)]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};