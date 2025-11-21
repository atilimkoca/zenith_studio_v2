import { useNotification } from '../contexts/NotificationContext.jsx';

export const useNotificationHook = () => {
  return useNotification();
};
