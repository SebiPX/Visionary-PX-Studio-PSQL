import React from 'react';
import { AppView, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface NavigationProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  userProfile: UserProfile;
  dashboardPath?: string;
  setDashboardPath?: (path: string) => void;
}

interface NavItem {
  view: AppView;
  icon: string;
  label: string;
  path?: string;
}

interface NavCategory {
  label: string;
  icon: string;
  items: NavItem[];
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView, userProfile, dashboardPath = '/dashboard', setDashboardPath }) => {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const navCategories: NavCategory[] = [
    {
      label: 'PX Desk',
      icon: 'grid_view',
      items: [
        { view: AppView.DASHBOARD, path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { view: AppView.DASHBOARD, path: '/logins', icon: 'password', label: 'Logins' },
        { view: AppView.DASHBOARD, path: '/links', icon: 'link', label: 'Links' },
        ...(userProfile.role === 'admin' ? [
          { view: AppView.DASHBOARD, path: '/news', icon: 'campaign', label: 'News' },
        ] : []),
      ],
    },
    {
      label: 'AI Chat',
      icon: 'forum',
      items: [
        { view: AppView.CHAT_BOT, icon: 'chat_bubble', label: 'Chat' },
      ],
    },
    {
      label: 'AI Studio',
      icon: 'auto_awesome',
      items: [
        { view: AppView.IMAGE_GEN, icon: 'image', label: 'Image' },
        { view: AppView.VIDEO_STUDIO, icon: 'videocam', label: 'Video' },
        { view: AppView.VOICE_STUDIO, icon: 'record_voice_over', label: 'Voice' },
        { view: AppView.TEXT_ENGINE, icon: 'description', label: 'Text' },
        { view: AppView.STORY_STUDIO, icon: 'movie_creation', label: 'Story' },
        { view: AppView.SKETCH_STUDIO, icon: 'brush', label: 'Sketch' },
        { view: AppView.STUDIO_3D, icon: 'view_in_ar', label: '3D' },
        { view: AppView.THUMBNAIL_ENGINE, icon: 'dashboard_customize', label: 'Thumb' },
        ...(userProfile.role === 'admin' ? [
          { view: AppView.MUSIC_STUDIO, icon: 'music_note', label: 'Music' },
          { view: AppView.I2AUDIO_STUDIO, icon: 'graphic_eq', label: 'i2Audio' },
        ] : []),
      ],
    },
    {
      label: 'AI Agents',
      icon: 'smart_toy',
      items: [
        { view: AppView.PX_CREATIVE, icon: 'tips_and_updates', label: 'Event' },
        { view: AppView.SOCIAL_AUDIT, icon: 'troubleshoot', label: 'Audit' },
      ],
    },
  ];

  const allNavItems = navCategories.flatMap(cat => cat.items);
  const activeCategory = navCategories.find(cat => cat.items.some(i => i.view === currentView)) || navCategories[0];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await signOut();
    }
  };

  return (
    <div className="flex-shrink-0 flex flex-col z-50">
      {/* Top Bar: Logo, Categories & Profile */}
      <nav className="bg-background border-b border-border">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setView(AppView.DASHBOARD)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-center pt-1.5 transition-all">
                <img 
                  src={theme === 'dark' ? '/logos/px-alpha.png' : '/logos/px-black.png'} 
                  alt="PX Logo" 
                  className="h-9 w-auto object-contain drop-shadow-sm"
                />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground hidden xl:block mt-1">
                Studio
              </h1>
            </button>

            {/* External Links */}
            <div className="hidden md:flex items-center pl-4 border-l border-border h-8">
              <a
                href={import.meta.env.VITE_PX_FLOW_URL || "https://px-flow.labs-schickeria.com/"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                <div className="w-5 h-5 rounded flex items-center justify-center bg-primary/10 text-primary">
                  <span className="material-icons-round text-[14px]">account_tree</span>
                </div>
                PX-Flow
                <span className="material-icons-round text-[12px] opacity-50 ml-0.5">open_in_new</span>
              </a>
            </div>
          </div>

          {/* Desktop Categories */}
          <div className="hidden md:flex items-center h-full gap-2">
            {navCategories.map((category) => {
              const isActive = activeCategory.label === category.label;
              return (
                <button
                  key={category.label}
                  onClick={() => setView(category.items[0].view)}
                  className={`flex items-center justify-center h-full px-4 border-b-2 transition-colors ${
                    isActive 
                      ? 'border-primary text-foreground' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <span className="material-icons-round text-[18px]">{category.icon}</span>
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Profile Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Toggle Theme"
            >
              <span className="material-icons-round text-lg">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>

            <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
              <span className="material-icons-round text-lg">notifications</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Logout"
            >
              <span className="material-icons-round text-lg">logout</span>
            </button>

            <button
              onClick={() => setView(AppView.SETTINGS)}
              className={`flex items-center gap-3 pl-1 pr-1 py-1 rounded-full border transition-all ${currentView === AppView.SETTINGS ? 'bg-muted/80 border-primary/50' : 'border-transparent hover:bg-muted/50'}`}
              title="User Settings"
            >
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-foreground leading-none">{userProfile.name}</p>
                {userProfile.role && (
                  <p className="text-[10px] uppercase text-primary font-bold mt-1 tracking-widest text-opacity-80">
                    {userProfile.role}
                  </p>
                )}
              </div>
              <div className="w-8 h-8 rounded-full border border-border p-0.5 overflow-hidden relative group">
                <img
                  src={userProfile.avatarUrl}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
                <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="material-icons-round text-[10px] text-foreground">settings</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Desktop Secondary Bar (Tools of Active Category) */}
      <div className="hidden md:flex items-center justify-center bg-muted/30 border-b border-border h-12 gap-1 px-4">
        {activeCategory.items.map((item) => {
          const isViewActive = currentView === item.view;
          const isPathActive = item.view === AppView.DASHBOARD ? dashboardPath === item.path : true;
          const isActive = isViewActive && isPathActive;
          
          return (
            <button
              key={item.label}
              onClick={() => {
                setView(item.view);
                if (item.path && setDashboardPath) {
                  setDashboardPath(item.path);
                }
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-2 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span className="material-icons-round text-[16px]">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Mobile Tabs (Bottom row for small screens) */}
      <div className="md:hidden flex overflow-x-auto hide-scrollbar border-t border-border bg-background">
        {allNavItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.label}
              onClick={() => {
                setView(item.view);
                if (item.path && setDashboardPath) {
                  setDashboardPath(item.path);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center py-3 min-w-[70px] relative transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <span className="material-icons-round text-xl mb-1">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(19,91,236,0.5)]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
