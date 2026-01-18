import { useState, useEffect } from 'react';

declare const __APP_VERSION__: string;

export interface FeatureHighlight {
  title: string;
  description: string;
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  featureHighlight?: FeatureHighlight;
}

// Feature highlights for milestone releases (used for preview mode)
const FEATURE_HIGHLIGHTS: Record<string, FeatureHighlight> = {
  '0.5.0': {
    title: 'Code Review is here!',
    description: 'Review git diffs with inline annotations. Run /plannotator-review to try it.',
  },
};

/**
 * Update checking is disabled to avoid external network requests.
 * The hook still supports ?preview-update=X.Y.Z for UI testing.
 */
export function useUpdateCheck(): UpdateInfo | null {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const currentVersion = typeof __APP_VERSION__ !== 'undefined'
      ? __APP_VERSION__
      : '0.0.0';

    // Debug: ?preview-update=0.5.0 simulates an update to that version
    const urlParams = new URLSearchParams(window.location.search);
    const previewVersion = urlParams.get('preview-update');

    if (previewVersion) {
      const cleanPreview = previewVersion.replace(/^v/, '');
      setUpdateInfo({
        currentVersion,
        latestVersion: previewVersion,
        updateAvailable: true,
        releaseUrl: `https://github.com/backnotprop/plannotator/releases/tag/v${cleanPreview}`,
        featureHighlight: FEATURE_HIGHLIGHTS[cleanPreview],
      });
    }
    // No external fetch - update checking disabled for privacy
  }, []);

  return updateInfo;
}
