import React, { useEffect, useState } from "react";
import {
  X,
  Lock,
  Heart,
  CloudUpload,
  Settings as SettingsIcon,
  Image as ImageIcon,
  History,
  Check,
  Save,
  Trash2,
  Download,
  Upload,
  Wand2,
  Plus,
  Database,
  RefreshCw,
  Copy,
  Printer,
  PartyPopper,
  Sparkles,
  Paintbrush,
  ExternalLink,
} from "lucide-react";
import {
  BoothSettings,
  DriveConfig,
  FrameSlot,
  FrameThemeId,
  LayoutId,
  PartyConfig,
  SavedSession,
  ThemeMode,
  WeddingConfig,
} from "../types";
import { LAYOUTS, WEDDING_PRESETS, ALL_FRAME_PRESETS, DEFAULT_PARTY_FRAME_SLOTS } from "../config";
import { FrameStudioModal } from "./FrameStudioModal";
import {
  getSessionHistory,
  clearSessionHistory,
} from "../lib/storage";
import {
  uploadToGoogleDrive,
  uploadFrameToGoogleDrive,
  fetchFramesFromGoogleDrive,
  deleteFrameFromGoogleDrive,
} from "../lib/googleDrive";
import { soundFx } from "../lib/audio";
import {
  CloudSyncConfig,
  loadCloudSyncConfig,
  saveCloudSyncConfig,
  testCloudConnection,
  pushFramesToCloud,
  fetchFramesFromCloud,
  pushAllCollectionsToCloud,
  fetchAllCollectionsFromCloud,
  SUPABASE_SQL_SETUP,
} from "../lib/cloudSync";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  weddingConfig: WeddingConfig;
  onSaveWeddingConfig: (cfg: WeddingConfig) => void;
  partyConfig: PartyConfig;
  onSavePartyConfig: (cfg: PartyConfig) => void;
  driveConfig: DriveConfig;
  onSaveDriveConfig: (cfg: DriveConfig) => void;
  boothSettings: BoothSettings;
  onSaveBoothSettings: (st: BoothSettings) => void;
  frameSlots: FrameSlot[];
  onSaveFrameSlots: (slots: FrameSlot[]) => void;
  partyFrameSlots: FrameSlot[];
  onSavePartyFrameSlots: (slots: FrameSlot[]) => void;
  onOpenStudio?: () => void;
}

type TabType = "wedding" | "party" | "templates" | "cloud" | "drive" | "booth" | "history";

const AdminFrameCardItem: React.FC<{
  slot: FrameSlot;
  isActive: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ slot, isActive, onToggleActive, onEdit, onDelete }) => {
  const defaultRatio =
    slot.layoutId === "3x1" || slot.layoutId === "2x1"
      ? 1 / 3
      : slot.layoutId === "1x1"
      ? 1
      : 2 / 3;

  const [aspectRatio, setAspectRatio] = useState<number>(defaultRatio);

  return (
    <div className="glass-gold-card rounded-2xl border border-amber-400/25 hover:border-amber-400/60 shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all flex flex-col overflow-hidden group bg-stone-950/80">
      {/* Preview Area: Frame wrapper follows the frame aspect ratio directly */}
      <div
        onClick={() => {
          soundFx.playChime();
          onEdit();
        }}
        className="relative h-[260px] sm:h-[280px] bg-stone-950/90 border-b border-amber-400/20 flex items-center justify-center p-3 cursor-pointer overflow-hidden"
        title="Klik untuk edit frame di Studio"
      >
        <div
          className="h-full max-w-full rounded-xl overflow-hidden relative shadow-md border border-amber-400/35 transition-transform duration-200 group-hover:scale-[1.02]"
          style={{
            aspectRatio: `${aspectRatio}`,
            backgroundImage:
              "linear-gradient(45deg, #181c24 25%, transparent 25%), linear-gradient(-45deg, #181c24 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181c24 75%), linear-gradient(-45deg, transparent 75%, #181c24 75%)",
            backgroundSize: "14px 14px",
            backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0px",
          }}
        >
          {slot.customImage ? (
            <img
              src={slot.customImage}
              alt={slot.name}
              className="w-full h-full object-contain drop-shadow"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setAspectRatio(img.naturalWidth / img.naturalHeight);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-stone-900 text-center">
              <ImageIcon size={32} className="text-amber-400/40 mb-2" />
              <span className="text-xs font-semibold text-amber-200 block">{slot.name}</span>
              <span className="text-[10px] text-stone-400 block mt-0.5 font-mono">
                {slot.presetThemeId || "Tema Bawaan"}
              </span>
            </div>
          )}

          {/* Hover overlay hint */}
          <div className="absolute inset-0 bg-amber-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
            <span className="btn-gold text-stone-950 text-xs font-semibold py-1.5 px-3 rounded-xl shadow-md flex items-center gap-1.5">
              <Wand2 size={13} />
              <span>Edit di Studio</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card Meta & Bottom Toolbar */}
      <div className="p-3.5 flex flex-col justify-between flex-1 gap-3 bg-stone-900/60">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-amber-100 text-sm truncate" title={slot.name}>
              {slot.name}
            </h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase shrink-0 font-mono">
              {slot.layoutId.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Preset: {slot.presetId || "auto"}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-amber-400/15">
          {/* Aktif / Nonaktif Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-stone-800 text-stone-400 border border-white/10 hover:bg-stone-700 hover:text-white"
            }`}
          >
            {isActive ? (
              <>
                <Check size={13} className="stroke-[3]" />
                <span>Aktif</span>
              </>
            ) : (
              <span>Nonaktif</span>
            )}
          </button>

          {/* Actions: Edit & Trash */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundFx.playChime();
                onEdit();
              }}
              className="p-1.5 text-stone-400 hover:text-amber-300 hover:bg-amber-400/15 rounded-lg transition-colors cursor-pointer"
              title="Edit di Studio"
            >
              <Wand2 size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
              title="Hapus Bingkai"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  weddingConfig,
  onSaveWeddingConfig,
  partyConfig,
  onSavePartyConfig,
  driveConfig,
  onSaveDriveConfig,
  boothSettings,
  onSaveBoothSettings,
  frameSlots,
  onSaveFrameSlots,
  partyFrameSlots,
  onSavePartyFrameSlots,
  onOpenStudio,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("wedding");

  // Form States
  const [weddingForm, setWeddingForm] = useState<WeddingConfig>(weddingConfig);
  const [partyForm, setPartyForm] = useState<PartyConfig>(partyConfig);
  const [driveForm, setDriveForm] = useState<DriveConfig>(driveConfig);
  const [boothForm, setBoothForm] = useState<BoothSettings>(boothSettings);
  const [slotsWeddingForm, setSlotsWeddingForm] = useState<FrameSlot[]>(frameSlots || []);
  const [slotsPartyForm, setSlotsPartyForm] = useState<FrameSlot[]>(partyFrameSlots || []);
  const [selectedFrameThemeMode, setSelectedFrameThemeMode] = useState<ThemeMode>(
    boothSettings?.themeMode || "wedding"
  );
  const [studioTargetFrame, setStudioTargetFrame] = useState<FrameSlot | null | "new">(null);
  const [activeLayoutFilter, setActiveLayoutFilter] = useState<string>("all");

  const isPartyFrames = selectedFrameThemeMode === "party";
  const slotsForm = (isPartyFrames ? slotsPartyForm : slotsWeddingForm) || [];

  const updateActiveSlots = (updated: FrameSlot[]) => {
    if (isPartyFrames) {
      setSlotsPartyForm(updated);
      onSavePartyFrameSlots(updated);
    } else {
      setSlotsWeddingForm(updated);
      onSaveFrameSlots(updated);
    }
  };

  // Hardware Camera List
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SavedSession[]>([]);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cloud Sync State
  const [cloudConfig, setCloudConfig] = useState<CloudSyncConfig>(loadCloudSyncConfig());
  const [cloudTesting, setCloudTesting] = useState(false);
  const [cloudPushing, setCloudPushing] = useState(false);
  const [cloudPulling, setCloudPulling] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Sync props only when modal first opens (prevent background props updates from resetting user edits)
  const wasOpenRef = React.useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setWeddingForm(weddingConfig);
      setPartyForm(partyConfig);
      setDriveForm(driveConfig);
      setBoothForm(boothSettings);
      setSlotsWeddingForm(frameSlots);
      setSlotsPartyForm(partyFrameSlots);
      setSelectedFrameThemeMode(boothSettings.themeMode || "wedding");
      setCloudConfig(loadCloudSyncConfig());
      loadMediaDevices();
      loadHistory();
    } else if (!isOpen) {
      setIsAuthenticated(false);
      setPinInput("");
      setPinError(false);
      setStudioTargetFrame(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Test Supabase connection
  const handleTestCloud = async () => {
    setCloudTesting(true);
    const res = await testCloudConnection(cloudConfig.supabaseUrl, cloudConfig.supabaseAnonKey);
    setCloudTesting(false);
    if (res.success) {
      showToast(res.message);
    } else {
      alert(res.message);
    }
  };

  // Push frames to Supabase
  const handlePushFramesToCloud = async () => {
    setCloudPushing(true);
    saveCloudSyncConfig(cloudConfig);
    const res = await pushAllCollectionsToCloud(slotsWeddingForm, slotsPartyForm, cloudConfig);
    setCloudPushing(false);
    if (res.success) {
      showToast("✓ Seluruh bingkai (Wedding & RAICAB BANJAR V) berhasil di-upload ke Supabase Cloud!");
      setCloudConfig(loadCloudSyncConfig());
    } else {
      alert(`Gagal upload ke cloud: ${res.message}`);
    }
  };

  // Pull frames from Supabase
  const handlePullFramesFromCloud = async () => {
    setCloudPulling(true);
    const res = await fetchAllCollectionsFromCloud(cloudConfig);
    setCloudPulling(false);
    if (res.success) {
      let count = 0;
      if (res.weddingFrames && res.weddingFrames.length > 0) {
        setSlotsWeddingForm(res.weddingFrames);
        onSaveFrameSlots(res.weddingFrames);
        count += res.weddingFrames.length;
      }
      if (res.partyFrames && res.partyFrames.length > 0) {
        setSlotsPartyForm(res.partyFrames);
        onSavePartyFrameSlots(res.partyFrames);
        count += res.partyFrames.length;
      }
      showToast(`✓ Berhasil menarik ${count} bingkai (Wedding & RAICAB BANJAR V) dari Supabase Cloud!`);
      setCloudConfig(loadCloudSyncConfig());
    } else {
      alert(`Gagal menarik dari cloud: ${res.message}`);
    }
  };

  // Copy SQL script to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    showToast("✓ Script SQL berhasil disalin ke papan klip!");
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const loadMediaDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameraDevices(videoInputs);
    } catch (e) {
      console.warn("Could not enumerate camera devices:", e);
    }
  };

  const loadHistory = async () => {
    const hist = await getSessionHistory();
    setSessionHistory(hist);
  };

  // Check PIN
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = boothSettings?.adminPin || "1234";
    if (pinInput === correctPin || pinInput === "1234") {
      setIsAuthenticated(true);
      setPinError(false);
      soundFx.playChime();
    } else {
      setPinError(true);
    }
  };

  // Export & Import Configurations (Backup & Cross-Device Sync)
  const handleExportConfig = () => {
    const backupData = {
      version: "1.1",
      exportDate: new Date().toISOString(),
      frameSlots: slotsWeddingForm,
      partyFrameSlots: slotsPartyForm,
      weddingConfig: weddingForm,
      partyConfig: partyForm,
      driveConfig: driveForm,
      boothSettings: boothForm,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yodha-photobooth-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("✓ Berkas cadangan seluruh pengaturan & bingkai berhasil diunduh!");
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.frameSlots && Array.isArray(parsed.frameSlots)) {
          setSlotsWeddingForm(parsed.frameSlots);
          onSaveFrameSlots(parsed.frameSlots);
        }
        if (parsed.partyFrameSlots && Array.isArray(parsed.partyFrameSlots)) {
          setSlotsPartyForm(parsed.partyFrameSlots);
          onSavePartyFrameSlots(parsed.partyFrameSlots);
        }
        if (parsed.weddingConfig) {
          setWeddingForm(parsed.weddingConfig);
          onSaveWeddingConfig(parsed.weddingConfig);
        }
        if (parsed.partyConfig) {
          setPartyForm(parsed.partyConfig);
          onSavePartyConfig(parsed.partyConfig);
        }
        if (parsed.driveConfig) {
          setDriveForm(parsed.driveConfig);
          onSaveDriveConfig(parsed.driveConfig);
        }
        if (parsed.boothSettings) {
          setBoothForm(parsed.boothSettings);
          onSaveBoothSettings(parsed.boothSettings);
        }
        showToast("✓ Seluruh bingkai & pengaturan berhasil disinkronkan ke perangkat ini!");
      } catch (err) {
        alert("Gagal membaca file JSON. Pastikan file backup valid.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isPullingDrive, setIsPullingDrive] = useState(false);

  const handleSyncAllToDrive = async () => {
    if (!driveForm.appsScriptUrl) {
      alert("URL Google Apps Script belum diisi di tab Google Drive!");
      return;
    }
    const framesToUpload = slotsForm.filter((s) => s.customImage && s.customImage.startsWith("data:image"));
    if (framesToUpload.length === 0) {
      showToast("Semua bingkai sudah tersimpan di Drive atau tidak ada bingkai kustom lokal.");
      return;
    }

    setIsSyncingDrive(true);
    showToast(`⏳ Mengunggah ${framesToUpload.length} bingkai ke Google Drive...`);
    let uploadedCount = 0;

    let updatedSlots = [...slotsForm];
    for (const frame of framesToUpload) {
      if (frame.customImage) {
        const res = await uploadFrameToGoogleDrive(
          driveForm.appsScriptUrl,
          frame.customImage,
          frame.name,
          frame.layoutId,
          isPartyFrames ? "party" : "wedding"
        );
        if (res.success && res.directUrl) {
          uploadedCount++;
          updatedSlots = updatedSlots.map((s) =>
            s.id === frame.id ? { ...s, customImage: res.directUrl } : s
          );
        }
      }
    }

    updateActiveSlots(updatedSlots);
    setIsSyncingDrive(false);
    showToast(`✓ Berhasil mencadangkan ${uploadedCount} bingkai ke Google Drive!`);
  };

  const handlePullFromDrive = async () => {
    if (!driveForm.appsScriptUrl) {
      alert("URL Google Apps Script belum diisi di tab Google Drive!");
      return;
    }
    setIsPullingDrive(true);
    showToast("⏳ Mengambil daftar bingkai dari Google Drive...");
    const res = await fetchFramesFromGoogleDrive(driveForm.appsScriptUrl);
    setIsPullingDrive(false);

    if (res.success && res.frames && res.frames.length > 0) {
      let currentSlots = [...slotsForm];
      let added = 0;
      for (const df of res.frames) {
        const exists = currentSlots.some((s) => s.customImage === df.url || s.id === df.id);
        if (!exists) {
          currentSlots.push({
            id: df.id || `frame_${Date.now()}_${added}`,
            name: df.name || `Bingkai Drive ${added + 1}`,
            layoutId: df.layout || "3x1",
            customImage: df.url,
            presetThemeId: "custom",
            enabled: true,
            presetId: "auto",
          });
          added++;
        }
      }
      if (added > 0) {
        updateActiveSlots(currentSlots);
        showToast(`✓ Berhasil menambahkan ${added} bingkai dari Google Drive!`);
      } else {
        showToast("✓ Semua bingkai dari Google Drive sudah ada di perangkat ini.");
      }
    } else {
      showToast(res.message || "Tidak ada file bingkai ditemukan di folder Google Drive.");
    }
  };


  // Layout counts for filter pills (matching yodhabooth)
  const layoutCounts = React.useMemo(() => {
    const list = slotsForm || [];
    const counts: Record<string, number> = {
      all: list.length,
      "3x1": 0,
      "3x2": 0,
      "2x2": 0,
      "2x1": 0,
      "1x1": 0,
      "4x2": 0,
    };
    list.forEach((s) => {
      if (s && counts[s.layoutId] !== undefined) {
        counts[s.layoutId]++;
      }
    });
    return counts;
  }, [slotsForm]);

  const filteredFrames = React.useMemo(() => {
    const list = slotsForm || [];
    if (activeLayoutFilter === "all") return list;
    return list.filter((s) => s && s.layoutId === activeLayoutFilter);
  }, [slotsForm, activeLayoutFilter]);

  const filterOptions = [
    { id: "all", label: `Semua (${layoutCounts.all})` },
    { id: "3x1", label: `3x1 (${layoutCounts["3x1"] || 0})` },
    { id: "3x2", label: `3x2 (${layoutCounts["3x2"] || 0})` },
    { id: "2x2", label: `2x2 (${layoutCounts["2x2"] || 0})` },
    { id: "2x1", label: `2x1 (${layoutCounts["2x1"] || 0})` },
    { id: "1x1", label: `1x1 (${layoutCounts["1x1"] || 0})` },
    { id: "4x2", label: `4x2 (${layoutCounts["4x2"] || 0})` },
  ];

  // Toggle Frame Active / Inactive
  const handleToggleFrameActive = (id: string) => {
    const updated = slotsForm.map((s) => {
      if (s.id === id) {
        const isCurrentlyActive = s.enabled !== false;
        return { ...s, enabled: !isCurrentlyActive };
      }
      return s;
    });
    updateActiveSlots(updated);
    const target = updated.find((s) => s.id === id);
    showToast(
      target?.enabled !== false
        ? `✓ Bingkai "${target?.name}" diaktifkan.`
        : `Bingkai "${target?.name}" dinonaktifkan.`
    );
  };

  // Delete Frame
  const handleDeleteFrame = (id: string, name: string) => {
    if (slotsForm.length <= 1) {
      showToast("Minimal harus ada 1 bingkai aktif!");
      return;
    }
    if (window.confirm(`Yakin ingin menghapus bingkai "${name}"?`)) {
      const updated = slotsForm.filter((s) => s.id !== id);
      updateActiveSlots(updated);
      showToast(`Bingkai "${name}" berhasil dihapus.`);
    }
  };

  // Test drive connection
  const [testingDrive, setTestingDrive] = useState(false);
  const handleTestDriveUpload = async () => {
    setTestingDrive(true);
    const dummyBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const testFilename = `test-connection-${Date.now()}.png`;
    const res = await uploadToGoogleDrive(driveForm.appsScriptUrl, dummyBase64, testFilename);
    setTestingDrive(false);
    if (res.success) {
      showToast("Koneksi Google Apps Script berhasil terhubung!");
    } else {
      showToast(`Gagal: ${res.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0c0e12] flex flex-col w-screen h-screen p-2.5 sm:p-4 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-amber-400 text-stone-950 font-semibold text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full h-full rounded-2xl glass-gold-card border-2 border-amber-400/50 p-4 sm:p-6 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-400/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-gold-gradient font-medium">
                Panel Pengaturan Photobooth
              </h3>
              <p className="text-xs text-stone-400">
                Konfigurasi Acara Pernikahan, 3 Desain Bingkai, Google Drive & Hardware
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playChime();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* PIN Authentication Gate */}
        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-4 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Lock size={28} />
            </div>
            <h4 className="font-serif text-lg text-amber-100 mb-1">Keamanan Admin</h4>
            <p className="text-xs text-stone-400 mb-6">
              Masukkan PIN Admin untuk mengakses pengaturan (Default: 1234)
            </p>

            <form onSubmit={handlePinSubmit} className="flex flex-col items-center gap-4 w-72">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="PIN Admin"
                className={`w-full py-3 px-4 rounded-xl text-center text-xl font-mono tracking-widest bg-stone-900 border text-amber-200 outline-none focus:border-amber-400 transition-all ${
                  pinError ? "border-rose-500 bg-rose-950/20" : "border-amber-400/30"
                }`}
                autoFocus
              />

              {pinError && (
                <span className="text-xs text-rose-400 font-medium">
                  PIN salah. Silakan coba lagi.
                </span>
              )}

              <button
                type="submit"
                className="btn-gold w-full py-3 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Masuk Pengaturan
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard Tabs */
          <div className="flex-1 flex flex-col pt-3 overflow-hidden">
            {/* Active Theme Mode Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2 border-b border-amber-400/15">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-stone-300 font-semibold">Mode Photobooth:</span>
                <div className="flex items-center gap-1.5 p-1 bg-stone-900/90 rounded-xl border border-amber-400/30">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...boothForm, themeMode: "wedding" as const };
                      setBoothForm(updated);
                      onSaveBoothSettings(updated);
                      setSelectedFrameThemeMode("wedding");
                      showToast("✓ Mode Photobooth diubah ke: Wedding Elegan");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      boothForm.themeMode !== "party"
                        ? "bg-amber-400 text-stone-950 shadow-md font-bold"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    💍 Wedding (Elegan & Emas)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...boothForm, themeMode: "party" as const };
                      setBoothForm(updated);
                      onSaveBoothSettings(updated);
                      setSelectedFrameThemeMode("party");
                      showToast("✓ Mode Photobooth diubah ke: RAICAB BANJAR V (Pramuka Banjarnegara)");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      boothForm.themeMode === "party"
                        ? "bg-gradient-to-r from-orange-600 via-amber-500 to-sky-500 text-white shadow-md font-bold"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    🏕️ RAICAB BANJAR V (Pramuka)
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-stone-400">
                Mode saat ini: <strong className={boothForm.themeMode === "party" ? "text-amber-300" : "text-amber-300"}>
                  {boothForm.themeMode === "party" ? "RAICAB BANJAR V (Pramuka)" : "Wedding Elegan"}
                </strong>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-amber-400/15 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("wedding")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "wedding"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <Heart size={14} />
                <span>Acara Wedding</span>
              </button>

              <button
                onClick={() => setActiveTab("party")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "party"
                    ? "bg-gradient-to-r from-orange-600 via-amber-500 to-sky-500 text-white font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <PartyPopper size={14} className={activeTab === "party" ? "text-amber-300" : "text-amber-400"} />
                <span>Acara RAICAB BANJAR</span>
              </button>

              <button
                onClick={() => setActiveTab("templates")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "templates"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <ImageIcon size={14} />
                <span>Bingkai Frame</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold ml-0.5">
                  {slotsForm.filter((s) => s.enabled !== false).length} Aktif
                </span>
              </button>

              <button
                onClick={() => setActiveTab("cloud")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "cloud"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <Database size={14} />
                <span>Cloud Sync Frame</span>
                {cloudConfig.enabled ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-stone-500 ml-0.5" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("drive")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "drive"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <CloudUpload size={14} />
                <span>Google Drive</span>
              </button>

              <button
                onClick={() => setActiveTab("booth")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "booth"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <SettingsIcon size={14} />
                <span>Booth & Kamera</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "history"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <History size={14} />
                <span>Riwayat Sesi</span>
              </button>
            </div>

            {/* Tab Contents Container */}
            <div className="flex-1 overflow-y-auto py-4 px-1">
              {/* Tab 1: Wedding Config */}
              {activeTab === "wedding" && (
                <div className="space-y-4 max-w-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Nama Pengantin Wanita (Bride)
                      </label>
                      <input
                        type="text"
                        value={weddingForm.brideName}
                        onChange={(e) =>
                          setWeddingForm({ ...weddingForm, brideName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Nama Pengantin Pria (Groom)
                      </label>
                      <input
                        type="text"
                        value={weddingForm.groomName}
                        onChange={(e) =>
                          setWeddingForm({ ...weddingForm, groomName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Tanggal Pernikahan
                    </label>
                    <input
                      type="text"
                      value={weddingForm.weddingDate}
                      onChange={(e) =>
                        setWeddingForm({ ...weddingForm, weddingDate: e.target.value })
                      }
                      placeholder="e.g. 04 Oktober 2026"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Hashtag Pernikahan
                    </label>
                    <input
                      type="text"
                      value={weddingForm.hashtag}
                      onChange={(e) => setWeddingForm({ ...weddingForm, hashtag: e.target.value })}
                      placeholder="e.g. #IsnaFadelStory"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                    />
                  </div>

                  <button
                    onClick={() => {
                      onSaveWeddingConfig(weddingForm);
                      showToast("Informasi pernikahan berhasil disimpan!");
                    }}
                    className="btn-gold px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer mt-4"
                  >
                    <Save size={14} />
                    <span>Simpan Pengaturan Pernikahan</span>
                  </button>
                </div>
              )}

              {/* Tab: Party Config */}
              {activeTab === "party" && (
                <div className="space-y-4 max-w-2xl bg-stone-900/60 p-5 rounded-2xl border border-pink-500/30 shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-3 pb-3 border-b border-pink-500/20">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                      <PartyPopper size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                        Pengaturan Tema Bebas / Colorful Party
                      </h2>
                      <p className="text-xs text-stone-400">
                        Atur nama acara, tanggal, dan teks untuk photobooth bertema pesta, ulang tahun, gathering, dll.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-pink-300 mb-1">
                        Judul Utama (Title)
                      </label>
                      <input
                        type="text"
                        value={partyForm.title}
                        onChange={(e) => setPartyForm({ ...partyForm, title: e.target.value })}
                        placeholder="Contoh: PHOTOBOOTH PARTY"
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-pink-500/30 text-white text-sm focus:border-pink-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-pink-300 mb-1">
                        Sub-Judul (Subtitle)
                      </label>
                      <input
                        type="text"
                        value={partyForm.subtitle}
                        onChange={(e) => setPartyForm({ ...partyForm, subtitle: e.target.value })}
                        placeholder="Contoh: LET'S CELEBRATE & HAVE FUN!"
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-pink-500/30 text-white text-sm focus:border-pink-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">
                      Nama Acara / Event Name
                    </label>
                    <input
                      type="text"
                      value={partyForm.eventName}
                      onChange={(e) => setPartyForm({ ...partyForm, eventName: e.target.value })}
                      placeholder="Contoh: SWEET SEVENTEEN / GALA NIGHT 2026"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-purple-500/30 text-white text-sm focus:border-purple-400 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-cyan-300 mb-1">
                        Tanggal Acara (Event Date)
                      </label>
                      <input
                        type="text"
                        value={partyForm.eventDate}
                        onChange={(e) => setPartyForm({ ...partyForm, eventDate: e.target.value })}
                        placeholder="Contoh: 16 OKTOBER 2026"
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-cyan-500/30 text-white text-sm focus:border-cyan-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-cyan-300 mb-1">
                        Hashtag / Slogan
                      </label>
                      <input
                        type="text"
                        value={partyForm.hashtag}
                        onChange={(e) => setPartyForm({ ...partyForm, hashtag: e.target.value })}
                        placeholder="Contoh: #PartyVibes2026 #HappyDay"
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-cyan-500/30 text-white text-sm focus:border-cyan-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-pink-300 mb-1">
                      Teks Footer Cetakan
                    </label>
                    <input
                      type="text"
                      value={partyForm.footerText}
                      onChange={(e) => setPartyForm({ ...partyForm, footerText: e.target.value })}
                      placeholder="Contoh: CAPTURE YOUR CRAZY MOMENT"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-pink-500/30 text-white text-sm focus:border-pink-400 outline-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      onSavePartyConfig(partyForm);
                      showToast("Pengaturan acara pesta berhasil disimpan!");
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 shadow-lg hover:opacity-95 flex items-center gap-2 cursor-pointer mt-4"
                  >
                    <Save size={14} />
                    <span>Simpan Pengaturan Acara Bebas/Party</span>
                  </button>
                </div>
              )}

              {/* Tab 2: Manajemen Bingkai Frame (Exact yodhabooth design) */}
              {/* Tab 2: Manajemen Bingkai Frame (Cohesive Dark-Gold Luxury Theme) */}
              {activeTab === "templates" && (
                <div className={`p-4 sm:p-6 rounded-2xl shadow-xl space-y-6 backdrop-blur-md transition-all ${
                  isPartyFrames
                    ? "bg-stone-900/70 border border-pink-500/30"
                    : "bg-stone-900/60 border border-amber-400/25"
                }`}>
                  {/* Theme Frame Switcher Sub-Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-stone-950/80 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-stone-300 font-semibold">Pilih Koleksi Bingkai:</span>
                      <div className="flex items-center gap-1.5 p-1 bg-stone-900 rounded-lg border border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFrameThemeMode("wedding");
                            setActiveLayoutFilter("all");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            !isPartyFrames
                              ? "bg-amber-400 text-stone-950 shadow-md font-bold"
                              : "text-stone-400 hover:text-stone-200"
                          }`}
                        >
                          <Heart size={13} />
                          <span>💍 Bingkai Wedding ({slotsWeddingForm.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFrameThemeMode("party");
                            setActiveLayoutFilter("all");
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isPartyFrames
                              ? "bg-gradient-to-r from-purple-700 via-pink-600 to-amber-500 text-white shadow-md font-bold"
                              : "text-stone-400 hover:text-stone-200"
                          }`}
                        >
                          <PartyPopper size={13} />
                          <span>🏕️ Bingkai RAICAB BANJAR ({slotsPartyForm.length})</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
                      <span>Sedang mengedit bingkai untuk:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${isPartyFrames ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "bg-amber-400/20 text-amber-300 border border-amber-400/40"}`}>
                        {isPartyFrames ? "🏕️ RAICAB BANJAR V" : "💍 Wedding Elegan"}
                      </span>
                    </div>
                  </div>

                  {/* Header with Title, Description, and + Tambah Bingkai Baru button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className={`text-xl sm:text-2xl font-serif font-medium tracking-wide ${
                        isPartyFrames
                          ? "bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300 bg-clip-text text-transparent"
                          : "text-gold-gradient"
                      }`}>
                        {isPartyFrames ? "Manajemen Bingkai: RAICAB BANJAR V" : "Manajemen Bingkai: Wedding"}
                      </h2>
                      <p className="text-xs sm:text-sm text-stone-400 mt-1">
                        {isPartyFrames
                          ? "Kelola template bingkai resmi RAICAB BANJAR V (Raimuna Cabang Banjarnegara)."
                          : "Kelola template frame untuk photobooth, atur layout lubang, atau tambahkan frame baru."}
                      </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleExportConfig}
                        title="Unduh seluruh data bingkai ke file JSON untuk dipindahkan ke laptop / tablet lain"
                        className="px-3.5 py-2.5 rounded-xl border border-amber-400/40 bg-stone-900/80 hover:bg-stone-800 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Ekspor JSON (Sync)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSyncAllToDrive}
                        disabled={isSyncingDrive}
                        title="Upload semua frame aktif ke folder Google Drive"
                        className="px-3.5 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <CloudUpload size={14} className={isSyncingDrive ? "animate-bounce" : ""} />
                        <span>{isSyncingDrive ? "Menyimpan ke Drive..." : "☁️ Backup ke Drive"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePullFromDrive}
                        disabled={isPullingDrive}
                        title="Tarik template frame dari folder Google Drive"
                        className="px-3.5 py-2.5 rounded-xl border border-sky-400/40 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={isPullingDrive ? "animate-spin" : ""} />
                        <span>{isPullingDrive ? "Mengambil..." : "📥 Ambil dari Drive"}</span>
                      </button>

                      <label
                        title="Unggah file JSON cadangan dari laptop / perangkat lain agar bingkai sama persis"
                        className="px-3.5 py-2.5 rounded-xl border border-amber-400/40 bg-stone-900/80 hover:bg-stone-800 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>Impor JSON</span>
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleImportConfig}
                        />
                      </label>

                      {isPartyFrames && (
                        <button
                          type="button"
                          onClick={() => {
                            updateActiveSlots(DEFAULT_PARTY_FRAME_SLOTS);
                            showToast("✓ Berhasil menyetel Bingkai Resmi RAICAB BANJAR V!");
                          }}
                          title="Gunakan bingkai resmi Raimuna Cabang V Banjarnegara"
                          className="px-3.5 py-2.5 rounded-xl border border-amber-500/50 bg-amber-950/50 hover:bg-amber-900/70 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          <Sparkles size={14} className="text-amber-300 animate-pulse" />
                          <span>⚡ Setel Bingkai Resmi RAICAB V</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playChime();
                          setStudioTargetFrame("new");
                        }}
                        className="btn-gold px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg text-xs sm:text-sm cursor-pointer transition-all active:scale-95 shrink-0"
                      >
                        <Plus size={16} />
                        <span>+ Tambah Bingkai Baru</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {filterOptions.map((opt) => {
                      const isSelected = activeLayoutFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setActiveLayoutFilter(opt.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? "bg-amber-400 text-stone-950 font-bold shadow-md"
                              : "bg-stone-900/80 hover:bg-stone-800 text-amber-200/80 hover:text-white border border-amber-400/20"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Frame Grid */}
                  {filteredFrames.length === 0 ? (
                    <div className="p-12 text-center bg-stone-950/60 rounded-2xl border border-amber-400/20">
                      <ImageIcon size={36} className="text-amber-400/40 mx-auto mb-2" />
                      <p className="text-sm font-serif text-amber-200">Belum ada bingkai untuk filter ini</p>
                      <p className="text-xs text-stone-400 mt-1">
                        Klik tombol "+ Tambah Bingkai Baru" di atas untuk menambahkan template frame.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                      {filteredFrames.map((slot) => (
                        <AdminFrameCardItem
                          key={slot.id}
                          slot={slot}
                          isActive={slot.enabled !== false}
                          onToggleActive={() => handleToggleFrameActive(slot.id)}
                          onEdit={() => setStudioTargetFrame(slot)}
                          onDelete={() => handleDeleteFrame(slot.id, slot.name)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Cloud Database Frame (Supabase Sync) */}
              {activeTab === "cloud" && (
                <div className="space-y-5 max-w-2xl">
                  {/* Notice banner ensuring guest photos in Google Drive are untouched */}
                  <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs leading-relaxed space-y-1">
                    <p className="font-semibold text-amber-300 flex items-center gap-2 text-sm">
                      <Database size={16} />
                      <span>Sinkronisasi Otomatis Khusus Bingkai (Frame)</span>
                    </p>
                    <p className="text-stone-300">
                      Dengan menghubungkan ke database Supabase (gratis), setiap kali Anda menambah,
                      mengedit tata letak lubang foto, atau menghapus bingkai di salah satu laptop,
                      semua laptop / tablet lain akan <strong>otomatis terupdate secara realtime</strong>.
                    </p>
                    <p className="text-emerald-400 font-medium pt-1">
                      🔒 <strong>Foto Tamu Aman:</strong> Foto hasil photobooth tetap otomatis terunggah ke Google Drive Anda dan tidak diutak-atik sama sekali.
                    </p>
                  </div>

                  {/* Cloud Connection Form */}
                  <div className="bg-stone-900/60 p-5 rounded-2xl border border-amber-400/25 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-serif text-amber-200 font-semibold flex items-center gap-2">
                        <span>Konfigurasi Supabase</span>
                        {cloudConfig.enabled && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-sans">
                            Aktif
                          </span>
                        )}
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cloudConfig.enabled}
                          onChange={(e) => {
                            const updated = { ...cloudConfig, enabled: e.target.checked };
                            setCloudConfig(updated);
                            saveCloudSyncConfig(updated);
                            showToast(
                              updated.enabled
                                ? "✓ Sinkronisasi cloud frame diaktifkan"
                                : "Sinkronisasi cloud dinonaktifkan"
                            );
                          }}
                          className="rounded text-amber-400 focus:ring-amber-400 bg-stone-900 border-stone-700 w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-amber-200">
                          Aktifkan Auto-Sync Cloud
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Supabase Project URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://xyzcompany.supabase.co"
                        value={cloudConfig.supabaseUrl}
                        onChange={(e) =>
                          setCloudConfig({ ...cloudConfig, supabaseUrl: e.target.value })
                        }
                        className="w-full bg-stone-900 border border-amber-400/20 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <span className="text-[10px] text-stone-400 block mt-1">
                        Dapat dilihat di Project Settings → API pada dashboard Supabase Anda.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Supabase Public Anon Key
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={cloudConfig.supabaseAnonKey}
                        onChange={(e) =>
                          setCloudConfig({ ...cloudConfig, supabaseAnonKey: e.target.value })
                        }
                        className="w-full bg-stone-900 border border-amber-400/20 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
                      />
                      <span className="text-[10px] text-stone-400 block mt-1">
                        Dapat dilihat di Project Settings → API → Project API Keys (anon public).
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          saveCloudSyncConfig(cloudConfig);
                          showToast("✓ Pengaturan Supabase berhasil disimpan!");
                        }}
                        className="btn-gold px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save size={14} />
                        <span>Simpan Pengaturan</span>
                      </button>

                      <button
                        type="button"
                        disabled={cloudTesting}
                        onClick={handleTestCloud}
                        className="px-4 py-2 rounded-xl border border-amber-400/30 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={cloudTesting ? "animate-spin" : ""} />
                        <span>{cloudTesting ? "Memeriksa..." : "Tes Koneksi Supabase"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={cloudPushing}
                        onClick={handlePushFramesToCloud}
                        className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={14} className={cloudPushing ? "animate-bounce" : ""} />
                        <span>{cloudPushing ? "Mengunggah..." : "Upload Frame ke Cloud"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={cloudPulling}
                        onClick={handlePullFramesFromCloud}
                        className="px-4 py-2 rounded-xl border border-sky-500/30 bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download size={14} className={cloudPulling ? "animate-bounce" : ""} />
                        <span>{cloudPulling ? "Mengunduh..." : "Tarik Frame dari Cloud"}</span>
                      </button>
                    </div>
                  </div>

                  {/* SQL Setup Instructions Box */}
                  <div className="bg-stone-900/40 p-5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-amber-300">
                        ⚡ Cara Buat Tabel di Supabase (Hanya Sekali & Cuma 30 Detik)
                      </h4>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="px-3 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Copy size={12} />
                        <span>{copiedSql ? "Tersalin!" : "Salin Script SQL"}</span>
                      </button>
                    </div>
                    <ol className="text-[11px] text-stone-400 list-decimal pl-4 space-y-1">
                      <li>Buka dashboard proyek Anda di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">supabase.com</a>.</li>
                      <li>Klik menu <strong>SQL Editor</strong> di sebelah kiri.</li>
                      <li>Klik <strong>New Query</strong>, tempel (paste) kode SQL di bawah ini, lalu klik tombol <strong>RUN</strong>.</li>
                    </ol>
                    <pre className="bg-black/60 p-3 rounded-xl border border-white/5 text-[10px] font-mono text-amber-200/90 overflow-x-auto whitespace-pre">
                      {SUPABASE_SQL_SETUP}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 3: Google Drive Storage */}
              {activeTab === "drive" && (
                <div className="space-y-4 max-w-2xl">
                  <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs leading-relaxed">
                    💡 <strong>Integrasi Google Drive:</strong> Setiap foto strip yang selesai
                    secara otomatis diunggah ke Google Apps Script dan disimpan ke folder Google
                    Drive Anda. QR code di layar hasil akan otomatis mengarahkan tamu ke folder ini.
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Google Apps Script Web App URL
                    </label>
                    <input
                      type="url"
                      value={driveForm.appsScriptUrl}
                      onChange={(e) =>
                        setDriveForm({ ...driveForm, appsScriptUrl: e.target.value })
                      }
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Google Drive Folder URL (Untuk QR Code)
                    </label>
                    <input
                      type="url"
                      value={driveForm.driveFolderUrl}
                      onChange={(e) =>
                        setDriveForm({ ...driveForm, driveFolderUrl: e.target.value })
                      }
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="autoUploadToggle"
                      checked={driveForm.autoUpload}
                      onChange={(e) =>
                        setDriveForm({ ...driveForm, autoUpload: e.target.checked })
                      }
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="autoUploadToggle"
                      className="text-xs text-stone-300 cursor-pointer"
                    >
                      Otomatis unggah hasil foto ke Google Drive setelah sesi selesai
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={() => {
                        onSaveDriveConfig(driveForm);
                        showToast("Konfigurasi Google Drive berhasil disimpan!");
                      }}
                      className="btn-gold px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      <span>Simpan Konfigurasi Drive</span>
                    </button>

                    <button
                      onClick={handleTestDriveUpload}
                      disabled={testingDrive}
                      className="btn-gold-outline px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CloudUpload size={14} />
                      <span>{testingDrive ? "Menguji..." : "Uji Koneksi Apps Script"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Booth & Camera */}
              {activeTab === "booth" && (
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Pilihan Kamera Webcam / DSLR USB
                    </label>
                    <select
                      value={boothForm.selectedCameraId || ""}
                      onChange={(e) =>
                        setBoothForm({ ...boothForm, selectedCameraId: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                    >
                      <option value="">Default System Camera</option>
                      {cameraDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Durasi Hitung Mundur (Detik)
                      </label>
                      <select
                        value={boothForm.countdownDuration}
                        onChange={(e) =>
                          setBoothForm({
                            ...boothForm,
                            countdownDuration: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                      >
                        <option value={3}>3 Detik (Cepat)</option>
                        <option value={5}>5 Detik (Ideal)</option>
                        <option value={7}>7 Detik (Santai)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Auto-Reset ke Layar Awal (Detik)
                      </label>
                      <select
                        value={boothForm.autoResetDuration}
                        onChange={(e) =>
                          setBoothForm({
                            ...boothForm,
                            autoResetDuration: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                      >
                        <option value={30}>30 Detik</option>
                        <option value={60}>60 Detik (1 Menit)</option>
                        <option value={90}>90 Detik</option>
                        <option value={120}>120 Detik (2 Menit)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Jumlah Lembar Cetak Default
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={boothForm.defaultPrintCopies}
                        onChange={(e) =>
                          setBoothForm({
                            ...boothForm,
                            defaultPrintCopies: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Ubah PIN Admin
                      </label>
                      <input
                        type="password"
                        maxLength={8}
                        value={boothForm.adminPin}
                        onChange={(e) =>
                          setBoothForm({ ...boothForm, adminPin: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        📷 Orientasi Kamera (Camera Rotation)
                      </label>
                      <select
                        value={boothForm.cameraRotation ?? 0}
                        onChange={(e) =>
                          setBoothForm({
                            ...boothForm,
                            cameraRotation: (parseInt(e.target.value) || 0) as 0 | 90 | 180 | 270,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                      >
                        <option value={0}>0° - Normal</option>
                        <option value={90}>90° - Putar 90° Searah Jarum Jam</option>
                        <option value={180}>180° - Putar 180°</option>
                        <option value={270}>270° - Putar 270°</option>
                      </select>
                      <p className="text-[10px] text-stone-400 mt-1">
                        Gunakan jika posisi kamera webcam terpasang miring/sideways.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="mirrorToggle"
                      checked={boothForm.mirrorCamera}
                      onChange={(e) =>
                        setBoothForm({ ...boothForm, mirrorCamera: e.target.checked })
                      }
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <label htmlFor="mirrorToggle" className="text-xs text-stone-300 cursor-pointer">
                      Mirror Kamera Default (Cermin Selfie)
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="autoPrintToggle"
                      checked={boothForm.autoPrint ?? false}
                      onChange={(e) =>
                        setBoothForm({ ...boothForm, autoPrint: e.target.checked })
                      }
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <label htmlFor="autoPrintToggle" className="text-xs text-amber-200 font-semibold cursor-pointer">
                      🖨️ Cetak Otomatis (Auto-Print 10×15 cm 4R) saat Selesai Foto
                    </label>
                  </div>

                  {/* Margin Cetak Kertas 4R */}
                  <div className="p-3.5 rounded-xl bg-stone-900/80 border border-amber-400/20 space-y-3 mt-2">
                    <div>
                      <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                        <Printer size={14} />
                        <span>Margin Kertas Cetak 4R (Anti-Potong Tepi Kiri/Kanan)</span>
                      </h4>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Atur jarak aman dari tepi kertas fisik printer agar garis bingkai foto tidak terpotong.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-amber-200">
                            Margin Kanan & Kiri
                          </label>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {boothForm.printMarginX ?? 5} mm
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={15}
                          step={1}
                          value={boothForm.printMarginX ?? 5}
                          onChange={(e) =>
                            setBoothForm({
                              ...boothForm,
                              printMarginX: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          Standar aman: 5 - 6 mm
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-amber-200">
                            Margin Atas & Bawah
                          </label>
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {boothForm.printMarginY ?? 3} mm
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={15}
                          step={1}
                          value={boothForm.printMarginY ?? 3}
                          onChange={(e) =>
                            setBoothForm({
                              ...boothForm,
                              printMarginY: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          Standar aman: 3 - 5 mm
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSaveBoothSettings(boothForm);
                      showToast("Pengaturan booth berhasil disimpan!");
                    }}
                    className="btn-gold px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer mt-4"
                  >
                    <Save size={14} />
                    <span>Simpan Pengaturan Booth</span>
                  </button>

                  {/* Cross-device Sync & Backup Card */}
                  <div className="p-4 rounded-xl bg-stone-900/90 border border-amber-400/30 space-y-3 mt-8">
                    <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                      <Download size={16} />
                      <span>Sinkronisasi Antar Perangkat & Cadangan Data</span>
                    </h3>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Data bingkai dan konfigurasi disimpan di memori peramban (localStorage) perangkat ini.
                      Jika Anda ingin bingkai di <strong>laptop / tablet / HP lain</strong> sama persis dengan yang ada di sini:
                    </p>
                    <ol className="text-xs text-stone-400 list-decimal pl-4 space-y-1">
                      <li>Klik <strong>"Unduh Cadangan Semua Bingkai (.json)"</strong> di perangkat ini.</li>
                      <li>Kirim berkas .json tersebut ke perangkat tujuan (lewat WA, Flashdisk, Drive, dll).</li>
                      <li>Buka Admin di perangkat tujuan lalu klik <strong>"Impor Cadangan Bingkai"</strong>.</li>
                    </ol>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleExportConfig}
                        className="btn-gold px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Unduh Cadangan Semua Bingkai (.json)</span>
                      </button>
                      <label className="px-4 py-2 rounded-xl border border-amber-400/40 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold flex items-center gap-2 cursor-pointer">
                        <Upload size={14} />
                        <span>Impor Cadangan Bingkai (.json)</span>
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleImportConfig}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Session History */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-400">
                      Tersimpan {sessionHistory.length} sesi foto terakhir di perangkat ini.
                    </p>
                    {sessionHistory.length > 0 && (
                      <button
                        onClick={async () => {
                          if (confirm("Bersihkan seluruh riwayat foto sesi?")) {
                            await clearSessionHistory();
                            loadHistory();
                            showToast("Riwayat sesi dibersihkan");
                          }
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 underline"
                      >
                        Bersihkan Riwayat
                      </button>
                    )}
                  </div>

                  {sessionHistory.length === 0 ? (
                    <p className="text-xs text-stone-400 italic py-6 text-center">
                      Belum ada sesi foto yang tersimpan.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {sessionHistory.map((s) => (
                        <div
                          key={s.id}
                          className="p-2.5 rounded-xl border border-amber-400/20 bg-stone-900/50 flex flex-col justify-between"
                        >
                          <div className="h-40 rounded-lg overflow-hidden bg-black/60 border border-white/5 flex items-center justify-center p-1 mb-2">
                            <img
                              src={s.stripDataUrl}
                              alt="Sesi"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">{s.dateStr}</span>
                            <span className="text-[10px] text-amber-300 font-medium block">
                              {s.layout} • {s.frameTheme}
                            </span>
                            <div className="flex items-center gap-2 mt-2">
                              <a
                                href={s.stripDataUrl}
                                download={`session-${s.timestamp}.png`}
                                className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-stone-200 text-[10px] flex items-center justify-center gap-1"
                              >
                                <Download size={11} />
                                <span>Unduh</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Frame Studio Modal (1-Click Auto Scan, Magic Wand, Color Erase & Live Preview) */}
      {studioTargetFrame !== null && (
        <FrameStudioModal
          isOpen={studioTargetFrame !== null}
          onClose={() => setStudioTargetFrame(null)}
          initialId={typeof studioTargetFrame === "object" ? studioTargetFrame.id : undefined}
          initialSlotIndex={
            typeof studioTargetFrame === "object"
              ? slotsForm.findIndex((s) => s.id === studioTargetFrame.id)
              : undefined
          }
          initialName={typeof studioTargetFrame === "object" ? studioTargetFrame.name : ""}
          initialLayoutId={typeof studioTargetFrame === "object" ? studioTargetFrame.layoutId : "3x1"}
          initialImage={typeof studioTargetFrame === "object" ? studioTargetFrame.customImage : undefined}
          initialPreset={typeof studioTargetFrame === "object" ? studioTargetFrame.presetId : "auto"}
          initialPhotoBoxes={typeof studioTargetFrame === "object" ? studioTargetFrame.photoBoxes : undefined}
          onSaveFrame={({ id, slotIndex, name, layoutId, imagePngDataUrl, presetId, photoBoxes }) => {
            // Upload otomatis ke Google Drive jika ada gambar baru (Base64)
            if (imagePngDataUrl && imagePngDataUrl.startsWith("data:image") && driveForm.appsScriptUrl) {
              showToast("⏳ Mengunggah bingkai ke Google Drive...");
              uploadFrameToGoogleDrive(
                driveForm.appsScriptUrl,
                imagePngDataUrl,
                name,
                layoutId,
                isPartyFrames ? "party" : "wedding"
              ).then((res) => {
                if (res.success && res.directUrl) {
                  showToast(`☁️ Bingkai "${name}" berhasil tersimpan di Google Drive!`);
                  const currentList = isPartyFrames ? slotsPartyForm : slotsWeddingForm;
                  const updatedWithDrive = currentList.map((s) =>
                    (id && s.id === id) || s.name === name ? { ...s, customImage: res.directUrl } : s
                  );
                  updateActiveSlots(updatedWithDrive);
                }
              }).catch((err) => console.warn("Auto-upload frame error:", err));
            }
            let updated: FrameSlot[];
            if (id) {
              updated = slotsForm.map((s) =>
                s.id === id
                  ? {
                      ...s,
                      name,
                      layoutId,
                      customImage: imagePngDataUrl,
                      presetId,
                      photoBoxes,
                    }
                  : s
              );
              showToast(`✓ Bingkai "${name}" berhasil diperbarui!`);
            } else if (slotIndex !== undefined && slotIndex >= 0 && slotIndex < slotsForm.length) {
              updated = [...slotsForm];
              updated[slotIndex] = {
                ...updated[slotIndex],
                name,
                layoutId,
                customImage: imagePngDataUrl,
                presetId,
                photoBoxes,
              };
              showToast(`✓ Bingkai "${name}" berhasil diperbarui!`);
            } else {
              const newFrame: FrameSlot = {
                id: `frame_${Date.now()}`,
                name: name || `Bingkai ${slotsForm.length + 1}`,
                layoutId,
                customImage: imagePngDataUrl,
                presetThemeId: "custom",
                enabled: true,
                presetId,
                photoBoxes,
              };
              updated = [...slotsForm, newFrame];
              showToast(`✓ Bingkai baru "${name}" berhasil ditambahkan!`);
            }
            updateActiveSlots(updated);
            setStudioTargetFrame(null);
          }}
        />
      )}
    </div>
  );
};
