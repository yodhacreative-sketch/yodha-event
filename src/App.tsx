import React, { useEffect, useState, lazy, Suspense } from "react";
import { Header } from "./components/Header";
import { HomeScreen } from "./components/HomeScreen";
import { FrameScreen } from "./components/FrameScreen";
import { ShootScreen } from "./components/ShootScreen";
import { ReviewScreen } from "./components/ReviewScreen";
import { ResultScreen } from "./components/ResultScreen";

// Lazy load AdminModal agar bundle utama web photobooth sangat kecil & instan di-load pengunjung
const AdminModal = lazy(() =>
  import("./components/AdminModal").then((m) => ({ default: m.AdminModal }))
);
import {
  BoothSettings,
  CustomHomeDesign,
  DriveConfig,
  FrameSlot,
  PartyConfig,
  Screen,
  ThemeMode,
  WeddingConfig,
} from "./types";
import {
  ALL_FRAME_PRESETS,
  DEFAULT_FRAME_SLOTS,
  DEFAULT_PARTY_CONFIG,
  DEFAULT_PARTY_FRAME_SLOTS,
  LAYOUTS,
  PHOTO_FILTERS,
  WEDDING_PRESETS,
} from "./config";
import { getEffectiveLayout } from "./lib/frameLayouts";
import {
  loadBoothSettings,
  loadDriveConfig,
  loadFrameSlots,
  loadPartyConfig,
  loadPartyFrameSlots,
  loadWeddingConfig,
  saveBoothSettings,
  saveDriveConfig,
  saveFrameSlots,
  savePartyConfig,
  savePartyFrameSlots,
  saveWeddingConfig,
  syncFromServer,
  pushToServer,
  syncChannel,
  initFrameSlots,
  initPartyFrameSlots,
  getLastLocalFrameUpdate,
  setLastLocalFrameUpdate,
  getLastLocalPartyFrameUpdate,
  setLastLocalPartyFrameUpdate,
  getCachedMemorySlots,
  setCachedMemorySlots,
  getCachedPartyMemorySlots,
  setCachedPartyMemorySlots,
  loadCustomDesigns,
  saveCustomDesigns,
  getActiveCustomDesign,
  setActiveCustomDesignId,
} from "./lib/storage";
import { fetchDesignsFromGoogleDrive } from "./lib/googleDrive";
import { saveFramesToIndexedDB } from "./lib/frameDB";
import { fetchAllCollectionsFromCloud } from "./lib/cloudSync";
import { soundFx } from "./lib/audio";

export const App: React.FC = () => {
  // Screens state: "home" -> "frame" (langsung pilih bingkai) -> "filter" -> "shoot" -> "review" -> "result"
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  // Persistent settings state
  const [weddingConfig, setWeddingConfig] = useState<WeddingConfig>(loadWeddingConfig);
  const [partyConfig, setPartyConfig] = useState<PartyConfig>(loadPartyConfig);
  const [driveConfig, setDriveConfig] = useState<DriveConfig>(loadDriveConfig);
  const [boothSettings, setBoothSettings] = useState<BoothSettings>(loadBoothSettings);
  const [frameSlots, setFrameSlots] = useState<FrameSlot[]>(() => getCachedMemorySlots() || loadFrameSlots());
  const [partyFrameSlots, setPartyFrameSlots] = useState<FrameSlot[]>(() => getCachedPartyMemorySlots() || loadPartyFrameSlots());

  const themeMode: ThemeMode = boothSettings.themeMode || "wedding";
  const isParty = themeMode === "party";
  const currentThemeSlots = isParty ? partyFrameSlots : frameSlots;

  // Active session selection state
  const [selectedSlotId, setSelectedSlotId] = useState<string>(() => currentThemeSlots[0]?.id || "slot_1");
  const [activeSlotOverride, setActiveSlotOverride] = useState<FrameSlot | null>(null);
  const [selectedFilterId, setSelectedFilterId] = useState<string>("normal");
  const [photos, setPhotos] = useState<string[]>([]);

  // Keep selected slot valid if theme mode or slots change
  useEffect(() => {
    if (!currentThemeSlots.some((s) => s.id === selectedSlotId)) {
      if (currentThemeSlots[0]) {
        setSelectedSlotId(currentThemeSlots[0].id);
        setActiveSlotOverride(null);
      }
    }
  }, [themeMode, currentThemeSlots]);

  // Redirect studio/builder URL to root while Canva studio is hidden
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.pathname.includes("/builder") ||
        window.location.pathname.includes("/studio") ||
        window.location.search.includes("builder") ||
        window.location.search.includes("studio"))
    ) {
      window.history.replaceState({}, "", "/");
    }
  }, []);
  const [activeCustomDesign, setActiveCustomDesign] = useState<CustomHomeDesign>(getActiveCustomDesign);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isAdminOpenRef = React.useRef(isAdminOpen);

  useEffect(() => {
    isAdminOpenRef.current = isAdminOpen;
  }, [isAdminOpen]);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    initFrameSlots().then((slots) => {
      if (slots && slots.length > 0) {
        setCachedMemorySlots(slots);
        setFrameSlots(slots);
      }
    });
    initPartyFrameSlots().then((pSlots) => {
      if (pSlots && pSlots.length > 0) {
        setCachedPartyMemorySlots(pSlots);
        setPartyFrameSlots(pSlots);
      }
    });
  }, []);

  // Cross-device sync from server on mount, interval, and window focus
  useEffect(() => {
    let mounted = true;

    const performSync = async () => {
      // If admin panel is currently open, DO NOT poll or overwrite frames
      if (isAdminOpenRef.current) return;

      // 1. Check cloud frames from Supabase first (if configured)
      try {
        const cloud = await fetchAllCollectionsFromCloud();
        if (cloud.success) {
          if (!mounted || isAdminOpenRef.current) return;
          // Wedding frames sync
          if (cloud.weddingFrames && cloud.weddingFrames.length > 0) {
            const cloudTs = cloud.weddingUpdatedAt ? new Date(cloud.weddingUpdatedAt).getTime() : 0;
            const localTs = getLastLocalFrameUpdate();
            if (cloudTs >= localTs) {
              setLastLocalFrameUpdate(cloudTs);
              setCachedMemorySlots(cloud.weddingFrames);
              saveFramesToIndexedDB(cloud.weddingFrames, cloudTs, "current_frame_slots").catch(() => {});
              setFrameSlots(cloud.weddingFrames);
              try {
                localStorage.setItem("yodha_frame_slots", JSON.stringify(cloud.weddingFrames));
              } catch (_) {}
            }
          }
          // Party (RAICAB BANJAR V) frames sync
          if (cloud.partyFrames && cloud.partyFrames.length > 0) {
            const pCloudTs = cloud.partyUpdatedAt ? new Date(cloud.partyUpdatedAt).getTime() : 0;
            const pLocalTs = getLastLocalPartyFrameUpdate();
            if (pCloudTs >= pLocalTs) {
              setLastLocalPartyFrameUpdate(pCloudTs);
              setCachedPartyMemorySlots(cloud.partyFrames);
              saveFramesToIndexedDB(cloud.partyFrames, pCloudTs, "party_frame_slots").catch(() => {});
              setPartyFrameSlots(cloud.partyFrames);
              try {
                localStorage.setItem("yodha_party_frame_slots", JSON.stringify(cloud.partyFrames));
              } catch (_) {}
            }
          }
        }
      } catch (_) {}

      // 2. Local PHP / Dev Server Storage sync (Laragon / Apache / Vite)
      const serverData = await syncFromServer();
      if (!mounted || isAdminOpenRef.current) return;

      if (serverData && Object.keys(serverData).length > 0) {
        if (serverData.frameSlots && Array.isArray(serverData.frameSlots) && serverData.frameSlots.length > 0) {
          const sTs = serverData.updatedAt || 0;
          if (sTs >= getLastLocalFrameUpdate()) {
            setLastLocalFrameUpdate(sTs);
            setCachedMemorySlots(serverData.frameSlots);
            saveFramesToIndexedDB(serverData.frameSlots, sTs).catch(() => {});
            setFrameSlots(serverData.frameSlots);
            try {
              localStorage.setItem("yodha_frame_slots", JSON.stringify(serverData.frameSlots));
            } catch (_) {}
          }
        }
        if (serverData.weddingConfig) {
          setWeddingConfig((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverData.weddingConfig)) {
              return serverData.weddingConfig!;
            }
            return prev;
          });
        }
        if (serverData.partyConfig) {
          setPartyConfig((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverData.partyConfig)) {
              return serverData.partyConfig!;
            }
            return prev;
          });
        }
        if (serverData.partyFrameSlots && Array.isArray(serverData.partyFrameSlots) && serverData.partyFrameSlots.length > 0) {
          const pTs = serverData.partyUpdatedAt || 0;
          if (pTs >= getLastLocalPartyFrameUpdate()) {
            setLastLocalPartyFrameUpdate(pTs);
            setCachedPartyMemorySlots(serverData.partyFrameSlots);
            saveFramesToIndexedDB(serverData.partyFrameSlots, pTs, "party_frame_slots").catch(() => {});
            setPartyFrameSlots(serverData.partyFrameSlots);
            try {
              localStorage.setItem("yodha_party_frame_slots", JSON.stringify(serverData.partyFrameSlots));
            } catch (_) {}
          }
        }
        if (serverData.driveConfig) {
          setDriveConfig((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverData.driveConfig)) {
              return serverData.driveConfig!;
            }
            return prev;
          });
        }
        if (serverData.boothSettings) {
          setBoothSettings((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverData.boothSettings)) {
              return serverData.boothSettings!;
            }
            return prev;
          });
        }
        if (serverData.customDesigns && Array.isArray(serverData.customDesigns) && serverData.customDesigns.length > 0) {
          saveCustomDesigns(serverData.customDesigns);
          if (serverData.activeDesignId) {
            setActiveCustomDesignId(serverData.activeDesignId);
          }
          setActiveCustomDesign(getActiveCustomDesign());
        }

        // 3. Google Apps Script / Drive Sync (Custom Designs) - Di-pause saat Canva Studio di-hide untuk menjaga performa booth tetap ringan
        /*
        const targetDriveUrl = serverData.driveConfig?.appsScriptUrl || driveConfig.appsScriptUrl;
        if (targetDriveUrl) {
          try {
            const driveRes = await fetchDesignsFromGoogleDrive(targetDriveUrl);
            if (driveRes.success && driveRes.designs && driveRes.designs.length > 0) {
              if (mounted && !isAdminOpenRef.current) {
                saveCustomDesigns(driveRes.designs);
                if (driveRes.activeDesign) {
                  setActiveCustomDesign(driveRes.activeDesign);
                } else if (driveRes.activeDesignId) {
                  setActiveCustomDesignId(driveRes.activeDesignId);
                  setActiveCustomDesign(getActiveCustomDesign());
                }
              }
            }
          } catch (_) {}
        }
        */
      } else {
        // If server is currently empty, push current device's configuration to server
        // ONLY if we have valid non-default frames loaded
        const currentSlots = getCachedMemorySlots() || frameSlots;
        const currentPartySlots = getCachedPartyMemorySlots() || partyFrameSlots;
        if (currentSlots && currentSlots.length > 0 && currentSlots !== DEFAULT_FRAME_SLOTS) {
          pushToServer({
            frameSlots: currentSlots,
            partyFrameSlots: currentPartySlots,
            weddingConfig: loadWeddingConfig(),
            partyConfig: loadPartyConfig(),
            driveConfig: loadDriveConfig(),
            boothSettings: loadBoothSettings(),
            updatedAt: getLastLocalFrameUpdate(),
            partyUpdatedAt: getLastLocalPartyFrameUpdate(),
          }).catch(() => {});
        }
      }
    };

    performSync();

    // Background interval to keep frames & config synced across devices (diatur 60s agar CPU tidak terbebani)
    const pollInterval = setInterval(() => {
      if (!mounted || isAdminOpenRef.current) return;
      performSync();
    }, 60000);

    const onFocus = () => {
      if (!isAdminOpenRef.current) {
        performSync();
      }
    };
    window.addEventListener("focus", onFocus);

    // Cross-tab broadcast listener for instant sync
    const handleBroadcast = (e: MessageEvent) => {
      if (!mounted || isAdminOpenRef.current) return;
      if (e.data?.type === "CONFIG_UPDATED" && e.data?.data) {
        const d = e.data.data;
        const localTs = getLastLocalFrameUpdate();
        if (d.updatedAt && d.updatedAt >= localTs) {
          if (d.frameSlots && Array.isArray(d.frameSlots) && d.frameSlots.length > 0) {
            setLastLocalFrameUpdate(d.updatedAt);
            setCachedMemorySlots(d.frameSlots);
            saveFramesToIndexedDB(d.frameSlots, d.updatedAt, "current_frame_slots").catch(() => {});
            setFrameSlots(d.frameSlots);
          }
        }
        const localPartyTs = getLastLocalPartyFrameUpdate();
        if (d.partyUpdatedAt && d.partyUpdatedAt >= localPartyTs) {
          if (d.partyFrameSlots && Array.isArray(d.partyFrameSlots) && d.partyFrameSlots.length > 0) {
            setLastLocalPartyFrameUpdate(d.partyUpdatedAt);
            setCachedPartyMemorySlots(d.partyFrameSlots);
            saveFramesToIndexedDB(d.partyFrameSlots, d.partyUpdatedAt, "party_frame_slots").catch(() => {});
            setPartyFrameSlots(d.partyFrameSlots);
          }
        }
        if (d.weddingConfig) setWeddingConfig(d.weddingConfig);
        if (d.partyConfig) setPartyConfig(d.partyConfig);
        if (d.driveConfig) setDriveConfig(d.driveConfig);
        if (d.boothSettings) setBoothSettings(d.boothSettings);
      }
    };
    syncChannel?.addEventListener("message", handleBroadcast);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      window.removeEventListener("focus", onFocus);
      syncChannel?.removeEventListener("message", handleBroadcast);
    };
  }, []);

  // Sync sound setting
  useEffect(() => {
    soundFx.enabled = boothSettings.soundEnabled;
  }, [boothSettings.soundEnabled]);

  // Fullscreen listeners
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Find active frame slot, layout, and preset theme
  const fallbackSlot = isParty ? DEFAULT_PARTY_FRAME_SLOTS[0] : DEFAULT_FRAME_SLOTS[0];
  const activeSlot =
    activeSlotOverride ||
    currentThemeSlots.find((s) => s.id === selectedSlotId) ||
    currentThemeSlots[0] ||
    fallbackSlot;
  const currentLayoutConfig = getEffectiveLayout(activeSlot, LAYOUTS);
  const currentPreset =
    (activeSlot?.presetThemeId && ALL_FRAME_PRESETS.find((p) => p.id === activeSlot.presetThemeId)) ||
    (isParty ? ALL_FRAME_PRESETS.find((p) => p.id === "party_neon") : WEDDING_PRESETS[0]) ||
    WEDDING_PRESETS[0];

  // Find filter CSS
  const activeFilter = PHOTO_FILTERS.find((f) => f.id === selectedFilterId);
  const activeFilterCss = activeFilter ? activeFilter.css : "none";

  // Handlers for settings saves
  const handleSaveWedding = (cfg: WeddingConfig) => {
    setWeddingConfig(cfg);
    saveWeddingConfig(cfg);
  };

  const handleSaveParty = (cfg: PartyConfig) => {
    setPartyConfig(cfg);
    savePartyConfig(cfg);
  };

  const handleSaveDrive = (cfg: DriveConfig) => {
    setDriveConfig(cfg);
    saveDriveConfig(cfg);
  };

  const handleSaveBooth = (st: BoothSettings) => {
    setBoothSettings(st);
    saveBoothSettings(st);
  };

  const handleSaveSlots = (slots: FrameSlot[]) => {
    setFrameSlots(slots);
    saveFrameSlots(slots);
  };

  const handleSavePartySlots = (slots: FrameSlot[]) => {
    setPartyFrameSlots(slots);
    savePartyFrameSlots(slots);
  };

  const resetToHome = () => {
    setPhotos([]);
    setActiveSlotOverride(null);
    setCurrentScreen("home");
  };

  return (
    <div className={`min-h-[100dvh] h-[100dvh] max-h-[100dvh] w-full max-w-full flex flex-col justify-between relative overflow-hidden transition-colors duration-500 ${
      isParty
        ? "bg-gradient-to-br from-[#FAF8FD] via-[#F4F9FD] to-[#FFF9F2] text-slate-800"
        : "bg-[#0c0e12] text-amber-200"
    }`}>
      {/* Top Header */}
      <Header
        weddingConfig={weddingConfig}
        partyConfig={partyConfig}
        themeMode={themeMode}
        customDesign={activeCustomDesign}
        soundEnabled={boothSettings.soundEnabled}
        onToggleSound={() =>
          handleSaveBooth({ ...boothSettings, soundEnabled: !boothSettings.soundEnabled })
        }
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 min-h-0 flex flex-col justify-center relative z-10 overflow-hidden">
        {/* Layar 1: Welcome Home Screen */}
        {currentScreen === "home" && (
          <HomeScreen
            weddingConfig={weddingConfig}
            partyConfig={partyConfig}
            themeMode={themeMode}
            customDesign={activeCustomDesign}
            onStart={() => setCurrentScreen("frame")}
          />
        )}

        {/* Layar 2: Langsung Pilih 1 dari 3 Desain Bingkai */}
        {currentScreen === "frame" && (
          <FrameScreen
            frameSlots={currentThemeSlots}
            selectedSlotId={selectedSlotId}
            weddingConfig={weddingConfig}
            partyConfig={partyConfig}
            themeMode={themeMode}
            onSelectSlot={(slot) => {
              setSelectedSlotId(slot.id);
              setActiveSlotOverride(slot);
            }}
            onBack={() => {
              setActiveSlotOverride(null);
              setCurrentScreen("home");
            }}
            onNext={(chosenSlot) => {
              setSelectedSlotId(chosenSlot.id);
              setActiveSlotOverride(chosenSlot);
              setCurrentScreen("shoot");
            }}
          />
        )}

        {/* Layar 3: Pemotretan Kamera (Langsung Shoot) */}
        {currentScreen === "shoot" && (
          <ShootScreen
            layout={currentLayoutConfig}
            filterCss={activeFilterCss}
            countdownDuration={boothSettings.countdownDuration}
            mirrorCamera={boothSettings.mirrorCamera}
            selectedCameraId={boothSettings.selectedCameraId}
            cameraRotation={boothSettings.cameraRotation || 0}
            onChangeCameraRotation={(r) =>
              handleSaveBooth({ ...boothSettings, cameraRotation: r })
            }
            preset={currentPreset}
            customOverlayUrl={activeSlot.customImage}
            photoBoxes={activeSlot.photoBoxes}
            weddingConfig={weddingConfig}
            partyConfig={partyConfig}
            themeMode={themeMode}
            onPhotosCaptured={(captured) => {
              setPhotos(captured);
              setCurrentScreen("review");
            }}
            onBack={() => {
              setActiveSlotOverride(null);
              setCurrentScreen("frame");
            }}
          />
        )}

        {/* Layar 5: Tinjau & Foto Ulang Satuan */}
        {currentScreen === "review" && (
          <ReviewScreen
            photos={photos}
            layout={currentLayoutConfig}
            selectedFilterId={selectedFilterId}
            preset={currentPreset}
            customOverlayUrl={activeSlot.customImage}
            photoBoxes={activeSlot.photoBoxes}
            weddingConfig={weddingConfig}
            partyConfig={partyConfig}
            themeMode={themeMode}
            onChangeFilter={(newFilterId) => setSelectedFilterId(newFilterId)}
            onUpdatePhoto={(index, newPhotoData) => {
              const updated = [...photos];
              updated[index] = newPhotoData;
              setPhotos(updated);
            }}
            onRetakeAll={() => setCurrentScreen("shoot")}
            onConfirm={() => setCurrentScreen("result")}
            mirrorCamera={boothSettings.mirrorCamera}
            selectedCameraId={boothSettings.selectedCameraId}
            cameraRotation={boothSettings.cameraRotation || 0}
            onChangeCameraRotation={(r) =>
              handleSaveBooth({ ...boothSettings, cameraRotation: r })
            }
          />
        )}

        {/* Layar 6: Hasil Cetak & Upload Google Drive */}
        {currentScreen === "result" && (
          <ResultScreen
            photos={photos}
            layout={currentLayoutConfig}
            preset={currentPreset}
            customOverlayUrl={activeSlot.customImage}
            photoBoxes={activeSlot.photoBoxes}
            filterCss={activeFilterCss}
            weddingConfig={weddingConfig}
            partyConfig={partyConfig}
            themeMode={themeMode}
            driveConfig={driveConfig}
            autoResetDuration={boothSettings.autoResetDuration}
            defaultPrintCopies={boothSettings.defaultPrintCopies}
            autoPrint={boothSettings.autoPrint ?? false}
            printMarginX={boothSettings.printMarginX ?? 5}
            printMarginY={boothSettings.printMarginY ?? 3}
            onHome={resetToHome}
          />
        )}
      </main>

      {/* Footer subtle brand */}
      {/* Footer Info */}
      <footer className={`w-full py-2 px-3 sm:px-6 flex items-center justify-between text-[10px] sm:text-[11px] select-none z-10 border-t ${
        isParty
          ? "bg-white/85 backdrop-blur-md border-purple-200/70 text-purple-950 font-semibold shadow-sm"
          : "text-amber-200/40 border-amber-400/5"
      }`}>
        <span className={`hidden sm:inline ${isParty ? "font-mono font-bold text-[#0094B4]" : ""}`}>
          {isParty ? partyConfig.hashtag : weddingConfig.hashtag}
        </span>
        <span className={`italic text-center truncate mx-auto px-2 max-w-[280px] sm:max-w-none ${
          isParty ? "font-sans font-bold text-[#622599]" : "font-serif text-amber-200/70"
        }`}>
          {isParty ? partyConfig.footerText : weddingConfig.footerText}
        </span>
        <span className={`hidden sm:inline ${isParty ? "text-[#EF5000] font-black" : ""}`}>
          {isParty ? (partyConfig.eventName || "RAIMUNA CABANG V BANJARNEGARA") : "Yodha Wedding Photobooth"}
        </span>
      </footer>

      {/* Admin Settings Modal (Lazy Loaded) */}
      {isAdminOpen && (
        <Suspense fallback={null}>
          <AdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            weddingConfig={weddingConfig}
            onSaveWeddingConfig={handleSaveWedding}
            partyConfig={partyConfig}
            onSavePartyConfig={handleSaveParty}
            driveConfig={driveConfig}
            onSaveDriveConfig={handleSaveDrive}
            boothSettings={boothSettings}
            onSaveBoothSettings={handleSaveBooth}
            frameSlots={frameSlots}
            onSaveFrameSlots={handleSaveSlots}
            partyFrameSlots={partyFrameSlots}
            onSavePartyFrameSlots={handleSavePartySlots}
          />
        </Suspense>
      )}
    </div>
  );
};
