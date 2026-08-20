// Global type definitions for React Native environment

// Missing module declarations
declare module '@react-native-community/datetimepicker' {
  import { ComponentType } from 'react';
  const DateTimePicker: ComponentType<any>;
  export default DateTimePicker;
}

declare module 'react-native-vision-camera' {
  export const Camera: any;
  export const useCameraDevices: any;
  export const useCodeScanner: any;
}

declare module 'react-native-modal' {
  import { ComponentType } from 'react';
  const Modal: ComponentType<any>;
  export default Modal;
}

declare module '@react-native-community/slider' {
  import { ComponentType } from 'react';
  const Slider: ComponentType<any>;
  export default Slider;
}

declare module 'react-native-swipeable' {
  import { ComponentType } from 'react';
  const Swipeable: ComponentType<any>;
  export default Swipeable;
}

declare module 'react-native-share' {
  const Share: any;
  export default Share;
}

declare module 'react-native-voice' {
  const Voice: any;
  export default Voice;
}

declare module 'pako' {
  export const deflate: any;
  export const inflate: any;
}

declare module '@microsoft/signalr' {
  export class HubConnectionBuilder {
    withUrl(url: string): this;
    build(): HubConnection;
  }
  export class HubConnection {
    start(): Promise<void>;
    stop(): Promise<void>;
    on(methodName: string, handler: (...args: any[]) => void): void;
    invoke(methodName: string, ...args: any[]): Promise<any>;
  }
}

declare module 'react-native-push-notification' {
  const PushNotification: any;
  export default PushNotification;
}

declare module '@react-native-google-signin/google-signin' {
  export const GoogleSignin: any;
  export const statusCodes: any;
}

declare module '@invertase/react-native-apple-authentication' {
  export const appleAuth: any;
}

declare module '*/offlineService' {
  export const offlineService: any;
}

declare global {
  // Browser globals that don't exist in React Native
  interface Navigator {
    userAgent?: string;
    platform?: string;
    onLine: boolean;
  }

  const navigator: Navigator;
  const localStorage: Storage | undefined;

  // Node.js globals
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Timeout {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Immediate {}

    interface Global {
      performance?: Performance;
    }
  }

  // Performance API
  interface Performance {
    now: () => number;
    mark?: (name: string) => void;
    measure?: (name: string, startMark?: string, endMark?: string) => void;
    clearMarks?: (name?: string) => void;
    clearMeasures?: (name?: string) => void;
  }

  // Dimensions for responsive utilities
  interface DimensionsType {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  }

  interface Dimensions {
    get(dim: 'window' | 'screen'): DimensionsType;
  }

  const Dimensions: Dimensions;
  const width: number;
  const height: number;

  // Navigation (React Navigation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation: any;
}

export {};
