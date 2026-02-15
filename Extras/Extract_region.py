import os
import re
import json
from typing import List, Dict, Optional


def parse_regions(file_path: Optional[str] = None) -> List[Dict[str, str]]:
    """Parse Regions.txt into a list of dicts with keys: id, area, office, code.

    If `file_path` is None, it will look for `Regions.txt` next to this script.
    """
    if file_path is None:
        file_path = os.path.join(os.path.dirname(__file__), "Regions.txt")

    regions: List[Dict[str, str]] = []
    splitter = re.compile(r"\t+")

    with open(file_path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue

            parts = splitter.split(line)
            # remove empty tokens and trim
            parts = [p.strip() for p in parts if p.strip()]
            if not parts:
                continue

            # Expecting: id, area, office (possibly multi-token), code
            if len(parts) >= 4:
                id_ = parts[0]
                area = parts[1]
                # everything between area and last token is office
                office = " ".join(parts[2:-1]) if len(parts) > 4 else parts[2]
                code = parts[-1]
            elif len(parts) == 3:
                id_, area, office = parts
                code = ""
            elif len(parts) == 2:
                id_, area = parts
                office = ""
                code = ""
            else:
                # fallback: put full line into office
                id_ = parts[0]
                area = ""
                office = " ".join(parts[1:])
                code = ""

            regions.append({"id": id_, "area": area, "office": office, "code": code})

    return regions


def get_regions_dict_by_id(file_path: Optional[str] = None) -> Dict[str, Dict[str, str]]:
    """Return a dict keyed by `id` for quick lookup."""
    lst = parse_regions(file_path)
    return {r["id"]: r for r in lst}


if __name__ == "__main__":
    import sys

    fp = None
    args = sys.argv[1:]
    # allow optional first arg as file path, and optional flag 'area-code'
    if args:
        # if first arg looks like a flag, don't treat as file path
        if args[0].startswith("--") or args[0] == "area-code":
            fp = None
        else:
            fp = args[0]

    def print_area_code(file_path: Optional[str] = None, sep: str = ' '):
        regs = parse_regions(file_path)
        for r in regs:
            area = r.get("area", "")
            code = r.get("code", "")
            # print(f"{area}{sep}{code}")
            print("INSERT INTO regions VALUES ('{}', '{}');".format(area.replace("'", "''"), code.replace("'", "''")))

    print_area_code(fp)

    # If 'area-code' flag provided, print area and code only
    # if "area-code" in args or "--area-code" in args:
    #     print_area_code(fp)
    # else:
    #     regions = parse_regions(fp)
    #     print(json.dumps(regions, ensure_ascii=False, indent=2))

    
