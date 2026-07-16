# -*- coding: utf-8 -*-
"""v8 对比矩阵：3姿势 x 3检查点(final/e10/e8)，带全部提示词修正
修正点：①服装细节补全 ②站立加front view/负向back view ③坐姿OpenPose降0.6+chibi比例词"""
import json
import sys
import time
import urllib.request

COMFYUI_URL = "http://127.0.0.1:8188"

POS_BASE = ("masterpiece, best quality, anmicius, 1boy, solo, chibi, "
            "anime style, clean lineart, flat colors, "
            "cream shirt, dark brown pants, red shoes, "
            "chibi proportions, large head, small body, "
            "white background, centered, single character, full body")
NEG_BASE = ("(1girl:1.5), female, woman, eyelashes, "
            "realistic, 3d, painting, blurry, "
            "gradient background, multiple characters, text, watermark, "
            "extra limbs, extra eyes, bad anatomy, bad legs, deformed feet, "
            "noise, photorealistic, nsfw, armor, necktie")

LORAS = {
    "final": "anmicius_v1.safetensors",
    "e10": "anmicius_v1-000010.safetensors",
    "e08": "anmicius_v1-000008.safetensors",
}

POSES = [
    # (标签, 姿势图, 姿势词, 额外负向, openpose强度)
    ("idle", "poses/01_Idle站立/shime1.png",
     "standing, front view, facing viewer, looking at viewer, arms at sides",
     "back view, from behind", 0.85),
    ("walk", "poses/02_Walk走路/shime2.png",
     "walking, facing left, side view, red shoes",
     "back view, from behind", 0.85),
    ("sit", "poses/06_Sit坐下/shime11.png",
     "sitting on ground, facing viewer, looking at viewer, smiling",
     "back view, from behind", 0.6),
]


def build_prompt(pose_rel, out_prefix, pose_word, extra_neg,
                 pose_strength, lora_name, seed=123456789, lora_strength=0.8):
    positive = f"{POS_BASE}, {pose_word}"
    negative = f"{NEG_BASE}, {extra_neg}"
    return {
        "1": {"class_type": "CheckpointLoaderSimple",
              "inputs": {"ckpt_name": "meinamix_meinaV10.safetensors"}},
        "2": {"class_type": "LoraLoader",
              "inputs": {"model": ["1", 0], "clip": ["1", 1],
                         "lora_name": lora_name,
                         "strength_model": lora_strength,
                         "strength_clip": lora_strength}},
        "3": {"class_type": "CLIPTextEncode",
              "inputs": {"clip": ["2", 1], "text": positive}},
        "4": {"class_type": "CLIPTextEncode",
              "inputs": {"clip": ["2", 1], "text": negative}},
        "5": {"class_type": "LoadImage",
              "inputs": {"image": pose_rel}},
        "6": {"class_type": "OpenposePreprocessor",
              "inputs": {"image": ["5", 0], "detect_hand": "disable",
                         "detect_body": "enable", "detect_face": "disable",
                         "resolution": 512}},
        "7": {"class_type": "ControlNetLoader",
              "inputs": {"control_net_name": "control_v11p_sd15_openpose.pth"}},
        "8": {"class_type": "ControlNetApplyAdvanced",
              "inputs": {"positive": ["3", 0], "negative": ["4", 0],
                         "control_net": ["7", 0], "image": ["6", 0],
                         "strength": pose_strength,
                         "start_percent": 0.0, "end_percent": 1.0}},
        "9": {"class_type": "EmptyLatentImage",
              "inputs": {"width": 512, "height": 512, "batch_size": 1}},
        "10": {"class_type": "KSampler",
               "inputs": {"model": ["2", 0], "positive": ["8", 0],
                          "negative": ["8", 1], "latent_image": ["9", 0],
                          "seed": seed, "steps": 24, "cfg": 7.0,
                          "sampler_name": "euler_ancestral",
                          "scheduler": "normal", "denoise": 1.0}},
        "11": {"class_type": "VAEDecode",
               "inputs": {"samples": ["10", 0], "vae": ["1", 2]}},
        "12": {"class_type": "SaveImage",
               "inputs": {"images": ["11", 0],
                          "filename_prefix": f"anmicius_v8/{out_prefix}"}},
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
    status = hist[pid].get("status", {})
    ok = status.get("status_str")
    print(f"{out_prefix}: {ok}")
    if ok == "error":
        print(json.dumps(status, ensure_ascii=False, indent=1)[:1200])


if __name__ == "__main__":
    for pose_tag, pose_rel, pose_word, extra_neg, strength in POSES:
        for lora_tag, lora_name in LORAS.items():
            p = build_prompt(pose_rel, f"v8_{pose_tag}_{lora_tag}",
                             pose_word, extra_neg, strength, lora_name)
            run(p, f"v8_{pose_tag}_{lora_tag}")
