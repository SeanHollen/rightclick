import json, os, sys
sys.path.insert(0, '.')
from cases import CASES
d, names = sys.argv[1], sys.argv[2:]
R = {n: json.load(open(f"{d}/{n}.json")) for n in ["oracle"] + names if os.path.exists(f"{d}/{n}.json")}
o = R["oracle"]
print("ORDERING (vs native middle-click)")
for s in o["order"]:
    bad = [f"     {n}: {R[n]['order'].get(s)}" for n in names if R[n]["order"].get(s) != o["order"][s]]
    print(f"  {s}: native = {o['order'][s]}" + ("" if not bad else "\n" + "\n".join(bad)))
print("\nEDGE CASE FAILURES")
for c in CASES:
    fails = [f"     {n}: {R[n]['edge'][c['name']]['why']}" for n in names if not R[n]["edge"].get(c["name"], {}).get("ok")]
    if fails: print(f"  [{c['group']}] {c['name']}\n" + "\n".join(fails))
print("\nTOTALS")
for n in names:
    e = R[n]["edge"]; ords = sum(R[n]["order"].get(s) == o["order"][s] for s in o["order"])
    print(f"  {n}: edge {sum(v['ok'] for v in e.values())}/{len(e)}, ordering {ords}/{len(o['order'])}, perf {R[n].get('perf_ms')}ms (no ext: {o.get('perf_ms')}ms)")
