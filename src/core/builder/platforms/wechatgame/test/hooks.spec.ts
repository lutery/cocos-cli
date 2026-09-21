'use strict';

/**
 * Contract tests for the wechatgame build hooks (TDD gate).
 * Mocks fs-extra / ejs / child_process / the devtools resolver and pins:
 *  - the engine + script params required by the WeChat runtime (CJS import map, single engine file, remote script relocation)
 *  - the md5 plan for the fixed-name entry files (game.js / game.json / project.config.json must never be renamed)
 *  - the generated game.json / project.config.json contents
 *  - the run stage's actionable failure when WeChat DevTools is missing
 */

const mockRenderFile = jest.fn(async (tpl: string, data: any) => `RENDERED(${tpl})(${JSON.stringify(data)})`);
jest.mock('ejs', () => ({ __esModule: true, default: { renderFile: (...args: any[]) => (mockRenderFile as any)(...args) } }));

const mockCopyFileSync = jest.fn();
const mockOutputFileSync = jest.fn();
jest.mock('fs-extra', () => ({
    __esModule: true,
    copyFileSync: (...args: any[]) => mockCopyFileSync(...args),
    outputFileSync: (...args: any[]) => mockOutputFileSync(...args),
}));

const mockExecFile = jest.fn((_cli: string, _args: string[], _opts: any, cb: any) => cb && cb(null, 'ok', ''));
jest.mock('child_process', () => ({ execFile: (...args: any[]) => (mockExecFile as any)(...args) }));

const mockResolveDevTools = jest.fn();
jest.mock('../src/devtools', () => ({
    resolveWeChatDevToolsCli: (...args: any[]) => mockResolveDevTools(...args),
}));

import * as hooks from '../src/hooks';

const ENGINE_ROOT = 'C:/engine';

function makePackageOptions(overrides: Record<string, any> = {}) {
    return {
        appid: 'wx1234567890abcdef',
        orientation: 'portrait',
        useWebgl2: false,
        bgColor: '0,0,0,1',
        useLogo: true,
        useDefaultLogo: true,
        useCustomBg: false,
        fitWidth: true,
        fitHeight: false,
        displayRatio: 1,
        wechatToolsPath: '',
        ...overrides,
    };
}

function makeOptions(overrides: Record<string, any> = {}) {
    const options: any = {
        name: 'my-project',
        debug: true,
        platform: 'wechatgame',
        platformType: 'WECHAT',
        packages: { wechatgame: makePackageOptions() },
        engineInfo: { typescript: { builtin: ENGINE_ROOT, path: ENGINE_ROOT } },
        buildEngineParam: { split: true },
        buildScriptParam: { flags: {} },
        includeModules: [],
        md5CacheOptions: { includes: [], excludes: [], replaceOnly: [] },
        server: 'http://localhost:9527',
        ...overrides,
    };
    return options;
}

function makeResult(overrides: Record<string, any> = {}) {
    const result: any = {
        paths: {
            dir: 'C:/out',
            applicationJS: 'C:/out/application.js',
            importMap: 'C:/out/src/import-map.js',
            polyfillsJs: 'C:/out/src/polyfills.bundle.js',
            systemJs: 'C:/out/src/system.bundle.js',
            settings: 'C:/out/src/settings.json',
        },
        settings: { screen: {}, assets: { subpackages: [] } },
        ...overrides,
    };
    return result;
}

function makeBuilder(buildTemplateOverrides: Record<string, any> = {}) {
    return {
        buildTemplate: {
            findFile: jest.fn().mockReturnValue(undefined),
            initUrl: jest.fn().mockReturnValue(undefined),
            ...buildTemplateOverrides,
        },
    } as any;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockRenderFile.mockImplementation(async (tpl: string, data: any) => `RENDERED(${tpl})(${JSON.stringify(data)})`);
});

describe('onAfterInit', () => {
    test('pins engine params: single engine file, runtime-resolved assets, local remote scripts', async () => {
        const options = makeOptions();
        await hooks.onAfterInit(options, makeResult(), {} as any);
        expect(options.buildEngineParam.split).toBe(false);
        expect(options.buildEngineParam.assetURLFormat).toBe('runtime-resolved');
        expect(options.moveRemoteBundleScript).toBe(true);
        expect(options.server).toBe('http://localhost:9527/');
    });
});

describe('onAfterBundleInit', () => {
    test('emits a CommonJS import map (game.ejs requires it with .default) and the web system preset', () => {
        const options = makeOptions();
        hooks.onAfterBundleInit(options);
        expect(options.buildScriptParam.importMapFormat).toBe('commonjs');
        expect(options.buildScriptParam.system).toEqual({ preset: 'web' });
    });

    test('adds gfx-webgl2 when useWebgl2 is on and removes it when off', () => {
        const on = makeOptions();
        on.packages.wechatgame = makePackageOptions({ useWebgl2: true });
        hooks.onAfterBundleInit(on);
        expect(on.includeModules).toContain('gfx-webgl2');

        const off = makeOptions();
        off.includeModules = ['gfx-webgl2'];
        hooks.onAfterBundleInit(off);
        expect(off.includeModules).not.toContain('gfx-webgl2');
    });
});

describe('onBeforeCompressSettings', () => {
    test('writes the orientation into settings.screen', async () => {
        const options = makeOptions();
        const result = makeResult();
        await hooks.onBeforeCompressSettings(options, result, {} as any);
        expect(result.settings.screen.orientation).toBe('portrait');
    });
});

describe('onBeforeCopyBuildTemplate', () => {
    test('protects the fixed-name WeChat entry files from md5 renaming', async () => {
        const options = makeOptions();
        const result = makeResult();
        await hooks.onBeforeCopyBuildTemplate.call(makeBuilder(), options, result);

        expect(options.md5CacheOptions.replaceOnly).toEqual(expect.arrayContaining(['game.js', 'game.json', 'project.config.json']));
        expect(options.md5CacheOptions.excludes).toEqual(expect.arrayContaining(['first-screen.js', 'logo.png', 'slogan.png', 'background.png']));
    });

    test('copies the wechat runtime adapters under the names game.js requires', async () => {
        const options = makeOptions({ debug: false });
        await hooks.onBeforeCopyBuildTemplate.call(makeBuilder(), options, makeResult());

        const calls = mockCopyFileSync.mock.calls.map(([from, to]) => [String(from).replace(/\\/g, '/'), String(to).replace(/\\/g, '/')]);
        expect(calls).toEqual(expect.arrayContaining([
            ['C:/engine/bin/adapter/minigame/wechat/web-adapter.min.js', 'C:/out/web-adapter.js'],
            ['C:/engine/bin/adapter/minigame/wechat/engine-adapter.min.js', 'C:/out/engine-adapter.js'],
        ]));
    });

    test('renders game.js with the paths the WeChat runtime needs', async () => {
        const options = makeOptions();
        const result = makeResult();
        await hooks.onBeforeCopyBuildTemplate.call(makeBuilder(), options, result);

        const gameCall = mockRenderFile.mock.calls.find(([tpl]) => String(tpl).endsWith('game.ejs'));
        expect(gameCall).toBeDefined();
        const data = gameCall![1] as Record<string, any>;
        expect(data.importMapFile).toBe('./src/import-map.js');
        expect(data.applicationJs).toBe('./application.js');
        // wx require resolves './'-relative paths reliably; the templates require these directly.
        expect(data.systemJsBundleFile).toBe('./src/system.bundle.js');
        expect(data.polyfillsBundleFile).toBe('./src/polyfills.bundle.js');
        expect(data.useWebgl2).toBe('false');
        expect(String(data.cocosTemplate).replace(/\\/g, '/')).toContain('templates/wechatgame/cocos-script.ejs');

        const gameWrite = mockOutputFileSync.mock.calls.find(([dest]) => String(dest).replace(/\\/g, '/') === 'C:/out/game.js');
        expect(gameWrite).toBeDefined();
    });

    test('emits game.json with deviceOrientation, networkTimeout and subpackages', async () => {
        const options = makeOptions();
        const result = makeResult();
        result.settings.assets.subpackages = ['sub1'];
        await hooks.onBeforeCopyBuildTemplate.call(makeBuilder(), options, result);

        const gameJsonWrite = mockOutputFileSync.mock.calls.find(([dest]) => String(dest).replace(/\\/g, '/') === 'C:/out/game.json');
        expect(gameJsonWrite).toBeDefined();
        const gameJson = JSON.parse(gameJsonWrite![1]);
        expect(gameJson.deviceOrientation).toBe('portrait');
        expect(gameJson.networkTimeout.downloadFile).toBe(500000);
        expect(gameJson.subpackages).toEqual([{ name: 'sub1', root: 'subpackages/sub1' }]);
        // WeChat DevTools (lib 3.17+) rejects an empty-string openDataContext; the field must be omitted.
        expect(gameJson).not.toHaveProperty('openDataContext');
    });

    test('emits project.config.json for WeChat DevTools with appid fallback and compileType game', async () => {
        const options = makeOptions();
        await hooks.onBeforeCopyBuildTemplate.call(makeBuilder(), options, makeResult());

        const cfgWrite = mockOutputFileSync.mock.calls.find(([dest]) => String(dest).replace(/\\/g, '/') === 'C:/out/project.config.json');
        expect(cfgWrite).toBeDefined();
        const cfg = JSON.parse(cfgWrite![1]);
        expect(cfg.compileType).toBe('game');
        expect(cfg.miniprogramRoot).toBe('./');
        expect(cfg.appid).toBe('wx1234567890abcdef');
        expect(cfg.projectname).toBe('my-project');
        expect(cfg.setting.minified).toBe(false); // debug build

        const emptyAppid = makeOptions();
        emptyAppid.packages.wechatgame = makePackageOptions({ appid: '' });
        mockOutputFileSync.mockClear();
        await hooks.onBeforeCopyBuildTemplate.call(makeBuilder(), emptyAppid, makeResult());
        const fallbackWrite = mockOutputFileSync.mock.calls.find(([dest]) => String(dest).replace(/\\/g, '/') === 'C:/out/project.config.json');
        expect(JSON.parse(fallbackWrite![1]).appid).toBe('touristappid');
    });
});

describe('run stage', () => {
    test('fails with an actionable message when WeChat DevTools is not found', async () => {
        mockResolveDevTools.mockReturnValue(undefined);
        const options = makeOptions();
        await expect(hooks.run.call({ buildExitRes: { custom: {} } } as any, 'C:/out', options)).rejects.toThrow(/WeChat DevTools/);
    });

    test('opens the build output directory with the DevTools cli when available', async () => {
        mockResolveDevTools.mockReturnValue('C:/devtools/cli.bat');
        const stage: any = { buildExitRes: { custom: {} } };
        const options = makeOptions();
        await hooks.run.call(stage, 'C:/out', options);

        expect(mockExecFile).toHaveBeenCalled();
        const [cli, args] = mockExecFile.mock.calls[0];
        expect(cli).toBe('C:/devtools/cli.bat');
        expect(args).toEqual(['open', '--project', 'C:/out']);
        expect(stage.buildExitRes.custom.projectPath).toBe('C:/out');
    });
});
