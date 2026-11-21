"""Fetch a balanced ~300-row sample of VitaminC (test split) from the Hugging Face datasets-server.

Usage (from services/api):  .venv/Scripts/python evals/fetch_external.py [--per-label 100]
Writes evals/data/vitaminc_sample.jsonl and evals/data/VITAMINC_LICENSE.md.
If the API is unreachable it exits non-zero and writes nothing: rows are never fabricated.
"""
import argparse
import json
import sys
from pathlib import Path

import httpx

URL = "https://datasets-server.huggingface.co/rows"
OUT = Path(__file__).parent / "data"
LICENSE = """# VitaminC sample: licence and attribution

`vitaminc_sample.jsonl` is a small sample of the VitaminC dataset (Hugging Face `tals/vitaminc`,
test split), fetched unmodified through the Hugging Face datasets-server API.

Schuster, T., Fisch, A., Barzilay, R. (2021). "Get Your Vitamin C! Robust Fact Verification with
Contrastive Evidence". NAACL 2021.

Licence: Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0), https://creativecommons.org/licenses/by-sa/3.0/
This sample is redistributed under the same licence. The underlying evidence text is from Wikipedia.
Threadline did not train or fine-tune on it; it is used only to evaluate the verification stage.
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-label", type=int, default=100)
    ap.add_argument("--max-pages", type=int, default=60)
    a = ap.parse_args()
    got: dict[str, list] = {}
    try:
        with httpx.Client(timeout=30) as c:
            for page in range(a.max_pages):
                r = c.get(URL, params={"dataset": "tals/vitaminc", "config": "default", "split": "test",
                                       "offset": page * 100, "length": 100})
                r.raise_for_status()
                rows = r.json().get("rows", [])
                if not rows:
                    break
                for x in rows:
                    row = x["row"]
                    lab = row.get("label")
                    if lab is None or not row.get("claim") or not row.get("evidence"):
                        continue
                    lst = got.setdefault(lab, [])
                    if len(lst) < a.per_label:
                        lst.append({"claim": row["claim"], "evidence": row["evidence"], "label": lab,
                                    "page": row.get("page"), "unique_id": row.get("unique_id")})
                if len(got) == 3 and all(len(v) >= a.per_label for v in got.values()):
                    break
    except Exception as e:  # noqa: BLE001
        print(f"datasets-server unreachable or failed ({type(e).__name__}); nothing written.", file=sys.stderr)
        return 1
    if len(got) != 3 or any(not v for v in got.values()):
        print(f"did not obtain all 3 labels (got {sorted(got)}); nothing written.", file=sys.stderr)
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / "vitaminc_sample.jsonl", "w", encoding="utf-8") as f:
        for lab in sorted(got):
            for row in got[lab]:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
    (OUT / "VITAMINC_LICENSE.md").write_text(LICENSE, encoding="utf-8")
    print({k: len(v) for k, v in got.items()})
    return 0


if __name__ == "__main__":
    sys.exit(main())
