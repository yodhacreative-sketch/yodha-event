import React from "react";
import { Maximize2, Minimize2, Settings, Volume2, VolumeX, Sparkles, Paintbrush } from "lucide-react";
import { CustomHomeDesign, PartyConfig, ThemeMode, WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface HeaderProps {
  themeMode?: ThemeMode;
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  customDesign?: CustomHomeDesign;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenAdmin: () => void;
  onOpenStudio?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  themeMode = "wedding",
  weddingConfig,
  partyConfig,
  customDesign,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  onOpenAdmin,
  onOpenStudio,
}) => {
  const isParty = themeMode === "party";
  const isCustom = themeMode === "custom" && Boolean(customDesign);

  const brandTitle =
    isCustom
      ? customDesign?.headerBrandText || "Custom Photobooth"
      : isParty
      ? "RAICAB BANJAR V • PHOTOBOOTH"
      : "Wedding Photobooth";

  const brandSubtitle =
    isCustom
      ? customDesign?.headerSubtitleText || "Photobooth"
      : isParty
      ? partyConfig?.eventName || "RAIMUNA CABANG V BANJARNEGARA"
      : `${weddingConfig.brideName} & ${weddingConfig.groomName}`;

  return (
    <header className={`w-full px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between z-30 select-none shrink-0 gap-2 transition-colors ${
      isParty
        ? "bg-white/85 backdrop-blur-md border-b border-orange-200/60 shadow-sm"
        : ""
    }`}>
      {/* Left: Branding */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {isCustom && customDesign ? (
          <>
            {customDesign.showLogo && customDesign.logoUrl ? (
              <div className="h-8 sm:h-9 px-1.5 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0 border border-orange-200">
                <img
                  src={customDesign.logoUrl}
                  alt="Logo"
                  className="h-6 sm:h-7 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#FF7A00] to-[#00A3E0] flex items-center justify-center text-white shadow-sm shrink-0">
                <Sparkles size={16} />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold tracking-[0.16em] text-[9px] sm:text-[11px] text-[#FF7A00] uppercase truncate">
                {brandTitle}
              </span>
              <span className="font-black text-sm sm:text-base text-slate-800 leading-tight truncate max-w-[140px] sm:max-w-[280px] md:max-w-none">
                {brandSubtitle}
              </span>
            </div>
          </>
        ) : isParty ? (
          <>
            <div className="h-8 sm:h-9 px-1.5 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0 border border-orange-200">
              <img
                src="/assets/raicab/logo-raicab-banjar.png"
                alt="RAICAB BANJAR V"
                className="h-6 sm:h-7 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold tracking-[0.16em] text-[9px] sm:text-[11px] text-[#FF7A00] uppercase truncate">
                RAICAB BANJAR V • PHOTOBOOTH
              </span>
              <span className="font-black text-sm sm:text-base text-slate-800 leading-tight truncate max-w-[140px] sm:max-w-[280px] md:max-w-none">
                {partyConfig?.eventName || "RAIMUNA CABANG V BANJARNEGARA"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-amber-400/50 flex items-center justify-center bg-amber-950/30 shadow-[0_0_12px_rgba(212,175,55,0.2)] shrink-0">
              <span className="font-script text-lg sm:text-xl text-amber-300">
                {weddingConfig.brideName.charAt(0)}&{weddingConfig.groomName.charAt(0)}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-cinzel tracking-[0.15em] sm:tracking-[0.2em] text-[9px] sm:text-[11px] text-amber-200/70 uppercase truncate">
                Wedding Photobooth
              </span>
              <span className="font-script text-base sm:text-xl text-amber-100 leading-tight truncate max-w-[140px] sm:max-w-[280px] md:max-w-none">
                {weddingConfig.brideName} & {weddingConfig.groomName}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Quick Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Sound toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onToggleSound();
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isParty
              ? "text-purple-900 hover:text-[#622599] bg-white/90 hover:bg-white border border-purple-200 shadow-sm"
              : "text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20"
          }`}
          title={soundEnabled ? "Mute Suara" : "Aktifkan Suara"}
        >
          {soundEnabled ? (
            <Volume2 size={16} className={isParty ? "text-[#622599]" : undefined} />
          ) : (
            <VolumeX size={16} className={isParty ? "text-slate-400" : "text-stone-500"} />
          )}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onToggleFullscreen();
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isParty
              ? "text-purple-900 hover:text-[#622599] bg-white/90 hover:bg-white border border-purple-200 shadow-sm"
              : "text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20"
          }`}
          title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
        >
          {isFullscreen ? (
            <Minimize2 size={16} className={isParty ? "text-[#622599]" : undefined} />
          ) : (
            <Maximize2 size={16} className={isParty ? "text-[#622599]" : undefined} />
          )}
        </button>

        {/* Admin Gear */}
        <button
          onClick={() => {
            soundFx.playChime();
            onOpenAdmin();
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isParty
              ? "text-purple-900 hover:text-[#622599] bg-white/90 hover:bg-white border border-purple-200 shadow-sm"
              : "text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20"
          }`}
          title="Pengaturan Admin"
        >
          <Settings size={16} className={isParty ? "text-[#622599]" : undefined} />
        </button>
      </div>
    </header>
  );
};
