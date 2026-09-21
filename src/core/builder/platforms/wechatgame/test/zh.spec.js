'use strict';

/**
 * i18n contract tests for the wechatgame platform (TDD gate).
 * The zh title is pinned by query-texture-compress-config.spec.ts ('微信小游戏'); both language
 * files must expose the same key set so the build panel never falls back to raw i18n keys.
 */

const zh = require('../i18n/zh.js');
const en = require('../i18n/en.js');

const keysOf = (obj) => Object.keys(obj).sort();

describe('wechatgame i18n', () => {
    test('pins the display titles used by the platform registry', () => {
        expect(zh.title).toBe('微信小游戏');
        expect(en.title).toBe('WeChat Mini Game');
    });

    test('keeps zh and en key sets in sync', () => {
        expect(keysOf(zh)).toEqual(keysOf(en));
        expect(keysOf(zh.options)).toEqual(keysOf(en.options));
        expect(keysOf(zh.tips)).toEqual(keysOf(en.tips));
        expect(keysOf(zh.run)).toEqual(keysOf(en.run));
    });

    test('translates every option referenced by config.ts', () => {
        ['appid', 'orientation', 'use_webgl2', 'bg_color', 'use_logo', 'use_default_logo', 'use_custom_bg', 'fit_width', 'fit_height', 'wechat_tools_path']
            .forEach((key) => {
                expect(typeof zh.options[key]).toBe('string');
                expect(typeof en.options[key]).toBe('string');
            });
    });
});
