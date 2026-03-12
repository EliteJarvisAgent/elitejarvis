export function useToast() {
  return {
    toast: () => {},
    toasts: [],
    dismiss: () => {},
  };
}

export const toast = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
};
