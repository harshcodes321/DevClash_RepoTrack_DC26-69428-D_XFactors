import tree_sitter
from tree_sitter import Language, Parser
import tree_sitter_python

py_lang = Language(tree_sitter_python.language())
parser = Parser(py_lang)
tree = parser.parse(b"import os\ndef foo():\n    pass")
print("Node dir:", dir(tree.root_node))
