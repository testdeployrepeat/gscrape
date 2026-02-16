# pip install pandas
import pandas as pd
from pathlib import Path
from tkinter import Tk, filedialog

# 1) Pick folder in Finder
root = Tk()
root.withdraw()
folder = filedialog.askdirectory(title="Select folder containing CSV files")
root.destroy()

if not folder:
    raise SystemExit("No folder selected.")

folder = Path(folder)
csv_files = sorted(folder.glob("*.csv"))
if not csv_files:
    raise SystemExit(f"No .csv files found in: {folder}")

# 2) Read all CSVs, then count total/unique/duplicates (by entire row)
frames = []
for f in csv_files:
    df = pd.read_csv(f, dtype=str, keep_default_na=False)  # treat everything as text
    frames.append(df)

all_df = pd.concat(frames, ignore_index=True, sort=False).fillna("")  # align columns

total_rows = len(all_df)
unique_rows = len(all_df.drop_duplicates())

# duplicates beyond the first occurrence (total - unique)
duplicate_rows_extra = total_rows - unique_rows

# rows that are part of a duplicated group (counts ALL occurrences of duplicates)
duplicate_rows_including_first = int(all_df.duplicated(keep=False).sum())

print(f"CSV files: {len(csv_files)}")
print(f"Total rows: {total_rows}")
print(f"Unique rows: {unique_rows}")
print(f"Duplicate rows (extra copies only): {duplicate_rows_extra}")
print(f"Duplicate rows (including first occurrences): {duplicate_rows_including_first}")