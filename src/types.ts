export type Screen =
  | "home"
  | "layout"
  | "frame"
  | "filter"
  | "shoot"
  | "review"
  | "result";

export type LayoutId = "1x1" | "2x1" | "3x1" | "2x2" | "3x2" | "4x2";

export interface LayoutConfig {
  id: LayoutId;
  name: string;
  subtitle: string;
  rows: number;
  cols: number;
  totalPhotos: number;
  totalBoxes?: number;
  isMirrored?: boolean;
  paperSizeLabel: string;
  badge: string;
  aspectRatio: string;
}

export type ThemeMode = "wedding" | "party" | "custom";

export type FrameThemeId =
  | "royal_gold"
  | "rose_floral"
  | "botanical_sage"
  | "midnight_star"
  | "minimal_ivory"
  | "party_neon"
  | "candy_pop"
  | "retro_vibes"
  | "cyber_glow"
  | "sunset_vibes"
  | "scout_purple"
  | "custom";

export interface WeddingFramePreset {
  id: FrameThemeId;
  name: string;
  description: string;
  bgGradient: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
  secondaryTextColor: string;
  headerStyle: "ornament" | "flourish" | "minimal" | "botanical";
  previewClass: string;
}
export interface PhotoBox {
  id: string;
  x: number; // percentage (0 - 100)
  y: number;
  w: number;
  h: number;
}

export interface FrameSlot {
  id: string; // "slot_1" | "slot_2" | "slot_3" | custom id
  name: string;
  layoutId: LayoutId;
  customImage?: string;
  previewImage?: string;
  presetThemeId: FrameThemeId;
  enabled?: boolean;
  presetId?: string;
  photoBoxes?: PhotoBox[];
}
export interface CameraFilter {
  id: string;
  name: string;
  css: string;
  desc: string;
  emoji: string;
}

export interface WeddingConfig {
  groomName: string;
  brideName: string;
  weddingDate: string;
  venueText: string;
  hashtag: string;
  footerText: string;
}

export interface PartyConfig {
  title: string;
  subtitle: string;
  eventName: string;
  eventDate: string;
  hashtag: string;
  footerText: string;
}

export interface DriveConfig {
  appsScriptUrl: string;
  driveFolderUrl: string;
  autoUpload: boolean;
}

export interface BoothSettings {
  themeMode?: ThemeMode;
  countdownDuration: number;
  autoResetDuration: number;
  soundEnabled: boolean;
  mirrorCamera: boolean;
  adminPin: string;
  defaultPrintCopies: number;
  selectedCameraId?: string;
  kioskFullscreen: boolean;
  autoPrint?: boolean;
  screenRotation?: 0 | 90 | 180 | 270;
  cameraRotation?: 0 | 90 | 180 | 270;
  printMarginX?: number; // mm (margin aman kanan-kiri kertas print)
  printMarginY?: number; // mm (margin aman atas-bawah kertas print)
}

export interface CustomTemplate {
  id: string;
  name: string;
  layout: LayoutId;
  imageUrl: string; // PNG transparent overlay
  createdAt: number;
}

export interface SavedSession {
  id: string;
  timestamp: number;
  dateStr: string;
  layout: LayoutId;
  frameTheme: string;
  stripDataUrl: string;
  driveUploadStatus: "success" | "error" | "pending" | "none";
}

export interface CanvasElement {
  id: string;
  type: "image" | "text" | "sticker";
  name?: string;
  x: number; // percentage (0 - 100) or px offset
  y: number; // percentage (0 - 100) or px offset
  width?: number; // px
  height?: number; // px
  content: string; // image url / base64 or text content
  color?: string;
  fontSize?: number; // px
  fontWeight?: string;
  fontFamily?: "sans" | "serif" | "script" | "cinzel" | "mono";
  backgroundColor?: string;
  borderRadius?: number;
  rotation?: number; // degrees
  zIndex?: number;
}

export interface CustomHomeDesign {
  id: string;
  name: string; // e.g. "RAICAB BANJAR V" or "Wedding Sarah & Kevin"
  isActive?: boolean;
  createdAt?: number;
  updatedAt?: number;

  // Freeform Canva drag & drop offsets (in px)
  logoOffset?: { x: number; y: number };
  subtitleOffset?: { x: number; y: number };
  titleOffset?: { x: number; y: number };
  tagsOffset?: { x: number; y: number };
  buttonOffset?: { x: number; y: number };
  titleScale?: number;
  buttonScale?: number;
  customElements?: CanvasElement[];

  // Background
  bgType: "color" | "gradient" | "image";
  bgColor?: string; // hex e.g. "#f8fafc" or "#0c0e12"
  bgGradient?: string; // e.g. "linear-gradient(135deg, #622599 0%, #0094B4 100%)"
  bgImageUrl?: string; // custom background image url / base64
  bgOverlayOpacity?: number; // 0 - 100 (in percent)
  bgOverlayColor?: string; // e.g. "#000000" or "#ffffff"
  bgBlur?: number; // 0 - 20 (in px)
  showAmbientRings?: boolean;
  ambientRingColor?: string;

  // Center Badge / Logo
  showLogo?: boolean;
  logoUrl?: string; // image url / base64
  logoShape?: "circle" | "rounded" | "square" | "none";
  logoBorderColor?: string;
  logoBorderWidth?: number; // px
  logoSize?: number; // px (e.g. 110)
  logoBadgeText?: string; // e.g. "RAICAB V 2026"
  logoBadgeBgColor?: string;
  logoBadgeTextColor?: string;

  // Subtitle / Pill
  showSubtitle?: boolean;
  subtitleText?: string; // e.g. "KWARTIR CABANG BANJARNEGARA"
  subtitleTextColor?: string;
  subtitleBgColor?: string;
  subtitleBorderColor?: string;

  // Main Event Title
  titleText: string; // e.g. "RAIMUNA CABANG V BANJARNEGARA"
  titleColorType?: "solid" | "gradient";
  titleColor?: string; // hex
  titleGradient?: string; // CSS gradient
  titleFontFamily?: "sans" | "serif" | "script" | "cinzel" | "mono";
  titleFontSize?: "normal" | "large" | "xlarge";

  // Event Badges / Tags (Date & Hashtag)
  showDateTag?: boolean;
  dateText?: string; // e.g. "Tahun 2026"
  dateTextColor?: string;
  dateBgColor?: string;
  dateBorderColor?: string;

  showHashtagTag?: boolean;
  hashtagText?: string; // e.g. "#RaicabBanjarV #PramukaBanjarnegara"
  hashtagTextColor?: string;
  hashtagBgColor?: string;
  hashtagBorderColor?: string;

  // CTA Start Button
  buttonText?: string; // e.g. "Sentuh Layar untuk Mulai"
  buttonIcon?: "camera" | "sparkles" | "heart" | "arrow" | "none";
  buttonBgType?: "gradient" | "solid";
  buttonBgColor?: string;
  buttonBgGradient?: string; // e.g. "linear-gradient(90deg, #622599 0%, #EF5000 100%)"
  buttonTextColor?: string;
  buttonShape?: "pill" | "rounded" | "box";
  buttonShadow?: boolean;
  buttonShadowColor?: string;

  // Header & Footer
  headerBrandText?: string; // e.g. "RAICAB BANJAR V • PHOTOBOOTH"
  headerSubtitleText?: string; // e.g. "RAIMUNA CABANG V BANJARNEGARA"
  footerText?: string; // e.g. "WORLD SCOUTING EVENT - YODHA PHOTOBOOTH"
  footerTextColor?: string;
}

export interface FirebaseSyncConfig {
  databaseUrl: string; // e.g. "https://my-photobooth-default-rtdb.firebaseio.com"
  authToken?: string; // optional Database Secret or leave empty if public rules
  enabled: boolean;
  lastSyncedAt?: number;
}
