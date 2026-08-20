// Global type declarations for React Native modules without TypeScript definitions

declare module '@react-native-community/datetimepicker' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface DateTimePickerEvent {
    type: 'set' | 'dismissed' | 'neutralButtonPressed';
    nativeEvent: {
      timestamp?: number;
      utcOffset?: number;
    };
  }

  export interface DateTimePickerProps extends ViewProps {
    value: Date;
    mode?: 'date' | 'time' | 'datetime' | 'countdown';
    display?: 'default' | 'spinner' | 'calendar' | 'clock' | 'compact' | 'inline';
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
    timeZoneOffsetInMinutes?: number;
    timeZoneName?: string;
    is24Hour?: boolean;
    neutralButtonLabel?: string;
    textColor?: string;
    accentColor?: string;
    themeVariant?: 'light' ;
    locale?: string;
  }

  export default class DateTimePicker extends Component<DateTimePickerProps> {}
}

declare module 'react-native-vision-camera' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface CameraDevice {
    id: string;
    name: string;
    position: 'front' | 'back';
    hasFlash: boolean;
    hasTorch: boolean;
    minZoom: number;
    maxZoom: number;
    neutralZoom: number;
    devices: string[];
    formats: CameraDeviceFormat[];
    supportsFocus: boolean;
    supportsRAW: boolean;
    isMultiCam: boolean;
  }

  export interface CameraDeviceFormat {
    photoHeight: number;
    photoWidth: number;
    videoHeight: number;
    videoWidth: number;
    minISO: number;
    maxISO: number;
    minFps: number;
    maxFps: number;
    fieldOfView: number;
    maxZoom: number;
    supportsVideoHDR: boolean;
    supportsPhotoHDR: boolean;
    supportsDepthCapture: boolean;
  }

  export interface CodeScanner {
    codeTypes: string[];
    onCodeScanned: (codes: { value: string; type: string }[]) => void;
  }

  export interface CameraProps extends ViewProps {
    device: CameraDevice;
    isActive: boolean;
    photo?: boolean;
    video?: boolean;
    audio?: boolean;
    codeScanner?: CodeScanner;
    enableZoomGesture?: boolean;
    zoom?: number;
    format?: CameraDeviceFormat;
    fps?: number;
    hdr?: boolean;
    lowLightBoost?: boolean;
    orientation?: 'portrait' | 'landscape-left' | 'landscape-right' | 'portrait-upside-down';
    torch?: 'off' | 'on';
    videoStabilizationMode?: 'off' | 'standard' | 'cinematic' | 'auto';
    onInitialized?: () => void;
    onError?: (error: CameraError) => void;
  }

  export interface CameraError {
    code: string;
    message: string;
  }

  export class Camera extends Component<CameraProps> {
    public static getAvailableCameraDevices(): Promise<CameraDevice[]>;
    public static getCameraPermissionStatus(): Promise<'granted' | 'not-determined' | 'denied' | 'restricted'>;
    public static requestCameraPermission(): Promise<'granted' | 'denied'>;
  }
}

declare module 'react-native-modal' {
  import { Component } from 'react';
  import { ViewProps, ViewStyle } from 'react-native';

  export interface ModalProps extends ViewProps {
    isVisible: boolean;
    onBackButtonPress?: () => void;
    onBackdropPress?: () => void;
    onSwipeComplete?: () => void;
    onModalShow?: () => void;
    onModalHide?: () => void;
    onModalWillShow?: () => void;
    onModalWillHide?: () => void;
    backdropColor?: string;
    backdropOpacity?: number;
    backdropTransitionInTiming?: number;
    backdropTransitionOutTiming?: number;
    animationIn?: string | object;
    animationInTiming?: number;
    animationOut?: string | object;
    animationOutTiming?: number;
    avoidKeyboard?: boolean;
    coverScreen?: boolean;
    deviceHeight?: number;
    deviceWidth?: number;
    hideModalContentWhileAnimating?: boolean;
    propagateSwipe?: boolean;
    scrollOffset?: number;
    scrollOffsetMax?: number;
    scrollTo?: (offset: { x: number; y: number }) => void;
    scrollHorizontal?: boolean;
    statusBarTranslucent?: boolean;
    supportedOrientations?: Array<'portrait' | 'portrait-upside-down' | 'landscape' | 'landscape-left' | 'landscape-right'>;
    swipeDirection?: 'up' | 'down' | 'left' | 'right' | Array<'up' | 'down' | 'left' | 'right'>;
    swipeThreshold?: number;
    useNativeDriver?: boolean;
    useNativeDriverForBackdrop?: boolean;
    customBackdrop?: React.ReactNode;
    children?: React.ReactNode;
    style?: ViewStyle;
  }

  export default class Modal extends Component<ModalProps> {}
}

declare module '@react-native-community/slider' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface SliderProps extends ViewProps {
    value?: number;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
    thumbImage?: any;
    trackImage?: any;
    minimumTrackImage?: any;
    maximumTrackImage?: any;
    inverted?: boolean;
    vertical?: boolean;
    onValueChange?: (value: number) => void;
    onSlidingStart?: (value: number) => void;
    onSlidingComplete?: (value: number) => void;
    testID?: string;
    accessibilityLabel?: string;
  }

  export default class Slider extends Component<SliderProps> {}
}

declare module 'react-native-swipeable' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface SwipeableProps extends ViewProps {
    leftContent?: React.ReactNode;
    rightContent?: React.ReactNode;
    leftButtons?: React.ReactNode[];
    rightButtons?: React.ReactNode[];
    leftActionActivationDistance?: number;
    rightActionActivationDistance?: number;
    leftButtonWidth?: number;
    rightButtonWidth?: number;
    onLeftActionActivate?: () => void;
    onRightActionActivate?: () => void;
    onLeftActionDeactivate?: () => void;
    onRightActionDeactivate?: () => void;
    onLeftActionRelease?: () => void;
    onRightActionRelease?: () => void;
    onLeftActionComplete?: () => void;
    onRightActionComplete?: () => void;
    onSwipeStart?: () => void;
    onSwipeRelease?: () => void;
    swipeStartMinDistance?: number;
    bounceOnMount?: boolean;
  }

  export default class Swipeable extends Component<SwipeableProps> {
    public recenter(): void;
  }
}

declare module 'react-native-share' {
  export interface ShareOptions {
    title?: string;
    message?: string;
    url?: string;
    urls?: string[];
    type?: string;
    subject?: string;
    email?: string;
    recipient?: string;
    social?: 'facebook' | 'twitter' | 'whatsapp' | 'instagram' | 'email' | 'sms';
    failOnCancel?: boolean;
    showAppsToView?: boolean;
  }

  export interface ShareSingleOptions extends ShareOptions {
    social: 'facebook' | 'twitter' | 'whatsapp' | 'instagram' | 'email' | 'sms';
  }

  export interface ShareResponse {
    success: boolean;
    message?: string;
  }

  export default class Share {
    public static open(options: ShareOptions): Promise<ShareResponse>;
    public static shareSingle(options: ShareSingleOptions): Promise<ShareResponse>;
  }
}

declare module 'react-native-voice' {
  export interface SpeechStartEvent {
    error?: boolean;
  }

  export interface SpeechEndEvent {
    error?: boolean;
  }

  export interface SpeechResultsEvent {
    value?: string[];
  }

  export interface SpeechErrorEvent {
    error?: {
      code?: string;
      message?: string;
    };
  }

  export interface SpeechVolumeEvent {
    value?: number;
  }

  class Voice {
    public static onSpeechStart: ((e: SpeechStartEvent) => void) | null;
    public static onSpeechEnd: ((e: SpeechEndEvent) => void) | null;
    public static onSpeechResults: ((e: SpeechResultsEvent) => void) | null;
    public static onSpeechPartialResults: ((e: SpeechResultsEvent) => void) | null;
    public static onSpeechError: ((e: SpeechErrorEvent) => void) | null;
    public static onSpeechVolumeChanged: ((e: SpeechVolumeEvent) => void) | null;
    public static isAvailable(): Promise<boolean>;
    public static start(locale: string, options?: any): Promise<void>;
    public static stop(): Promise<void>;
    public static cancel(): Promise<void>;
    public static destroy(): Promise<void>;
    public static removeAllListeners(): void;
    public static isRecognizing(): Promise<boolean>;
  }

  export default Voice;
}
