'use strict';

module.exports = {
    title: 'WeChat Mini Game',
    options: {
        appid: 'WeChat AppID',
        appid_tips: 'Leave empty to use the tourist appid (WeChat DevTools preview only)',
        orientation: 'Device Orientation',
        orientation_tips: 'Rendered into game.json deviceOrientation. WeChat mini games support portrait and landscape only.',
        use_webgl2: 'Use WebGL2',
        use_webgl2_tips: 'Tries WebGL2 first and falls back to WebGL1 when unsupported (set by the first screen probe and reported to the engine).',
        bg_color: 'Splash background color',
        bg_color_tips: 'Comma separated r,g,b,a components in the 0-1 range, e.g. 0,0,0,1',
        use_logo: 'Show splash logo',
        use_default_logo: 'Show splash slogan',
        use_custom_bg: 'Use splash background image',
        fit_width: 'Fit splash to width',
        fit_height: 'Fit splash to height',
        wechat_tools_path: 'WeChat DevTools path',
        wechat_tools_path_tips: 'Install directory or cli of WeChat DevTools, used by the Run stage to open the built mini game.',
    },
    tips: {
        devtools_not_found: 'WeChat DevTools CLI not found. Install WeChat DevTools, enable its service port (Settings - Security), or set wechatToolsPath / WECHAT_DEVTOOLS_PATH.',
    },
    run: {
        label: 'Run',
    },
};
