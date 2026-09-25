#!/usr/bin/env bash
#
# Turn one plant photo into a .glb on this Mac with TripoSR (MIT, runs on CPU),
# then optionally attach it to a plant through the garden API.
#
#   apps/garden/scripts/photo-to-3d.sh rosier.jpg
#   apps/garden/scripts/photo-to-3d.sh rosier.jpg --out rosier.glb
#   apps/garden/scripts/photo-to-3d.sh rosier.jpg --upload "Rosier" \
#        --api https://api.vigooth.com --email you@example.com --password '...'
#
# The first run installs TripoSR and its weights (~2 GB) under ~/.vigooth/triposr;
# later runs reuse them. A photo takes two to five minutes on an M-series chip.
# The subject should fill the frame on a plain background: the background is
# removed automatically, but a busy one is sometimes mistaken for the plant.
#
# Options
#   --out FILE          Where to write the .glb (default: next to the photo)
#   --resolution N      Marching-cubes grid, 128–320 (default 256). Lower is faster.
#   --upload NAME       Attach the result to the plant with this exact name
#   --api URL           API base for --upload (default http://localhost:8090)
#   --email / --password  Credentials for --upload (or SEED_EMAIL / SEED_PASSWORD)
#   --reinstall         Wipe ~/.vigooth/triposr and set it up again

set -euo pipefail

HOME_DIR="${HOME}/.vigooth/triposr"
REPO_DIR="${HOME_DIR}/TripoSR"
VENV_DIR="${HOME_DIR}/venv"
PYTHON_BIN="${PYTHON_BIN:-}"

PHOTO=""
OUT=""
RESOLUTION=256
UPLOAD_NAME=""
API="${SEED_API:-http://localhost:8090}"
EMAIL="${SEED_EMAIL:-}"
PASSWORD="${SEED_PASSWORD:-}"
REINSTALL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --resolution) RESOLUTION="$2"; shift 2 ;;
    --upload) UPLOAD_NAME="$2"; shift 2 ;;
    --api) API="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --reinstall) REINSTALL=1; shift ;;
    -h|--help) sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; exit 1 ;;
    *) PHOTO="$1"; shift ;;
  esac
done

if [[ -z "$PHOTO" ]]; then
  echo "Usage: $0 photo.jpg [--out model.glb] [--upload \"Nom de la plante\"]" >&2
  exit 1
fi
if [[ ! -f "$PHOTO" ]]; then
  echo "Photo not found: $PHOTO" >&2
  exit 1
fi
if [[ -z "$OUT" ]]; then
  OUT="${PHOTO%.*}.glb"
fi

# --- Python: TripoSR's stack (torch, rembg) ships wheels for 3.10–3.13 only.
pick_python() {
  if [[ -n "$PYTHON_BIN" ]]; then echo "$PYTHON_BIN"; return; fi
  for candidate in python3.13 python3.12 python3.11 python3.10; do
    if command -v "$candidate" >/dev/null 2>&1; then echo "$candidate"; return; fi
  done
  echo "No Python 3.10–3.13 found. Install one (brew install python@3.13) or set PYTHON_BIN." >&2
  exit 1
}

# --- Install once ----------------------------------------------------------------
install() {
  local python
  python="$(pick_python)"
  echo "▶ Installing TripoSR under ${HOME_DIR} with $($python --version)"
  mkdir -p "$HOME_DIR"

  if [[ ! -d "$REPO_DIR/.git" ]]; then
    git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR.git "$REPO_DIR"
  fi

  "$python" -m venv "$VENV_DIR"
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  pip install --quiet --upgrade pip setuptools wheel

  # CPU/MPS build of torch: the default index is the right one on macOS.
  pip install --quiet torch torchvision
  # requirements.txt lists torchmcubes too, which cannot build in isolation
  # (below), and gradio, a web UI this script never opens. Its version pins date
  # from early 2024 and have no wheels for current Pythons, so they are dropped.
  grep -vE 'torchmcubes|^gradio' "$REPO_DIR/requirements.txt" \
    | sed -E 's/[=<>~!].*$//' > "$HOME_DIR/requirements.txt"
  pip install --quiet -r "$HOME_DIR/requirements.txt"
  # Background removal needs an ONNX runtime, which plain rembg leaves out.
  pip install --quiet "rembg[cpu]"
  # transformers 5 renamed the vision encoder's layers; TripoSR's weights use
  # the 4.x names, so that major is the one that loads them.
  pip install --quiet "transformers<5"
  # Marching cubes is a C++ extension compiled here against the torch just
  # installed, hence no build isolation; without CUDA it builds the CPU kernel,
  # which is all this Mac can use anyway.
  pip install --quiet scikit-build-core cmake ninja pybind11
  pip install --quiet --no-build-isolation git+https://github.com/tatsy/torchmcubes.git

  # Stamp so later runs skip straight to generation.
  "$python" --version > "$HOME_DIR/.installed"
  echo "▶ Install complete"
}

if [[ $REINSTALL -eq 1 ]]; then
  rm -rf "$HOME_DIR"
fi
if [[ ! -f "$HOME_DIR/.installed" ]]; then
  install
else
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
fi

# --- Generate ---------------------------------------------------------------------
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$(dirname "$OUT")"

echo "▶ Reconstructing ${PHOTO} (grid ${RESOLUTION}, CPU) — a minute or so on an M-series chip"
# Weights (stabilityai/TripoSR, ~1.6 GB) download to the Hugging Face cache on
# the first run. --device cpu is explicit because run.py only knows CUDA or CPU.
# With --bake-texture, run.py writes an OBJ plus texture.png whatever format is
# asked for, so the glb is assembled below.
(
  cd "$REPO_DIR"
  python run.py "$PHOTO" \
    --device cpu \
    --output-dir "$WORK" \
    --model-save-format obj \
    --bake-texture \
    --texture-resolution 1024 \
    --mc-resolution "$RESOLUTION" \
    --foreground-ratio 0.85
)

MESH="$(find "$WORK" -name 'mesh.obj' | head -n 1)"
TEXTURE="$(find "$WORK" -name 'texture.png' | head -n 1)"
if [[ -z "$MESH" || -z "$TEXTURE" ]]; then
  echo "TripoSR produced no mesh" >&2
  exit 1
fi

echo "▶ Packing mesh and texture into a glb"
python - "$MESH" "$TEXTURE" "$OUT" <<'PY'
import sys
import trimesh
from PIL import Image

mesh_path, texture_path, out_path = sys.argv[1:4]
mesh = trimesh.load(mesh_path, force="mesh", process=False)
image = Image.open(texture_path).convert("RGB")
# Unlit-looking material: the baked colours already carry the photo's shading,
# and a shiny surface would fight the walk's own sun.
material = trimesh.visual.material.PBRMaterial(
    baseColorTexture=image, metallicFactor=0.0, roughnessFactor=1.0
)
mesh.visual = trimesh.visual.TextureVisuals(uv=mesh.visual.uv, material=material)
# TripoSR's mesh is z-up and roughly one unit across; the walk rescales and
# stands it on the ground itself, so only the up axis needs fixing here.
mesh.apply_transform(trimesh.transformations.rotation_matrix(-3.14159265 / 2, [1, 0, 0]))
mesh.export(out_path, file_type="glb")
PY
echo "▶ Model written to ${OUT} ($(du -h "$OUT" | cut -f1))"

# --- Upload -----------------------------------------------------------------------
if [[ -n "$UPLOAD_NAME" ]]; then
  if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
    echo "--upload needs --email and --password (or SEED_EMAIL / SEED_PASSWORD)" >&2
    exit 1
  fi
  JAR="$WORK/cookies"
  curl -sf -c "$JAR" -H 'Content-Type: application/json' \
    -d "{\"email\":$(printf '%s' "$EMAIL" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'),\"password\":$(printf '%s' "$PASSWORD" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')}" \
    "$API/auth/login" -o /dev/null || { echo "Login failed on $API" >&2; exit 1; }

  PLANT_ID="$(curl -sf -b "$JAR" "$API/api/garden" | python3 -c '
import json, sys
name = sys.argv[1]
plants = [p for p in json.load(sys.stdin)["plants"] if p["name"] == name]
print(plants[0]["id"] if plants else "")' "$UPLOAD_NAME")"
  if [[ -z "$PLANT_ID" ]]; then
    echo "No plant named exactly \"$UPLOAD_NAME\" in this garden" >&2
    exit 1
  fi

  curl -sf -b "$JAR" -X PUT -H 'Content-Type: model/gltf-binary' \
    --data-binary "@$OUT" "$API/api/garden/plants/$PLANT_ID/model" -o /dev/null \
    || { echo "Upload refused (too large, or not a glb?)" >&2; exit 1; }
  echo "▶ Attached to \"$UPLOAD_NAME\" — open the plant card or the 3D walk"
else
  echo "▶ Next: PLANTES → modifier la plante → AJOUTER UN MODELE 3D → ${OUT}"
fi
