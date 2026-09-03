'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { settingsService } from '@/lib/services/settingsService';

export interface LogoUploaderProps {
  logoUrl?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function LogoUploader({ logoUrl, onChange, disabled = false }: LogoUploaderProps) {
  const toast = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) return;

    // Early client-side validation
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid PNG, JPG, or WEBP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file size must be smaller than 2 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Temporary object URL for immediate responsiveness
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);
    setIsUploading(true);

    try {
      const persistedUrl = await settingsService.uploadLogo(file);
      onChange(persistedUrl);
      toast.success('Logo Uploaded', 'Business logo has been uploaded and saved.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Logo upload failed.';
      setError(msg);
      toast.error('Upload Failed', msg);
    } finally {
      URL.revokeObjectURL(tempUrl);
      setPreviewUrl(null);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setError(null);
    setIsRemoving(true);

    try {
      await settingsService.deleteLogo();
      onChange('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Logo Removed', 'Business logo has been removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove logo.';
      setError(msg);
      toast.error('Remove Failed', msg);
    } finally {
      setIsRemoving(false);
    }
  };

  const currentLogo = previewUrl || logoUrl;
  const isBusy = disabled || isUploading || isRemoving;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-slate-700">
        Business Logo
      </label>

      {error && (
        <div
          className="rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 animate-in fade-in"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Logo Preview Box */}
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden group">
          {currentLogo ? (
            <>
              <img
                src={currentLogo}
                alt="Business logo preview"
                className="h-full w-full object-contain p-2"
              />
              {isUploading && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs text-white flex flex-col items-center justify-center gap-1">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                  <span className="text-[10px] font-medium">Uploading</span>
                </div>
              )}
              {!isBusy && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                  title="Remove logo"
                  aria-label="Remove logo"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </>
          ) : (
            <div className="text-center text-slate-400 p-2">
              {isUploading ? (
                <Loader2 className="mx-auto h-6 w-6 text-indigo-600 animate-spin mb-1" />
              ) : (
                <ImageIcon className="mx-auto h-6 w-6 text-slate-300 mb-1" />
              )}
              <span className="text-[10px] font-medium block">
                {isUploading ? 'Uploading...' : 'No Logo'}
              </span>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
            disabled={isBusy}
            className="hidden"
            id="logo-file-input"
            aria-label="Upload business logo file"
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              isLoading={isUploading}
              leftIcon={!isUploading && <Upload className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              {currentLogo ? 'Change Logo' : 'Upload Logo'}
            </Button>

            {currentLogo && !isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isBusy}
                isLoading={isRemoving}
                className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                Remove
              </Button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Recommended: PNG, JPG, or WEBP up to 2 MB. Square or horizontal layout.
          </p>
        </div>
      </div>
    </div>
  );
}
