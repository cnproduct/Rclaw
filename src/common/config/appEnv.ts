/**
 * @license
 * Copyright 2025 Rclaw (rrennAI.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPlatformServices } from '@/common/platform';

/**
 * Returns baseName unchanged in release builds, or baseName + '-dev' in dev builds.
 * When RCLAW_MULTI_INSTANCE=1, appends '-2' to isolate the second dev instance.
 * Used to isolate symlink and directory names between environments.
 *
 * @example
 * getEnvAwareName('.rclaw')        // release → '.rclaw',        dev → '.rclaw-dev'
 * getEnvAwareName('.rclaw-config') // release → '.rclaw-config', dev → '.rclaw-config-dev'
 * // with RCLAW_MULTI_INSTANCE=1:  dev → '.rclaw-dev-2'
 */
export function getEnvAwareName(baseName: string): string {
  if (getPlatformServices().paths.isPackaged() === true) return baseName;
  const suffix = process.env.RCLAW_MULTI_INSTANCE === '1' ? '-dev-2' : '-dev';
  return `${baseName}${suffix}`;
}
