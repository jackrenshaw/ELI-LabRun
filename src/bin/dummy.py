# main.py
import sys

print("Arguments count: {len(sys.argv)}")

for i, arg in enumerate(sys.argv):
  if i == 1:
    print(arg)