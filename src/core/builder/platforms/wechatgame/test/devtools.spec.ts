'use strict';

/**
 * Unit tests for the WeChat DevTools cli resolver (TDD gate).
 */

const mockExistsSync = jest.fn();
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: (...args: any[]) => (mockExistsSync as any)(...args),
}));

import { join } from 'path';
import { resolveWeChatDevToolsCli, DEFAULT_INSTALL_DIRS, cliNameForPlatform } from '../src/devtools';

const CLI_NAME = cliNameForPlatform();
const normal = (p: string) => p.replace(/\\/g, '/');

beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.WECHAT_DEVTOOLS_PATH;
});

describe('resolveWeChatDevToolsCli', () => {
    test('returns a configured cli file path when it exists', () => {
        const configured = join('D:/tools/wechat', CLI_NAME);
        mockExistsSync.mockImplementation((p: string) => normal(p) === normal(configured));
        expect(resolveWeChatDevToolsCli(configured)).toBe(configured);
    });

    test('accepts a configured install directory and appends the platform cli name', () => {
        const dir = 'D:/tools/wechat';
        const expected = join(dir, CLI_NAME);
        mockExistsSync.mockImplementation((p: string) => normal(p) === normal(expected));
        expect(resolveWeChatDevToolsCli(dir)).toBe(expected);
    });

    test('honours the WECHAT_DEVTOOLS_PATH environment variable', () => {
        const dir = 'E:/env/wechat';
        const expected = join(dir, CLI_NAME);
        process.env.WECHAT_DEVTOOLS_PATH = dir;
        mockExistsSync.mockImplementation((p: string) => normal(p) === normal(expected));
        expect(resolveWeChatDevToolsCli()).toBe(expected);
    });

    test('probes the default install dirs', () => {
        const expected = join(DEFAULT_INSTALL_DIRS[0], CLI_NAME);
        mockExistsSync.mockImplementation((p: string) => normal(p) === normal(expected));
        expect(resolveWeChatDevToolsCli()).toBe(expected);
    });

    test('returns undefined when nothing exists', () => {
        mockExistsSync.mockReturnValue(false);
        expect(resolveWeChatDevToolsCli()).toBeUndefined();
    });
});
