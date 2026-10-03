import json, glob, os, sys
sys.path.insert(0, '.')
from cases import CASES
names = [n for n in ["oracle","mine","bgdam-ff-0.0.9","hedworth-ff-0.0.7","rightlinks-ff-0.5b12","hedworth-chrome-0.1.1","bgtab-chrome-1.5"] if os.path.exists(f"results/{n}.json")]
R = {n: json.load(open(f"results/{n}.json")) for n in names}
o = R.get("oracle")
show = [n for n in names if n != "oracle"]
print("ORDERING (vs native middle-click)")
for s in o["order"]:
    print(f"  {s}: native = {o['order'][s]}")
    for n in show:
        v = R[n]["order"].get(s); print(f"     {'ok ' if v == o['order'][s] else 'BAD'} {n}: {v}")
print("\nEDGE CASES")
for c in CASES:
    row = []
    for n in show:
        v = R[n]["edge"].get(c["name"], {})
        row.append(("ok" if v.get("ok") else "FAIL") + ("" if v.get("ok") else " (" + v.get("why", "") + ")"))
    orc = o["edge"].get(c["name"])
    print(f"  [{c['group']}] {c['name']}" + (f"   native middle-click: {orc['tabs'][1:]}" if orc else ""))
    for n, r in zip(show, row): print(f"       {n}: {r}")
print("\nTOTALS")
for n in show:
    e = R[n]["edge"]; ords = sum(R[n]["order"].get(s) == o["order"][s] for s in o["order"])
    print(f"  {n}: edge {sum(v['ok'] for v in e.values())}/{len(e)}, ordering {ords}/{len(o['order'])}, perf {R[n].get('perf_ms')}ms (no ext: {o.get('perf_ms')}ms)")
