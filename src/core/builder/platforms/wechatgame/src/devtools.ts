'use strict';

import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Common WeChat DevTools install locations.
 * The cli inside them is used to open a built mini game project.
 */
export const DEFAULT_INSTALL_DIRS: string[] = process.platform === 'win32'
    ? [
        'C:/Program Files (x86)/Tencent/微信web开发者工具',
        'C:/Program Files/Tencent/微信web开发者工具',
        'E:/Program Files (x86)/Tencent/微信web开发者工具',
        'D:/Program Files (x86)/Tencent/微信web开发者工具',
    ]
    : process.platform === 'darwin'
        ? ['/Applications/wechatwebdevtools.app']
        : [];

/** The executable name of the DevTools cli on this platform. */
export function cliNameForPlatform(): string {
    return process.platform === 'win32' ? 'cli.bat' : 'cli';
}

/** Candidate cli paths inside an installation directory. */
export function candidateClisInDir(dir: string): string[] {
    if (process.platform === 'darwin') {
        return [join(dir, 'Contents/MacOS/cli'), join(dir, 'cli')];
    }
    return [join(dir, cliNameForPlatform())];
}

/**
 * Resolve the WeChat DevTools cli used by the run stage.
 *
 * Resolution order: explicit option -> WECHAT_DEVTOOLS_PATH env -> default install dirs.
 * A configured value may be either the cli itself or an install directory.
 */
export function resolveWeChatDevToolsCli(configured?: string): string | undefined {
    const candidates: string[] = [];

    const consider = (raw?: string): void => {
        if (!raw) {
            return;
        }
        const normalized = raw.replace(/\\/g, '/');
        if (/(^|\/)cli(\.exe|\.bat)?$/i.test(normalized)) {
            candidates.push(raw);
            return;
        }
        if (existsSync(raw)) {
            candidates.push(...candidateClisInDir(raw));
        } else {
            // Even when the configured directory does not exist, keep probing it: a missing dir
            // simply fails the existsSync checks below.
            candidates.push(...candidateClisInDir(raw));
        }
    };

    consider(configured);
    consider(process.env.WECHAT_DEVTOOLS_PATH);
    DEFAULT_INSTALL_DIRS.forEach((dir) => candidates.push(...candidateClisInDir(dir)));

    return candidates.find((candidate) => existsSync(candidate));
}
