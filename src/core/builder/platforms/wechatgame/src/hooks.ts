'use strict';

import Ejs from 'ejs';
import { copyFileSync, outputFileSync } from 'fs-extra';
import { execFile } from 'child_process';
import { join } from 'path';
import { BuilderCache, IBuilder, IBuildStageTask, IInterBuildTaskOption, InternalBuildResult } from '../../../@types/protected';
import { relativeUrl } from '../../../worker/builder/utils';
import { IBuildResult } from './type';
import { resolveWeChatDevToolsCli } from './devtools';

const PLATFORM = 'wechatgame';

export const throwError = true;

export async function onAfterInit(options: IInterBuildTaskOption<'wechatgame'>, _result: InternalBuildResult, _cache: BuilderCache) {
    options.buildEngineParam.split = false;
    options.buildEngineParam.assetURLFormat = 'runtime-resolved';
    // The WeChat runtime cannot fetch/evaluate remote bundle scripts: keep them inside the package.
    options.moveRemoteBundleScript = true;
    if (options.server && !options.server.endsWith('/')) {
        options.server += '/';
    }
}

export function onAfterBundleInit(options: IInterBuildTaskOption<'wechatgame'>) {
    options.buildScriptParam.system = { preset: 'web' };
    // game.js consumes the import map with `require('...').default` — it must be emitted as a
    // CommonJS module (src/import-map.js), not as raw JSON.
    options.buildScriptParam.importMapFormat = 'commonjs';
    const packageOptions = options.packages[PLATFORM];
    if (packageOptions.useWebgl2) {
        if (!options.includeModules.includes('gfx-webgl2')) {
            options.includeModules.push('gfx-webgl2');
        }
    } else if (options.includeModules.includes('gfx-webgl2')) {
        options.includeModules.splice(options.includeModules.indexOf('gfx-webgl2'), 1);
    }
}

export async function onBeforeCompressSettings(options: IInterBuildTaskOption<'wechatgame'>, result: InternalBuildResult, _cache: BuilderCache) {
    if (!result.paths.dir) {
        return;
    }
    result.settings.screen.orientation = options.packages[PLATFORM].orientation;
}

export async function onBeforeCopyBuildTemplate(this: IBuilder, options: IInterBuildTaskOption<'wechatgame'>, result: IBuildResult) {
    const engineBuiltin = options.engineInfo.typescript.builtin;
    const staticDir = join(engineBuiltin, `templates/${PLATFORM}`);
    const packageOptions = options.packages[PLATFORM];
    const outDir = result.paths.dir;
    const debug = !!options.debug;

    // WeChat loads game.js / game.json / project.config.json by fixed name — never md5-rename them.
    // replaceOnly rewrites their content references instead of renaming the files themselves.
    options.md5CacheOptions.replaceOnly.push('game.js', 'game.json', 'project.config.json');
    // The first screen loads these by hard-coded name at runtime.
    options.md5CacheOptions.excludes.push('first-screen.js', 'logo.png', 'slogan.png', 'background.png');

    // 1. Runtime adapters -> output root. game.js requires './web-adapter' and './engine-adapter';
    //    release builds use the minified payload under the plain name the template requires.
    const adapterDir = join(engineBuiltin, 'bin/adapter/minigame/wechat');
    for (const name of ['web-adapter', 'engine-adapter']) {
        const destName = `${name}.js`;
        if (this.buildTemplate.findFile(destName)) {
            continue; // a user build template provides its own copy (buildTemplate.copyTo overwrites ours)
        }
        copyFileSync(join(adapterDir, debug ? `${name}.js` : `${name}.min.js`), join(outDir, destName));
    }

    // 2. First screen (splash) + its images.
    const firstScreenTemplate = this.buildTemplate.initUrl('first-screen.ejs', 'firstScreen') || join(staticDir, 'first-screen.ejs');
    const firstScreenContent = await Ejs.renderFile(firstScreenTemplate, {
        displayRatio: packageOptions.displayRatio,
        bgColor: packageOptions.bgColor,
        useCustomBg: packageOptions.useCustomBg,
        useLogo: packageOptions.useLogo,
        useDefaultLogo: packageOptions.useDefaultLogo,
        logoName: 'logo.png',
        bgName: 'background.png',
        fitWidth: packageOptions.fitWidth,
        fitHeight: packageOptions.fitHeight,
    });
    outputFileSync(join(outDir, 'first-screen.js'), firstScreenContent, 'utf8');

    const copySplashIfMissing = (name: string, when: boolean) => {
        if (when && !this.buildTemplate.findFile(name)) {
            copyFileSync(join(staticDir, name), join(outDir, name));
        }
    };
    copySplashIfMissing('logo.png', packageOptions.useLogo);
    copySplashIfMissing('slogan.png', packageOptions.useLogo && packageOptions.useDefaultLogo);
    copySplashIfMissing('background.png', packageOptions.useCustomBg);

    // 3. game.js — the WeChat entry. The `./` prefixes keep wx require resolution unambiguous.
    const gameTemplate = this.buildTemplate.initUrl('game.ejs', 'gameEjs') || join(staticDir, 'game.ejs');
    const cocosScriptTemplate = this.buildTemplate.initUrl('cocos-script.ejs', 'cocosScript') || join(staticDir, 'cocos-script.ejs');
    const gameContent = await Ejs.renderFile(gameTemplate, {
        importMapFile: './' + relativeUrl(outDir, result.paths.importMap),
        applicationJs: './' + relativeUrl(outDir, result.paths.applicationJS),
        alpha: 'true',
        antialias: 'true',
        useWebgl2: String(!!packageOptions.useWebgl2),
        cocosTemplate: cocosScriptTemplate,
        // consumed by cocos-script.ejs through include(cocosTemplate, {}) (parent locals are inherited)
        polyfillsBundleFile: result.paths.polyfillsJs ? './' + relativeUrl(outDir, result.paths.polyfillsJs) : false,
        systemJsBundleFile: './' + relativeUrl(outDir, result.paths.systemJs!),
    });
    result.paths.gameJs = join(outDir, 'game.js');
    outputFileSync(result.paths.gameJs, gameContent, 'utf8');

    // 4. game.json — WeChat mini game manifest.
    if (!this.buildTemplate.findFile('game.json')) {
        const subpackageNames: string[] = (result.settings as any).assets?.subpackages || [];
        const gameJson: Record<string, unknown> = {
            deviceOrientation: packageOptions.orientation,
            // NOT openDataContext: WeChat DevTools (lib 3.17+) rejects an empty string
            // ("game.json: [\"openDataContext\"] 不能为 ''"), and the open data context is optional.
            networkTimeout: { request: 5000, connectSocket: 5000, uploadFile: 5000, downloadFile: 500000 },
        };
        if (subpackageNames.length) {
            gameJson.subpackages = subpackageNames.map((name) => ({ name, root: `subpackages/${name}` }));
        }
        result.paths.gameJson = join(outDir, 'game.json');
        outputFileSync(result.paths.gameJson, JSON.stringify(gameJson, null, debug ? 4 : 0), 'utf8');
    }

    // 5. project.config.json — what WeChat DevTools opens. Note: do NOT register these two files
    //    through buildTemplate.initUrl; registered urls are removed from the output after copyTo.
    if (!this.buildTemplate.findFile('project.config.json')) {
        result.paths.projectConfigJson = join(outDir, 'project.config.json');
        outputFileSync(result.paths.projectConfigJson, JSON.stringify({
            description: 'Cocos Creator project config.',
            miniprogramRoot: './',
            setting: {
                urlCheck: true,
                postcss: true,
                minified: !debug,
                newFeature: false,
                enhance: true,
                useIsolateContext: true,
            },
            compileType: 'game',
            libVersion: 'widelyUsed',
            appid: packageOptions.appid || 'touristappid',
            projectname: options.name || 'cocos-game',
            condition: {},
        }, null, 4), 'utf8');
    }
}

/**
 * `run` stage: open the build output in WeChat DevTools.
 * The stage keeps requiredBuildOptions default (true) so build options are persisted as
 * cocos.compile.config.json and merged back into `options` by the run flow.
 */
export async function run(this: IBuildStageTask, root: string, options: IInterBuildTaskOption<'wechatgame'>) {
    const packageOptions = options.packages?.[PLATFORM];
    const cli = resolveWeChatDevToolsCli(packageOptions?.wechatToolsPath);
    if (!cli) {
        throw new Error('WeChat DevTools CLI not found. Install WeChat DevTools and enable its service port '
            + '(Settings -> Security -> Service Port), or set packages.wechatgame.wechatToolsPath / '
            + 'WECHAT_DEVTOOLS_PATH to the DevTools cli.');
    }
    await new Promise<void>((resolve, reject) => {
        // .bat/.cmd needs a shell on Windows.
        const useShell = /\.(bat|cmd)$/i.test(cli);
        execFile(cli, ['open', '--project', root], { windowsHide: true, shell: useShell }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Failed to open WeChat DevTools (${cli}): ${error.message}. ${stderr || stdout || ''}`));
                return;
            }
            resolve();
        });
    });
    this.buildExitRes.custom = { ...(this.buildExitRes.custom || {}), projectPath: root, devtoolsCli: cli };
}
