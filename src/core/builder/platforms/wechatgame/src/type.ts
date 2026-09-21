'use strict';

import { IBuildPaths, InternalBuildResult } from '../../../@types/protected';

export type IOrientation = 'portrait' | 'landscape';

export interface IOptions {
    /** WeChat appid; empty falls back to the tourist appid in the built project.config.json. */
    appid: string;
    /** Written into game.json deviceOrientation. */
    orientation: IOrientation;
    /** Probe WebGL2 in the first screen and report it to the engine (falls back to WebGL1). */
    useWebgl2: boolean;
    /** First screen background color, comma separated r,g,b,a components in the 0-1 range. */
    bgColor: string;
    useLogo: boolean;
    useDefaultLogo: boolean;
    useCustomBg: boolean;
    fitWidth: boolean;
    fitHeight: boolean;
    displayRatio: number;
    /** Install dir or cli of WeChat DevTools, used by the run stage. */
    wechatToolsPath: string;
}

export interface IPaths extends IBuildPaths {
    gameJs?: string;
    gameJson?: string;
    projectConfigJson?: string;
}

export interface IBuildResult extends InternalBuildResult {
    paths: IPaths;
}
