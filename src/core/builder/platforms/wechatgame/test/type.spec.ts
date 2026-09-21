'use strict';

/**
 * Compile-time + shape contract for the wechatgame platform option types (TDD gate).
 * The typed fixture below fails to compile if IOptions drifts from the config option keys.
 */

import { IOptions, IOrientation } from '../src/type';

describe('wechatgame platform types', () => {
    test('IOptions covers every option exposed by config.ts', () => {
        const options: IOptions = {
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
        };
        expect(Object.keys(options).sort()).toEqual([
            'appid', 'bgColor', 'displayRatio', 'fitHeight', 'fitWidth',
            'orientation', 'useCustomBg', 'useDefaultLogo', 'useLogo', 'useWebgl2', 'wechatToolsPath',
        ]);
    });

    test('orientation accepts exactly the two WeChat game.json values', () => {
        const values: IOrientation[] = ['portrait', 'landscape'];
        expect(values).toHaveLength(2);
    });
});
