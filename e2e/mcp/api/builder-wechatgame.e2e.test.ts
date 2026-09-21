import { setupMCPTestEnvironment, teardownMCPTestEnvironment, MCPTestContext, E2E_TIMEOUTS } from '../../helpers/test-utils';
import { join } from 'path';
import { pathExists, readFile, readdirSync } from 'fs-extra';

/**
 * WeChat mini game (wechatgame) platform E2E.
 *
 * Verifies the WeChat entry chain produced by the platform hooks:
 *  game.js -> ./web-adapter -> ./first-screen -> src/polyfills + src/system + src/import-map(.js, CJS)
 *          -> ./application*.js -> cc (via import map) -> ./engine-adapter
 * plus the DevTools-facing configs (game.json / project.config.json) and the fixed-name guarantees
 * (entry files must never be md5 renamed; their references are rewritten instead).
 */
describe('MCP Builder API - wechatgame', () => {
    let context: MCPTestContext;

    beforeAll(async () => {
        // Dedicated project copy: wechatgame builds should not race the other builder suites.
        context = await setupMCPTestEnvironment(undefined, 'mcp-e2e-wechatgame');
    });

    afterAll(async () => {
        // 注意：不关闭共享的 MCP 服务器，由全局 teardown 统一清理
        await teardownMCPTestEnvironment(context);
    });

    const findFileByPrefix = (dir: string, prefix: string): string | undefined =>
        readdirSync(dir).find((name: string) => name.startsWith(prefix) && !name.endsWith('.map'));

    test('builds a complete WeChat mini game package', async () => {
        const result = await context.mcpClient.callTool('builder-build', {
            platform: 'wechatgame',
            options: {
                outputName: 'wechatgame',
                debug: true,
                buildPath: 'project://build',
                packages: {
                    wechatgame: {
                        appid: 'wx1234567890abcdef',
                        orientation: 'portrait',
                        useWebgl2: false,
                    },
                },
            },
        }, E2E_TIMEOUTS.BUILD_OPERATION);

        expect(result.reason).toBe(undefined);
        expect(result.code).toBe(200);
        expect(result.data).toBeDefined();
        expect(result.data.code).toBe(0);
        expect(result.data.dest).toBe('project://build/wechatgame');

        const out = join(context.testProject.path, 'build', 'wechatgame');

        // Fixed-name WeChat entry files + DevTools configs.
        for (const name of ['game.js', 'game.json', 'project.config.json']) {
            expect(await pathExists(join(out, name))).toBe(true);
        }
        // Runtime adapters and first screen copied by the platform hooks.
        for (const name of ['web-adapter.js', 'engine-adapter.js', 'first-screen.js', 'logo.png']) {
            expect(await pathExists(join(out, name))).toBe(true);
        }
        // Engine + runtime scripts.
        expect(await pathExists(join(out, 'cocos-js'))).toBe(true);
        expect(await pathExists(join(out, 'src'))).toBe(true);

        // game.js must wire the WeChat chain and reference the built import map by its real (possibly hashed) name.
        const gameJs = await readFile(join(out, 'game.js'), 'utf8');
        expect(gameJs).toContain("require('./web-adapter')");
        expect(gameJs).toContain("require('./first-screen')");
        expect(gameJs).toContain("require('./engine-adapter')");
        expect(gameJs).toMatch(/require\("\.\/src\/import-map[\w.-]*\.js"\)\.default/);
        expect(gameJs).toMatch(/System\.import\('\.\/application[\w.-]*\.js'\)/);

        // The import map must be a CommonJS module (game.js consumes its .default).
        const importMapName = findFileByPrefix(join(out, 'src'), 'import-map');
        expect(importMapName).toBeDefined();
        const importMap = await readFile(join(out, 'src', importMapName!), 'utf8');
        expect(importMap).toContain('exports');
        expect(importMap).toContain('default');

        // game.json / project.config.json contents driven by the platform options.
        const gameJson = JSON.parse(await readFile(join(out, 'game.json'), 'utf8'));
        expect(gameJson.deviceOrientation).toBe('portrait');

        const projectConfig = JSON.parse(await readFile(join(out, 'project.config.json'), 'utf8'));
        expect(projectConfig.compileType).toBe('game');
        expect(projectConfig.miniprogramRoot).toBe('./');
        expect(projectConfig.appid).toBe('wx1234567890abcdef');
    }, E2E_TIMEOUTS.BUILD_OPERATION);

    test('falls back to the tourist appid and honours landscape orientation', async () => {
        const result = await context.mcpClient.callTool('builder-build', {
            platform: 'wechatgame',
            options: {
                outputName: 'wechatgame-landscape',
                debug: true,
                buildPath: 'project://build',
                packages: {
                    wechatgame: {
                        orientation: 'landscape',
                    },
                },
            },
        }, E2E_TIMEOUTS.BUILD_OPERATION);

        expect(result.code).toBe(200);
        expect(result.data.code).toBe(0);

        const out = join(context.testProject.path, 'build', 'wechatgame-landscape');
        const gameJson = JSON.parse(await readFile(join(out, 'game.json'), 'utf8'));
        expect(gameJson.deviceOrientation).toBe('landscape');

        const projectConfig = JSON.parse(await readFile(join(out, 'project.config.json'), 'utf8'));
        expect(projectConfig.appid).toBe('touristappid');
    }, E2E_TIMEOUTS.BUILD_OPERATION);
});
