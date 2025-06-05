import os
import re
import sys

def has_code_coverage_disabled(file_path):
    pattern = re.compile(r"/\*\s*istanbul\s+ignore.*?\*/|//\s*istanbul\s+ignore", re.IGNORECASE)
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return bool(pattern.search(file.read()))
    except (FileNotFoundError, PermissionError, IOError) as e:
        print(f"Error reading {file_path}: {e}")
        return False

def check_files(dirs):
    found = False
    for dir in dirs:
        for root, _, files in os.walk(dir):
            if "node_modules" in root or "dist" in root or "build" in root:
                continue
            for file in files:
                if file.endswith((".ts", ".tsx")) and not file.endswith((".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx")):
                    file_path = os.path.join(root, file)
                    if has_code_coverage_disabled(file_path):
                        print(f"Coverage disable found in {file_path}")
                        found = True
    return found

if __name__ == "__main__":
    dirs = sys.argv[1:] or ["apps", "packages"]
    if check_files(dirs):
        print("Coverage disable check failed.")
        sys.exit(1)
    print("Coverage disable check passed.")