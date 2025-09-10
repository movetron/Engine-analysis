# python/preview.py
import sys
import pandas as pd
import numpy as np

def downsample_csv(input_path, output_path, max_points=150000):
    df = pd.read_csv(input_path)
   
    df = df.fillna(0)

    step = max(1, len(df) // max_points)
    if step > 10:
        step = 10
    df_sampled = df.iloc[::step]
    df_sampled.to_csv(output_path, index=False)

if __name__ == "__main__":
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    print(f"Downsampling CSV: {input_path} -> {output_path}")
    downsample_csv(input_path, output_path)
    print("Done. Output saved.")