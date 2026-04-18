import tree_sitter
from tree_sitter import Language, Parser
import tree_sitter_python
import tree_sitter_javascript
import tree_sitter_typescript

py_lang = Language(tree_sitter_python.language())
js_lang = Language(tree_sitter_javascript.language())
ts_lang = Language(tree_sitter_typescript.language_typescript())

# PYTHON
py_parser = Parser(py_lang)
py_text = b"import os\nfrom pathlib import Path\ndef foo():\n    pass\nclass Bar:\n    pass\nasync def baz():\n    pass"
tree = py_parser.parse(py_text)

q = py_lang.query("""
(function_definition name: (identifier) @func)
(class_definition name: (identifier) @class)
(import_statement name: (dotted_name) @import)
(import_from_statement module_name: (dotted_name) @import)
""")

for _, captures in q.matches(tree.root_node):
    for k, nodes in captures.items():
        for n in nodes:
            print(f"PY {k}:", n.text.decode("utf8"))

# JAVASCRIPT
js_parser = Parser(js_lang)
js_text = b"import { x } from 'abc';\nconst y = require('def');\nfunction test1() {}\nconst test2 = () => {}\nclass MyClass {}"
tree = js_parser.parse(js_text)

js_q = js_lang.query("""
(function_declaration name: (identifier) @func)
(lexical_declaration (variable_declarator name: (identifier) @func value: (arrow_function)))
(class_declaration name: (identifier) @class)
(import_statement source: (string (string_fragment) @import))
(call_expression function: (identifier) @req arguments: (arguments (string (string_fragment) @import)) (#eq? @req "require"))
""")

for _, captures in js_q.matches(tree.root_node):
    for k, nodes in captures.items():
        if k == "req": continue
        for n in nodes:
            print(f"JS {k}:", n.text.decode("utf8"))

