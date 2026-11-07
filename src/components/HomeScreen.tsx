import React, { useEffect } from "react";
import { Camera, Heart, Sparkles, PartyPopper, ArrowRight } from "lucide-react";
import { CustomHomeDesign, PartyConfig, ThemeMode, WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface HomeScreenProps {
  themeMode?: ThemeMode;
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  customDesign?: CustomHomeDesign;
  onStart: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  themeMode = "wedding",
  weddingConfig,
  partyConfig,
  customDesign,
  onStart,
}) => {
  // Listen for Spacebar key to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        soundFx.playChime();
        onStart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStart]);

  const handleStartClick = () => {
    soundFx.playChime();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    onStart();
  };

  // ----------------------------------------------------
  // TEMA CUSTOM DIY BUILDER (DARI GOOGLE DRIVE / ONLINE / LOCAL)
  // ----------------------------------------------------
  if (themeMode === "custom" && customDesign) {
    const d = customDesign;
    if (d) {
      const getFontFamilyClass = () => {
        if (d.titleFontFamily === "script") return "font-script";
        if (d.titleFontFamily === "cinzel") return "font-cinzel";
        if (d.titleFontFamily === "serif") return "font-serif";
        if (d.titleFontFamily === "mono") return "font-mono";
        return "font-sans";
      };

      const getTitleSizeClass = () => {
        if (d.titleFontSize === "normal") return "text-4xl sm:text-5xl md:text-6xl";
        if (d.titleFontSize === "xlarge") return "text-6xl sm:text-7xl md:text-8xl lg:text-9xl";
        return "text-5xl sm:text-6xl md:text-7xl lg:text-8xl";
      };

      const renderIcon = () => {
        if (d.buttonIcon === "sparkles") return <Sparkles size={24} className="group-hover:scale-115 transition-transform drop-shadow" />;
        if (d.buttonIcon === "heart") return <Heart size={24} className="group-hover:scale-115 transition-transform drop-shadow" />;
        if (d.buttonIcon === "arrow") return <ArrowRight size={24} className="group-hover:scale-115 transition-transform drop-shadow" />;
        if (d.buttonIcon === "none") return null;
        return <Camera size={26} className="group-hover:scale-115 transition-transform drop-shadow" />;
      };

      const getButtonShapeClass = () => {
        if (d.buttonShape === "box") return "rounded-xl";
        if (d.buttonShape === "rounded") return "rounded-2xl";
        return "rounded-full";
      };

      const bgStyle: React.CSSProperties = {};
      if (d.bgType === "image" && d.bgImageUrl) {
        bgStyle.backgroundImage = `url(${d.bgImageUrl})`;
        bgStyle.backgroundSize = "cover";
        bgStyle.backgroundPosition = "center";
        bgStyle.backgroundRepeat = "no-repeat";
      } else if (d.bgType === "gradient" && d.bgGradient) {
        bgStyle.background = d.bgGradient;
      } else if (d.bgColor) {
        bgStyle.backgroundColor = d.bgColor;
      }

      return (
        <div
          className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative text-center overflow-hidden select-none"
          style={bgStyle}
        >
          {/* Background Overlay (If Image with Opacity) */}
          {d.bgType === "image" && (d.bgOverlayOpacity ?? 0) > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: d.bgOverlayColor || "#000000",
                opacity: (d.bgOverlayOpacity || 0) / 100,
              }}
            />
          )}

          {/* Ambient Rings */}
          {d.showAmbientRings && (
            <>
              <div
                className="absolute w-[520px] h-[520px] rounded-full border pointer-events-none animate-[pulse_4s_ease-in-out_infinite]"
                style={{ borderColor: d.ambientRingColor || "rgba(98,37,153,0.3)" }}
              />
              <div
                className="absolute w-[700px] h-[700px] rounded-full border pointer-events-none"
                style={{ borderColor: d.ambientRingColor || "rgba(0,148,180,0.2)" }}
              />
            </>
          )}

          {/* Center Logo / Badge */}
          {d.showLogo && (
            <div
              className="relative mb-6 z-10 transition-transform duration-75"
              style={{
                transform: `translate(${d.logoOffset?.x || 0}px, ${d.logoOffset?.y || 0}px)`,
              }}
            >
              <div
                className={`overflow-hidden flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
                  d.logoShape === "circle"
                    ? "rounded-full"
                    : d.logoShape === "rounded"
                    ? "rounded-2xl"
                    : d.logoShape === "square"
                    ? "rounded-none"
                    : ""
                }`}
                style={{
                  width: `${d.logoSize || 120}px`,
                  height: `${d.logoSize || 120}px`,
                  border: d.logoBorderWidth ? `${d.logoBorderWidth}px solid ${d.logoBorderColor || "#ffffff"}` : undefined,
                  backgroundColor: "#ffffff",
                }}
              >
                {d.logoUrl ? (
                  <img
                    src={d.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Sparkles size={40} className="text-amber-500" />
                )}
              </div>

              {/* Sub-badge under logo */}
              {d.logoBadgeText && (
                <div
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-md border whitespace-nowrap"
                  style={{
                    backgroundColor: d.logoBadgeBgColor || "#2E0E4C",
                    borderColor: d.logoBorderColor || "#F9B708",
                    color: d.logoBadgeTextColor || "#F9B708",
                  }}
                >
                  <Sparkles size={11} className="animate-spin text-current" />
                  <span className="text-[10px] font-black tracking-widest uppercase">
                    {d.logoBadgeText}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Subtitle Pill */}
          {d.showSubtitle && d.subtitleText && (
            <div
              className="flex items-center gap-3 mb-2 z-10 max-w-full transition-transform duration-75"
              style={{
                transform: `translate(${d.subtitleOffset?.x || 0}px, ${d.subtitleOffset?.y || 0}px)`,
              }}
            >
              <div
                className="w-8 sm:w-12 h-[2px]"
                style={{
                  background: `linear-gradient(to right, transparent, ${d.subtitleTextColor || "#622599"})`,
                }}
              />
              <span
                className="px-5 py-1.5 rounded-full font-black tracking-[0.18em] text-xs sm:text-sm uppercase shadow-sm border truncate max-w-[85vw]"
                style={{
                  backgroundColor: d.subtitleBgColor || "#ffffff",
                  color: d.subtitleTextColor || "#622599",
                  borderColor: d.subtitleBorderColor || "rgba(98,37,153,0.3)",
                }}
              >
                {d.subtitleText}
              </span>
              <div
                className="w-8 sm:w-12 h-[2px]"
                style={{
                  background: `linear-gradient(to left, transparent, ${d.subtitleTextColor || "#622599"})`,
                }}
              />
            </div>
          )}

          {/* Main Title Heading */}
          <h1
            className={`${getFontFamilyClass()} ${getTitleSizeClass()} font-black py-2 px-6 my-1 drop-shadow-sm leading-tight tracking-tight z-10 max-w-full overflow-visible break-words transition-transform duration-75`}
            style={{
              ...(d.titleColorType === "gradient" && d.titleGradient
                ? {
                    background: d.titleGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }
                : {
                    color: d.titleColor || "#1e293b",
                  }),
              transform: `translate(${d.titleOffset?.x || 0}px, ${d.titleOffset?.y || 0}px) ${
                d.titleScale && d.titleScale !== 1 ? `scale(${d.titleScale})` : ""
              }`,
            }}
          >
            {d.titleText}
          </h1>

          {/* Date & Hashtag Badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm tracking-wider font-bold mt-2 mb-10 z-10 transition-transform duration-75"
            style={{
              transform: `translate(${d.tagsOffset?.x || 0}px, ${d.tagsOffset?.y || 0}px)`,
            }}
          >
            {d.showDateTag && d.dateText && (
              <span
                className="px-4 py-1.5 rounded-full border shadow-sm"
                style={{
                  backgroundColor: d.dateBgColor || "#ffffff",
                  color: d.dateTextColor || "#0094B4",
                  borderColor: d.dateBorderColor || "rgba(0,148,180,0.4)",
                }}
              >
                {d.dateText}
              </span>
            )}
            {d.showDateTag && d.showHashtagTag && (
              <span className="text-slate-400 font-bold">•</span>
            )}
            {d.showHashtagTag && d.hashtagText && (
              <span
                className="px-4 py-1.5 rounded-full border shadow-sm"
                style={{
                  backgroundColor: d.hashtagBgColor || "#ffffff",
                  color: d.hashtagTextColor || "#622599",
                  borderColor: d.hashtagBorderColor || "rgba(98,37,153,0.4)",
                }}
              >
                {d.hashtagText}
              </span>
            )}
          </div>

          {/* CTA Start Button */}
          <div
            className="z-10 transition-transform duration-75"
            style={{
              transform: `translate(${d.buttonOffset?.x || 0}px, ${d.buttonOffset?.y || 0}px) ${
                d.buttonScale && d.buttonScale !== 1 ? `scale(${d.buttonScale})` : ""
              }`,
            }}
          >
            <button
              onClick={handleStartClick}
              className={`px-10 py-4 sm:px-16 sm:py-5 flex items-center justify-center gap-3 text-base sm:text-lg font-bold group cursor-pointer transition-all active:scale-95 ${getButtonShapeClass()}`}
              style={{
                background:
                  d.buttonBgType === "gradient" && d.buttonBgGradient
                    ? d.buttonBgGradient
                    : d.buttonBgColor || "#EF5000",
                color: d.buttonTextColor || "#ffffff",
                boxShadow: d.buttonShadow
                  ? `0 10px 30px ${d.buttonShadowColor || "rgba(0,0,0,0.3)"}`
                  : undefined,
              }}
            >
              {renderIcon()}
              <span>{d.buttonText || "Sentuh Layar untuk Mulai"}</span>
            </button>
          </div>

          {/* Custom Freeform Canva Elements (Stickers, Images, Additional Texts) */}
          {d.customElements &&
            d.customElements.map((el) => {
              const elStyle: React.CSSProperties = {
                position: "absolute",
                left: `${el.x}%`,
                top: `${el.y}%`,
                transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                zIndex: el.zIndex || 15,
              };

              if (el.type === "image" || el.type === "sticker") {
                return (
                  <div key={el.id} style={elStyle} className="pointer-events-none drop-shadow-lg">
                    <img
                      src={el.content}
                      alt={el.name || "Sticker"}
                      style={{
                        width: el.width ? `${el.width}px` : "130px",
                        height: el.height ? `${el.height}px` : "auto",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                );
              }

              if (el.type === "text") {
                return (
                  <div
                    key={el.id}
                    style={{
                      ...elStyle,
                      color: el.color || "#1e293b",
                      fontSize: el.fontSize ? `${el.fontSize}px` : "16px",
                      fontWeight: el.fontWeight || "bold",
                      backgroundColor: el.backgroundColor || "transparent",
                      borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                      padding: el.backgroundColor ? "4px 12px" : undefined,
                    }}
                    className="pointer-events-none drop-shadow select-none whitespace-pre-wrap"
                  >
                    {el.content}
                  </div>
                );
              }
              return null;
            })}
        </div>
      );
    }
  }

  // ----------------------------------------------------
  // TEMA BEBAS / RAIMUNA CABANG V BANJARNEGARA
  // ----------------------------------------------------
  if (themeMode === "party") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative text-center overflow-hidden">
        {/* Soft Colorful Background Ambient Rings (Ringan tanpa heavy blur / continuous repaint) */}
        <div className="absolute w-[520px] h-[520px] rounded-full border border-orange-300/30 pointer-events-none" />
        <div className="absolute w-[700px] h-[700px] rounded-full border border-sky-300/25 pointer-events-none" />
        <div className="absolute w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-orange-400/10 via-amber-300/10 to-sky-400/10 pointer-events-none" />

        {/* Mascot Putra (Left Side) */}
        <div className="hidden lg:block absolute left-8 bottom-4 w-40 xl:w-48 z-10 pointer-events-none drop-shadow-xl animate-fade-in hover:scale-105 transition-transform">
          <img
            src="/assets/raicab/maskot-putra.png"
            alt="Maskot Putra Raicab Banjar V"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Mascot Putri (Right Side) */}
        <div className="hidden lg:block absolute right-8 bottom-4 w-40 xl:w-48 z-10 pointer-events-none drop-shadow-xl animate-fade-in hover:scale-105 transition-transform">
          <img
            src="/assets/raicab/maskot-putri.png"
            alt="Maskot Putri Raicab Banjar V"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Official Raicab V Banjarnegara Logo */}
        <div className="relative mb-5 z-20">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-[3px] bg-gradient-to-tr from-[#FF7A00] via-[#F9B708] to-[#00A3E0] shadow-[0_10px_35px_rgba(255,122,0,0.3)] hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-3xl bg-white p-2 flex items-center justify-center overflow-hidden border border-white/60 shadow-inner">
              <img
                src="/assets/raicab/logo-raicab-banjar.png"
                alt="Logo Resmi Raimuna Cabang V Banjarnegara"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          </div>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#FF7A00] px-4 py-0.5 rounded-full border-2 border-white flex items-center gap-1.5 shadow-md whitespace-nowrap">
            <Sparkles size={12} className="text-white" />
            <span className="text-[10px] font-black tracking-widest text-white uppercase">RAICAB V 2026</span>
          </div>
        </div>

        {/* Subtitle with Bright Scout Pill */}
        <div className="flex items-center gap-3 mb-2 z-20">
          <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-[#FF7A00]" />
          <span className="px-5 py-1.5 rounded-full bg-white border-2 border-orange-200 text-[#FF7A00] font-black tracking-[0.2em] text-xs sm:text-sm uppercase shadow-sm">
            {partyConfig?.subtitle || "KWARTIR CABANG BANJARNEGARA"}
          </span>
          <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-[#FF7A00]" />
        </div>

        {/* Event Name */}
        <h1 className="font-sans font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl py-2 px-6 my-1 drop-shadow-sm overflow-visible leading-tight tracking-tight z-20"
            style={{
              background: "linear-gradient(135deg, #FF7A00 0%, #00A3E0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
        >
          {partyConfig?.eventName || "RAIMUNA CABANG V BANJARNEGARA"}
        </h1>

        {/* Date & Hashtag */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm tracking-wider font-bold text-slate-700 mt-2 mb-10 z-20">
          <span className="px-4 py-1.5 rounded-full bg-white border border-[#00A3E0]/40 text-[#00A3E0] shadow-sm">
            {partyConfig?.eventDate || "Tahun 2026"}
          </span>
          <span className="text-slate-400">•</span>
          <span className="px-4 py-1.5 rounded-full bg-white border border-[#FF7A00]/40 text-[#FF7A00] shadow-sm">
            {partyConfig?.hashtag || "#RaicabBanjarV #PramukaBanjarnegara"}
          </span>
        </div>

        {/* Bright Raicab Button */}
        <button
          onClick={handleStartClick}
          className="px-12 py-5 sm:px-16 sm:py-6 rounded-full flex items-center justify-center gap-3 text-base sm:text-lg font-bold group cursor-pointer shadow-[0_8px_30px_rgba(255,122,0,0.35)] transition-all hover:scale-105 active:scale-95 z-20 text-white"
          style={{
            background: "linear-gradient(90deg, #FF7A00 0%, #00A3E0 100%)",
          }}
        >
          <Camera size={26} className="text-white group-hover:scale-115 transition-transform drop-shadow" />
          <span>Sentuh Layar untuk Mulai</span>
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // TEMA WEDDING (ELEGAN & EMAS)
  // ----------------------------------------------------
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative text-center">
      {/* Background Decorative Rings */}
      <div className="absolute w-[500px] h-[500px] rounded-full border border-amber-400/10 pointer-events-none animate-[pulse_6s_ease-in-out_infinite]" />
      <div className="absolute w-[680px] h-[680px] rounded-full border border-amber-400/5 pointer-events-none" />

      {/* Wedding Monogram Seal */}
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-amber-400/40 p-1 flex items-center justify-center bg-gradient-to-b from-amber-950/40 to-stone-900/60 shadow-[0_0_35px_rgba(212,175,55,0.25)]">
          <div className="w-full h-full rounded-full border border-amber-400/30 flex items-center justify-center">
            <span className="font-script text-3xl sm:text-4xl text-amber-300">
              {weddingConfig.brideName.charAt(0)}&{weddingConfig.groomName.charAt(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Subtitle Pill */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-amber-400/60" />
        <span className="px-5 py-1.5 rounded-full bg-amber-950/30 border border-amber-400/30 text-amber-300/80 font-cinzel text-xs tracking-[0.2em] uppercase">
          The Wedding Celebration
        </span>
        <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-amber-400/60" />
      </div>

      {/* Bride & Groom Name */}
      <h1 className="font-script text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-amber-100 py-3 px-6 my-1 drop-shadow leading-tight overflow-visible">
        {weddingConfig.brideName} & {weddingConfig.groomName}
      </h1>

      {/* Date */}
      <p className="font-cinzel text-sm sm:text-base tracking-[0.25em] text-amber-200/60 uppercase mt-2 mb-10">
        {weddingConfig.eventDate}
      </p>

      {/* Wedding Button */}
      <button
        onClick={handleStartClick}
        className="px-10 py-4 sm:px-14 sm:py-5 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-900/50 via-amber-800/40 to-amber-900/50 hover:from-amber-800/60 hover:to-amber-700/60 text-amber-100 flex items-center justify-center gap-3 text-base sm:text-lg font-cinzel font-semibold tracking-widest uppercase cursor-pointer shadow-[0_0_30px_rgba(212,175,55,0.25)] transition-all hover:scale-105 active:scale-95"
      >
        <Heart size={20} className="text-amber-400 animate-pulse" />
        <span>Sentuh Layar untuk Mulai</span>
      </button>
    </div>
  );
};

export default HomeScreen;
