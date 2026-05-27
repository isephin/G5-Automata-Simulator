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


if __name__ == "__main__":
    app.run()
