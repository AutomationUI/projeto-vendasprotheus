import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, Check, X, AlertCircle, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setIsLoadingCamera(true);
    setErrorMessage(null);
    setCapturedBlobUrl(null);
    setCapturedFile(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador ou ambiente não possui suporte para acesso direto à câmera.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("[CameraCaptureModal] Erro ao iniciar câmera:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Permissão de câmera negada. Conceda permissão no navegador para fotografar o produto.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("Nenhuma câmera detectada neste dispositivo.");
      } else {
        setErrorMessage(err.message || "Não foi possível acessar a câmera do dispositivo.");
      }
    } finally {
      setIsLoadingCamera(false);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
      setCapturedBlobUrl(null);
      setCapturedFile(null);
      setErrorMessage(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const filename = `camera_prod_${Date.now()}.jpg`;
          const file = new File([blob], filename, { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          setCapturedBlobUrl(url);
          setCapturedFile(file);
          stopStream();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
    }
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      onClose();
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-base">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>Fotografar Produto com Câmera</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Stream / Preview */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] overflow-hidden">
          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />

          {errorMessage ? (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
              <p className="text-zinc-200 text-sm font-medium mb-1">Acesso à câmera indisponível</p>
              <p className="text-zinc-400 text-xs mb-4">{errorMessage}</p>
              <Button variant="outline" size="sm" onClick={startCamera} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Tentar Novamente
              </Button>
            </div>
          ) : capturedBlobUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedBlobUrl}
                alt="Prévia capturada"
                className="max-h-[480px] w-auto max-w-full object-contain rounded"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                <Check className="w-3.5 h-3.5" /> Foto Capturada
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full max-h-[480px] object-cover"
              />
              {isLoadingCamera && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-zinc-300 text-sm gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                  Iniciando câmera...
                </div>
              )}
              {/* Framing Reticle */}
              <div className="pointer-events-none absolute inset-8 border border-white/30 rounded-xl flex items-center justify-center">
                <div className="w-12 h-12 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0 rounded-tl-lg" />
                <div className="w-12 h-12 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0 rounded-tr-lg" />
                <div className="w-12 h-12 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0 rounded-bl-lg" />
                <div className="w-12 h-12 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0 rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-3">
            {!capturedBlobUrl && !errorMessage && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleFacingMode}
                  className="gap-1.5 text-zinc-300 border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                  title="Alternar entre câmera frontal e traseira"
                >
                  <SwitchCamera className="w-4 h-4" />
                  <span className="hidden sm:inline">Alternar Câmera</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleTakePhoto}
                  disabled={isLoadingCamera}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 gap-2 shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  Fotografar
                </Button>
              </>
            )}

            {capturedBlobUrl && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                  className="gap-1.5 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tirar Novamente
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirm}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 gap-2 shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  Usar esta Foto
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
