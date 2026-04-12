import React from 'react';

interface InstallBannerProps {
  canInstall: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export default function InstallBanner({ canInstall, onInstall, onDismiss }: InstallBannerProps) {
  if (!canInstall) return null;

  return (
    <div className="install-banner glass" id="install-banner">
      <div className="install-banner-text">
        <div className="install-banner-title">📱 Add to Home Screen</div>
        <div className="install-banner-sub">Install for the best experience</div>
      </div>
      <button
        className="btn btn-primary"
        onClick={onInstall}
        style={{ flexShrink: 0 }}
        id="btn-install"
      >
        Install
      </button>
      <button
        className="modal-close"
        onClick={onDismiss}
        style={{ flexShrink: 0 }}
        id="btn-dismiss-install"
      >
        ✕
      </button>
    </div>
  );
}
