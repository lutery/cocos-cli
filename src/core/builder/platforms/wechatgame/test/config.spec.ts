'use strict';

/**
 * Contract tests for the wechatgame platform config (TDD gate).
 * Pins the values that the pre-existing builder specs (query-texture-compress-config,
 * get-registered-platforms, query-platform-build-schema) expect from this platform.
 */

import config from '../src/config';

const ASTC_TYPES = ['astc_4x4', 'astc_5x5', 'astc_6x6', 'astc_8x8', 'astc_10x5', 'astc_10x10', 'astc_12x12'];

describe('wechatgame platform config', () => {
    test('declares the WECHAT engine platform type and the pinned display name key', () => {
        expect(config.platformType).toBe('WECHAT');
        expect(config.displayName).toBe('i18n:wechatgame.title');
    });

    test('matches the texture compress lists pinned by query-texture-compress-config.spec.ts', () => {
        expect(config.textureCompressConfig).toBeDefined();
        expect(config.textureCompressConfig!.platformType).toBe('miniGame');
        expect(config.textureCompressConfig!.support.rgb).toEqual([
            'etc1_rgb', 'pvrtc_4bits_rgb', 'pvrtc_2bits_rgb', 'etc2_rgb', ...ASTC_TYPES,
        ]);
        expect(config.textureCompressConfig!.support.rgba).toEqual([
            'etc1_rgb_a', 'pvrtc_4bits_rgb_a', 'pvrtc_4bits_rgba', 'etc2_rgba', 'pvrtc_2bits_rgb_a', 'pvrtc_2bits_rgba', ...ASTC_TYPES,
        ]);
    });

    test('registers miniGame asset bundles including the wechat subpackage compression', () => {
        expect(config.assetBundleConfig).toBeDefined();
        expect(config.assetBundleConfig!.platformType).toBe('miniGame');
        expect(config.assetBundleConfig!.supportedCompressionTypes).toContain('subpackage');
    });

    test('exposes wechat specific build options', () => {
        const options = config.options as Record<string, any>;
        expect(options.appid.type).toBe('string');
        expect(options.orientation.type).toBe('enum');
        expect(options.orientation.items).toEqual(['portrait', 'landscape']);
        expect(options.useWebgl2.type).toBe('boolean');
    });

    test('declares the customizable build templates sourced from the engine wechatgame template dir', () => {
        const templates = config.buildTemplateConfig?.templates || [];
        const destUrls = templates.map((t) => t.destUrl);
        expect(destUrls).toEqual(expect.arrayContaining(['game.ejs', 'cocos-script.ejs', 'first-screen.ejs', 'game.json', 'project.config.json']));
        templates.forEach((t) => {
            expect(t.path.replace(/\\/g, '/')).toContain('templates/wechatgame/');
        });
    });

    test('registers a run stage that persists build options (cocos.compile.config.json is required by the run flow)', () => {
        const stages = config.customBuildStages || [];
        const runStage = stages.find((s) => s.name === 'run');
        expect(runStage).toBeDefined();
        expect(runStage!.hook).toBe('run');
        // For non-web platforms the run flow reads cocos.compile.config.json from the output dir,
        // which is only emitted when some stage has requiredBuildOptions !== false.
        expect(runStage!.requiredBuildOptions).not.toBe(false);
    });
});
