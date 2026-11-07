import React, { useState, useEffect } from "react";
import {
  Camera,
  Heart,
  Sparkles,
  PartyPopper,
  ArrowRight,
  Move,
  RotateCcw,
  Trash2,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { CanvasElement, CustomHomeDesign, PartyConfig, ThemeMode, WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";
import { saveCustomDesigns, loadCustomDesigns, pushToServer } from "../lib/storage";

interface HomeScreenProps {
  themeMode?: ThemeMode;
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  customDesign?: CustomHomeDesign;
  onStart: () => void;
  onOpenStudio?: () => void;
  onUpdateCustomDesign?: (design: CustomHomeDesign) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  themeMode = "wedding",
  weddingConfig,
  partyConfig,
  customDesign,
  onStart,
  onOpenStudio,
  onUpdateCustomDesign,
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

  // Live in-place Canva interactive editing state
  const [currentDesign, setCurrentDesign] = useState<CustomHomeDesign | undefined>(customDesign);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  useEffect(() => {
    setCurrentDesign(customDesign);
  }, [customDesign]);

  // Update & sync local design to storage and server
  const persistDesign = (updated: CustomHomeDesign) => {
    setCurrentDesign(updated);
    const allDesigns = loadCustomDesigns();
    const updatedAll = allDesigns.map((d) =>
      d.id === updated.id ? { ...d, ...updated, updatedAt: Date.now() } : d
    );
    saveCustomDesigns(updatedAll);
    pushToServer({ customDesigns: updatedAll, activeDesignId: updated.id }).catch(() => {});
    if (onUpdateCustomDesign) onUpdateCustomDesign(updated);
  };

  // Handle pointer down for dragging custom stickers / mascot directly on screen
  const handleElementPointerDown = (
    e: React.PointerEvent,
    el: CanvasElement
  ) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();
    e.preventDefault();

    setSelectedElement(el.id);
    setIsEditMode(true);
    soundFx.playPop();

    const container = document.getElementById("kiosk-home-container");
    const containerRect = container ? container.getBoundingClientRect() : null;
    if (!containerRect) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startPctX = el.x;
    const startPctY = el.y;
    let hasMoved = false;

    const onPointerMove = (moveEv: PointerEvent) => {
      hasMoved = true;
      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;

      const pctX = (deltaX / containerRect.width) * 100;
      const pctY = (deltaY / containerRect.height) * 100;

      const newX = Math.max(2, Math.min(98, Math.round((startPctX + pctX) * 10) / 10));
      const newY = Math.max(2, Math.min(98, Math.round((startPctY + pctY) * 10) / 10));

      setCurrentDesign((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          customElements: (prev.customElements || []).map((item) =>
            item.id === el.id ? { ...item, x: newX, y: newY } : item
          ),
        };
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (hasMoved) {
        setCurrentDesign((latest) => {
          if (!latest) return latest;
          persistDesign(latest);
          return latest;
        });
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Handle pointer down for main layout elements (logo, subtitle, title, button)
  const handleLayoutPointerDown = (
    e: React.PointerEvent,
    elementKey: "logo" | "subtitle" | "title" | "tags" | "button",
    currentOffset: { x: number; y: number } = { x: 0, y: 0 }
  ) => {
    if (!isEditMode) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();
    e.preventDefault();

    setSelectedElement(elementKey);
    soundFx.playPop();

    const startX = e.clientX;
    const startY = e.clientY;
    const startOffsetX = currentOffset.x;
    const startOffsetY = currentOffset.y;
    let hasMoved = false;

    const onPointerMove = (moveEv: PointerEvent) => {
      hasMoved = true;
      const deltaX = Math.round(moveEv.clientX - startX);
      const deltaY = Math.round(moveEv.clientY - startY);

      setCurrentDesign((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(elementKey === "logo" && { logoOffset: { x: startOffsetX + deltaX, y: startOffsetY + deltaY } }),
          ...(elementKey === "subtitle" && { subtitleOffset: { x: startOffsetX + deltaX, y: startOffsetY + deltaY } }),
          ...(elementKey === "title" && { titleOffset: { x: startOffsetX + deltaX, y: startOffsetY + deltaY } }),
          ...(elementKey === "tags" && { tagsOffset: { x: startOffsetX + deltaX, y: startOffsetY + deltaY } }),
          ...(elementKey === "button" && { buttonOffset: { x: startOffsetX + deltaX, y: startOffsetY + deltaY } }),
        };
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (hasMoved) {
        setCurrentDesign((latest) => {
          if (!latest) return latest;
          persistDesign(latest);
          return latest;
        });
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Resize custom element
  const resizeElement = (id: string, delta: number) => {
    if (!currentDesign) return;
    const updated = {
      ...currentDesign,
      customElements: (currentDesign.customElements || []).map((item) =>
        item.id === id ? { ...item, width: Math.max(40, Math.min(500, (item.width || 130) + delta)) } : item
      ),
    };
    persistDesign(updated);
    soundFx.playPop();
  };

  // Rotate custom element
  const rotateElement = (id: string) => {
    if (!currentDesign) return;
    const updated = {
      ...currentDesign,
      customElements: (currentDesign.customElements || []).map((item) =>
        item.id === id ? { ...item, rotation: ((item.rotation || 0) + 15) % 360 } : item
      ),
    };
    persistDesign(updated);
    soundFx.playPop();
  };

  // Delete custom element
  const deleteElement = (id: string) => {
    if (!currentDesign) return;
    const updated = {
      ...currentDesign,
      customElements: (currentDesign.customElements || []).map((item) => item.id !== id),
    };
    persistDesign(updated);
    setSelectedElement(null);
    soundFx.playPop();
  };

  // ----------------------------------------------------
  // TEMA CUSTOM DIY BUILDER (DARI GOOGLE DRIVE / ONLINE / LOCAL)
  // ----------------------------------------------------
  if (themeMode === "custom" || currentDesign) {
    const d = currentDesign;
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
          id="kiosk-home-container"
          onClick={() => {
            if (isEditMode) setSelectedElement(null);
          }}
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

          {/* Canva Edit Mode Indicator Banner (at top) */}
          {isEditMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#7D2AE8] text-white px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-pulse border border-purple-300">
              <Move size={14} className="text-yellow-300" />
              <span>Mode Canva Aktif: Klik dan seret (drag) maskot atau elemen ke posisi manapun!</span>
            </div>
          )}

          {/* Center Logo / Badge */}
          {d.showLogo && (
            <div
              onPointerDown={(e) => handleLayoutPointerDown(e, "logo", d.logoOffset || { x: 0, y: 0 })}
              onClick={(e) => {
                if (isEditMode) {
                  e.stopPropagation();
                  setSelectedElement("logo");
                }
              }}
              className={`relative mb-6 z-20 transition-transform duration-75 ${
                isEditMode
                  ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-[#7D2AE8] rounded-2xl"
                  : ""
              } ${selectedElement === "logo" ? "ring-2 ring-[#7D2AE8] rounded-2xl shadow-xl" : ""}`}
              style={{
                transform: `translate(${d.logoOffset?.x || 0}px, ${d.logoOffset?.y || 0}px)`,
                touchAction: isEditMode ? "none" : undefined,
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
                    className="w-full h-full object-contain p-2 pointer-events-none"
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
                  className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-md border whitespace-nowrap pointer-events-none"
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
              onPointerDown={(e) => handleLayoutPointerDown(e, "subtitle", d.subtitleOffset || { x: 0, y: 0 })}
              onClick={(e) => {
                if (isEditMode) {
                  e.stopPropagation();
                  setSelectedElement("subtitle");
                }
              }}
              className={`flex items-center gap-3 mb-2 z-20 max-w-full transition-transform duration-75 ${
                isEditMode
                  ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-[#7D2AE8] rounded-full p-1"
                  : ""
              } ${selectedElement === "subtitle" ? "ring-2 ring-[#7D2AE8] rounded-full shadow-lg p-1" : ""}`}
              style={{
                transform: `translate(${d.subtitleOffset?.x || 0}px, ${d.subtitleOffset?.y || 0}px)`,
                touchAction: isEditMode ? "none" : undefined,
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
          <div
            onPointerDown={(e) => handleLayoutPointerDown(e, "title", d.titleOffset || { x: 0, y: 0 })}
            onClick={(e) => {
              if (isEditMode) {
                e.stopPropagation();
                setSelectedElement("title");
              }
            }}
            className={`z-20 max-w-full transition-transform duration-75 ${
              isEditMode
                ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-[#7D2AE8] rounded-2xl"
                : ""
            } ${selectedElement === "title" ? "ring-2 ring-[#7D2AE8] rounded-2xl shadow-xl" : ""}`}
            style={{
              transform: `translate(${d.titleOffset?.x || 0}px, ${d.titleOffset?.y || 0}px)`,
              touchAction: isEditMode ? "none" : undefined,
            }}
          >
            <h1
              className={`${getFontFamilyClass()} ${getTitleSizeClass()} font-black py-2 px-6 my-1 drop-shadow-sm leading-tight tracking-tight overflow-visible break-words`}
              style={
                d.titleColorType === "gradient" && d.titleGradient
                  ? {
                      background: d.titleGradient,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }
                  : {
                      color: d.titleColor || "#1e293b",
                    }
              }
            >
              {d.titleText}
            </h1>
          </div>

          {/* Date & Hashtag Badges */}
          <div
            onPointerDown={(e) => handleLayoutPointerDown(e, "tags", d.tagsOffset || { x: 0, y: 0 })}
            onClick={(e) => {
              if (isEditMode) {
                e.stopPropagation();
                setSelectedElement("tags");
              }
            }}
            className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm tracking-wider font-bold mt-2 mb-10 z-20 transition-transform duration-75 ${
              isEditMode
                ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-[#7D2AE8] rounded-full p-1"
                : ""
            } ${selectedElement === "tags" ? "ring-2 ring-[#7D2AE8] rounded-full shadow-lg p-1" : ""}`}
            style={{
              transform: `translate(${d.tagsOffset?.x || 0}px, ${d.tagsOffset?.y || 0}px)`,
              touchAction: isEditMode ? "none" : undefined,
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
            onPointerDown={(e) => handleLayoutPointerDown(e, "button", d.buttonOffset || { x: 0, y: 0 })}
            onClick={(e) => {
              if (isEditMode) {
                e.stopPropagation();
                setSelectedElement("button");
              }
            }}
            className={`z-20 transition-transform duration-75 ${
              isEditMode
                ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-[#7D2AE8] rounded-full p-1"
                : ""
            } ${selectedElement === "button" ? "ring-2 ring-[#7D2AE8] rounded-full shadow-xl p-1" : ""}`}
            style={{
              transform: `translate(${d.buttonOffset?.x || 0}px, ${d.buttonOffset?.y || 0}px)`,
              touchAction: isEditMode ? "none" : undefined,
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

          {/* Custom Freeform Canva Elements (Stickers, Mascot, Images) - FULLY INTERACTIVE & DRAGGABLE */}
          {d.customElements &&
            d.customElements.map((el) => {
              const isSelected = selectedElement === el.id;
              const elStyle: React.CSSProperties = {
                position: "absolute",
                left: `${el.x}%`,
                top: `${el.y}%`,
                transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                zIndex: isSelected ? 45 : el.zIndex || 25,
                touchAction: "none",
              };

              return (
                <div
                  key={el.id}
                  style={elStyle}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(el.id);
                    setIsEditMode(true);
                  }}
                  className={`cursor-grab active:cursor-grabbing select-none transition-shadow ${
                    isSelected
                      ? "ring-2 ring-[#7D2AE8] ring-offset-2 ring-offset-white shadow-2xl rounded-xl"
                      : "hover:ring-2 hover:ring-[#7D2AE8]/60 rounded-xl"
                  }`}
                  title={`${el.name || "Elemen"} - Klik & geser untuk memindahkan`}
                >
                  {/* Floating Action Pill Toolbar when element is selected */}
                  {isSelected && (
                    <>
                      <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-40 pointer-events-none shadow-sm" />
                      <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-40 pointer-events-none shadow-sm" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-40 pointer-events-none shadow-sm" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-40 pointer-events-none shadow-sm" />

                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-200 shadow-[0_6px_25px_rgba(0,0,0,0.18)] flex items-center gap-1.5 whitespace-nowrap z-50"
                      >
                        <span className="text-[10px] text-[#7D2AE8] font-bold max-w-[80px] truncate">
                          {el.name || "Stiker"}
                        </span>
                        <div className="h-3 w-px bg-slate-200" />
                        <button
                          onClick={() => resizeElement(el.id, -20)}
                          className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-700 font-bold"
                          title="Perkecil"
                        >
                          -
                        </button>
                        <button
                          onClick={() => resizeElement(el.id, 20)}
                          className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-700 font-bold"
                          title="Perbesar"
                        >
                          +
                        </button>
                        <button
                          onClick={() => rotateElement(el.id)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                          title="Putar 15°"
                        >
                          <RotateCcw size={12} className="rotate-180" />
                        </button>
                        <button
                          onClick={() => deleteElement(el.id)}
                          className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700"
                          title="Hapus dari layar"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}

                  {el.type === "image" || el.type === "sticker" ? (
                    <img
                      src={el.content}
                      alt={el.name || "Sticker"}
                      draggable={false}
                      style={{
                        width: el.width ? `${el.width}px` : "130px",
                        height: el.height ? `${el.height}px` : "auto",
                        objectFit: "contain",
                        pointerEvents: "none",
                      }}
                      className="drop-shadow-lg"
                    />
                  ) : (
                    <div
                      style={{
                        color: el.color || "#1e293b",
                        fontSize: el.fontSize ? `${el.fontSize}px` : "16px",
                        fontWeight: el.fontWeight || "bold",
                        backgroundColor: el.backgroundColor || "transparent",
                        borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                        padding: el.backgroundColor ? "4px 12px" : undefined,
                        pointerEvents: "none",
                      }}
                      className="drop-shadow-sm whitespace-pre-wrap select-none"
                    >
                      {el.content}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Quick Floating Canva Bar in bottom right corner */}
          <div className="absolute bottom-3 right-4 z-40 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundFx.playPop();
                setIsEditMode(!isEditMode);
                if (isEditMode) setSelectedElement(null);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                isEditMode
                  ? "bg-amber-400 text-slate-900 ring-2 ring-amber-500 scale-105"
                  : "bg-white/90 hover:bg-white text-slate-700 border border-slate-300"
              }`}
              title="Aktifkan mode geser elemen langsung di layar"
            >
              <Move size={13} className={isEditMode ? "animate-pulse" : ""} />
              <span>{isEditMode ? "✓ Selesai Geser" : "🎨 Mode Geser Elemen"}</span>
            </button>

            {onOpenStudio && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playChime();
                  onOpenStudio();
                }}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#00C4CC] via-[#7D2AE8] to-[#5433FF] hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer active:scale-95"
                title="Buka Canva DIY Theme Studio lengkap"
              >
                <Sparkles size={13} className="text-yellow-300" />
                <span>Buka Canva Studio Penuh</span>
              </button>
            )}
          </div>
        </div>
      );
    }
  }

  // ----------------------------------------------------
  // TEMA BEBAS / RAIMUNA CABANG V BANJARNEGARA
  // ----------------------------------------------------
  if (themeMode === "party") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative text-center overflow-hidden select-none">
        {/* Soft Colorful Animated Background Ambient Rings */}
        <div className="absolute w-[520px] h-[520px] rounded-full border border-orange-300/40 pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute w-[700px] h-[700px] rounded-full border border-sky-300/30 pointer-events-none" />
        <div className="absolute w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-orange-400/15 via-amber-300/10 to-sky-400/15 blur-3xl pointer-events-none" />

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
            <Sparkles size={12} className="text-white animate-spin" />
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
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative text-center select-none">
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
