'use strict';

/**
 * Pins the built-in platform registry (TDD gate).
 * `wechatgame` is registered as a mini-game platform; it must not leak into NATIVE_PLATFORM.
 */

import { PLATFORMS, NATIVE_PLATFORM } from '../share/platforms-options';

describe('platform registry', () => {
    test('registers wechatgame as a built-in platform', () => {
        expect(PLATFORMS).toContain('wechatgame');
    });

    test('keeps wechatgame out of the native platform list', () => {
        expect(NATIVE_PLATFORM).not.toContain('wechatgame');
    });

    test('keeps the existing built-in platforms registered', () => {
        ['web-desktop', 'web-mobile', 'android', 'ios', 'windows', 'mac', 'ohos', 'harmonyos-next'].forEach((platform) => {
            expect(PLATFORMS).toContain(platform);
        });
    });
});
