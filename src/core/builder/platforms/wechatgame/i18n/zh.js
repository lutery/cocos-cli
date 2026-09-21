'use strict';

module.exports = {
    title: '微信小游戏',
    options: {
        appid: '微信 AppID',
        appid_tips: '留空则使用游客 AppID（仅供微信开发者工具预览）',
        orientation: '屏幕方向',
        orientation_tips: '写入 game.json 的 deviceOrientation，微信小游戏仅支持竖屏与横屏。',
        use_webgl2: '使用 WebGL2',
        use_webgl2_tips: '优先使用 WebGL2，不支持时回退 WebGL1（由启动屏探测并告知引擎）。',
        bg_color: '启动背景颜色',
        bg_color_tips: '逗号分隔的 r,g,b,a 分量（0-1 范围），例如 0,0,0,1',
        use_logo: '显示启动 Logo',
        use_default_logo: '显示启动宣传语',
        use_custom_bg: '使用启动背景图',
        fit_width: '启动屏拉伸至宽度',
        fit_height: '启动屏拉伸至高度',
        wechat_tools_path: '微信开发者工具路径',
        wechat_tools_path_tips: '微信开发者工具安装目录或 cli 路径，供 Run 阶段打开构建产物使用。',
    },
    tips: {
        devtools_not_found: '未找到微信开发者工具 CLI。请安装微信开发者工具、开启服务端口（设置 - 安全设置），或配置 wechatToolsPath / WECHAT_DEVTOOLS_PATH。',
    },
    run: {
        label: '运行',
    },
};
