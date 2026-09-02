import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  title,
  subtitle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentPhoto;
    link.download = `foto-reforma-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="lightbox-backdrop"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md text-white animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h3 className="text-sm sm:text-base font-bold text-white truncate">
              {title || 'Fotos da Reforma / Manutenção'}
            </h3>
            <p className="text-xs text-white/60 truncate">
              {subtitle ? `${subtitle} • ` : ''}Foto {currentIndex + 1} de {photos.length}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Baixar imagem"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => window.open(currentPhoto, '_blank')}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer hidden sm:block"
            title="Abrir em nova aba"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
          <button
            id="btn-close-lightbox"
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-rose-600/80 rounded-lg transition-colors cursor-pointer ml-2"
            title="Fechar (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Navigation - Prev */}
        {photos.length > 1 && (
          <button
            id="btn-lightbox-prev"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-sm transition-all shadow-lg cursor-pointer"
            title="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Center Image */}
        <div className="max-w-5xl max-h-[75vh] sm:max-h-[80vh] flex items-center justify-center">
          <img
            src={currentPhoto}
            alt={title ? `${title} - Foto ${currentIndex + 1}` : `Foto ${currentIndex + 1}`}
            className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Navigation - Next */}
        {photos.length > 1 && (
          <button
            id="btn-lightbox-next"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-sm transition-all shadow-lg cursor-pointer"
            title="Próxima foto"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="py-3 px-4 bg-black/60 border-t border-white/10 flex justify-center items-center space-x-2 overflow-x-auto">
          {photos.map((photo, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                idx === currentIndex
                  ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/20 opacity-100'
                  : 'border-white/20 opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={photo}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
