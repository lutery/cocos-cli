'use strict';

import { join } from 'path';
import { IPlatformBuildPluginConfig } from '../../../@types/protected';
import { GlobalPaths } from '../../../../../global';

const PLATFORM = 'wechatgame';

const buildTemplateDir = join(GlobalPaths.enginePath, `templates/${PLATFORM}`);

const ASTC_TYPES = ['astc_4x4', 'astc_5x5', 'astc_6x6', 'astc_8x8', 'astc_10x5', 'astc_10x10', 'astc_12x12'];

const config: IPlatformBuildPluginConfig = {
    displayName: 'i18n:wechatgame.title',
    platformType: 'WECHAT',
    doc: 'editor/publish/publish-wechatgame.html',
    hooks: './src/hooks',
    textureCompressConfig: {
        platformType: 'miniGame',
        support: {
            rgb: ['etc1_rgb', 'pvrtc_4bits_rgb', 'pvrtc_2bits_rgb', 'etc2_rgb', ...ASTC_TYPES],
            rgba: ['etc1_rgb_a', 'pvrtc_4bits_rgb_a', 'pvrtc_4bits_rgba', 'etc2_rgba', 'pvrtc_2bits_rgb_a', 'pvrtc_2bits_rgba', ...ASTC_TYPES],
        },
    },
    assetBundleConfig: {
        platformType: 'miniGame',
        supportedCompressionTypes: ['none', 'merge_dep', 'merge_all_json', 'subpackage'],
    },
    commonOptions: {
        // The WeChat mini game runtime ships no regenerator: async functions need the polyfill bundle.
        polyfills: {
            default: {
                asyncFunctions: true,
            },
        },
    },
    options: {
        appid: {
            label: 'i18n:wechatgame.options.appid',
            type: 'string',
            default: '',
            description: 'i18n:wechatgame.options.appid_tips',
            // Intentionally not 'required': an empty appid falls back to the tourist appid in the
            // built project.config.json, which is a valid WeChat DevTools workflow.
        },
        orientation: {
            label: 'i18n:wechatgame.options.orientation',
            type: 'enum',
            default: 'portrait',
            items: ['portrait', 'landscape'],
            description: 'i18n:wechatgame.options.orientation_tips',
        },
        useWebgl2: {
            label: 'i18n:wechatgame.options.use_webgl2',
            type: 'boolean',
            default: false,
            description: 'i18n:wechatgame.options.use_webgl2_tips',
        },
        // First screen (splash) options consumed by first-screen.ejs
        bgColor: {
            label: 'i18n:wechatgame.options.bg_color',
            type: 'string',
            default: '0,0,0,1',
            description: 'i18n:wechatgame.options.bg_color_tips',
        },
        useLogo: {
            label: 'i18n:wechatgame.options.use_logo',
            type: 'boolean',
            default: true,
        },
        useDefaultLogo: {
            label: 'i18n:wechatgame.options.use_default_logo',
            type: 'boolean',
            default: true,
        },
        useCustomBg: {
            label: 'i18n:wechatgame.options.use_custom_bg',
            type: 'boolean',
            default: false,
        },
        fitWidth: {
            label: 'i18n:wechatgame.options.fit_width',
            type: 'boolean',
            default: true,
        },
        fitHeight: {
            label: 'i18n:wechatgame.options.fit_height',
            type: 'boolean',
            default: false,
        },
        displayRatio: {
            label: 'displayRatio',
            type: 'number',
            default: 1,
            hidden: true,
        },
        wechatToolsPath: {
            label: 'i18n:wechatgame.options.wechat_tools_path',
            type: 'string',
            default: '',
            description: 'i18n:wechatgame.options.wechat_tools_path_tips',
        },
    },
    buildTemplateConfig: {
        templates: ['game.ejs', 'cocos-script.ejs', 'first-screen.ejs', 'game.json', 'project.config.json'].map((url) => ({
            path: join(buildTemplateDir, url),
            destUrl: url,
        })),
        version: '1.0.0',
    },
    customBuildStages: [{
        hook: 'run',
        name: 'run',
        // requiredBuildOptions defaults to true on purpose: it makes buildConfig persist
        // cocos.compile.config.json into the output dir, which the non-web run flow reads back.
    }],
};

export default config;
