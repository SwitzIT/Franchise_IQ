import os
from pathlib import Path

# BASE_DIR = Path(__file__).resolve().parent.parent.parent
# (mirroring app/config.py)
CONFIG_FILE = Path(r"c:\Users\RajeevK\Desktop\FranchiseIQ\backend\app\config.py")
BASE_DIR = CONFIG_FILE.resolve().parent.parent.parent

print(f"CONFIG_FILE: {CONFIG_FILE}")
print(f"BASE_DIR: {BASE_DIR}")
print(f"BASE_DIR.name: {BASE_DIR.name}")
print(f"BASE_DIR.parent: {BASE_DIR.parent}")

DATA_DIR = BASE_DIR.parent / "data"
print(f"DATA_DIR (default): {DATA_DIR}")

import os
DATA_DIR_ENV = os.getenv("DATA_DIR", str(BASE_DIR.parent / "data"))
print(f"DATA_DIR (env-aware): {DATA_DIR_ENV}")
