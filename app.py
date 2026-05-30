from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- DFA Definitions ---

DFAS = {
    "DFA 1": {
        "description": "(bab)*(b|a)(bab|aba)(a|b)*(aa|bb)*(b|a|bb)(a|b)*(aa|bb)",
        "alphabet": ["a", "b"],
        "states": [
            {"id": "q0", "label": "-", "start": True,  "accept": False},
            {"id": "q1", "label": "q1", "start": False, "accept": False},
            {"id": "q2", "label": "q2", "start": False, "accept": False},
            {"id": "q3", "label": "q3", "start": False, "accept": False},
            {"id": "q4", "label": "q4", "start": False, "accept": False},
            {"id": "q5", "label": "q5", "start": False, "accept": False},
            {"id": "q6", "label": "q6", "start": False, "accept": False},
            {"id": "q7", "label": "q7", "start": False, "accept": False},
            {"id": "q8",  "label": "q8",  "start": False, "accept": False},
            {"id": "q9",  "label": "q9",  "start": False, "accept": False},
            {"id": "q10", "label": "q10", "start": False, "accept": False},
            {"id": "q11", "label": "q11", "start": False, "accept": False},
            {"id": "q12", "label": "q12", "start": False, "accept": False},
            {"id": "q13", "label": "q13", "start": False, "accept": False},
            {"id": "q14", "label": "q14", "start": False, "accept": False},
            {"id": "q15", "label": "q15", "start": False, "accept": False},
            {"id": "q16", "label": "q16", "start": False, "accept": False},
            {"id": "q17", "label": "q17", "start": False, "accept": False},
            {"id": "q18", "label": "q18", "start": False, "accept": False},
            {"id": "trapstate_q2", "label": "T", "start": False, "accept": False},
            {"id": "trapstate_q12_q16", "label": "T", "start": False, "accept": False},
            {"id": "trapstate_q13_q17", "label": "T", "start": False, "accept": False},
            {"id": "first_end_state", "label": "+", "start": False, "accept": True},
            {"id": "second_end_state", "label": "+", "start": False, "accept": True}
        ],
        "transitions": [
            {"from": "q0", "to": "q1", "label": "b"},
            {"from": "q0", "to": "q11", "label": "a"},
            {"from": "q1", "to": "q2", "label": "a"},
            {"from": "q1", "to": "q12", "label": "b"},
            {"from": "q2", "to": "q3", "label": "b"},
            {"from": "q2", "to": "trapstate_q2", "label": "a"},
            {"from": "trapstate_q2", "to": "trapstate_q2", "label": "a, b"},
            {"from": "q3", "to": "q4", "label": "a"},
            {"from": "q3", "to": "q1", "label": "b"},
            {"from": "q4", "to": "q5", "label": "a"},
            {"from": "q4", "to": "q8", "label": "b"},
            {"from": "q5", "to": "q7", "label": "a"},
            {"from": "q5", "to": "q6", "label": "b"},
            {"from": "q6", "to": "q7", "label": "a"},
            {"from": "q6", "to": "second_end_state", "label": "b"},
            {"from": "q7", "to": "first_end_state", "label": "a"},
            {"from": "q7", "to": "q10", "label": "b"},
            {"from": "q8", "to": "q9", "label": "a"},
            {"from": "q8", "to": "q10", "label": "b"},
            {"from": "q9", "to": "first_end_state", "label": "a"},
            {"from": "q9", "to": "q10", "label": "b"},
            {"from": "q10", "to": "q7", "label": "a"},
            {"from": "q10", "to": "second_end_state", "label": "b"},
            {"from": "q11", "to": "q16", "label": "a"},
            {"from": "q11", "to": "q12", "label": "b"},
            {"from": "q12", "to": "q13", "label": "a"},
            {"from": "q12", "to": "trapstate_q12_q16", "label": "b"},
            {"from": "trapstate_q12_q16", "to": "trapstate_q12_q16", "label": "a, b"},
            {"from": "q13", "to": "trapstate_q13_q17", "label": "a"},
            {"from": "q13", "to": "q14", "label": "b"},
            {"from": "trapstate_q13_q17", "to": "trapstate_q13_q17", "label": "a, b"},
            {"from": "q14", "to": "q15", "label": "a"},
            {"from": "q14", "to": "q18", "label": "b"},
            {"from": "q15", "to": "q7", "label": "a"},
            {"from": "q15", "to": "q10", "label": "b"},
            {"from": "q16", "to": "trapstate_q12_q16", "label": "a"},
            {"from": "trapstate_q12_q16", "to": "trapstate_q12_q16", "label": "a, b"},
            {"from": "q16", "to": "q17", "label": "b"},
            {"from": "q17", "to": "q14", "label": "a"},
            {"from": "q17", "to": "trapstate_q13_q17", "label": "b"},
            {"from": "q18", "to": "q10", "label": "b"},
            {"from": "q18", "to": "q7", "label": "a"},
            {"from": "first_end_state", "to": "first_end_state", "label": "a"},
            {"from": "first_end_state", "to": "q10", "label": "b"},
            {"from": "second_end_state", "to": "second_end_state", "label": "b"},
            {"from": "second_end_state", "to": "q7", "label": "a"},
        ],
        "samples": ["bbabbaa", "abababb", "bbabaaa", "bbabbbaa", "babbbabbaa", "aababbb"],
    },
    "DFA 2": {
        "description": "(1|0)*(11|00)(00|11)*(1|0|11)(1|0|11)*(101|111)(101|111)*(1|0*|11)(1|0*|11)",
        "alphabet": ["0", "1"],
        "states": [
            {"id": "q0", "label": "-",  "start": True,  "accept": False},
            {"id": "q1", "label": "q1", "start": False, "accept": False},
            {"id": "q2", "label": "q2", "start": False, "accept": False},
            {"id": "q3", "label": "q3", "start": False, "accept": False},
            {"id": "q4", "label": "q4", "start": False, "accept": False},
            {"id": "q5", "label": "q5", "start": False, "accept": False},
            {"id": "q6", "label": "q6", "start": False, "accept": False},
            {"id": "q7", "label": "q7", "start": False, "accept": False},
            {"id": "q8", "label": "q8", "start": False, "accept": False},
            {"id": "q9", "label": "q9", "start": False, "accept": False},
            {"id": "q10", "label": "q10", "start": False, "accept": False},
            {"id": "q11", "label": "q11", "start": False, "accept": False},
            {"id": "q12", "label": "q12", "start": False, "accept": False},
            {"id": "q13", "label": "+",  "start": False,  "accept": True},
        ],
        "transitions": [
            {"from": "q0", "to": "q1", "label": "0"},
            {"from": "q0", "to": "q2", "label": "1"},
            {"from": "q1", "to": "q5", "label": "0"},
            {"from": "q1", "to": "q2", "label": "1"},
            {"from": "q2", "to": "q1", "label": "0"},
            {"from": "q2", "to": "q3", "label": "1"},
            {"from": "q3", "to": "q4", "label": "0"},
            {"from": "q3", "to": "q8", "label": "1"},
            {"from": "q4", "to": "q4", "label": "0"},
            {"from": "q4", "to": "q7", "label": "1"},
            {"from": "q5", "to": "q6", "label": "0"},
            {"from": "q5", "to": "q4", "label": "1"},
            {"from": "q6", "to": "q11", "label": "0"},
            {"from": "q6", "to": "q7", "label": "1"},
            {"from": "q7", "to": "q10", "label": "0"},
            {"from": "q7", "to": "q9", "label": "1"},
            {"from": "q8", "to": "q11", "label": "0"},
            {"from": "q8", "to": "q7", "label": "1"},
            {"from": "q9", "to": "q12", "label": "0"},
            {"from": "q9", "to": "q13", "label": "1"},
            {"from": "q10", "to": "q11", "label": "0"},
            {"from": "q10", "to": "q13", "label": "1"},
            {"from": "q11", "to": "q11", "label": "0"},
            {"from": "q11", "to": "q7", "label": "1"},
            {"from": "q12", "to": "q11", "label": "0"},
            {"from": "q12", "to": "q13", "label": "1"},
            {"from": "q13", "to": "q13", "label": "0"},
            {"from": "q13", "to": "q13", "label": "1"},
        ],
        "samples": ["11110111", "00011111", "111110111", "011110111", "111101111", "00010110111"],
    }
}


def run_dfa(dfa_def, input_string):
    start_state = next(s["id"] for s in dfa_def["states"] if s["start"])
    trans_map = {
        (t["from"], t["label"]): t["to"]
        for t in dfa_def["transitions"]
    }

    current = start_state
    trace = [{"state": current, "char_index": -1, "symbol": None}]

    for i, ch in enumerate(input_string):
        key = (current, ch)
        if key not in trans_map:
            return {
                "trace": trace,
                "accepted": False,
                "dead": True,
                "dead_at": i,
                "final_state": current,
                "verdict": f'✗ REJECTED — "{input_string}" is not in the language',
            }
        current = trans_map[key]
        trace.append({"state": current, "char_index": i, "symbol": ch})

    is_accept = next(s["accept"] for s in dfa_def["states"] if s["id"] == current)
    verdict = (
        f'✓ ACCEPTED — "{input_string}" is in the language'
        if is_accept
        else f'✗ REJECTED — "{input_string}" is not in the language'
    )
    return {
        "trace": trace,
        "accepted": is_accept,
        "dead": False,
        "dead_at": None,
        "final_state": current,
        "verdict": verdict,
    }


# --- CFG Definitions ---

CFGS = {
    "DFA 1": {
        "regex": "(bab)*(b+a)(bab+aba)(a+b)*(aa+bb)*(b+a+bb)(a+b)*(aa+bb)",
        "alphabet": ["a", "b"],
        "samples": [
            "bbabbaa", "abababb", "bbabaaa", "bbabbbaa", "babbbabbaa", "aababbb"
        ],
        "invalid_samples": [
            "ab", "bab", "aab", "babbabbaa", "ba", "b",
        ],
        "rules": [
            {"lhs": "S",   "rhs": ["Z Y X W V U T R"]},
            {"lhs": "Z",   "rhs": ["bab Z", "\u039b"]},
            {"lhs": "Y",   "rhs": ["b", "a"]},
            {"lhs": "X",   "rhs": ["bab", "aba"]},
            {"lhs": "W",   "rhs": ["a W", "b W", "\u039b"]},
            {"lhs": "V",   "rhs": ["aa V", "bb V", "\u039b"]},
            {"lhs": "U",   "rhs": ["b", "a", "bb"]},
            {"lhs": "T",   "rhs": ["a T", "b T", "\u039b"]},
            {"lhs": "R",   "rhs": ["aa", "bb"]},
        ],
    },
    "DFA 2": {
        "regex": "(1+0)*(11+00)(00+11)*(1+0+11)(1+0+11)*(101+111)(101+111)*(1+0+11)(1+0+11)",
        "alphabet": ["0", "1"],
        "samples": [
            "11110111", "00011111", "111110111", "011110111", "111101111", "00010110111"
        ],
        "invalid_samples": [
            "01", "11", "00", "101", "111", "0011",
        ],
        "rules": [
            {"lhs": "S",   "rhs": ["Z Y X W V U T R"]},
            {"lhs": "Z",   "rhs": ["1 Z", "0 Z", "\u039b"]},
            {"lhs": "Y",   "rhs": ["11", "00"]},
            {"lhs": "X",   "rhs": ["00 X", "11 X", "\u039b"]},
            {"lhs": "W",   "rhs": ["1", "0", "11"]},
            {"lhs": "V",   "rhs": ["1 V", "0 V", "11 V", "\u039b"]},
            {"lhs": "U",   "rhs": ["101", "111"]},
            {"lhs": "T",   "rhs": ["101 T", "111 T", "\u039b"]},
            {"lhs": "R",   "rhs": ["1 R'", "0 R'", "11 R'"]},
            {"lhs": "R'",  "rhs": ["1 R''", "0 R''", "11 R''"]},
            {"lhs": "R''", "rhs": ["\u039b"]},
        ],
    },
}

# --- Routes ---

@app.route("/api/dfas", methods=["GET"])
def list_dfas():
    result = {}
    for key, dfa in DFAS.items():
        samples = dfa.get("samples", [])
        result[key] = {
            "description": dfa["description"],
            "alphabet": dfa["alphabet"],
            "samples": samples,
            "test_strings": samples,
            "states": dfa["states"],
            "transitions": dfa["transitions"],
        }
    return jsonify(result)

@app.route("/api/run", methods=["POST"])
def run():
    body = request.get_json()
    if not body:
        return jsonify({"error": "JSON body required"}), 400

    dfa_id = body.get("dfa_id")
    input_string = body.get("input", "")

    if dfa_id not in DFAS:
        return jsonify({"error": f"DFA '{dfa_id}' not found"}), 404

    dfa_def = DFAS[dfa_id]
    result = run_dfa(dfa_def, input_string)
    result["dfa_id"] = dfa_id
    result["input"] = input_string
    return jsonify(result)

def parse_rhs(rhs_str):
    return [t for t in rhs_str.split() if t]

def derive_cfg(cfg_def, input_string):
    LAMBDA = "\u039b"
    grammar = {}
    for rule in cfg_def["rules"]:
        v = rule["lhs"]
        grammar.setdefault(v, [])
        for rhs in rule["rhs"]:
            grammar[v].append([] if rhs == LAMBDA else parse_rhs(rhs))
    variables = set(grammar.keys())
    pos_cache = {}

    def match(var, s, depth=0):
        if depth > 80: return None
        key = (var, s)
        if key in pos_cache: return pos_cache[key]
        pos_cache[key] = None
        for prod in grammar.get(var, []):
            result = match_seq(prod, s, depth)
            if result is not None:
                consumed, children = result
                if consumed == s:
                    node = (prod, children)
                    pos_cache[key] = node
                    return node
        return None

    def match_seq(symbols, s, depth):
        return _seq(symbols, s, depth, [])

    def _seq(symbols, remaining, depth, children):
        if not symbols: return ("", children) if remaining == "" else None
        sym = symbols[0]
        rest = symbols[1:]
        if sym not in variables:
            n = len(sym)
            if remaining[:n] == sym:
                result = _seq(rest, remaining[n:], depth, children)
                if result is not None:
                    consumed, ch = result
                    return (sym + consumed, ch)
            return None
        else:
            max_split = min(len(remaining), len(input_string)) + 1
            for split in range(max_split):
                prefix = remaining[:split]
                node = match(sym, prefix, depth + 1)
                if node is not None:
                    result = _seq(rest, remaining[split:], depth, children + [(sym, prefix, node)])
                    if result is not None:
                        consumed, ch = result
                        return (prefix + consumed, ch)
            return None

    root = match("S", input_string)

    if root is None:
        partial_steps = []
        step_num = [0]
        def try_partial_expand(var, form, pos, depth=0):
            if depth > 30 or step_num[0] >= 40: return form
            prods = grammar.get(var, [])
            best_prod = prods[0] if prods else []
            remaining = "".join(ch for sym in form[pos+1:] if sym not in variables for ch in [sym])
            for prod in prods:
                if not prod:
                    best_prod = prod
                    break
                first_term = next((s for s in prod if s not in variables), None)
                if first_term:
                    consumed_so_far = len("".join(s for s in form[:pos] if s not in variables))
                    if input_string[consumed_so_far:consumed_so_far + len(first_term)] == first_term:
                        best_prod = prod
                        break
            rhs_str = " ".join(best_prod) if best_prod else LAMBDA
            new_form = form[:pos] + best_prod + form[pos + 1:]
            step_num[0] += 1
            partial_steps.append({
                "step_num":   step_num[0],
                "sentential": " ".join(form) if form else LAMBDA,
                "rule_lhs":   var,
                "rule_rhs":   rhs_str,
                "after":      " ".join(new_form) if new_form else LAMBDA,
            })
            cur_form = new_form
            offset = pos
            for sym in best_prod:
                if sym in variables and step_num[0] < 40:
                    try_partial_expand(sym, cur_form, offset, depth + 1)
                    sub_prod = grammar.get(sym, [[]])[0]
                    cur_form = cur_form[:offset] + sub_prod + cur_form[offset + 1:]
                    offset += max(len(sub_prod), 1)
                else: offset += 1
            return cur_form

        try_partial_expand("S", ["S"], 0)
        verdict = f'\u2717 REJECTED \u2014 "{input_string}" is not in the language'
        return {"accepted": False, "steps": partial_steps, "input": input_string, "verdict": verdict}

    steps = []
    step_num = [0]

    def flatten(var, s, node, form, pos):
        prod, children = node
        rhs_str = " ".join(prod) if prod else LAMBDA
        new_form = form[:pos] + prod + form[pos + 1:]
        step_num[0] += 1
        steps.append({
            "step_num":     step_num[0],
            "sentential":   " ".join(form) if form else LAMBDA,
            "rule_lhs":     var,
            "rule_rhs":     rhs_str,
            "after":        " ".join(new_form) if new_form else LAMBDA,
        })
        cur_form = new_form
        cur_pos  = pos
        for child_var, child_s, child_node in children:
            idx = next((j for j in range(cur_pos, len(cur_form)) if cur_form[j] == child_var), None)
            if idx is None: continue
            child_prod, _ = child_node
            flatten(child_var, child_s, child_node, cur_form, idx)
            cur_form = cur_form[:idx] + child_prod + cur_form[idx + 1:]
            cur_pos  = idx + max(len(child_prod), 1)

    flatten("S", input_string, root, ["S"], 0)
    verdict = f'\u2713 ACCEPTED \u2014 "{input_string}" is in the language'
    return {"accepted": True, "steps": steps, "input": input_string, "verdict": verdict}

@app.route("/api/cfgs", methods=["GET"])
def list_cfgs():
    result = {}
    for key, cfg in CFGS.items():
        samples = cfg.get("samples", [])
        invalid_samples = cfg.get("invalid_samples", [])
        result[key] = {
            "regex":           cfg["regex"],
            "alphabet":        cfg["alphabet"],
            "rules":           cfg["rules"],
            "samples":         samples,
            "invalid_samples": invalid_samples,
            "test_strings":    samples + invalid_samples,
        }
    return jsonify(result)

@app.route("/api/cfg/validate", methods=["POST"])
def cfg_validate():
    body = request.get_json()
    cfg_id = body.get("cfg_id")
    input_string = body.get("input", "")
    if cfg_id not in CFGS: return jsonify({"error": f"CFG '{cfg_id}' not found"}), 404
    result = derive_cfg(CFGS[cfg_id], input_string)
    result["cfg_id"] = cfg_id
    return jsonify(result)

# ════════════════════════════════════════════
# PDA Definitions & Logic (Linear Simulator)
# ════════════════════════════════════════════

PDAS = {
    "DFA 1": {
        "description": "(bab)*(b|a)(bab|aba)(a|b)*(aa|bb)*(b|a|bb)(a|b)*(aa|bb)",
        "alphabet": ["a", "b"],
        "stack_alphabet": ["Z", "A", "B"],
        "states": [
            {"id": "s_start", "label": "START", "shape": "oval", "start": True, "accept": False},
            {"id": "q1",  "label": "REJECT", "shape": "oval", "start": False, "accept": False},
            {"id": "q2",  "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q3",  "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q4",  "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q5",  "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q6",  "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q7",  "label": "REJECT", "shape": "oval", "start": False, "accept": False},
            {"id": "q8",  "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q9",  "label": "REJECT", "shape": "oval", "start": False, "accept": False},
            {"id": "q10", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q11", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q12", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q13", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q14", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q15", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q16", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q17", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q18", "label": "REJECT", "shape": "oval", "start": False, "accept": False},
            {"id": "q19", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q20", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q21", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q22", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q23", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "q24", "label": "READ", "shape": "diamond", "start": False, "accept": False},
            {"id": "acc", "label": "ACCEPT", "shape": "oval", "start": False, "accept": True}
        ],
        "transitions": [
            {"from": "s_start", "to": "q4", "read": "Λ", "pop": "Λ", "push": ["Λ"], "label": ""},
            {"from": "q3", "to": "q2", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q3", "to": "q12", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q4", "to": "q3", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q4", "to": "q5", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q4", "to": "q9", "read": "Λ", "pop": "Λ", "push": ["Λ"]}, # Fallback reject
            {"from": "q5", "to": "q6", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q5", "to": "q12", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q6", "to": "q7", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q6", "to": "q10", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q8", "to": "q1", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q10", "to": "q13", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q10", "to": "q5", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q11", "to": "q14", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q11", "to": "q14", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q12", "to": "q9", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q12", "to": "q15", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q13", "to": "q16", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q13", "to": "q17", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q15", "to": "q11", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q15", "to": "q18", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q16", "to": "q19", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q16", "to": "q21", "read": "a", "pop": "Λ", "push": ["Λ"]}, #to q21
            {"from": "q17", "to": "q22", "read": "b", "pop": "Λ", "push": ["Λ"]}, #to q22
            {"from": "q17", "to": "q20", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q19", "to": "q21", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q19", "to": "q23", "read": "b", "pop": "Λ", "push": ["Λ"]}, #to q23
            {"from": "q20", "to": "q24", "read": "a", "pop": "Λ", "push": ["Λ"]}, #to q24
            {"from": "q20", "to": "q22", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q21", "to": "q22", "read": "b", "pop": "Λ", "push": ["Λ"]}, #to q22
            {"from": "q21", "to": "q23", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q21", "to": "acc", "read": "Λ", "pop": "Λ", "push": ["Λ"]}, # FIXED: Allows q21 to accept
            {"from": "q22", "to": "q21", "read": "a", "pop": "Λ", "push": ["Λ"]}, #to q21
            {"from": "q22", "to": "q24", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q22", "to": "acc", "read": "Λ", "pop": "Λ", "push": ["Λ"]}, # FIXED: Allows q22 to accept
            {"from": "q23", "to": "q22", "read": "b", "pop": "Λ", "push": ["Λ"]}, #to q22
            {"from": "q23", "to": "q23", "read": "a", "pop": "Λ", "push": ["Λ"]}, #to q23
            {"from": "q23", "to": "acc", "read": "Λ", "pop": "Λ", "push": ["Λ"]}, 
            {"from": "q24", "to": "q24", "read": "b", "pop": "Λ", "push": ["Λ"]}, #to q24
            {"from": "q24", "to": "q21", "read": "a", "pop": "Λ", "push": ["Λ"]}, #to q21
            {"from": "q24", "to": "acc", "read": "Λ", "pop": "Λ", "push": ["Λ"]},
            {"from": "q2", "to": "q1", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q2", "to": "q8", "read": "b", "pop": "Λ", "push": ["Λ"]},
            {"from": "q8", "to": "q11", "read": "a", "pop": "Λ", "push": ["Λ"]},
            {"from": "q14", "to": "q21", "read": "a", "pop": "Λ", "push": ["Λ"]}, #to q21
            {"from": "q14", "to": "q22", "read": "b", "pop": "Λ", "push": ["Λ"]}, #to q22
            
        ],
        "samples": ["bbabbaa", "abababb", "bbabaaa", "aababbb"]
    },
    "DFA 2": {
        "description": "(1|0)*(11|00)(00|11)*(1|0|11)(1|0|11)*(101|111)(101|111)*(1|0*|11)(1|0*|11)",
        "alphabet": ["0", "1"],
        "stack_alphabet": ["Z", "0", "1"],
        "states": [
            {"id": "s_start", "label": "START",  "shape": "oval",    "start": True,  "accept": False},
            {"id": "q1",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q2",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q3",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q4",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q5",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q6",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q7",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q8",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q9",      "label": "READ",       "shape": "diamond", "start": False, "accept": False},
            {"id": "q10",     "label": "READ",      "shape": "diamond", "start": False, "accept": False},
            {"id": "q11",     "label": "READ",      "shape": "diamond", "start": False, "accept": False},
            {"id": "q12",     "label": "READ",      "shape": "diamond", "start": False, "accept": False},
            {"id": "q13",     "label": "READ",      "shape": "diamond", "start": False, "accept": False},
            {"id": "q14",     "label": "READ",      "shape": "diamond", "start": False, "accept": False},
            {"id": "q15",     "label": "READ",      "shape": "diamond", "start": False, "accept": False},
            {"id": "q16",     "label": "READ",      "shape": "diamond", "start": False, "accept": False},
            {"id": "acc_1",   "label": "ACCEPT",  "shape": "oval",    "start": False, "accept": True}

        ],
        "transitions": [
            {"from": "s_start", "to": "q1",  "read": "Λ", "pop": "Λ", "push": ["Λ"], "label": ""},
            {"from": "q1", "to": "q2", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q1", "to": "q6", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q2", "to": "q6", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q2", "to": "q3", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q2", "to": "q6", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q3", "to": "q4", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q3", "to": "q10", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q4", "to": "q5", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q4", "to": "q13", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q5", "to": "q13", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q5", "to": "q4", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q6", "to": "q7", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q6", "to": "q2", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q7", "to": "q8", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q7", "to": "q10", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q8", "to": "q9", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q8", "to": "q13", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q9", "to": "q8", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q9", "to": "q13", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q10", "to": "q13", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q11", "to": "q11", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q11", "to": "q11", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q11", "to": "acc_1", "read": "Λ", "pop": "Λ", "push": ["Λ"]},
            {"from": "q12", "to": "q11", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q12", "to": "q15", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q13", "to": "q14", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q13", "to": "q12", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q14", "to": "q16", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q14", "to": "q9", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q15", "to": "q5", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q15", "to": "q11", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q16", "to": "q16", "read": "0", "pop": "Λ", "push": ["Λ"]},
            {"from": "q16", "to": "q16", "read": "1", "pop": "Λ", "push": ["Λ"]},
            {"from": "q16", "to": "acc_1", "read": "Λ", "pop": "Λ", "push": ["Λ"]},
        ],
        "samples": ["11110111", "00011111", "111110111", "011110111", "111101111", "00010110111"]
    }
}

def run_pda(pda_def, input_string):
    """
    Linear simulator: checks characters first, falls back to epsilon (\u039b), exactly like your DFA.
    """
    start_state = next(s["id"] for s in pda_def["states"] if s["start"])
    current = start_state
    stack = []
    trace = [{"state": current, "char_index": -1, "symbol": None, "stack": list(stack)}]
    
    idx = 0
    while idx <= len(input_string):
        state_info = next((s for s in pda_def["states"] if s["id"] == current), None)
        
        # Stop completely if the string is consumed AND we are in an Accept state
        if idx == len(input_string) and state_info and state_info["accept"]:
            break
            
        transitions = [t for t in pda_def["transitions"] if t["from"] == current]
        valid_transition = None
        symbol_read = None
        
        # 1. Try to consume an exact character from the input
        if idx < len(input_string):
            char = input_string[idx]
            for t in transitions:
                if t.get("read") == char:
                    pop_char = t.get("pop", "Λ")
                    if pop_char in ["Λ", "\u039b", "ε", ""] or (stack and stack[-1] == pop_char):
                        valid_transition = t
                        symbol_read = char
                        break
        
        # 2. If no exact match, try Epsilon (Λ) fallback transitions
        if not valid_transition:
            for t in transitions:
                if t.get("read") in ["Λ", "\u039b", "ε", ""]:
                    pop_char = t.get("pop", "Λ")
                    if pop_char in ["Λ", "\u039b", "ε", ""] or (stack and stack[-1] == pop_char):
                        valid_transition = t
                        symbol_read = "Λ"
                        break

        # 3. Dead state (no valid moves left)
        if not valid_transition:
            break
            
        t = valid_transition
        
        # Pop from Stack
        pop_char = t.get("pop", "Λ")
        if pop_char not in ["Λ", "\u039b", "ε", ""]:
            stack.pop()
            
        # Push to Stack
        push_chars = t.get("push", ["Λ"])
        if push_chars not in [["Λ"], ["\u039b"], ["ε"], [""]]:
            for push_char in reversed(push_chars):
                stack.append(push_char)
                
        current = t["to"]
        
        if symbol_read != "Λ":
            idx += 1
            
        trace.append({
            "state": current,
            "char_index": idx - 1 if symbol_read != "Λ" else idx - 1,
            "symbol": symbol_read,
            "stack": list(stack)
        })
        
        # Infinite loop safeguard
        if len(trace) > 1000:
            break

    state_info = next((s for s in pda_def["states"] if s["id"] == current), None)
    is_accept = state_info["accept"] if state_info else False
    fully_consumed = (idx == len(input_string))
    final_success = is_accept and fully_consumed
    
    verdict = (
        f'✓ ACCEPTED — "{input_string}" is in the language'
        if final_success
        else f'✗ REJECTED — "{input_string}" is not in the language'
    )

    return {
        "trace": trace,
        "accepted": final_success,
        "dead": not final_success,
        "dead_at": idx if not final_success else None,
        "final_state": current,
        "verdict": verdict
    }

@app.route("/api/pdas", methods=["GET"])
def list_pdas():
    result = {}
    for key, pda in PDAS.items():
        result[key] = {"description": pda["description"], "alphabet": pda["alphabet"], "samples": pda["samples"], "states": pda["states"], "transitions": pda["transitions"]}
    return jsonify(result)

@app.route("/api/pda/run", methods=["POST"])
def run_pda_route():
    body = request.get_json()
    pda_id = body.get("pda_id")
    input_string = body.get("input", "")
    if pda_id not in PDAS: return jsonify({"error": f"PDA '{pda_id}' not found"}), 404
    result = run_pda(PDAS[pda_id], input_string)
    return jsonify(result)

if __name__ == "__main__":
    app.run()