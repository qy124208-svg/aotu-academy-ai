# -*- coding: utf-8 -*-
"""素材图直转桌宠帧：14张高清素材 -> 21帧 shimeji 128px 透明底
流程：RGBA直接用alpha / RGB泛洪去白底 -> 边缘羽化 -> 裁剪bbox -> LANCZOS缩放 -> 128画布锚定
雷狮参考帧全面弃用（串色+OpenPose逻辑错误）"""
import os
import cv2
import numpy as np
from PIL import Image, ImageFilter

SRC_DIR = r"C:\Users\14206\Desktop\安迷修图片"
OUT_DIR = r"C:\Users\14206\Desktop\凹凸转学记\img\anmicius"
CANVAS = 256    # 2x分辨率：引擎显示128px，缩小渲染更锐利(高DPI屏受益)
MAX_SIZE = 248  # 角色最长边，留少量边距

# (输出帧名, 源图, 锚定方式)  anchor: bottom=贴地 / center=悬空
FRAME_MAP = [
    ("shime1.png",  "正面全身图.png",       "bottom"),  # Idle站立
    ("shime1b.png", "正面全身图.png",       "bottom"),  # Idle眨眼(占位)
    ("shime2.png",  "迈左脚走路图.png",     "bottom"),  # Walk步1
    ("shime3.png",  "迈右脚走路图.png",     "bottom"),  # Walk步2
    ("shime4.png",  "被提起悬挂半空图.png", "center"),  # Fall1(占位)
    ("shime4b.png", "被提起悬挂半空图.png", "center"),  # Fall2(占位)
    ("shime5.png",  "被提起悬挂半空图.png", "center"),  # Dragged拖拽
    ("shime11.png", "坐姿图.png",           "bottom"),  # Sit主帧
    ("shime11b.png","坐姿图.png",           "bottom"),  # Sit眨眼(占位)
    ("shime15.png", "坐姿图.png",           "bottom"),  # Sit变体1(占位)
    ("shime16.png", "坐姿图.png",           "bottom"),  # Sit变体2(占位)
    ("shime17.png", "坐姿图.png",           "bottom"),  # Sit变体3(占位)
    ("shime18.png", "侧躺睡觉图.png",       "bottom"),  # Sleep1
    ("shime21.png", "趴在地上图.png",       "bottom"),  # Sleep2
    ("shime27.png", "微笑图.png",           "bottom"),  # CP互动1(占位·胸像)
    ("shime28.png", "微笑图.png",           "bottom"),  # CP互动2(占位·胸像)
    ("shime29.png", "微笑图.png",           "bottom"),  # CP互动3(占位·胸像)
    ("shime38.png", "正面全身图.png",       "bottom"),  # 宽幅特殊1(占位)
    ("shime39.png", "正面全身图.png",       "bottom"),  # 宽幅特殊2(占位)
    ("shime40.png", "正面全身图.png",       "bottom"),  # 宽幅特殊3(占位)
    ("shime41.png", "正面全身图.png",       "bottom"),  # 宽幅特殊4(占位)
]

WHITE_THRESH = 252  # 泛洪判白阈值(收紧：米白衬衫≈248会被240误判泛洪漏抠)
RIM_THRESH = 235    # 抗锯齿白边吸收阈值
RIM_ITER = 3        # 白边吸收最大扩张px
HOLE_MIN_AREA = 1000  # 封闭白洞填除阈值(px)：胳膊-身体死角3000~11000，眼睛高光/线稿缝<700
BUST_SOURCES = {"微笑图.png", "生气图.png", "闭眼图.png"}  # 胸像不填洞(眼睛高光1500+px会被误杀)
FEATHER_HI = 3      # 高清阶段羽化半径(px)


def has_real_alpha(im):
    """RGBA且alpha确实在用(非全255)"""
    if im.mode != "RGBA":
        return False
    a = np.array(im.getchannel("A"))
    return a.min() < 250


def flood_remove_white(im, fill_holes=True):
    """从四边泛洪去白底，保留角色内部白色区域"""
    rgb = np.array(im.convert("RGB"))
    h, w = rgb.shape[:2]
    # 近白区域二值图
    near_white = (rgb.min(axis=2) >= WHITE_THRESH).astype(np.uint8)
    # 泛洪：从所有边界近白点开始
    mask = np.zeros((h + 2, w + 2), np.uint8)
    ff_flags = 8 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)
    seeds = []
    for x in range(0, w, 20):
        if near_white[0, x]: seeds.append((x, 0))
        if near_white[h-1, x]: seeds.append((x, h-1))
    for y in range(0, h, 20):
        if near_white[y, 0]: seeds.append((0, y))
        if near_white[y, w-1]: seeds.append((w-1, y))
    work = near_white * 255
    for sx, sy in seeds:
        if mask[sy+1, sx+1] == 0:
            cv2.floodFill(work, mask, (sx, sy), 128,
                          loDiff=0, upDiff=0, flags=ff_flags)
    bg = mask[1:-1, 1:-1] > 0  # True=背景白
    # 填除封闭白洞(泛洪够不到的胳膊-身体死角)；胸像跳过防误杀眼睛高光
    if fill_holes:
        holes = ((near_white > 0) & ~bg).astype(np.uint8)
        n_cc, labels, stats, _ = cv2.connectedComponentsWithStats(holes, None, None, None, 8)
        for ci in range(1, n_cc):
            if stats[ci, cv2.CC_STAT_AREA] >= HOLE_MIN_AREA:
                bg = bg | (labels == ci)
    # 受限扩张：只向"近白的抗锯齿边缘"扩张RIM_ITER像素，吃掉白边但不侵入米白衣物
    near_rim = rgb.min(axis=2) >= RIM_THRESH
    kernel = np.ones((3, 3), np.uint8)
    for _ in range(RIM_ITER):
        grown = cv2.dilate(bg.astype(np.uint8), kernel) > 0
        bg = bg | (grown & near_rim)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    out = np.dstack([rgb, alpha])
    return Image.fromarray(out, "RGBA")


def feather(im, radius):
    """alpha边缘羽化"""
    a = im.getchannel("A").filter(ImageFilter.GaussianBlur(radius))
    im.putalpha(a)
    return im


def to_frame(im, anchor):
    """裁bbox -> 等比缩放 -> 贴到128透明画布"""
    bbox = im.getbbox()
    im = im.crop(bbox)
    scale = MAX_SIZE / max(im.size)
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im = im.resize((nw, nh), Image.LANCZOS)
    # 下采样补锐：源图是柔和动漫渲染风，缩小后必须锐化否则发糊
    # 分离alpha只锐化RGB，避免透明边缘产生白色光晕
    r, g, b, a = im.split()
    rgb = Image.merge("RGB", (r, g, b)).filter(
        ImageFilter.UnsharpMask(radius=2, percent=160, threshold=2))
    im = Image.merge("RGBA", (*rgb.split(), a))
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = (CANVAS - nw) // 2
    y = (CANVAS - nh) if anchor == "bottom" else (CANVAS - nh) // 2
    canvas.paste(im, (x, y), im)
    return canvas


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    cache = {}
    for out_name, src_name, anchor in FRAME_MAP:
        if src_name not in cache:
            im = Image.open(os.path.join(SRC_DIR, src_name))
            if has_real_alpha(im):
                im = im.convert("RGBA")
                method = "自带alpha"
            else:
                im = flood_remove_white(im, fill_holes=src_name not in BUST_SOURCES)
                method = "泛洪去白"
            im = feather(im, FEATHER_HI)
            cache[src_name] = (im, method)
        im, method = cache[src_name]
        frame = to_frame(im.copy(), anchor)
        frame.save(os.path.join(OUT_DIR, out_name))
        # 统计透明度验证
        a = np.array(frame.getchannel("A"))
        trans = (a == 0).mean() * 100
        print(f"{out_name:14s} <- {src_name:18s} [{method}] 透明{trans:.1f}%")
    print(f"\n完成: {len(FRAME_MAP)}帧 -> {OUT_DIR}")


if __name__ == "__main__":
    main()
