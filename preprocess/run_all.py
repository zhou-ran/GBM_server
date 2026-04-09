"""Master preprocessing script — runs all steps in order."""
import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from step1_extract import run as step1
from step2_senescence import run as step2
from step3_hexbin import run as step3
from step4_stats import run as step4
from step5_downsample import run as step5
from step6_arrow import run as step6
from validate_outputs import run as validate_outputs


def main():
    t0 = time.time()
    print("=" * 60)
    print("GBM Senescence Atlas — Data Preprocessing Pipeline")
    print("=" * 60)

    step1()
    print()
    step2()
    print()
    step3()
    print()
    step4()
    print()
    step5()
    print()
    step6()
    print()
    validate_outputs()

    elapsed = time.time() - t0
    print()
    print(f"All preprocessing complete in {elapsed/60:.1f} minutes.")
    print(f"Output files in: {os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')}")


if __name__ == '__main__':
    main()
