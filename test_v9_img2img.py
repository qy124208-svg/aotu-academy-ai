# -*- coding: utf-8 -*-
"""v9 img2img一比一复刻测试：雷狮帧直接做底图重绘(不走OpenPose)
姿势/构图逐像素继承原帧，LoRA负责把角色换成安迷修
三档denoise对比：0.5(姿势最忠实) / 0.65(平衡) / 0.8(角色特征最强)"""
import json
import sys
import time
import urllib.request

COMFYUI_URL = "http://127.0.0.1:8188"

POS_BASE = ("masterpiece, best quality, anmicius, 1boy, solo, chibi, "
            "anime style, clean lineart, flat colors, "
            "huge fluffy brown hair, dark red streak on left bangs, "
            "cyan gradient eyes, cream shirt, dark brown pants, red shoes, "
            "white background, centered, single character")
NEG_BASE = ("(1girl:1.5), female, woman, eyelashes, "
            "purple hair, purple clothes, "
            "realistic, 3d, painting, blurry, "
            "gradient background, multiple characters, text, watermark, "
            "extra limbs, extra eyes, bad anatomy, "
            "noise, photorealistic, nsfw, armor, necktie")


def build_prompt(pose_rel, out_prefix, pose_word, denoise,
                 seed=123456789, lora_strength=0.8):
    return {
        "1": {"class_type": "CheckpointLoaderSimple",
              "inputs": {"ckpt_name": "meinamix_meinaV10.safetensors"}},
        "2": {"class_type": "LoraLoader",
              "inputs": {"model": ["1", 0], "clip": ["1", 1],
                         "lora_name": "anmicius_v1.safetensors",
                         "strength_model": lora_strength,
                         "strength_clip": lora_strength}},
        "3": {"class_type": "CLIPTextEncode",
              "inputs": {"clip": ["2", 1], "text": f"{POS_BASE}, {pose_word}"}},
        "4": {"class_type": "CLIPTextEncode",
              "inputs": {"clip": ["2", 1], "text": NEG_BASE}},
        "5": {"class_type": "LoadImage",
              "inputs": {"image": pose_rel}},
        # 128 -> 512 放大作底图
        "6": {"class_type": "ImageScale",
              "inputs": {"image": ["5", 0], "upscale_method": "lanczos",
                         "width": 512, "height": 512, "crop": "disabled"}},
        "7": {"class_type": "VAEEncode",
              "inputs": {"pixels": ["6", 0], "vae": ["1", 2]}},
        "10": {"class_type": "KSampler",
               "inputs": {"model": ["2", 0], "positive": ["3", 0],
                          "negative": ["4", 0], "latent_image": ["7", 0],
                          "seed": seed, "steps": 30, "cfg": 7.0,
                          "sampler_name": "euler_ancestral",
                          "scheduler": "normal", "denoise": denoise}},
        "11": {"class_type": "VAEDecode",
               "inputs": {"samples": ["10", 0], "vae": ["1", 2]}},
        "12": {"class_type": "SaveImage",
               "inputs": {"images": ["11", 0],
                          "filename_prefix": f"anmicius_v9/{out_prefix}"}},
    }


def run(prompt, out_prefix):
    data = json.dumps({"prompt": prompt}).encode("utf-8")
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data,
                                 headers={"Content-Type": "application/json"})
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        print("[ERROR] 提交失败:", e.read().decode("utf-8", "replace")[:1500])
        sys.exit(1)
    pid = resp["prompt_id"]
    while True:
        time.sleep(2)
        hist = json.loads(urllib.request.urlopen(
            f"{COMFYUI_URL}/history/{pid}").read())
        if pid in hist:
            break
    print(f"{out_prefix}: {hist[pid].get('status', {}).get('status_str')}")


if __name__ == "__main__":
    for dn in (0.5, 0.65, 0.8):
        tag = f"v9_idle_dn{int(dn*100)}"
        p = build_prompt("poses/01_Idle站立/shime1.png", tag,
                         "standing, front view, facing viewer", dn)
        run(p, tag)
