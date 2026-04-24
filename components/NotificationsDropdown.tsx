import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface Props {
  onClose: () => void;
}

export const NotificationsDropdown: React.FC<Props> = ({ onClose }) => {
  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Since these are PX-Flow events, navigate to PX-Flow
    const pxFlowUrl = import.meta.env.VITE_PX_FLOW_URL || "https://px-flow.labs-schickeria.com/";
    
    // Simplistic routing logic based on entity type
    let url = pxFlowUrl;
    if (notification.related_entity_id) {
        // Assume default route is project-detail which handles project/task/assets
        url = `${pxFlowUrl.replace(/\/$/, '')}/`;
        // In PX-Flow, routing is usually handled via internal state, 
        // so external deep linking might require a specific URL format if supported, 
        // otherwise just opening PX-Flow is a good start.
        // If PX-Flow supports deep linking, we could append ?project=ID
    }
    
    window.open(url, '_blank');
    onClose();
  };

  if (isLoading && notifications.length === 0) {
    return (
      <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-xl border border-border p-4 z-50">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 mt-2 w-96 bg-card rounded-lg shadow-xl border border-border z-50 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="text-foreground font-semibold">Benachrichtigungen</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Alle als gelesen markieren
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {!notifications || notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Keine neuen Benachrichtigungen</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 rounded-md cursor-pointer transition-colors flex gap-3 ${notification.is_read
                    ? 'bg-transparent text-muted-foreground hover:bg-muted/50'
                    : 'bg-muted/30 text-foreground hover:bg-muted'
                    }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {notification.type === 'success' && <span className="material-icons-round text-green-500 text-[20px]">check_circle</span>}
                    {notification.type === 'warning' && <span className="material-icons-round text-yellow-500 text-[20px]">warning</span>}
                    {notification.type === 'error' && <span className="material-icons-round text-red-500 text-[20px]">error</span>}
                    {notification.type === 'info' && <span className="material-icons-round text-primary text-[20px]">info</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${notification.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
                      {new Date(notification.created_at).toLocaleString('de-DE')}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
