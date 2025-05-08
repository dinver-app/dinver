/* eslint-disable @typescript-eslint/no-require-imports */
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

let toastify: any = null;

export const initializeToast = () => {
  if (Platform.OS === 'web') {
    try {
      toastify = require('react-toastify').toast;
      toastify.configure({
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Failed to initialize toast for web:', error);
    }
  }
};

export const showToast = (
  type: 'normal' | 'success' | 'danger' | 'warning', 
  title: string, 
  message?: string
) => {
  const toastType = type === 'normal' ? 'info' : 
                    type === 'danger' ? 'error' : type;
                    
  if (Platform.OS !== 'web') {
    const displayMessage = message || '';
    
    Toast.show({
      type: toastType,
      text1: title,
      text2: displayMessage,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 50,
    });
    return;
  }
  
  if (!toastify) {
    console.warn('Toast not initialized');
    return;
  }
  
  const displayMessage = message ? `${title}: ${message}` : title;
  const options = {
    position: "top-center" as const,
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    style: { zIndex: 10000 }, 
  };
  
  switch (type) {
    case 'success':
      toastify.success(displayMessage, options);
      break;
    case 'danger':
      toastify.error(displayMessage, options);
      break;
    case 'warning':
      toastify.warning(displayMessage, options);
      break;
    case 'normal':
    default:
      toastify.info(displayMessage, options);
      break;
  }
};

export const showSuccess = (title: string, message?: string) => 
  showToast('success', title, message);

export const showError = (title: string, message?: string) => 
  showToast('danger', title, message);

export const showInfo = (title: string, message?: string) => 
  showToast('normal', title, message);

export const showWarning = (title: string, message?: string) => 
  showToast('warning', title, message);