'use strict';

/**
 * Pins the MCP builder tool's dynamic platform schema (TDD gate).
 * The platform parameter description must advertise every known built-in platform, wechatgame included.
 */

import { z } from 'zod';
import { BuilderHook } from '../hooks/builder.hook';

describe('BuilderHook', () => {
    test('advertises wechatgame in the builder-build platform description', () => {
        const hook = new BuilderHook();
        const fields: Record<string, any> = {};
        const param = { name: 'platform', schema: z.string() };

        hook.onRegisterParam('builder-build', param, fields);

        const schema = fields['platform'] as z.ZodTypeAny;
        expect(schema).toBeDefined();
        expect(schema.description || '').toContain('wechatgame');
    });

    test('leaves other tools untouched', () => {
        const hook = new BuilderHook();
        const fields: Record<string, any> = {};
        const param = { name: 'platform', schema: z.string() };

        hook.onRegisterParam('some-other-tool', param, fields);

        expect(fields['platform']).toBeUndefined();
    });
});
