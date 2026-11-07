import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Save,
  CloudUpload,
  RefreshCw,
  Plus,
  Copy,
  Trash2,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  Palette,
  Cloud,
  Sparkles,
  Camera,
  Heart,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Monitor,
  Tablet,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Eye,
  Move,
  Upload,
  RotateCcw,
  Layers,
  Search,
  LayoutGrid,
  Smile,
  Shapes,
  Maximize2,
  Lock,
  ChevronDown,
  X,
  FileText,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
} from "lucide-react";
import { CanvasElement, CustomHomeDesign, DriveConfig } from "../types";
import { DEFAULT_CUSTOM_DESIGNS } from "../config";
import {
  saveCustomDesigns,
  loadCustomDesigns,
  setActiveCustomDesignId,
  pushToServer,
} from "../lib/storage";
import {
  saveDesignsToGoogleDrive,
  fetchDesignsFromGoogleDrive,
} from "../lib/googleDrive";
import { soundFx } from "../lib/audio";

interface ThemeStudioProps {
  onBackToKiosk: () => void;
  driveConfig: DriveConfig;
}

type StudioTab =
  | "elements"
  | "typography"
  | "logo"
  | "background"
  | "button"
  | "designs"
  | "cloud";

export const ThemeStudio: React.FC<ThemeStudioProps> = ({
  onBackToKiosk,
  driveConfig,
}) => {
  const [designs, setDesigns] = useState<CustomHomeDesign[]>(() => loadCustomDesigns());
  const [activeId, setActiveId] = useState<string>(() => {
    const list = loadCustomDesigns();
    const active = list.find((d) => d.isActive) || list[0] || DEFAULT_CUSTOM_DESIGNS[0];
    return active.id;
  });

  const [activeTab, setActiveTab] = useState<StudioTab>("elements");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet">("desktop");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const currentDesign = designs.find((d) => d.id === activeId) || designs[0] || DEFAULT_CUSTOM_DESIGNS[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Update a field on the current design
  const updateCurrentDesign = (patch: Partial<CustomHomeDesign>) => {
    setDesigns((prev) => {
      const updated = prev.map((item) =>
        item.id === currentDesign.id
          ? { ...item, ...patch, updatedAt: Date.now() }
          : item
      );
      saveCustomDesigns(updated);
      pushToServer({ customDesigns: updated, activeDesignId: activeId }).catch(() => {});
      return updated;
    });
  };

  // Canva Drag & Drop State
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [newCustomText, setNewCustomText] = useState<string>("");
  const [newCustomTextColor, setNewCustomTextColor] = useState<string>("#1e293b");
  const [newCustomTextBg, setNewCustomTextBg] = useState<string>("transparent");
  const [newCustomTextSize, setNewCustomTextSize] = useState<number>(20);

  const resetOffset = (element: "logo" | "subtitle" | "title" | "tags" | "button") => {
    soundFx.playChime();
    if (element === "logo") updateCurrentDesign({ logoOffset: { x: 0, y: 0 } });
    if (element === "subtitle") updateCurrentDesign({ subtitleOffset: { x: 0, y: 0 } });
    if (element === "title") updateCurrentDesign({ titleOffset: { x: 0, y: 0 } });
    if (element === "tags") updateCurrentDesign({ tagsOffset: { x: 0, y: 0 } });
    if (element === "button") updateCurrentDesign({ buttonOffset: { x: 0, y: 0 } });
    showToast(`✓ Posisi ${element} dikembalikan ke tengah.`);
  };

  const snapElement = (
    element: "title" | "subtitle" | "button" | "logo" | "tags",
    pos: "left" | "center" | "right" | "up" | "down"
  ) => {
    const offsetKey = `${element}Offset` as keyof CustomHomeDesign;
    const current = (currentDesign[offsetKey] as { x: number; y: number }) || { x: 0, y: 0 };
    let newX = current.x;
    let newY = current.y;
    if (pos === "center") {
      newX = 0;
      newY = 0;
    } else if (pos === "left") {
      newX = -150;
    } else if (pos === "right") {
      newX = 150;
    } else if (pos === "up") {
      newY -= 20;
    } else if (pos === "down") {
      newY += 20;
    }

    updateCurrentDesign({ [offsetKey]: { x: newX, y: newY } });
    soundFx.playChime();
    showToast(`✓ Posisi ${element} diperbarui.`);
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    elementId: string,
    currentOffset: { x: number; y: number } = { x: 0, y: 0 },
    isCustom = false,
    customElement?: CanvasElement
  ) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();

    setSelectedElement(elementId);
    if (elementId === "logo") setActiveTab("logo");
    if (elementId === "title" || elementId === "subtitle" || elementId === "tags") setActiveTab("typography");
    if (elementId === "button") setActiveTab("button");
    if (isCustom) setActiveTab("elements");

    soundFx.playPop();

    const canvas = document.getElementById("canva-preview-canvas");
    const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
    if (!canvasRect) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startOffsetX = currentOffset.x;
    const startOffsetY = currentOffset.y;
    const startLeftPercent = customElement?.x ?? 50;
    const startTopPercent = customElement?.y ?? 50;

    let hasMoved = false;
    let rafId: number | null = null;
    let latestEv: PointerEvent | null = null;

    const applyMove = () => {
      if (!latestEv) return;
      const deltaX = latestEv.clientX - startX;
      const deltaY = latestEv.clientY - startY;

      if (isCustom) {
        const pctX = (deltaX / canvasRect.width) * 100;
        const pctY = (deltaY / canvasRect.height) * 100;
        const newX = Math.max(2, Math.min(98, Math.round((startLeftPercent + pctX) * 10) / 10));
        const newY = Math.max(2, Math.min(98, Math.round((startTopPercent + pctY) * 10) / 10));

        setDesigns((prev) =>
          prev.map((item) =>
            item.id === currentDesign.id
              ? {
                  ...item,
                  customElements: (item.customElements || []).map((el) =>
                    el.id === elementId ? { ...el, x: newX, y: newY } : el
                  ),
                }
              : item
          )
        );
      } else {
        const newOffsetX = Math.round(startOffsetX + deltaX);
        const newOffsetY = Math.round(startOffsetY + deltaY);

        setDesigns((prev) =>
          prev.map((item) =>
            item.id === currentDesign.id
              ? {
                  ...item,
                  ...(elementId === "logo" && { logoOffset: { x: newOffsetX, y: newOffsetY } }),
                  ...(elementId === "subtitle" && { subtitleOffset: { x: newOffsetX, y: newOffsetY } }),
                  ...(elementId === "title" && { titleOffset: { x: newOffsetX, y: newOffsetY } }),
                  ...(elementId === "tags" && { tagsOffset: { x: newOffsetX, y: newOffsetY } }),
                  ...(elementId === "button" && { buttonOffset: { x: newOffsetX, y: newOffsetY } }),
                }
              : item
          )
        );
      }
      rafId = null;
    };

    const onPointerMove = (moveEv: PointerEvent) => {
      hasMoved = true;
      moveEv.preventDefault();
      latestEv = moveEv;
      if (!rafId) {
        rafId = requestAnimationFrame(applyMove);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (rafId) {
        cancelAnimationFrame(rafId);
        applyMove();
      }

      if (hasMoved) {
        setDesigns((prev) => {
          saveCustomDesigns(prev);
          pushToServer({ customDesigns: prev, activeDesignId: activeId }).catch(() => {});
          return prev;
        });
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Real Corner Drag-To-Resize for All Elements (Custom, Logo, Title, Button)
  const handleResizeCornerPointerDown = (
    e: React.PointerEvent,
    targetType: "custom" | "logo" | "title" | "button",
    elementId: string,
    corner: "nw" | "ne" | "sw" | "se",
    initialVal: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    soundFx.playPop();

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    let rafId: number | null = null;
    let latestEv: PointerEvent | null = null;

    const applyResize = () => {
      if (!latestEv) return;
      const deltaX = latestEv.clientX - startX;
      const deltaY = latestEv.clientY - startY;

      let delta = 0;
      if (corner === "se") delta = (deltaX + deltaY) / 2;
      else if (corner === "nw") delta = (-deltaX - deltaY) / 2;
      else if (corner === "ne") delta = (deltaX - deltaY) / 2;
      else if (corner === "sw") delta = (-deltaX + deltaY) / 2;

      if (targetType === "custom") {
        const newWidth = Math.max(35, Math.min(650, Math.round(initialVal + delta * 1.4)));
        setDesigns((prev) =>
          prev.map((item) =>
            item.id === currentDesign.id
              ? {
                  ...item,
                  customElements: (item.customElements || []).map((el) =>
                    el.id === elementId ? { ...el, width: newWidth } : el
                  ),
                }
              : item
          )
        );
      } else if (targetType === "logo") {
        const newSize = Math.max(50, Math.min(260, Math.round(initialVal + delta * 1.2)));
        setDesigns((prev) =>
          prev.map((item) =>
            item.id === currentDesign.id ? { ...item, logoSize: newSize } : item
          )
        );
      } else if (targetType === "title") {
        const newScale = Math.max(0.6, Math.min(2.2, Number((initialVal + delta * 0.007).toFixed(2))));
        setDesigns((prev) =>
          prev.map((item) =>
            item.id === currentDesign.id ? { ...item, titleScale: newScale } : item
          )
        );
      } else if (targetType === "button") {
        const newScale = Math.max(0.7, Math.min(1.8, Number((initialVal + delta * 0.007).toFixed(2))));
        setDesigns((prev) =>
          prev.map((item) =>
            item.id === currentDesign.id ? { ...item, buttonScale: newScale } : item
          )
        );
      }
      rafId = null;
    };

    const onPointerMove = (moveEv: PointerEvent) => {
      hasMoved = true;
      moveEv.preventDefault();
      latestEv = moveEv;
      if (!rafId) {
        rafId = requestAnimationFrame(applyResize);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (rafId) {
        cancelAnimationFrame(rafId);
        applyResize();
      }

      if (hasMoved) {
        setDesigns((prev) => {
          saveCustomDesigns(prev);
          pushToServer({ customDesigns: prev, activeDesignId: activeId }).catch(() => {});
          return prev;
        });
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Quick positioning snap
  const snapCustomElement = (
    id: string,
    position: "left-bottom" | "right-bottom" | "center" | "left-top" | "right-top"
  ) => {
    let x = 50;
    let y = 50;
    if (position === "left-bottom") { x = 18; y = 78; }
    if (position === "right-bottom") { x = 82; y = 78; }
    if (position === "center") { x = 50; y = 50; }
    if (position === "left-top") { x = 18; y = 25; }
    if (position === "right-top") { x = 82; y = 25; }

    updateCustomElement(id, { x, y });
    soundFx.playChime();
    showToast(`✓ Posisi elemen dipindahkan.`);
  };

  // Duplicate custom element
  const duplicateCustomElement = (id: string) => {
    const target = (currentDesign.customElements || []).find((el) => el.id === id);
    if (!target) return;
    addCustomElement({
      ...target,
      x: Math.min(90, target.x + 4),
      y: Math.min(90, target.y + 4),
      name: `${target.name || "Elemen"} (Salinan)`,
    });
  };

  // Add / Edit / Remove Custom Canva Elements
  const addCustomElement = (element: Omit<CanvasElement, "id">) => {
    const newElement: CanvasElement = {
      ...element,
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const currentList = currentDesign.customElements || [];
    const updated = [...currentList, newElement];
    updateCurrentDesign({ customElements: updated });
    setSelectedElement(newElement.id);
    showToast(`✓ Berhasil menambahkan ${newElement.name || "elemen"} ke kanvas!`);
    soundFx.playChime();
  };

  const updateCustomElement = (id: string, patch: Partial<CanvasElement>) => {
    const currentList = currentDesign.customElements || [];
    const updated = currentList.map((el) => (el.id === id ? { ...el, ...patch } : el));
    updateCurrentDesign({ customElements: updated });
  };

  const deleteCustomElement = (id: string) => {
    const currentList = currentDesign.customElements || [];
    const updated = currentList.filter((el) => el.id !== id);
    updateCurrentDesign({ customElements: updated });
    if (selectedElement === id) setSelectedElement(null);
    showToast("Elemen berhasil dihapus dari kanvas.");
  };

  // Activate / Publish this design as the live photobooth display
  const handleSetActive = (targetId: string) => {
    setActiveId(targetId);
    setActiveCustomDesignId(targetId);
    setDesigns((prev) => {
      const updated = prev.map((d) => ({
        ...d,
        isActive: d.id === targetId,
      }));
      saveCustomDesigns(updated);
      pushToServer({ customDesigns: updated, activeDesignId: targetId }).catch(() => {});
      return updated;
    });
    soundFx.playChime();
    showToast(`✓ Desain "${designs.find((d) => d.id === targetId)?.name}" kini AKTIF di Photobooth!`);
  };

  // Create a new design
  const handleCreateNewDesign = () => {
    const newId = "design_" + Date.now();
    const newDesign: CustomHomeDesign = {
      ...currentDesign,
      id: newId,
      name: `Desain Event Baru #${designs.length + 1}`,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...designs, newDesign];
    setDesigns(updated);
    setActiveId(newId);
    saveCustomDesigns(updated);
    showToast("Desain baru berhasil dibuat!");
  };

  // Duplicate current design
  const handleDuplicate = () => {
    const newId = "design_" + Date.now();
    const dup: CustomHomeDesign = {
      ...currentDesign,
      id: newId,
      name: `${currentDesign.name} (Salinan)`,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...designs, dup];
    setDesigns(updated);
    setActiveId(newId);
    saveCustomDesigns(updated);
    showToast("Desain berhasil diduplikasi!");
  };

  // Delete current design
  const handleDeleteDesign = (idToDelete: string) => {
    if (designs.length <= 1) {
      alert("Minimal harus ada 1 desain tersimpan!");
      return;
    }
    if (!confirm("Yakin ingin menghapus desain ini?")) return;
    const remaining = designs.filter((d) => d.id !== idToDelete);
    setDesigns(remaining);
    setActiveId(remaining[0].id);
    setActiveCustomDesignId(remaining[0].id);
    saveCustomDesigns(remaining);
    showToast("Desain berhasil dihapus.");
  };

  // Publish to Google Drive / Apps Script
  const handlePublishToGoogleDrive = async () => {
    if (!driveConfig.appsScriptUrl) {
      alert("URL Google Apps Script belum diisi di tab Google Drive!");
      return;
    }
    setIsPublishing(true);
    soundFx.playChime();
    try {
      const res = await saveDesignsToGoogleDrive(
        driveConfig.appsScriptUrl,
        designs,
        activeId,
        currentDesign
      );
      if (res.success) {
        showToast("✓ Sukses! Desain berhasil dipublikasikan online ke Google Drive.");
      } else {
        alert("Gagal menyimpan ke Google Drive: " + res.message);
      }
    } catch (e: any) {
      alert("Error publish ke Google Drive: " + e.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Pull / Sync from Google Drive
  const handlePullFromGoogleDrive = async () => {
    if (!driveConfig.appsScriptUrl) {
      alert("URL Google Apps Script belum diisi!");
      return;
    }
    setIsPulling(true);
    try {
      const res = await fetchDesignsFromGoogleDrive(driveConfig.appsScriptUrl);
      if (res.success && res.designs && res.designs.length > 0) {
        setDesigns(res.designs);
        saveCustomDesigns(res.designs);
        if (res.activeDesignId) {
          setActiveId(res.activeDesignId);
          setActiveCustomDesignId(res.activeDesignId);
        }
        showToast("✓ Berhasil menyinkronkan desain dari Google Drive!");
      } else {
        alert(res.message || "Belum ada desain tersimpan di Google Drive.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsPulling(false);
    }
  };

  // Handle local image file upload (Background or Logo)
  const handleImageUpload = (
    field: "bgImageUrl" | "logoUrl",
    file: File | null
  ) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        if (field === "bgImageUrl") {
          updateCurrentDesign({ bgType: "image", bgImageUrl: base64 });
        } else {
          updateCurrentDesign({ logoUrl: base64, showLogo: true });
        }
        showToast("Gambar berhasil dimuat!");
      }
    };
    reader.readAsDataURL(file);
  };

  // TAB DEFINITIONS FOR CANVA LEFT DOCK
  const tabsList = [
    { id: "elements" as StudioTab, label: "Elemen", icon: Sparkles, badge: currentDesign.customElements?.length || 0 },
    { id: "typography" as StudioTab, label: "Teks", icon: Type },
    { id: "logo" as StudioTab, label: "Unggahan", icon: Upload },
    { id: "background" as StudioTab, label: "Latar", icon: Palette },
    { id: "button" as StudioTab, label: "Tombol", icon: MousePointerClick },
    { id: "designs" as StudioTab, label: "Desain", icon: LayoutGrid },
    { id: "cloud" as StudioTab, label: "Drive", icon: Cloud },
  ];

  const tabTitles: Record<StudioTab, string> = {
    elements: "Elemen & Stiker",
    typography: "Teks & Tipografi",
    logo: "Unggahan & Logo",
    background: "Latar Belakang",
    button: "Tombol & Aksi",
    designs: "Koleksi Desain",
    cloud: "Google Drive Sync",
  };

  // RENDER LIVE PREVIEW CANVAS (CANVA PAPER ARTBOARD)
  const renderLivePreview = () => {
    const d = currentDesign;
    const getFontFamilyClass = () => {
      if (d.titleFontFamily === "script") return "font-script";
      if (d.titleFontFamily === "cinzel") return "font-cinzel";
      if (d.titleFontFamily === "serif") return "font-serif";
      if (d.titleFontFamily === "mono") return "font-mono";
      return "font-sans";
    };

    const getTitleSizeClass = () => {
      if (d.titleFontSize === "normal") return "text-3xl sm:text-4xl md:text-5xl";
      if (d.titleFontSize === "xlarge") return "text-5xl sm:text-6xl md:text-7xl lg:text-8xl";
      return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl";
    };

    const renderIcon = () => {
      if (d.buttonIcon === "sparkles") return <Sparkles size={20} className="drop-shadow" />;
      if (d.buttonIcon === "heart") return <Heart size={20} className="drop-shadow" />;
      if (d.buttonIcon === "arrow") return <ArrowRight size={20} className="drop-shadow" />;
      if (d.buttonIcon === "none") return null;
      return <Camera size={22} className="drop-shadow" />;
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
        id="canva-preview-canvas"
        onClick={() => setSelectedElement(null)}
        className="w-full h-full min-h-[500px] sm:min-h-[600px] flex flex-col justify-between items-center relative overflow-hidden select-none transition-all bg-white shadow-[0_16px_50px_rgba(0,0,0,0.12)] rounded-2xl border border-slate-200/90"
        style={bgStyle}
      >
        {/* Background Overlay */}
        {d.bgType === "image" && (d.bgOverlayOpacity ?? 0) > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: d.bgOverlayColor || "#000000",
              opacity: (d.bgOverlayOpacity || 0) / 100,
            }}
          />
        )}

        {/* Ambient Animated Rings */}
        {d.showAmbientRings && (
          <>
            <div
              className="absolute w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] rounded-full border pointer-events-none animate-[pulse_4s_ease-in-out_infinite]"
              style={{ borderColor: d.ambientRingColor || "rgba(98,37,153,0.3)" }}
            />
            <div
              className="absolute w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full border pointer-events-none"
              style={{ borderColor: d.ambientRingColor || "rgba(0,148,180,0.2)" }}
            />
          </>
        )}

        {/* Mock Top Header Bar */}
        <div className="w-full px-4 py-2.5 flex items-center justify-between border-b border-black/5 bg-white/70 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-2">
            {d.showLogo && d.logoUrl ? (
              <img src={d.logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded bg-white p-0.5 shadow-xs" />
            ) : (
              <Sparkles size={16} className="text-[#7D2AE8]" />
            )}
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {d.headerBrandText || "RAICAB BANJAR V • PHOTOBOOTH"}
              </span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                {d.headerSubtitleText || d.titleText}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <div className="w-6 h-6 rounded-full bg-slate-200/60 flex items-center justify-center text-[10px]">🔊</div>
            <div className="w-6 h-6 rounded-full bg-slate-200/60 flex items-center justify-center text-[10px]">⛶</div>
            <div className="w-6 h-6 rounded-full bg-slate-200/60 flex items-center justify-center text-[10px]">⚙️</div>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center z-10 w-full max-w-4xl relative">
          {/* Logo / Badge */}
          {d.showLogo && (
            <div
              onPointerDown={(e) => handlePointerDown(e, "logo", d.logoOffset || { x: 0, y: 0 })}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement("logo");
                setActiveTab("logo");
              }}
              className={`relative mb-4 z-20 cursor-grab active:cursor-grabbing transition-shadow ${
                selectedElement === "logo"
                  ? "ring-2 ring-[#7D2AE8] ring-offset-2 ring-offset-white rounded-2xl shadow-xl"
                  : "hover:ring-1 hover:ring-[#7D2AE8]/60 rounded-2xl"
              }`}
              style={{
                transform: `translate(${d.logoOffset?.x || 0}px, ${d.logoOffset?.y || 0}px)`,
                touchAction: "none",
              }}
            >
              {selectedElement === "logo" && (
                <>
                  {/* Interactive Canva 4-corner resize handles for Logo */}
                  <div
                    onPointerDown={(e) => handleResizeCornerPointerDown(e, "logo", "logo", "nw", d.logoSize || 110)}
                    className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    title="Tarik sudut untuk ubah ukuran"
                  />
                  <div
                    onPointerDown={(e) => handleResizeCornerPointerDown(e, "logo", "logo", "ne", d.logoSize || 110)}
                    className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    title="Tarik sudut untuk ubah ukuran"
                  />
                  <div
                    onPointerDown={(e) => handleResizeCornerPointerDown(e, "logo", "logo", "sw", d.logoSize || 110)}
                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    title="Tarik sudut untuk ubah ukuran"
                  />
                  <div
                    onPointerDown={(e) => handleResizeCornerPointerDown(e, "logo", "logo", "se", d.logoSize || 110)}
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    title="Tarik sudut untuk ubah ukuran"
                  />
                  
                  {/* Floating Action Pill */}
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-slate-200 shadow-[0_8px_25px_rgba(0,0,0,0.18)] flex items-center gap-1.5 whitespace-nowrap z-50"
                  >
                    <span className="text-[#7D2AE8] font-bold">Logo</span>
                    <div className="h-3 w-px bg-slate-200" />

                    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                      <button
                        onClick={() => snapElement("logo", "left")}
                        className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                        title="Geser Kiri"
                      >
                        👈 Kiri
                      </button>
                      <button
                        onClick={() => snapElement("logo", "center")}
                        className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                        title="Tengah"
                      >
                        🎯 Tengah
                      </button>
                      <button
                        onClick={() => snapElement("logo", "right")}
                        className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                        title="Geser Kanan"
                      >
                        Kanan 👉
                      </button>
                      <button
                        onClick={() => snapElement("logo", "up")}
                        className="p-1 hover:bg-white rounded text-slate-700"
                        title="Naik"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        onClick={() => snapElement("logo", "down")}
                        className="p-1 hover:bg-white rounded text-slate-700"
                        title="Turun"
                      >
                        <ArrowDown size={11} />
                      </button>
                    </div>

                    <div className="h-3 w-px bg-slate-200" />
                    <button
                      onClick={() => updateCurrentDesign({ logoSize: Math.max(50, (d.logoSize || 110) - 15) })}
                      className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-700 font-bold"
                      title="Perkecil Logo"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateCurrentDesign({ logoSize: Math.min(240, (d.logoSize || 110) + 15) })}
                      className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-700 font-bold"
                      title="Perbesar Logo"
                    >
                      +
                    </button>
                    <div className="h-3 w-px bg-slate-200" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetOffset("logo");
                      }}
                      className="text-[#7D2AE8] hover:underline font-bold text-[10px] cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </>
              )}

              <div
                className={`overflow-hidden flex items-center justify-center shadow-md transition-transform ${
                  d.logoShape === "circle"
                    ? "rounded-full"
                    : d.logoShape === "rounded"
                    ? "rounded-2xl"
                    : d.logoShape === "square"
                    ? "rounded-none"
                    : ""
                }`}
                style={{
                  width: `${d.logoSize || 110}px`,
                  height: `${d.logoSize || 110}px`,
                  border: d.logoBorderWidth
                    ? `${d.logoBorderWidth}px solid ${d.logoBorderColor || "#ffffff"}`
                    : undefined,
                  backgroundColor: "#ffffff",
                }}
              >
                {d.logoUrl ? (
                  <img
                    src={d.logoUrl}
                    alt="Logo"
                    draggable={false}
                    className="w-full h-full object-contain p-2 pointer-events-none"
                  />
                ) : (
                  <Sparkles size={36} className="text-[#7D2AE8]" />
                )}
              </div>

              {/* Logo Badge Underneath */}
              {d.logoBadgeText && (
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md border whitespace-nowrap pointer-events-none"
                  style={{
                    backgroundColor: d.logoBadgeBgColor || "#2E0E4C",
                    borderColor: d.logoBorderColor || "#F9B708",
                    color: d.logoBadgeTextColor || "#F9B708",
                  }}
                >
                  <Sparkles size={10} className="animate-spin text-current" />
                  <span className="text-[9px] font-black tracking-widest uppercase">
                    {d.logoBadgeText}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Subtitle Pill */}
          {d.showSubtitle && d.subtitleText && (
            <div
              onPointerDown={(e) => handlePointerDown(e, "subtitle", d.subtitleOffset || { x: 0, y: 0 })}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement("subtitle");
                setActiveTab("typography");
              }}
              className={`relative mb-2 z-20 max-w-full cursor-grab active:cursor-grabbing transition-shadow flex items-center gap-2 ${
                selectedElement === "subtitle"
                  ? "ring-2 ring-[#7D2AE8] ring-offset-2 ring-offset-white rounded-full shadow-lg p-0.5"
                  : "hover:ring-1 hover:ring-[#7D2AE8]/60 rounded-full"
              }`}
              style={{
                transform: `translate(${d.subtitleOffset?.x || 0}px, ${d.subtitleOffset?.y || 0}px)`,
                touchAction: "none",
              }}
            >
              {selectedElement === "subtitle" && (
                <>
                  <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-30 pointer-events-none shadow-sm" />
                  <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-30 pointer-events-none shadow-sm" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-30 pointer-events-none shadow-sm" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-30 pointer-events-none shadow-sm" />
                  
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-slate-200 shadow-[0_8px_25px_rgba(0,0,0,0.18)] flex items-center gap-1.5 whitespace-nowrap z-50"
                  >
                    <span className="text-[#7D2AE8] font-bold">Subjudul</span>
                    <div className="h-3 w-px bg-slate-200" />

                    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                      <button
                        onClick={() => snapElement("subtitle", "left")}
                        className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                        title="Geser Kiri"
                      >
                        👈 Kiri
                      </button>
                      <button
                        onClick={() => snapElement("subtitle", "center")}
                        className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                        title="Tengah"
                      >
                        🎯 Tengah
                      </button>
                      <button
                        onClick={() => snapElement("subtitle", "right")}
                        className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                        title="Geser Kanan"
                      >
                        Kanan 👉
                      </button>
                      <button
                        onClick={() => snapElement("subtitle", "up")}
                        className="p-1 hover:bg-white rounded text-slate-700"
                        title="Naik"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        onClick={() => snapElement("subtitle", "down")}
                        className="p-1 hover:bg-white rounded text-slate-700"
                        title="Turun"
                      >
                        <ArrowDown size={11} />
                      </button>
                    </div>

                    <div className="h-3 w-px bg-slate-200" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetOffset("subtitle");
                      }}
                      className="text-[#7D2AE8] hover:underline font-bold text-[10px] cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </>
              )}

              <div
                className="w-6 sm:w-10 h-[2px]"
                style={{
                  background: `linear-gradient(to right, transparent, ${d.subtitleTextColor || "#622599"})`,
                }}
              />
              <span
                className="px-4 py-1 rounded-full font-black tracking-[0.16em] text-[11px] sm:text-xs uppercase shadow-xs border truncate max-w-[80vw]"
                style={{
                  backgroundColor: d.subtitleBgColor || "#ffffff",
                  color: d.subtitleTextColor || "#622599",
                  borderColor: d.subtitleBorderColor || "rgba(98,37,153,0.3)",
                }}
              >
                {d.subtitleText}
              </span>
              <div
                className="w-6 sm:w-10 h-[2px]"
                style={{
                  background: `linear-gradient(to left, transparent, ${d.subtitleTextColor || "#622599"})`,
                }}
              />
            </div>
          )}

          {/* Main Title Heading */}
          <div
            onPointerDown={(e) => handlePointerDown(e, "title", d.titleOffset || { x: 0, y: 0 })}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement("title");
              setActiveTab("typography");
            }}
            className={`relative my-1 z-20 max-w-full cursor-grab active:cursor-grabbing transition-shadow ${
              selectedElement === "title"
                ? "ring-2 ring-[#7D2AE8] ring-offset-2 ring-offset-white rounded-2xl shadow-xl"
                : "hover:ring-1 hover:ring-[#7D2AE8]/60 rounded-2xl"
            }`}
            style={{
              transform: `translate(${d.titleOffset?.x || 0}px, ${d.titleOffset?.y || 0}px) ${
                d.titleScale && d.titleScale !== 1 ? `scale(${d.titleScale})` : ""
              }`,
              touchAction: "none",
            }}
          >
            {selectedElement === "title" && (
              <>
                {/* Interactive Canva 4-corner resize handles for Title */}
                <div
                  onPointerDown={(e) => handleResizeCornerPointerDown(e, "title", "title", "nw", d.titleScale || 1)}
                  className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik sudut untuk ubah ukuran"
                />
                <div
                  onPointerDown={(e) => handleResizeCornerPointerDown(e, "title", "title", "ne", d.titleScale || 1)}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik sudut untuk ubah ukuran"
                />
                <div
                  onPointerDown={(e) => handleResizeCornerPointerDown(e, "title", "title", "sw", d.titleScale || 1)}
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik sudut untuk ubah ukuran"
                />
                <div
                  onPointerDown={(e) => handleResizeCornerPointerDown(e, "title", "title", "se", d.titleScale || 1)}
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik sudut untuk ubah ukuran"
                />
                
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-slate-200 shadow-[0_8px_25px_rgba(0,0,0,0.18)] flex items-center gap-1.5 whitespace-nowrap z-50"
                >
                  <span className="text-[#7D2AE8] font-bold">Judul Acara</span>
                  <div className="h-3 w-px bg-slate-200" />

                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => snapElement("title", "left")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Geser Kiri"
                    >
                      👈 Kiri
                    </button>
                    <button
                      onClick={() => snapElement("title", "center")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Tengah"
                    >
                      🎯 Tengah
                    </button>
                    <button
                      onClick={() => snapElement("title", "right")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Geser Kanan"
                    >
                      Kanan 👉
                    </button>
                    <button
                      onClick={() => snapElement("title", "up")}
                      className="p-1 hover:bg-white rounded text-slate-700"
                      title="Naik"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={() => snapElement("title", "down")}
                      className="p-1 hover:bg-white rounded text-slate-700"
                      title="Turun"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>

                  <div className="h-3 w-px bg-slate-200" />
                  <button
                    onClick={() =>
                      updateCurrentDesign({
                        titleScale: Math.max(0.6, Number(((d.titleScale || 1) - 0.1).toFixed(1))),
                      })
                    }
                    className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-slate-700 font-bold text-xs"
                    title="Perkecil Ukuran Judul"
                  >
                    A-
                  </button>
                  <button
                    onClick={() =>
                      updateCurrentDesign({
                        titleScale: Math.min(2.0, Number(((d.titleScale || 1) + 0.1).toFixed(1))),
                      })
                    }
                    className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-slate-700 font-bold text-xs"
                    title="Perbesar Ukuran Judul"
                  >
                    A+
                  </button>
                  <div className="h-3 w-px bg-slate-200" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetOffset("title");
                      updateCurrentDesign({ titleScale: 1 });
                    }}
                    className="text-[#7D2AE8] hover:underline font-bold text-[10px] cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </>
            )}

            <h1
              className={`${getFontFamilyClass()} ${getTitleSizeClass()} font-black py-1 px-4 drop-shadow-xs leading-tight tracking-tight overflow-visible break-words select-none`}
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
            onPointerDown={(e) => handlePointerDown(e, "tags", d.tagsOffset || { x: 0, y: 0 })}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement("tags");
              setActiveTab("typography");
            }}
            className={`relative mt-2 mb-8 z-20 cursor-grab active:cursor-grabbing transition-shadow flex flex-wrap items-center justify-center gap-2 ${
              selectedElement === "tags"
                ? "ring-2 ring-[#7D2AE8] ring-offset-2 ring-offset-white rounded-full shadow-lg p-1"
                : "hover:ring-1 hover:ring-[#7D2AE8]/60 rounded-full p-1"
            }`}
            style={{
              transform: `translate(${d.tagsOffset?.x || 0}px, ${d.tagsOffset?.y || 0}px)`,
              touchAction: "none",
            }}
          >
            {selectedElement === "tags" && (
              <>
                <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-30 pointer-events-none shadow-sm" />
                <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-30 pointer-events-none shadow-sm" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-30 pointer-events-none shadow-sm" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#7D2AE8] rounded-full z-30 pointer-events-none shadow-sm" />
                
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-slate-200 shadow-[0_8px_25px_rgba(0,0,0,0.18)] flex items-center gap-1.5 whitespace-nowrap z-50"
                >
                  <span className="text-[#7D2AE8] font-bold">Tagar & Tanggal</span>
                  <div className="h-3 w-px bg-slate-200" />

                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => snapElement("tags", "left")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Geser Kiri"
                    >
                      👈 Kiri
                    </button>
                    <button
                      onClick={() => snapElement("tags", "center")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Tengah"
                    >
                      🎯 Tengah
                    </button>
                    <button
                      onClick={() => snapElement("tags", "right")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Geser Kanan"
                    >
                      Kanan 👉
                    </button>
                    <button
                      onClick={() => snapElement("tags", "up")}
                      className="p-1 hover:bg-white rounded text-slate-700"
                      title="Naik"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={() => snapElement("tags", "down")}
                      className="p-1 hover:bg-white rounded text-slate-700"
                      title="Turun"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>

                  <div className="h-3 w-px bg-slate-200" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetOffset("tags");
                    }}
                    className="text-[#7D2AE8] hover:underline font-bold text-[10px] cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </>
            )}

            {d.showDateTag && d.dateText && (
              <span
                className="px-3.5 py-1 rounded-full border shadow-xs text-xs font-bold"
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
                className="px-3.5 py-1 rounded-full border shadow-xs text-xs font-bold"
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

          {/* Start CTA Button */}
          <div
            onPointerDown={(e) => handlePointerDown(e, "button", d.buttonOffset || { x: 0, y: 0 })}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElement("button");
              setActiveTab("button");
            }}
            className={`relative z-20 cursor-grab active:cursor-grabbing transition-shadow ${
              selectedElement === "button"
                ? "ring-2 ring-[#7D2AE8] ring-offset-2 ring-offset-white rounded-full shadow-xl p-0.5"
                : "hover:ring-1 hover:ring-[#7D2AE8]/60 rounded-full"
            }`}
            style={{
              transform: `translate(${d.buttonOffset?.x || 0}px, ${d.buttonOffset?.y || 0}px) ${
                d.buttonScale && d.buttonScale !== 1 ? `scale(${d.buttonScale})` : ""
              }`,
              touchAction: "none",
            }}
          >
            {selectedElement === "button" && (
              <>
                {/* Interactive Canva 4-corner resize handles for Button */}
                <div
                  onPointerDown={(e) => handleResizeCornerPointerDown(e, "button", "button", "nw", d.buttonScale || 1)}
                  className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik sudut untuk ubah ukuran"
                />
                <div
                  onPointerDown={(e) => handleResizeCornerPointerDown(e, "button", "button", "ne", d.buttonScale || 1)}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik sudut untuk ubah ukuran"
                />
                <div
                  onPointerDown={(e) => handleResizeCornerPointerDown(e, "button", "button", "sw", d.buttonScale || 1)}
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik sudut untuk ubah ukuran"
                />
                <div
                  onPointerDown={(e) => handleResizeCornerPointerDown(e, "button", "button", "se", d.buttonScale || 1)}
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                  title="Tarik sudut untuk ubah ukuran"
                />
                
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-slate-200 shadow-[0_8px_25px_rgba(0,0,0,0.18)] flex items-center gap-1.5 whitespace-nowrap z-50"
                >
                  <span className="text-[#7D2AE8] font-bold">Tombol Mulai</span>
                  <div className="h-3 w-px bg-slate-200" />

                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => snapElement("button", "left")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Geser Kiri"
                    >
                      👈 Kiri
                    </button>
                    <button
                      onClick={() => snapElement("button", "center")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Tengah"
                    >
                      🎯 Tengah
                    </button>
                    <button
                      onClick={() => snapElement("button", "right")}
                      className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                      title="Geser Kanan"
                    >
                      Kanan 👉
                    </button>
                    <button
                      onClick={() => snapElement("button", "up")}
                      className="p-1 hover:bg-white rounded text-slate-700"
                      title="Naik"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={() => snapElement("button", "down")}
                      className="p-1 hover:bg-white rounded text-slate-700"
                      title="Turun"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>

                  <div className="h-3 w-px bg-slate-200" />
                  <button
                    onClick={() =>
                      updateCurrentDesign({
                        buttonScale: Math.max(0.7, Number(((d.buttonScale || 1) - 0.1).toFixed(1))),
                      })
                    }
                    className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-700 font-bold"
                    title="Perkecil Tombol"
                  >
                    -
                  </button>
                  <button
                    onClick={() =>
                      updateCurrentDesign({
                        buttonScale: Math.min(1.8, Number(((d.buttonScale || 1) + 0.1).toFixed(1))),
                      })
                    }
                    className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-700 font-bold"
                    title="Perbesar Tombol"
                  >
                    +
                  </button>
                  <div className="h-3 w-px bg-slate-200" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetOffset("button");
                      updateCurrentDesign({ buttonScale: 1 });
                    }}
                    className="text-[#7D2AE8] hover:underline font-bold text-[10px] cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => soundFx.playChime()}
              className={`px-8 py-3.5 sm:px-12 sm:py-4 flex items-center justify-center gap-2.5 text-base font-bold group transition-transform ${getButtonShapeClass()}`}
              style={{
                background:
                  d.buttonBgType === "gradient" && d.buttonBgGradient
                    ? d.buttonBgGradient
                    : d.buttonBgColor || "#EF5000",
                color: d.buttonTextColor || "#ffffff",
                boxShadow: d.buttonShadow
                  ? `0 8px 25px ${d.buttonShadowColor || "rgba(0,0,0,0.2)"}`
                  : undefined,
              }}
            >
              {renderIcon()}
              <span>{d.buttonText || "Sentuh Layar untuk Mulai"}</span>
            </button>
          </div>
        </div>

        {/* Freeform Canva Draggable Custom Elements with Interactive Corner Scaling */}
        {d.customElements &&
          d.customElements.map((el) => {
            const isSelected = selectedElement === el.id;
            return (
              <div
                key={el.id}
                onPointerDown={(e) => handlePointerDown(e, el.id, { x: 0, y: 0 }, true, el)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElement(el.id);
                  setActiveTab("elements");
                }}
                style={{
                  position: "absolute",
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                  zIndex: isSelected ? 45 : el.zIndex || 25,
                  touchAction: "none",
                }}
                className={`cursor-grab active:cursor-grabbing select-none transition-shadow ${
                  isSelected
                    ? "ring-2 ring-[#7D2AE8] ring-offset-2 ring-offset-white shadow-2xl rounded-xl"
                    : "hover:ring-2 hover:ring-[#7D2AE8]/60 rounded-xl"
                }`}
                title="Klik & seret untuk memindahkan posisi"
              >
                {isSelected && (
                  <>
                    {/* Real Interactive Corner Handles to Drag-Resize */}
                    <div
                      onPointerDown={(e) => handleResizeCornerPointerDown(e, "custom", el.id, "nw", el.width || 130)}
                      className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      title="Tarik sudut untuk ubah ukuran"
                    />
                    <div
                      onPointerDown={(e) => handleResizeCornerPointerDown(e, "custom", el.id, "ne", el.width || 130)}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      title="Tarik sudut untuk ubah ukuran"
                    />
                    <div
                      onPointerDown={(e) => handleResizeCornerPointerDown(e, "custom", el.id, "sw", el.width || 130)}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      title="Tarik sudut untuk ubah ukuran"
                    />
                    <div
                      onPointerDown={(e) => handleResizeCornerPointerDown(e, "custom", el.id, "se", el.width || 130)}
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#7D2AE8] rounded-full z-40 cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      title="Tarik sudut untuk ubah ukuran"
                    />

                    {/* Floating Canva Toolbar */}
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-slate-200 shadow-[0_8px_25px_rgba(0,0,0,0.18)] flex items-center gap-1.5 whitespace-nowrap z-50"
                    >
                      <span className="text-[10px] text-[#7D2AE8] font-bold max-w-[85px] truncate">
                        {el.name || (el.type === "text" ? el.content : "Elemen")}
                      </span>
                      <div className="h-3 w-px bg-slate-200" />
                      
                      {/* Quick Snap Positions */}
                      <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                        <button
                          onClick={() => snapCustomElement(el.id, "left-bottom")}
                          className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                          title="Pindah ke Kiri Bawah"
                        >
                          👈 Kiri
                        </button>
                        <button
                          onClick={() => snapCustomElement(el.id, "center")}
                          className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                          title="Pindah ke Tengah"
                        >
                          🎯 Tengah
                        </button>
                        <button
                          onClick={() => snapCustomElement(el.id, "right-bottom")}
                          className="px-1.5 py-0.5 hover:bg-white rounded text-[10px] font-bold text-slate-700 transition-colors"
                          title="Pindah ke Kanan Bawah"
                        >
                          Kanan 👉
                        </button>
                      </div>

                      <div className="h-3 w-px bg-slate-200" />

                      {el.type !== "text" ? (
                        <>
                          <button
                            onClick={() =>
                              updateCustomElement(el.id, {
                                width: Math.max(40, (el.width || 120) - 20),
                              })
                            }
                            className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-700 font-bold"
                            title="Perkecil"
                          >
                            -
                          </button>
                          <button
                            onClick={() =>
                              updateCustomElement(el.id, {
                                width: Math.min(500, (el.width || 120) + 20),
                              })
                            }
                            className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-700 font-bold"
                            title="Perbesar"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              updateCustomElement(el.id, {
                                fontSize: Math.max(10, (el.fontSize || 16) - 2),
                              })
                            }
                            className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-slate-700 font-bold text-xs"
                            title="Perkecil Font"
                          >
                            A-
                          </button>
                          <button
                            onClick={() =>
                              updateCustomElement(el.id, {
                                fontSize: Math.min(60, (el.fontSize || 16) + 2),
                              })
                            }
                            className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-slate-700 font-bold text-xs"
                            title="Perbesar Font"
                          >
                            A+
                          </button>
                        </>
                      )}
                      <button
                        onClick={() =>
                          updateCustomElement(el.id, {
                            rotation: ((el.rotation || 0) + 15) % 360,
                          })
                        }
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                        title="Putar 15°"
                      >
                        <RotateCcw size={12} className="rotate-180" />
                      </button>
                      <button
                        onClick={() => duplicateCustomElement(el.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                        title="Duplikat Elemen"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => deleteCustomElement(el.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700"
                        title="Hapus Elemen"
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
                    className="drop-shadow-md"
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
                    className="drop-shadow-xs whitespace-pre-wrap select-none"
                  >
                    {el.content}
                  </div>
                )}
              </div>
            );
          })}

        {/* Mock Bottom Footer Bar */}
        <div className="w-full px-4 py-2 flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-black/5 bg-slate-50/70 z-10 shrink-0">
          <span>{d.hashtagText || "#PHOTOBOOTH"}</span>
          <span className="uppercase tracking-wider">{d.footerText || "YODHA PHOTOBOOTH"}</span>
          <span>Powered by Yodha</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-[#EDF0F5] text-slate-800 flex flex-col overflow-hidden font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce text-xs font-semibold backdrop-blur-md border border-white/10">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR: Real Canva Signature Gradient */}
      <header className="h-14 px-4 bg-gradient-to-r from-[#00C4CC] via-[#7D2AE8] to-[#5433FF] text-white flex items-center justify-between z-30 shrink-0 gap-3 shadow-md">
        {/* Left: Back & Document Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToKiosk}
            className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer backdrop-blur-sm shrink-0"
            title="Kembali ke Layar Kiosk"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div className="h-5 w-px bg-white/25 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center font-extrabold text-sm shadow-inner shrink-0">
              🎨
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={currentDesign.name}
                  onChange={(e) => updateCurrentDesign({ name: e.target.value })}
                  className="bg-transparent hover:bg-white/15 focus:bg-white/25 text-white font-bold text-xs sm:text-sm px-1.5 py-0.5 rounded transition-colors focus:outline-none max-w-[130px] sm:max-w-[220px] truncate"
                  title="Klik untuk mengubah nama desain"
                />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-medium hidden md:inline-block shrink-0">
                  Canva DIY
                </span>
              </div>
              <span className="text-[10px] text-white/80 hidden sm:block truncate">
                Tersimpan otomatis • Kiosk Photobooth
              </span>
            </div>
          </div>
        </div>

        {/* Center: Design Selector */}
        <div className="hidden lg:flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 text-xs">
          <span className="text-white/70 text-[11px]">Tema:</span>
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer pr-1"
          >
            {designs.map((d) => (
              <option key={d.id} value={d.id} className="text-slate-900 bg-white">
                {d.name} {d.isActive ? "🟢 (Aktif)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateNewDesign}
            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Buat Desain Baru"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {currentDesign.id !== activeId || !currentDesign.isActive ? (
            <button
              onClick={() => handleSetActive(currentDesign.id)}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-purple-50 text-[#7D2AE8] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Jadikan desain ini tampilan aktif di photobooth"
            >
              <CheckCircle2 size={14} className="text-[#7D2AE8]" />
              <span>Jadikan Aktif</span>
            </button>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-300/50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              <span className="hidden sm:inline">Aktif di Kiosk</span>
              <span className="sm:hidden">Aktif</span>
            </span>
          )}

          <button
            onClick={handlePublishToGoogleDrive}
            disabled={isPublishing}
            className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm transition-all border border-white/25 cursor-pointer disabled:opacity-50"
            title="Simpan & Sinkronkan ke Google Drive permanen"
          >
            <CloudUpload size={14} className={isPublishing ? "animate-bounce" : ""} />
            <span className="hidden md:inline">{isPublishing ? "Menyimpan..." : "Simpan Drive"}</span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE: 3-PANE CANVA LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* PANE 1: LEFT SLIM ICON DOCK (72px) */}
        <aside className="w-[72px] bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-1 shrink-0 z-20">
          {tabsList.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-14 py-2.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                  isActive
                    ? "bg-purple-50 text-[#7D2AE8] font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
                }`}
                title={tab.label}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#7D2AE8] rounded-r-full" />
                )}
                <Icon size={20} className={isActive ? "text-[#7D2AE8]" : "text-slate-500"} />
                <span className="text-[10px] mt-1 text-center tracking-tight leading-none">
                  {tab.label}
                </span>
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#7D2AE8] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* PANE 2: FLYOUT DRAWER (360px White Panel) */}
        <div className="w-[340px] sm:w-[380px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-xs z-10">
          {/* Header of Drawer */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{tabTitles[activeTab]}</span>
              </h2>
              <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-semibold">
                Canva Studio
              </span>
            </div>

            {/* Rounded Search Bar */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Cari di ${tabTitles[activeTab]}...`}
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#7D2AE8] text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-700">
            {/* TAB: ELEMEN (CANVA STYLE) */}
            {activeTab === "elements" && (
              <div className="space-y-5">
                {/* Visual Category Tiles */}
                <div>
                  <span className="text-xs font-bold text-slate-900 block mb-2">Telusuri Kategori</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "Maskot", icon: "🐻", color: "from-amber-100 to-orange-100 text-amber-800" },
                      { name: "Stiker", icon: "✨", color: "from-purple-100 to-pink-100 text-purple-800" },
                      { name: "Teks", icon: "✍️", color: "from-blue-100 to-cyan-100 text-blue-800" },
                      { name: "Emoji", icon: "🎉", color: "from-emerald-100 to-teal-100 text-emerald-800" },
                    ].map((cat, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl bg-gradient-to-br ${cat.color} flex flex-col items-center justify-center gap-1 border border-slate-200/60 shadow-xs cursor-pointer hover:scale-105 transition-transform`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-[10px] font-bold truncate">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 1: Maskot & Logo Resmi Raicab Banjar V with Smart Default Positions */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Maskot & Logo Resmi</span>
                    <span className="text-[10px] text-slate-400">Klik untuk pasang</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: "Maskot Putra", url: "/assets/raicab/maskot-putra.png", width: 140, defaultX: 18, defaultY: 76 },
                      { name: "Maskot Putri", url: "/assets/raicab/maskot-putri.png", width: 140, defaultX: 82, defaultY: 76 },
                      { name: "Logo Raicab V", url: "/assets/raicab/logo-raicab-banjar.png", width: 130, defaultX: 50, defaultY: 22 },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          addCustomElement({
                            type: "sticker",
                            name: item.name,
                            content: item.url,
                            width: item.width,
                            x: item.defaultX,
                            y: item.defaultY,
                          })
                        }
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:border-[#7D2AE8] hover:shadow-md flex flex-col items-center gap-1.5 transition-all cursor-pointer group"
                      >
                        <div className="w-14 h-14 rounded-lg bg-slate-50 p-1 flex items-center justify-center overflow-hidden">
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 text-center truncate w-full">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: Quick Canva Text Adders */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <span className="text-xs font-bold text-slate-900 block">Tambahkan Teks Bebas</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomText}
                      onChange={(e) => setNewCustomText(e.target.value)}
                      placeholder="Tulis teks bebas (contoh: Booth VIP, Tamu Undangan)..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs font-semibold focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCustomText.trim()) {
                          addCustomElement({
                            type: "text",
                            name: newCustomText.trim().substring(0, 15),
                            content: newCustomText.trim(),
                            x: 50,
                            y: 86,
                            fontSize: newCustomTextSize,
                            color: newCustomTextColor,
                            backgroundColor: newCustomTextBg === "transparent" ? undefined : newCustomTextBg,
                            fontWeight: "bold",
                            borderRadius: 8,
                          });
                          setNewCustomText("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!newCustomText.trim()) return;
                        addCustomElement({
                          type: "text",
                          name: newCustomText.trim().substring(0, 15),
                          content: newCustomText.trim(),
                          x: 50,
                          y: 86,
                          fontSize: newCustomTextSize,
                          color: newCustomTextColor,
                          backgroundColor: newCustomTextBg === "transparent" ? undefined : newCustomTextBg,
                          fontWeight: "bold",
                          borderRadius: 8,
                        });
                        setNewCustomText("");
                      }}
                      disabled={!newCustomText.trim()}
                      className="px-3.5 py-2 rounded-xl bg-[#7D2AE8] hover:bg-[#6C22CC] disabled:opacity-40 text-white font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    >
                      <Plus size={14} />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div>
                      <span className="block text-[10px] text-slate-500 mb-1">Warna</span>
                      <input
                        type="color"
                        value={newCustomTextColor}
                        onChange={(e) => setNewCustomTextColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Ukuran Font:</span>
                        <span>{newCustomTextSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={48}
                        value={newCustomTextSize}
                        onChange={(e) => setNewCustomTextSize(parseInt(e.target.value))}
                        className="w-full accent-[#7D2AE8] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Stiker Emoji & Dekorasi Populer */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <span className="text-xs font-bold text-slate-900 block">Stiker Dekorasi Event</span>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: "Bintang", emoji: "⭐", size: 36 },
                      { label: "Kamera", emoji: "📸", size: 38 },
                      { label: "Hati", emoji: "💖", size: 36 },
                      { label: "Balon", emoji: "🎈", size: 40 },
                      { label: "Pita", emoji: "🎀", size: 38 },
                      { label: "Mahkota", emoji: "👑", size: 38 },
                      { label: "Tunas Cikal", emoji: "🥥", size: 36 },
                      { label: "Api Unggun", emoji: "🔥", size: 36 },
                      { label: "Pesta", emoji: "🎉", size: 38 },
                      { label: "Trofi", emoji: "🏆", size: 38 },
                    ].map((em, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          addCustomElement({
                            type: "text",
                            name: em.label,
                            content: em.emoji,
                            x: 50,
                            y: 50,
                            fontSize: em.size,
                            color: "#ffffff",
                          })
                        }
                        className="h-10 rounded-xl bg-white border border-slate-200 hover:border-[#7D2AE8] text-xl flex items-center justify-center hover:scale-115 transition-transform cursor-pointer shadow-xs"
                        title={em.label}
                      >
                        {em.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 4: Lapisan Objek Aktif (Layers) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Lapisan Objek di Kanvas ({currentDesign.customElements?.length || 0})
                    </span>
                    {currentDesign.customElements && currentDesign.customElements.length > 0 && (
                      <button
                        onClick={() => updateCurrentDesign({ customElements: [] })}
                        className="text-[11px] text-red-500 hover:underline font-semibold cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  {(!currentDesign.customElements || currentDesign.customElements.length === 0) ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs bg-slate-50">
                      Belum ada objek tambahan. Klik stiker, maskot, atau teks di atas!
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {currentDesign.customElements.map((el, idx) => (
                        <div
                          key={el.id}
                          onClick={() => setSelectedElement(el.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            selectedElement === el.id
                              ? "bg-purple-50 border-[#7D2AE8] shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                            {el.type === "image" || el.type === "sticker" ? (
                              <img src={el.content} alt="" className="w-6 h-6 object-contain rounded bg-slate-100" />
                            ) : (
                              <span className="text-sm">{el.content}</span>
                            )}
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">
                              {el.name || el.content}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateCustomElement(el.id);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="Duplikat"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCustomElement(el.id);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Hapus elemen"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: TYPOGRAPHY / TEKS */}
            {activeTab === "typography" && (
              <div className="space-y-4">
                {/* Main Heading Text */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="block text-slate-900 font-bold">Judul Acara Utama</label>
                  <input
                    type="text"
                    value={currentDesign.titleText}
                    onChange={(e) => updateCurrentDesign({ titleText: e.target.value })}
                    placeholder="Contoh: RAIMUNA CABANG V BANJARNEGARA"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-900 text-sm font-bold focus:outline-none"
                  />

                  {/* Font Family Selection */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Gaya Font</label>
                    <select
                      value={currentDesign.titleFontFamily || "sans"}
                      onChange={(e) => updateCurrentDesign({ titleFontFamily: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="sans">Modern Sans-Serif (Tegas & Rapi)</option>
                      <option value="script">Luxury Script / Kaligrafi (Wedding / Elegan)</option>
                      <option value="cinzel">Royal Serif / Cinzel (Klasik Premium)</option>
                      <option value="serif">Classic Serif</option>
                      <option value="mono">Cyber Monospace (Futuristik)</option>
                    </select>
                  </div>

                  {/* Font Color Mode */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Warna Font Judul</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => updateCurrentDesign({ titleColorType: "gradient" })}
                        className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          currentDesign.titleColorType === "gradient"
                            ? "bg-purple-50 border-[#7D2AE8] text-[#7D2AE8]"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        Gradien Warna
                      </button>
                      <button
                        onClick={() => updateCurrentDesign({ titleColorType: "solid" })}
                        className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          currentDesign.titleColorType === "solid"
                            ? "bg-purple-50 border-[#7D2AE8] text-[#7D2AE8]"
                            : "bg-white border-slate-200 text-slate-600"
                        }`}
                      >
                        Warna Solid
                      </button>
                    </div>

                    {currentDesign.titleColorType === "solid" ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={currentDesign.titleColor || "#1e293b"}
                          onChange={(e) => updateCurrentDesign({ titleColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="font-mono text-slate-600 text-xs">{currentDesign.titleColor || "#1e293b"}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {[
                          { name: "Scout Ungu-Cyan", val: "linear-gradient(135deg, #2E0E4C 0%, #622599 50%, #0094B4 100%)" },
                          { name: "Emas Kilau Gold", val: "linear-gradient(135deg, #FFF7D6 0%, #D4AF37 50%, #AA771C 100%)" },
                          { name: "Pink Magenta Cyan", val: "linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" },
                          { name: "Oranye Sunset Fire", val: "linear-gradient(90deg, #f97316 0%, #ef4444 100%)" },
                        ].map((gr, idx) => (
                          <button
                            key={idx}
                            onClick={() => updateCurrentDesign({ titleGradient: gr.val })}
                            className="p-2 rounded-lg bg-white border border-slate-200 hover:border-[#7D2AE8] text-[11px] font-bold text-slate-700 truncate cursor-pointer shadow-xs"
                          >
                            {gr.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtitle Pill */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-900 font-bold">Subjudul / Kategori Acara</label>
                    <input
                      type="checkbox"
                      checked={currentDesign.showSubtitle ?? true}
                      onChange={(e) => updateCurrentDesign({ showSubtitle: e.target.checked })}
                      className="w-4 h-4 accent-[#7D2AE8] rounded cursor-pointer"
                    />
                  </div>
                  {currentDesign.showSubtitle && (
                    <input
                      type="text"
                      value={currentDesign.subtitleText || ""}
                      onChange={(e) => updateCurrentDesign({ subtitleText: e.target.value })}
                      placeholder="Contoh: KWARTIR CABANG BANJARNEGARA"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs font-semibold focus:outline-none"
                    />
                  )}
                </div>

                {/* Date & Hashtag */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="block text-slate-900 font-bold">Tag Tanggal & Hashtag</label>
                  <input
                    type="text"
                    value={currentDesign.dateText || ""}
                    onChange={(e) => updateCurrentDesign({ dateText: e.target.value, showDateTag: true })}
                    placeholder="Tanggal (Contoh: Tahun 2026)"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs font-semibold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={currentDesign.hashtagText || ""}
                    onChange={(e) => updateCurrentDesign({ hashtagText: e.target.value, showHashtagTag: true })}
                    placeholder="Hashtag (Contoh: #RaicabBanjarV #PramukaBanjarnegara)"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Header & Footer Custom Text */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="block text-slate-900 font-bold">Header & Footer Kiosk</label>
                  <input
                    type="text"
                    value={currentDesign.headerBrandText || ""}
                    onChange={(e) => updateCurrentDesign({ headerBrandText: e.target.value })}
                    placeholder="Header Atas (Contoh: RAICAB BANJAR V • PHOTOBOOTH)"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    value={currentDesign.footerText || ""}
                    onChange={(e) => updateCurrentDesign({ footerText: e.target.value })}
                    placeholder="Footer Bawah (Contoh: RAIMUNA CABANG V BANJARNEGARA)"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* TAB: UNGGAHAN & LOGO */}
            {activeTab === "logo" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900">Tampilkan Logo Utama</span>
                  <input
                    type="checkbox"
                    checked={currentDesign.showLogo ?? true}
                    onChange={(e) => updateCurrentDesign({ showLogo: e.target.checked })}
                    className="w-4 h-4 accent-[#7D2AE8] rounded cursor-pointer"
                  />
                </div>

                {currentDesign.showLogo && (
                  <>
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <label className="block text-slate-900 font-bold">Upload Logo / Maskot Baru</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload("logoUrl", e.target.files?.[0] || null)}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7D2AE8] file:text-white hover:file:bg-[#6C22CC] cursor-pointer"
                      />

                      {currentDesign.logoUrl && (
                        <div className="flex items-center gap-3 pt-1">
                          <img
                            src={currentDesign.logoUrl}
                            alt="Logo"
                            className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-slate-200 shadow-xs"
                          />
                          <button
                            onClick={() => updateCurrentDesign({ logoUrl: undefined })}
                            className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 cursor-pointer"
                          >
                            Hapus Logo
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Logo Size */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex justify-between text-slate-700 font-semibold text-xs">
                        <span>Ukuran Logo:</span>
                        <span>{currentDesign.logoSize || 110}px</span>
                      </div>
                      <input
                        type="range"
                        min={60}
                        max={200}
                        value={currentDesign.logoSize || 110}
                        onChange={(e) => updateCurrentDesign({ logoSize: parseInt(e.target.value) })}
                        className="w-full accent-[#7D2AE8] cursor-pointer"
                      />
                    </div>

                    {/* Logo Shape */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <label className="block text-slate-900 font-bold">Bentuk Bingkai Logo</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "circle", label: "Lingkaran" },
                          { id: "rounded", label: "Membulat" },
                          { id: "square", label: "Kotak" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => updateCurrentDesign({ logoShape: s.id as any })}
                            className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                              currentDesign.logoShape === s.id
                                ? "bg-purple-50 border-[#7D2AE8] text-[#7D2AE8]"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Badge Underneath Logo */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <label className="block text-slate-900 font-bold">Pill Badge Bawah Logo</label>
                      <input
                        type="text"
                        value={currentDesign.logoBadgeText || ""}
                        onChange={(e) => updateCurrentDesign({ logoBadgeText: e.target.value })}
                        placeholder="Contoh: RAICAB V 2026 atau SPECIAL EVENT"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: LATAR BELAKANG (BACKGROUND) */}
            {activeTab === "background" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="block text-slate-900 font-bold">Tipe Latar Belakang</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "gradient", label: "Gradien" },
                      { id: "image", label: "Foto / Gambar" },
                      { id: "color", label: "Warna Solid" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => updateCurrentDesign({ bgType: t.id as any })}
                        className={`p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                          currentDesign.bgType === t.id
                            ? "bg-purple-50 border-[#7D2AE8] text-[#7D2AE8]"
                            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Image Background */}
                {currentDesign.bgType === "image" && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="block text-slate-900 font-bold">Upload Foto Background</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload("bgImageUrl", e.target.files?.[0] || null)}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#7D2AE8] file:text-white hover:file:bg-[#6C22CC] cursor-pointer"
                    />

                    {currentDesign.bgImageUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28">
                        <img
                          src={currentDesign.bgImageUrl}
                          alt="Background"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => updateCurrentDesign({ bgImageUrl: undefined })}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white cursor-pointer"
                          title="Hapus foto background"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-slate-700 font-medium mb-1">
                        <span>Lapisan Redup (Overlay):</span>
                        <span>{currentDesign.bgOverlayOpacity ?? 0}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={currentDesign.bgOverlayOpacity ?? 0}
                        onChange={(e) =>
                          updateCurrentDesign({ bgOverlayOpacity: parseInt(e.target.value) })
                        }
                        className="w-full accent-[#7D2AE8] cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Gradient Presets */}
                {currentDesign.bgType === "gradient" && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <label className="block text-slate-900 font-bold">Pilihan Gradien Populer</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          name: "Scout Oranye-Biru",
                          val: "linear-gradient(135deg, #FF7A00 0%, #00A3E0 100%)",
                        },
                        {
                          name: "Scout Putih Elegan",
                          val: "linear-gradient(180deg, #ffffff 0%, #f0f9ff 50%, #fff7ed 100%)",
                        },
                        {
                          name: "Clean Ivory White",
                          val: "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                        },
                        {
                          name: "Sunset Peach Warm",
                          val: "linear-gradient(135deg, #fff1eb 0%, #ace0f9 100%)",
                        },
                        {
                          name: "Cyber Neon Party",
                          val: "linear-gradient(135deg, #18052e 0%, #0d0221 100%)",
                        },
                        {
                          name: "Royal Wedding Dark",
                          val: "linear-gradient(135deg, #0c0e12 0%, #171410 50%, #0f0c08 100%)",
                        },
                      ].map((g, idx) => (
                        <button
                          key={idx}
                          onClick={() => updateCurrentDesign({ bgGradient: g.val })}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-[#7D2AE8] text-left font-semibold cursor-pointer transition-all flex items-center gap-2 bg-white shadow-xs"
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-slate-300 shrink-0 shadow-xs"
                            style={{ background: g.val }}
                          />
                          <span className="truncate text-slate-700 text-xs">{g.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solid Color */}
                {currentDesign.bgType === "color" && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-slate-900 font-bold">Warna Solid</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={currentDesign.bgColor || "#ffffff"}
                        onChange={(e) => updateCurrentDesign({ bgColor: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={currentDesign.bgColor || "#ffffff"}
                        onChange={(e) => updateCurrentDesign({ bgColor: e.target.value })}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Ambient Decorative Rings */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Cincin Lingkaran Animasi</span>
                    <span className="text-[11px] text-slate-500">Efek berdenyut lembut di latar</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentDesign.showAmbientRings ?? true}
                    onChange={(e) => updateCurrentDesign({ showAmbientRings: e.target.checked })}
                    className="w-4 h-4 accent-[#7D2AE8] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: TOMBOL & AKSI */}
            {activeTab === "button" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="block text-slate-900 font-bold">Teks Tombol Mulai</label>
                  <input
                    type="text"
                    value={currentDesign.buttonText || ""}
                    onChange={(e) => updateCurrentDesign({ buttonText: e.target.value })}
                    placeholder="Contoh: Sentuh Layar untuk Mulai"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7D2AE8] text-slate-800 text-xs font-semibold focus:outline-none"
                  />

                  {/* Button Icon */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Ikon Tombol</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "camera", label: "Kamera" },
                        { id: "sparkles", label: "Bintang" },
                        { id: "heart", label: "Hati" },
                        { id: "arrow", label: "Panah" },
                      ].map((ic) => (
                        <button
                          key={ic.id}
                          onClick={() => updateCurrentDesign({ buttonIcon: ic.id as any })}
                          className={`p-2 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                            currentDesign.buttonIcon === ic.id
                              ? "bg-purple-50 border-[#7D2AE8] text-[#7D2AE8]"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          {ic.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button Shape */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Bentuk Tombol</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "pill", label: "Kapsul (Pill)" },
                        { id: "rounded", label: "Membulat" },
                        { id: "box", label: "Kotak" },
                      ].map((sh) => (
                        <button
                          key={sh.id}
                          onClick={() => updateCurrentDesign({ buttonShape: sh.id as any })}
                          className={`p-2 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                            currentDesign.buttonShape === sh.id
                              ? "bg-purple-50 border-[#7D2AE8] text-[#7D2AE8]"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          {sh.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button Color Presets */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Warna Tombol</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: "Scout Oranye", val: "#EF5000" },
                        { name: "Ungu Canva", val: "linear-gradient(90deg, #7D2AE8 0%, #00C4CC 100%)" },
                        { name: "Scout Ungu-Oranye", val: "linear-gradient(90deg, #622599 0%, #EF5000 100%)" },
                        { name: "Emas Mewah Gold", val: "linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)" },
                      ].map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() =>
                            btn.val.startsWith("linear")
                              ? updateCurrentDesign({ buttonBgType: "gradient", buttonBgGradient: btn.val })
                              : updateCurrentDesign({ buttonBgType: "solid", buttonBgColor: btn.val })
                          }
                          className="p-2 rounded-xl border border-slate-200 hover:border-[#7D2AE8] text-xs font-bold cursor-pointer text-left flex items-center gap-2 bg-white shadow-xs"
                        >
                          <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ background: btn.val }} />
                          <span className="truncate text-slate-700">{btn.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: KOLEKSI DESAIN */}
            {activeTab === "designs" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Koleksi Desain Tersimpan ({designs.length})</span>
                  <button
                    onClick={handleCreateNewDesign}
                    className="px-3 py-1.5 rounded-xl bg-[#7D2AE8] text-white text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-[#6C22CC] shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Buat Baru</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {designs.map((des) => (
                    <div
                      key={des.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        des.id === activeId
                          ? "bg-purple-50 border-[#7D2AE8] shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        onClick={() => setActiveId(des.id)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs truncate">{des.name}</span>
                          {des.isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              Aktif
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block">
                          Judul: {des.titleText}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleSetActive(des.id)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                          title="Aktifkan ke Photobooth"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          onClick={handleDuplicate}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Duplikasi"
                        >
                          <Copy size={14} />
                        </button>
                        {designs.length > 1 && (
                          <button
                            onClick={() => handleDeleteDesign(des.id)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: GOOGLE DRIVE SYNC */}
            {activeTab === "cloud" && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs leading-relaxed">
                  💡 <strong>Google Drive Cloud Sync:</strong> Semua desain visual, stiker, dan logo yang diedit dapat disinkronkan langsung ke Google Drive / Google Sheets Anda secara online.
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-900 block text-xs">Status Koneksi Apps Script</span>
                  <div className="text-[11px] text-slate-600 font-mono break-all bg-white p-2.5 rounded-xl border border-slate-200">
                    {driveConfig.appsScriptUrl || "Belum ada URL Apps Script"}
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={handlePublishToGoogleDrive}
                      disabled={isPublishing}
                      className="px-4 py-2.5 rounded-xl bg-[#7D2AE8] hover:bg-[#6C22CC] text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 text-xs"
                    >
                      <CloudUpload size={15} />
                      <span>{isPublishing ? "Menyimpan ke Drive..." : "Publish ke Drive Sekarang"}</span>
                    </button>

                    <button
                      onClick={handlePullFromGoogleDrive}
                      disabled={isPulling}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-200 disabled:opacity-50 text-xs shadow-xs"
                    >
                      <RefreshCw size={15} className={isPulling ? "animate-spin" : ""} />
                      <span>{isPulling ? "Menarik..." : "Tarik dari Drive"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANE 3: CENTER DESK CANVAS (Authentic Canva Desk `#EDF0F5`) */}
        <main className="flex-1 bg-[#EDF0F5] p-3 sm:p-6 flex flex-col items-center justify-between overflow-auto relative">
          {/* Top Page Header Toolbar (Canva Style) */}
          <div className="w-full max-w-5xl mb-3 flex items-center justify-between text-xs text-slate-600 px-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Halaman 1</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-medium truncate max-w-[200px] sm:max-w-md">
                Layar Utama Photobooth ({currentDesign.name})
              </span>
              <div className="flex items-center gap-1 text-slate-400 ml-1">
                <button
                  onClick={() => duplicateCurrentDesign()}
                  className="p-1 hover:text-slate-700 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                  title="Duplikat Halaman Desain Ini"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetOffset("logo");
                  resetOffset("subtitle");
                  resetOffset("title");
                  resetOffset("tags");
                  resetOffset("button");
                  updateCurrentDesign({ titleScale: 1, buttonScale: 1 });
                  showToast("✓ Semua elemen utama dikembalikan ke posisi tengah.");
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium flex items-center gap-1 shadow-xs transition-all text-xs cursor-pointer"
                title="Kembalikan semua posisi elemen ke tengah"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Reset Posisi</span>
              </button>

              <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-xs">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    previewDevice === "desktop"
                      ? "bg-purple-100 text-[#7D2AE8]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tampilan Layar Kiosk (16:9)"
                >
                  <Monitor size={13} />
                  <span className="hidden md:inline">Kiosk</span>
                </button>
                <button
                  onClick={() => setPreviewDevice("tablet")}
                  className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    previewDevice === "tablet"
                      ? "bg-purple-100 text-[#7D2AE8]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tampilan Tablet Portrait"
                >
                  <Tablet size={13} />
                  <span className="hidden md:inline">Tablet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Artboard Paper Sheet */}
          <div
            className={`transition-all duration-300 w-full flex items-center justify-center my-auto ${
              previewDevice === "tablet" ? "max-w-[520px]" : "max-w-5xl"
            }`}
          >
            {renderLivePreview()}
          </div>

          {/* Bottom Desk Toolbar (Canva Footer) */}
          <div className="w-full max-w-5xl mt-3 flex items-center justify-between text-[11px] text-slate-500 px-2 shrink-0">
            <span className="hidden sm:inline">
              💡 <strong>Tip Canva:</strong> Klik dan seret (drag & drop) langsung pada maskot, stiker, atau teks di atas layar! Tarik sudut untuk memperbesar ukuran.
            </span>
            <span className="sm:hidden">
              💡 Seret elemen langsung di layar
            </span>
            <span className="font-medium text-slate-600">
              100% Fit Screen • Yodha Creative
            </span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ThemeStudio;
