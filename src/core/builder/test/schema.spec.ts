'use strict';

/**
 * Contract tests for the MCP builder zod schemas (TDD gate).
 * The wechatgame platform must be a first-class member of the discriminated unions, otherwise
 * `builder-build` rejects it with invalid_union_discriminator before the CLI ever sees the request.
 */

import { SchemaBuildOption, SchemaBuildConfigResult } from '../../../api/builder/schema';

describe('builder schema: wechatgame', () => {
    test('SchemaBuildOption accepts a wechatgame build with platform packages', () => {
        const parsed = SchemaBuildOption.safeParse({
            platform: 'wechatgame',
            packages: {
                wechatgame: {
                    appid: 'wx1234567890abcdef',
                    orientation: 'portrait',
                    useWebgl2: false,
                },
            },
        });
        expect(parsed.success).toBe(true);
    });

    test('SchemaBuildOption accepts wechatgame without packages (defaults apply)', () => {
        const parsed = SchemaBuildOption.safeParse({ platform: 'wechatgame' });
        expect(parsed.success).toBe(true);
    });

    test('SchemaBuildOption still rejects unknown platform discriminators', () => {
        const parsed = SchemaBuildOption.safeParse({ platform: 'not-a-real-platform' });
        expect(parsed.success).toBe(false);
    });

    test('SchemaBuildConfigResult exposes the wechatgame member for config queries', () => {
        const parsed = SchemaBuildConfigResult.safeParse({
            platform: 'wechatgame',
            packages: { wechatgame: {} },
        });
        expect(parsed.success).toBe(true);
    });
});
