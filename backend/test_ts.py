import sys
try:
    from analyzer.parser import TS_AVAILABLE
    print("TS_AVAILABLE:", TS_AVAILABLE)
except Exception as e:
    print("Error:", e)
