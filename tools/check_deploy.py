# -*- coding: utf-8 -*-
"""查当前部署状态：workflow 是否跑完，各页面是否上线。"""
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

TOKEN = open("C:/Users/Administrator/.workbuddy/secrets/github_token.txt",
             encoding="utf-8").read().strip()
REPO = "zyzyzy747/pixel-arcade"


def call(method, path, payload=None, timeout=60):
    url = "https://api.github.com" + path
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", "Bearer " + TOKEN)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "pixel-arcade-check")
    if payload is not None:
        req.data = payload
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, (r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        return e.code, (e.read().decode("utf-8") or "{}")
    except Exception as e:
        return 0, str(e)


print("=== 最近 3 次 workflow run ===")
st, raw = call("GET", "/repos/%s/actions/runs?per_page=3" % REPO)
if st == 200:
    import json
    d = json.loads(raw)
    for r in d.get("workflow_runs", []):
        print("  %-22s %-12s %s" % (r.get("status"), r.get("conclusion"), r.get("display_title", "")[:44]))
else:
    print("  HTTP %s" % st)

print()
print("=== workflow 文件内容里的发布清单 ===")
st, raw = call("GET", "/repos/%s/contents/.github/workflows/deploy.yml?ref=main" % REPO)
if st == 200:
    import json, base64
    content = base64.b64decode(json.loads(raw)["content"]).decode("utf-8")
    for line in content.splitlines():
        if line.strip().startswith("cp -r") or line.strip().startswith("path:"):
            print("  " + line.strip())
else:
    print("  HTTP %s" % st)

print()
print("=== 站点 HTTP 检查 ===")
base = "https://zyzyzy747.github.io/pixel-arcade/"
paths = [
    "", "arcade/", "assets/avatar.png",
    "courseware/", "courseware/chemistry/", "courseware/respiratory/",
    "courseware/foodchain/",
    "courseware/assets/three.bundle.js",
    "notes/ws63.html",
    "tools/push_courseware.py", "README.md",
]
for p in paths:
    url = base + p
    try:
        req = urllib.request.Request(url, method="GET")
        req.add_header("User-Agent", "pixel-arcade-check")
        with urllib.request.urlopen(req, timeout=30) as r:
            print("  %-40s %s" % ("/" + p if p else "/", r.status))
    except urllib.error.HTTPError as e:
        print("  %-40s %s" % ("/" + p if p else "/", e.code))
    except Exception as e:
        print("  %-40s ERR %s" % ("/" + p if p else "/", str(e)[:40]))
