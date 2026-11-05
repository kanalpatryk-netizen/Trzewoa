# Dwuklik na Windows uruchamia budzik bez czarnego okna konsoli.
import os
import runpy
import sys

tutaj = os.path.dirname(os.path.abspath(__file__))
os.chdir(tutaj)
sys.path.insert(0, tutaj)
sys.argv = [os.path.join(tutaj, "budzik.py")]
runpy.run_path(sys.argv[0], run_name="__main__")
