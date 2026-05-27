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

            # 1 - ALL (OUTWARD)

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
        "samples": ["aab", "ab", "bab", "ba", "b", "ababab"],
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
            {"from": "q12", "to": "q3", "label": "1"},

            {"from": "q13", "to": "q13", "label": "0"},
            {"from": "q13", "to": "q13", "label": "1"},


        ],
        "samples": ["aa", "bab", "aabb", "a", "bb", "aaa"],
    }
}


def run_dfa(dfa_def, input_string):
    """
    Simulate a DFA on an input string.
    Returns a step-by-step trace: list of {state, char_index} dicts.
    """
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
            # Dead / trap state
            return {
                "trace": trace,
                "accepted": False,
                "dead": True,
                "dead_at": i,
                "final_state": current,
            }
        current = trans_map[key]
        trace.append({"state": current, "char_index": i, "symbol": ch})

    is_accept = next(s["accept"] for s in dfa_def["states"] if s["id"] == current)
    return {
        "trace": trace,
        "accepted": is_accept,
        "dead": False,
        "dead_at": None,
        "final_state": current,
    }


# --- CFG Definitions ---

CFGS = {
    "DFA 1": {
        "regex": "(bab)*(b+a)(bab+aba)(a+b)*(aa+bb)*(b+a+bb)(a+b)*(aa+bb)",
        "alphabet": ["a", "b"],
        "samples": [
            "bbabbaa",     # Z=ε  Y=b  X=bab  W=ε  V=ε  U=b  T=ε  R=aa
            "abababb",     # Z=ε  Y=a  X=bab  W=ε  V=ε  U=a  T=ε  R=bb
            "bbabaaa",     # Z=ε  Y=b  X=bab  W=a  V=ε  U=a  T=ε  R=aa
            "bbabbbaa",    # Z=ε  Y=b  X=bab  W=b  V=ε  U=b  T=ε  R=aa
            "babbbabbaa",  # Z=bab Y=b X=bab  W=ε  V=ε  U=b  T=ε  R=aa
            "aababbb",     # Z=ε  Y=a  X=aba  W=b  V=ε  U=b  T=ε  R=bb
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
        "regex": "(1+0)*(11+00)(00+11)*(1+0+11)(1+0+11)*(101+111)(101+111)*(1+0*+11)(1+0*+11)",
        "alphabet": ["0", "1"],
        "samples": [
            "11110111",    # Z=ε  Y=11  X=ε  W=1  V=ε  U=101  T=ε  R=11
            "00011111",    # Z=ε  Y=00  X=ε  W=0  V=ε  U=111  T=ε  R=11
            "111110111",   # Z=1  Y=11  X=ε  W=1  V=ε  U=101  T=ε  R=11
            "011110111",   # Z=0  Y=11  X=ε  W=1  V=ε  U=101  T=ε  R=11
            "111101111",   # Z=ε  Y=11  X=ε  W=1  V=ε  U=101  T=ε  R=111
            "00010110111", # Z=ε  Y=00  X=ε  W=0  V=ε  U=101  T=101 R=11
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
            {"lhs": "R",   "rhs": ["1 R'", "0* R'", "11 R'"]},
            {"lhs": "R'",  "rhs": ["1 R''", "0* R''", "11 R''"]},
            {"lhs": "R''", "rhs": ["\u039b"]},
        ],
    },
}


# --- Routes ---

@app.route("/api/dfas", methods=["GET"])
def list_dfas():
    """Return all available DFA keys and their metadata."""
    result = {}
    for key, dfa in DFAS.items():
        result[key] = {
            "description": dfa["description"],
            "alphabet": dfa["alphabet"],
            "samples": dfa["samples"],
            "states": dfa["states"],
            "transitions": dfa["transitions"],
        }
    return jsonify(result)


@app.route("/api/dfa/<dfa_id>", methods=["GET"])
def get_dfa(dfa_id):
    """Return a single DFA definition."""
    if dfa_id not in DFAS:
        return jsonify({"error": f"DFA '{dfa_id}' not found"}), 404
    return jsonify(DFAS[dfa_id])


@app.route("/api/run", methods=["POST"])
def run():
    """
    Run a DFA on an input string.
    Body: { "dfa_id": "ends_ab", "input": "aab" }
    Returns full trace + result.
    """
    body = request.get_json()
    if not body:
        return jsonify({"error": "JSON body required"}), 400

    dfa_id = body.get("dfa_id")
    input_string = body.get("input", "")

    if dfa_id not in DFAS:
        return jsonify({"error": f"DFA '{dfa_id}' not found"}), 404

    # Validate characters
    dfa_def = DFAS[dfa_id]
    alphabet = set(dfa_def["alphabet"])
    invalid = [ch for ch in input_string if ch not in alphabet]
    if invalid:
        return jsonify({
            "error": f"Invalid character(s): {list(set(invalid))}. Alphabet is {sorted(alphabet)}"
        }), 400

    result = run_dfa(dfa_def, input_string)
    result["dfa_id"] = dfa_id
    result["input"] = input_string
    return jsonify(result)


@app.route("/api/batch", methods=["POST"])
def batch():
    """
    Run multiple strings against one DFA.
    Body: { "dfa_id": "ends_ab", "inputs": ["aab", "ab", "ba"] }
    """
    body = request.get_json()
    dfa_id = body.get("dfa_id")
    inputs = body.get("inputs", [])

    if dfa_id not in DFAS:
        return jsonify({"error": f"DFA '{dfa_id}' not found"}), 404

    dfa_def = DFAS[dfa_id]
    alphabet = set(dfa_def["alphabet"])
    results = []
    for s in inputs:
        invalid = [ch for ch in s if ch not in alphabet]
        if invalid:
            results.append({"input": s, "accepted": False, "error": f"Invalid chars: {invalid}"})
        else:
            r = run_dfa(dfa_def, s)
            results.append({"input": s, "accepted": r["accepted"], "dead": r["dead"]})
    return jsonify({"dfa_id": dfa_id, "results": results})


def parse_rhs(rhs_str):
    """Split 'a W' -> ['a', 'W'],  'bab' -> ['bab'],  'Λ' -> []"""
    return [t for t in rhs_str.split() if t]


def derive_cfg(cfg_def, input_string):
    """
    Top-down recursive descent parser with backtracking (no broken memo).
    The input is kept as a plain string; terminals are matched as substrings
    so multi-char terminals like 'bab', 'aa', '101' work correctly.

    Returns {accepted, steps[], input}.
    Each step: {step_num, sentential, rule_lhs, rule_rhs, after}
    """
    LAMBDA = "\u039b"

    # grammar: var -> [ [sym, sym, ...], ... ]   ([] means ε)
    grammar = {}
    for rule in cfg_def["rules"]:
        v = rule["lhs"]
        grammar.setdefault(v, [])
        for rhs in rule["rhs"]:
            grammar[v].append([] if rhs == LAMBDA else parse_rhs(rhs))

    variables = set(grammar.keys())

    # ------------------------------------------------------------------
    # match(var, s) -> parse-node | None
    #   parse-node = (production_list, [ (child_var, child_str, child_node), ... ])
    #
    # match_seq(symbols, s) -> (consumed_str, child_list) | None
    #   consumed_str = portion of s matched by symbols
    # ------------------------------------------------------------------

    # Cache: (var, s) -> True/False  (cache both to avoid re-exploring)
    pos_cache = {}

    def match(var, s, depth=0):
        if depth > 100:
            return None
        key = (var, s)
        if key in pos_cache:
            return pos_cache[key]

        for prod in grammar.get(var, []):
            result = match_seq(prod, s, depth)
            if result is not None:
                consumed, children = result
                if consumed == s:
                    node = (prod, children)
                    pos_cache[key] = node
                    return node

        pos_cache[key] = None     # cache failure only after trying ALL productions
        return None

    def match_seq(symbols, s, depth):
        """
        Returns (total_consumed, children) if symbols can derive a prefix of s,
        consuming exactly len(total_consumed) characters and leaving nothing.
        Because we require full consumption at the top level, we thread the
        remaining string and demand it be empty when symbols run out.
        """
        return _seq(symbols, s, depth, [])

    def _seq(symbols, remaining, depth, children):
        if not symbols:
            return ("", children) if remaining == "" else None

        sym = symbols[0]
        rest = symbols[1:]

        if sym not in variables:
            # Terminal: must be a literal prefix match
            n = len(sym)
            if remaining[:n] == sym:
                result = _seq(rest, remaining[n:], depth, children)
                if result is not None:
                    consumed, ch = result
                    return (sym + consumed, ch)
            return None
        else:
            # Variable: try every possible split of remaining
            for split in range(len(remaining) + 1):
                prefix = remaining[:split]
                node = match(sym, prefix, depth + 1)
                if node is not None:
                    result = _seq(rest, remaining[split:], depth,
                                  children + [(sym, prefix, node)])
                    if result is not None:
                        consumed, ch = result
                        return (prefix + consumed, ch)
            return None

    # ── Run parser ────────────────────────────────────────────────────
    root = match("S", input_string)
    if root is None:
        return {"accepted": False, "steps": [], "input": input_string}

    # ── Flatten parse tree → leftmost derivation steps ───────────────
    # sentential form is a list of symbol-strings (vars or terminals)
    steps = []
    step_num = [0]

    def flatten(var, s, node, form, pos):
        """Expand var at position pos in form, then recurse into children."""
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

        # walk children left-to-right, keeping form in sync
        cur_form = new_form
        cur_pos  = pos
        for child_var, child_s, child_node in children:
            # find the next occurrence of child_var starting at cur_pos
            idx = next(
                (j for j in range(cur_pos, len(cur_form)) if cur_form[j] == child_var),
                None
            )
            if idx is None:
                continue
            # expand it
            child_prod, _ = child_node
            flatten(child_var, child_s, child_node, cur_form, idx)
            # update cur_form to reflect that expansion
            cur_form = cur_form[:idx] + child_prod + cur_form[idx + 1:]
            cur_pos  = idx + max(len(child_prod), 1)

    flatten("S", input_string, root, ["S"], 0)

    return {"accepted": True, "steps": steps, "input": input_string}


@app.route("/api/cfgs", methods=["GET"])
def list_cfgs():
    """Return all CFG definitions (rules + metadata)."""
    result = {}
    for key, cfg in CFGS.items():
        result[key] = {
            "regex":           cfg["regex"],
            "alphabet":        cfg["alphabet"],
            "rules":           cfg["rules"],
            "samples":         cfg.get("samples", []),
            "invalid_samples": cfg.get("invalid_samples", []),
        }
    return jsonify(result)


@app.route("/api/cfg/<cfg_id>", methods=["GET"])
def get_cfg(cfg_id):
    """Return a single CFG definition."""
    if cfg_id not in CFGS:
        return jsonify({"error": f"CFG '{cfg_id}' not found"}), 404
    return jsonify(CFGS[cfg_id])


@app.route("/api/cfg/validate", methods=["POST"])
def cfg_validate():
    """
    Validate a string against a CFG and return a step-by-step derivation.
    Body: { "cfg_id": "DFA 1", "input": "babaabb" }
    """
    body = request.get_json()
    if not body:
        return jsonify({"error": "JSON body required"}), 400

    cfg_id      = body.get("cfg_id")
    input_string = body.get("input", "")

    if cfg_id not in CFGS:
        return jsonify({"error": f"CFG '{cfg_id}' not found"}), 404

    cfg_def  = CFGS[cfg_id]
    alphabet = set(cfg_def["alphabet"])
    invalid  = [ch for ch in input_string if ch not in alphabet]
    if invalid:
        return jsonify({
            "error": f"Invalid character(s): {list(set(invalid))}. Alphabet is {sorted(alphabet)}"
        }), 400

    result = derive_cfg(cfg_def, input_string)
    result["cfg_id"] = cfg_id
    return jsonify(result)


if __name__ == "__main__":
    app.run()