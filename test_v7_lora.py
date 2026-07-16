# -*- coding: utf-8 -*-
"""v7 角色LoRA验收测试：anmicius_v1 + OpenPose
基于v6改造：①删IPAdapter链(20~24) ②LoraLoader挂anmicius_v1(0.8)
③正向按训练caption风格 ④负向删像素词 ⑤保留OpenPose(0.85)、512²、seed固定
生成 站立/走路/坐下 3张 → 用户验收"""
import json
import sys
import time
import urllib.request

COMFYUI_URL = "http://127.0.0.1:8188"

POS_BASE = ("masterpiece, best quality, anmicius, 1boy, solo, chibi, "
            "anime style, clean lineart, flat colors, "
            "white background, centered, single character, full body")
NEGATIVE = ("(1girl:1.5), female, woman, eyelashes, "
            "realistic, 3d, painting, blurry, "
            "gradient background, multiple characters, text, watermark, "
            "extra limbs, extra eyes, bad anatomy, noise, photorealistic, "
            "nsfw, armor, necktie")


def build_prompt(pose_rel, out_prefix, pose_word,
                 seed=123456789, pose_strength=0.85,
                 lora_name="anmicius_v1.safetensors", lora_strength=0.8):
    positive = f"{POS_BASE}, {pose_word}"
    p = {
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
              "inputs": {"clip": ["2", 1], "text": NEGATIVE}},
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
                          "filename_prefix": f"anmicius_v7/{out_prefix}"}},
    }
    return p


def run(pose_rel, out_prefix, pose_word, **kw):
    prompt = build_prompt(pose_rel, out_prefix, pose_word, **kw)
    data = json.dumps({"prompt": prompt}).encode("utf-8")
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data,
                                 headers={"Content-Type": "application/json"})
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        print("[ERROR] 提交失败:", e.read().decode("utf-8", "replace")[:1500])
        sys.exit(1)
    pid = resp["prompt_id"]
    print(f"已提交 {out_prefix}:", pid)
    while True:
        time.sleep(2)
        hist = json.loads(urllib.request.urlopen(
            f"{COMFYUI_URL}/history/{pid}").read())
        if pid in hist:
            break
    status = hist[pid].get("status", {})
    print("状态:", status.get("status_str"))
    for node_id, out in hist[pid].get("outputs", {}).items():
        for img in out.get("images", []):
            print(f"  输出[{node_id}]:", img["subfolder"], "/", img["filename"])
    if status.get("status_str") == "error":
        print(json.dumps(status, ensure_ascii=False, indent=1)[:1500])


if __name__ == "__main__":
    run("poses/01_Idle站立/shime1.png", "v7_idle",
        "standing, facing viewer, arms at sides")
    run("poses/02_Walk走路/shime2.png", "v7_walk",
        "walking, facing left, side view")
    run("poses/06_Sit坐下/shime11.png", "v7_sit",
        "sitting on ground, facing viewer")
