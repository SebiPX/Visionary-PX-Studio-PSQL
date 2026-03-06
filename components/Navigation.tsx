import React from 'react';
import { AppView, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';

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

  const navCategories: NavCategory[] = [
    {
      label: 'Home',
      icon: 'home',
      items: [
        { view: AppView.DASHBOARD, path: '/dashboard', icon: 'grid_view', label: 'Dashboard' },
        { view: AppView.DASHBOARD, path: '/inventar', icon: 'inventory_2', label: 'Inventar' },
        { view: AppView.DASHBOARD, path: '/verleih-formular', icon: 'calendar_month', label: 'Verleih' },
        { view: AppView.DASHBOARD, path: '/kalender', icon: 'event', label: 'Kalender' },
        { view: AppView.DASHBOARD, path: '/logins', icon: 'password', label: 'Logins' },
        ...(userProfile.role === 'admin' ? [
          { view: AppView.DASHBOARD, path: '/handyvertraege', icon: 'smartphone', label: 'Verträge' },
          { view: AppView.DASHBOARD, path: '/kreditkarten', icon: 'credit_card', label: 'Karten' },
          { view: AppView.DASHBOARD, path: '/firmendaten', icon: 'business', label: 'Firma' },
        ] : []),
        { view: AppView.DASHBOARD, path: '/links', icon: 'link', label: 'Links' },
      ],
    },
    {
      label: 'Studio',
      icon: 'auto_awesome',
      items: [
        { view: AppView.IMAGE_GEN, icon: 'image', label: 'Image' },
        { view: AppView.VIDEO_STUDIO, icon: 'videocam', label: 'Video' },
        { view: AppView.TEXT_ENGINE, icon: 'description', label: 'Text' },
        { view: AppView.THUMBNAIL_ENGINE, icon: 'dashboard_customize', label: 'Thumb' },
        { view: AppView.VOICE_STUDIO, icon: 'record_voice_over', label: 'Voice' },
        { view: AppView.STUDIO_3D, icon: 'view_in_ar', label: '3D' },
      ],
    },
    {
      label: 'Agents',
      icon: 'smart_toy',
      items: [
        { view: AppView.PX_CREATIVE, icon: 'tips_and_updates', label: 'Event' },
        { view: AppView.SOCIAL_AUDIT, icon: 'troubleshoot', label: 'Audit' },
        { view: AppView.STORY_STUDIO, icon: 'movie_creation', label: 'Story' },
        { view: AppView.SKETCH_STUDIO, icon: 'brush', label: 'Sketch' },
        { view: AppView.CHAT_BOT, icon: 'chat_bubble', label: 'Chat' },
      ],
    },
    ...(userProfile.role === 'admin' ? [{
      label: 'Admin',
      icon: 'admin_panel_settings',
      items: [
        { view: AppView.MUSIC_STUDIO, icon: 'music_note', label: 'Music' },
        { view: AppView.I2AUDIO_STUDIO, icon: 'graphic_eq', label: 'i2Audio' },
      ],
    }] : []),
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
      <nav className="bg-[#101622] border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center neon-glow">
              <span className="material-icons-round text-white text-lg">auto_awesome</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white hidden md:block">
              PX <span className="text-primary">Studio</span>
            </h1>
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
                      ? 'border-primary text-white' 
                      : 'border-transparent text-slate-400 hover:text-white hover:border-white/20'
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
                {userProfile.role && (
                  <p className="text-[10px] uppercase text-primary font-bold mt-1 tracking-widest text-opacity-80">
                    {userProfile.role}
                  </p>
                )}
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
      </nav>

      {/* Desktop Secondary Bar (Tools of Active Category) */}
      <div className="hidden md:flex items-center justify-center bg-[#0a0e17] border-b border-white/5 h-12 gap-1 px-4">
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
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-icons-round text-[16px]">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Mobile Tabs (Bottom row for small screens) */}
      <div className="md:hidden flex overflow-x-auto hide-scrollbar border-t border-white/5 bg-[#0a0e17]">
        {allNavItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex-1 flex flex-col items-center justify-center py-3 min-w-[70px] relative transition-colors ${isActive ? 'text-primary' : 'text-slate-500'}`}
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
