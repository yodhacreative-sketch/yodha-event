import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, FlipHorizontal, RefreshCw, RotateCw, Sparkles, CheckCircle2 } from "lucide-react";
import { LayoutConfig, PartyConfig, PhotoBox, ThemeMode, WeddingConfig, WeddingFramePreset } from "../types";
import { soundFx } from "../lib/audio";
import { calculateTargetPhotoRatio, getDefaultBoxesForLayout, getBoxShotIndex } from "../lib/frameLayouts";

interface ShootScreenProps {
  layout: LayoutConfig;
  filterCss: string;
  countdownDuration: number;
  mirrorCamera: boolean;
  selectedCameraId?: string;
  cameraRotation?: 0 | 90 | 180 | 270;
  onChangeCameraRotation?: (r: 0 | 90 | 180 | 270) => void;
  preset: WeddingFramePreset;
  customOverlayUrl?: string;
  photoBoxes?: PhotoBox[];
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  themeMode?: ThemeMode;
  onPhotosCaptured: (photos: string[]) => void;
  onBack: () => void;
}

export const ShootScreen: React.FC<ShootScreenProps> = ({
  layout,
  filterCss,
  countdownDuration,
  mirrorCamera: initialMirror,
  selectedCameraId,
  cameraRotation = 0,
  onChangeCameraRotation,
  preset,
  customOverlayUrl,
  photoBoxes,
  weddingConfig,
  partyConfig,
  themeMode = "wedding",
  onPhotosCaptured,
  onBack,
}) => {
  const isParty = themeMode === "party";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mirror, setMirror] = useState(initialMirror);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frameNaturalRatio, setFrameNaturalRatio] = useState<number | null>(null);

  // Measure custom overlay aspect ratio if present
  useEffect(() => {
    if (!customOverlayUrl) {
      setFrameNaturalRatio(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setFrameNaturalRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = customOverlayUrl;
    if (img.complete && img.naturalWidth) {
      setFrameNaturalRatio(img.naturalWidth / img.naturalHeight);
    }
  }, [customOverlayUrl]);

  // Frame aspect ratio (default 1/3 for 1-col strip, 2/3 for standard 4R/postcard)
  const effectiveFrameRatio = frameNaturalRatio || (layout.cols === 1 ? 1 / 2.8 : 2 / 3);

  // Identify current targeted photo box
  const activeBoxes = photoBoxes && photoBoxes.length > 0 ? photoBoxes : getDefaultBoxesForLayout(layout.id);
  const currentTargetBox =
    activeBoxes.find((_, idx) => getBoxShotIndex(idx, activeBoxes, layout) === Math.max(0, currentShotIndex - 1)) ||
    activeBoxes[Math.min(Math.max(0, currentShotIndex - 1), activeBoxes.length - 1)] ||
    activeBoxes[0];

  // Viewfinder and capture aspect ratio (width / height)
  const targetPhotoRatio = useMemo(() => {
    return calculateTargetPhotoRatio(currentTargetBox, effectiveFrameRatio, layout.aspectRatio);
  }, [currentTargetBox, effectiveFrameRatio, layout.aspectRatio]);

  // Initialize camera stream
  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        setCameraError(null);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError("Kamera tidak dapat diakses. Mohon periksa izin webcam atau koneksi kamera.");
      }
    }

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [selectedCameraId]);

  // Capture single frame from video cropped to match the exact viewfinder & photo hole ratio
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const isRot90or270 = cameraRotation === 90 || cameraRotation === 270;

    // Effective dimensions taking rotation into account
    const effW = isRot90or270 ? vh : vw;
    const effH = isRot90or270 ? vw : vh;
    const effRatio = effW / effH;

    let cropEffW = effW;
    let cropEffH = effH;

    if (effRatio > targetPhotoRatio) {
      cropEffW = effH * targetPhotoRatio;
    } else {
      cropEffH = effW / targetPhotoRatio;
    }

    const cropSrcW = isRot90or270 ? cropEffH : cropEffW;
    const cropSrcH = isRot90or270 ? cropEffW : cropEffH;
    const cropX = (vw - cropSrcW) / 2;
    const cropY = (vh - cropSrcH) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropEffW);
    canvas.height = Math.round(cropEffH);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (mirror) {
      ctx.scale(-1, 1);
    }
    if (cameraRotation !== 0) {
      ctx.rotate((cameraRotation * Math.PI) / 180);
    }
    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropSrcW,
      cropSrcH,
      -cropSrcW / 2,
      -cropSrcH / 2,
      cropSrcW,
      cropSrcH
    );
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.98);
  }, [mirror, targetPhotoRatio, cameraRotation]);

  // Trigger Flash effect and Shutter sound
  const triggerShutterFlash = useCallback(() => {
    setIsFlashing(true);
    soundFx.playShutter();
    setTimeout(() => {
      setIsFlashing(false);
    }, 400);
  }, []);

  // Run full multi-shot sequence
  const startShootSequence = useCallback(async () => {
    if (isShooting) return;
    setIsShooting(true);
    setCapturedPhotos([]);
    setCurrentShotIndex(0);

    const photos: string[] = [];

    for (let i = 0; i < layout.totalPhotos; i++) {
      setCurrentShotIndex(i + 1);

      // Countdown loop (e.g. 3, 2, 1)
      for (let sec = countdownDuration; sec > 0; sec--) {
        setCountdown(sec);
        soundFx.playCountdown(sec);
        await new Promise((res) => setTimeout(res, 1000));
      }

      setCountdown(null);

      // Flash & Capture
      triggerShutterFlash();
      const photoData = captureFrame();
      if (photoData) {
        photos.push(photoData);
        setCapturedPhotos([...photos]);
      }

      // Rest interval between shots if not last shot
      if (i < layout.totalPhotos - 1) {
        await new Promise((res) => setTimeout(res, 1500));
      }
    }

    setIsShooting(false);
    // Move to review screen
    soundFx.playFanfare();
    onPhotosCaptured(photos);
  }, [
    isShooting,
    layout.totalPhotos,
    countdownDuration,
    triggerShutterFlash,
    captureFrame,
    onPhotosCaptured,
  ]);

  // Spacebar to trigger shoot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isShooting && !cameraError) {
        e.preventDefault();
        startShootSequence();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isShooting, cameraError, startShootSequence]);

  return (
    <div className="flex-1 flex flex-col max-w-[1750px] mx-auto w-full px-2 sm:px-6 py-1 relative h-full overflow-y-auto lg:overflow-hidden min-h-0">
      {/* Shutter Flash Overlay */}
      {isFlashing && <div className="camera-flash" />}

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 flex-1 items-stretch min-h-0">
        {/* ================= LEFT COLUMN: Camera Feed & Controls ================= */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between min-h-0">
          {/* Left Header with title, shot count, and back button */}
          <div className="flex items-center justify-between mb-1 px-1 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              {!isShooting && (
                <button
                  onClick={() => {
                    soundFx.playChime();
                    onBack();
                  }}
                  className={`${isParty ? "btn-party-outline" : "btn-gold-outline"} px-3.5 py-1 rounded-full text-xs cursor-pointer hover:scale-105 transition-transform flex items-center gap-1 font-medium`}
                >
                  <span>←</span>
                  <span>Kembali</span>
                </button>
              )}
              <span className={isParty ? "font-bold text-xs sm:text-sm tracking-wider text-purple-900 uppercase" : "font-cinzel text-xs sm:text-sm tracking-wider text-amber-300 uppercase font-semibold"}>
                {layout.name}
              </span>
              <span className={`text-xs ${isParty ? "text-purple-700 font-medium" : "text-stone-400"}`}>
                • {isShooting ? `Mengambil Foto ${currentShotIndex} dari ${layout.totalPhotos}` : `${layout.totalPhotos} Jepretan${layout.isMirrored ? " (Mirror)" : ""}`}
              </span>
            </div>
          </div>

          {/* Main Camera Viewport Area */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-0.5 sm:p-1 relative w-full overflow-hidden">
            <div
              className={`h-full w-auto max-h-[48vh] sm:max-h-[58vh] lg:max-h-[78vh] xl:max-h-[82vh] 2xl:max-h-[85vh] max-w-full rounded-2xl overflow-hidden relative border-2 ${
                isParty
                  ? "border-purple-300/80 bg-black shadow-[0_15px_40px_rgba(98,37,153,0.18)]"
                  : "border-amber-400/40 bg-stone-950 shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
              } flex items-center justify-center transition-all duration-300`}
              style={{
                aspectRatio: `${targetPhotoRatio}`,
              }}
            >
              {cameraError ? (
                <div className="text-center p-6 max-w-md">
                  <Camera size={48} className="text-rose-400 mx-auto mb-3 opacity-60" />
                  <h3 className="font-serif text-lg text-rose-200 mb-1">Kamera Bermasalah</h3>
                  <p className="text-xs text-stone-400 mb-4">{cameraError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className={`${isParty ? "btn-party-outline" : "btn-gold-outline"} px-4 py-2 rounded-full text-xs inline-flex items-center gap-2`}
                  >
                    <RefreshCw size={14} /> Muat Ulang Halaman
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transition-transform duration-300"
                    style={{
                      filter: filterCss,
                      transform: `${mirror ? "scaleX(-1)" : ""} ${cameraRotation ? `rotate(${cameraRotation}deg)` : ""}`.trim() || undefined,
                      ...(cameraRotation === 90 || cameraRotation === 270
                        ? {
                            position: "absolute",
                            width: "180%",
                            height: "180%",
                            objectFit: "cover",
                          }
                        : {}),
                    }}
                  />

                  {/* Corner Framing Brackets */}
                  <div className={`absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 ${isParty ? "border-purple-400" : "border-amber-400/70"} pointer-events-none z-10`} />
                  <div className={`absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 ${isParty ? "border-purple-400" : "border-amber-400/70"} pointer-events-none z-10`} />
                  <div className={`absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 ${isParty ? "border-purple-400" : "border-amber-400/70"} pointer-events-none z-10`} />
                  <div className={`absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 ${isParty ? "border-purple-400" : "border-amber-400/70"} pointer-events-none z-10`} />

                  {/* Countdown Overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                      <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 ${
                        isParty
                          ? "border-purple-400 bg-white shadow-[0_0_50px_rgba(98,37,153,0.6)]"
                          : "border-amber-400/70 bg-stone-900/85 shadow-[0_0_50px_rgba(212,175,55,0.7)]"
                      } flex items-center justify-center animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]`}>
                        <span className={isParty ? "font-extrabold text-5xl sm:text-6xl text-party-gradient" : "font-cinzel text-5xl sm:text-6xl font-bold text-gold-gradient"}>
                          {countdown}
                        </span>
                      </div>
                      <span className={`mt-3 ${isParty ? "font-bold text-2xl sm:text-3xl text-white drop-shadow-md" : "font-script text-2xl sm:text-3xl text-amber-200 drop-shadow"}`}>
                        {isParty ? "Siap-siap... Senyum!" : "Bersiaplah... Senyum!"}
                      </span>
                    </div>
                  )}

                  {/* In-between shot message */}
                  {isShooting && countdown === null && (
                    <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full ${
                      isParty
                        ? "bg-white/95 border border-purple-300 text-purple-900 shadow-md"
                        : "bg-stone-900/90 border border-amber-400/40 text-amber-200"
                    } text-xs font-medium tracking-wider flex items-center gap-2 shadow-lg z-20`}>
                      <Sparkles size={14} className={`${isParty ? "text-purple-600" : "text-amber-400"} animate-spin`} />
                      <span>Foto {currentShotIndex} Tersimpan! Bersiap selanjutnya...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Live Strip Preview & Ambil Foto ================= */}
        <div className={`lg:col-span-4 xl:col-span-3 flex flex-col justify-between min-h-0 ${
          isParty
            ? "glass-party-card border border-purple-200/80 shadow-lg text-slate-800"
            : "bg-stone-900/30 border border-amber-400/15 text-stone-200 shadow-xl"
        } rounded-2xl p-2.5 sm:p-3 backdrop-blur-sm`}>
          {/* Top Bar of Right Column: Camera Rotate Toggle & Mirror Toggle */}
          <div className="flex items-center justify-end gap-2 mb-1.5">
            {onChangeCameraRotation && (
              <button
                onClick={() => {
                  soundFx.playChime();
                  const next = (cameraRotation === 0 ? 90 : cameraRotation === 90 ? 180 : cameraRotation === 180 ? 270 : 0) as 0 | 90 | 180 | 270;
                  onChangeCameraRotation(next);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                  cameraRotation !== 0
                    ? isParty
                      ? "bg-purple-100 border-purple-400 text-purple-900 font-bold shadow-sm"
                      : "bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                    : isParty
                    ? "bg-white/80 border-purple-200 text-purple-700 hover:bg-white"
                    : "bg-white/5 border-white/10 text-stone-400 hover:text-stone-200"
                }`}
                title="Putar Orientasi Kamera (0° / 90° / 180° / 270°)"
              >
                <RotateCw size={13} />
                <span>Rotasi {cameraRotation}°</span>
              </button>
            )}

            <button
              onClick={() => {
                soundFx.playChime();
                setMirror(!mirror);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                mirror
                  ? isParty
                    ? "bg-purple-100 border-purple-400 text-purple-900 font-bold shadow-sm"
                    : "bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                  : isParty
                  ? "bg-white/80 border-purple-200 text-purple-700 hover:bg-white"
                  : "bg-white/5 border-white/10 text-stone-400 hover:text-stone-200"
              }`}
              title="Cermin / Flip Kamera"
            >
              <FlipHorizontal size={14} />
              <span>Mirror {mirror ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Center: Live Frame / Strip Mockup */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-1">
            {customOverlayUrl ? (
              /* Custom Uploaded Frame Overlay Mockup */
              <div className={`relative h-full max-h-[220px] sm:max-h-[300px] lg:max-h-[46vh] xl:max-h-[50vh] w-fit rounded-xl overflow-hidden border ${
                isParty ? "border-purple-200/80 bg-white shadow-md" : "border-amber-400/40 bg-stone-950 shadow-2xl"
              } select-none mx-auto flex items-center justify-center`}>
                {/* Photo Boxes beneath custom overlay */}
                <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                  {(photoBoxes && photoBoxes.length > 0
                    ? photoBoxes
                    : getDefaultBoxesForLayout(layout.id)
                  ).map((box, slotIdx) => {
                    const shotIdx = getBoxShotIndex(slotIdx, activeBoxes, layout);
                    const shotPhoto = capturedPhotos[shotIdx];
                    const isCurrentTarget = shotIdx === currentShotIndex - 1 && isShooting;

                    return (
                      <div
                        key={box.id || slotIdx}
                        className={`absolute rounded overflow-hidden flex items-center justify-center transition-all ${
                          shotPhoto
                            ? "bg-black"
                            : isCurrentTarget
                            ? isParty
                              ? "bg-purple-400/30 border-2 border-purple-500 animate-pulse z-10"
                              : "bg-amber-400/20 border-2 border-amber-400 animate-pulse z-10"
                            : isParty
                            ? "bg-purple-50 border border-purple-200"
                            : "bg-stone-800 border border-stone-700"
                        }`}
                        style={{
                          left: `${box.x}%`,
                          top: `${box.y}%`,
                          width: `${box.w}%`,
                          height: `${box.h}%`,
                        }}
                      >
                        {shotPhoto ? (
                          <div className="w-full h-full relative">
                            <img
                              src={shotPhoto}
                              alt={`Shot ${shotIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-0.5">
                              <CheckCircle2 size={11} className={isParty ? "text-purple-400" : "text-amber-400"} />
                            </div>
                          </div>
                        ) : isCurrentTarget ? (
                          <div className={`flex flex-col items-center gap-0.5 ${isParty ? "text-purple-600" : "text-amber-300"}`}>
                            <Camera size={14} className={`animate-bounce ${isParty ? "text-purple-600" : "text-amber-400"}`} />
                            <span className="text-[8px] font-bold uppercase">#{shotIdx + 1}</span>
                          </div>
                        ) : (
                          <span className={`text-[9px] font-mono font-bold ${isParty ? "text-purple-400" : "text-stone-400"}`}>#{shotIdx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom Overlay sits on top so photos peek cleanly through transparent holes */}
                <img
                  src={customOverlayUrl}
                  alt="Bingkai Kustom"
                  className="h-full w-auto max-h-[220px] sm:max-h-[300px] lg:max-h-[46vh] xl:max-h-[50vh] block pointer-events-none z-20 drop-shadow"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setFrameNaturalRatio(img.naturalWidth / img.naturalHeight);
                    }
                  }}
                />
              </div>
            ) : (
              /* Built-in Preset Frame Mockup */
              <div
                className={`w-full ${
                  layout.cols === 1 ? "max-w-[150px] sm:max-w-[190px] xl:max-w-[210px]" : "max-w-[190px] sm:max-w-[230px] xl:max-w-[260px]"
                } h-full max-h-[220px] sm:max-h-[300px] lg:max-h-[46vh] xl:max-h-[50vh] rounded-xl overflow-hidden shadow-2xl relative border flex flex-col items-center justify-between p-2 transition-all select-none`}
                style={{
                  aspectRatio: layout.cols === 1 ? "1 / 2.7" : "2 / 3",
                  background: preset.bgColor,
                  borderColor: preset.borderColor,
                }}
              >
                <div
                  className="absolute inset-1.5 border rounded-lg pointer-events-none opacity-25"
                  style={{ borderColor: preset.borderColor }}
                />

                {/* Strip Header: Couple Names or Event Name */}
                <div className="text-center z-10 pt-0.5">
                  <div
                    className="text-[7px] sm:text-[8px] tracking-[0.2em] font-cinzel uppercase"
                    style={{ color: preset.secondaryTextColor }}
                  >
                    {isParty ? (partyConfig?.title || "RAICAB BANJAR V") : "THE WEDDING OF"}
                  </div>
                  <div
                    className="font-script text-base sm:text-lg leading-tight mt-0.5"
                    style={{ color: preset.textColor }}
                  >
                    {isParty ? (partyConfig?.subtitle || "KWARTIR CABANG BANJARNEGARA") : `${weddingConfig.brideName} & ${weddingConfig.groomName}`}
                  </div>
                </div>

                {/* Adaptive Photo Grid */}
                <div
                  className="w-full px-1 flex-1 min-h-0 z-10 my-1 grid gap-1.5 items-center justify-center"
                  style={{
                    gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: layout.totalBoxes || (layout.rows * layout.cols) }).map((_, slotIdx) => {
                    const shotIdx = getBoxShotIndex(slotIdx, [], layout);
                    const shotPhoto = capturedPhotos[shotIdx];
                    const isCurrentTarget = shotIdx === currentShotIndex - 1 && isShooting;

                    return (
                      <div
                        key={slotIdx}
                        className={`w-full h-full rounded overflow-hidden relative border transition-all flex items-center justify-center min-h-0 ${
                          shotPhoto
                            ? "border-amber-400/60 shadow-sm"
                            : isCurrentTarget
                            ? "border-amber-400 border-2 bg-amber-400/15 shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse"
                            : "border-white/15 bg-white/5 opacity-70"
                        }`}
                        style={{
                          borderColor: isCurrentTarget ? undefined : preset.borderColor,
                        }}
                      >
                        {shotPhoto ? (
                          <div className="w-full h-full relative">
                            <img
                              src={shotPhoto}
                              alt={`Shot ${shotIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-0.5">
                              <CheckCircle2 size={11} className={isParty ? "text-purple-400" : "text-amber-400"} />
                            </div>
                          </div>
                        ) : isCurrentTarget ? (
                          <div className="flex flex-col items-center gap-0.5 text-amber-300">
                            <Camera size={14} className="animate-bounce" />
                            <span className="text-[8px] font-cinzel uppercase tracking-wider">
                              Jepret #{shotIdx + 1}
                            </span>
                          </div>
                        ) : (
                          <span
                            className="text-[8px] font-mono opacity-50"
                            style={{ color: preset.secondaryTextColor }}
                          >
                            Foto {shotIdx + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Strip Footer: Date */}
                <div
                  className="text-[7px] sm:text-[8px] font-sans tracking-wider z-10 pb-0.5"
                  style={{ color: preset.secondaryTextColor }}
                >
                  {isParty ? (partyConfig?.eventDate || "16 - 18 Oktober 2026") : weddingConfig.weddingDate}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action: Prominent Ambil Foto Button */}
          <div className={`mt-1.5 pt-1.5 border-t ${isParty ? "border-purple-200/80" : "border-amber-400/10"}`}>
            <button
              onClick={() => {
                soundFx.playChime();
                startShootSequence();
              }}
              disabled={isShooting || !!cameraError}
              className={`w-full ${
                isParty
                  ? "btn-party shadow-[0_8px_30px_rgba(98,37,153,0.35)]"
                  : "btn-gold shimmer-glow shadow-[0_0_20px_rgba(212,175,55,0.35)]"
              } py-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]`}
            >
              {isShooting ? (
                <>
                  <Sparkles size={16} className={`animate-spin ${isParty ? "text-white" : "text-stone-900"}`} />
                  <span>Mengambil Foto...</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>AMBIL FOTO SEKARANG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
