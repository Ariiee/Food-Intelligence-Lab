import csv

data = [
    # headers: name, category, c_pct, h_pct, o_pct, n_pct, p_pct, ca_pct, mg_pct, k_pct, na_pct, trace_pb, trace_cd, trace_hg, trace_as
    ["Organic Green Apple", "Fruit", 40.5, 7.1, 51.2, 0.2, 0.1, 0.04, 0.02, 0.25, 0.003, 0.005, 0.001, 0.0002, 0.003],
    ["Premium Ribeye Steak", "Meat", 54.2, 8.8, 28.5, 4.1, 0.22, 0.01, 0.03, 0.28, 0.09, 0.012, 0.002, 0.0005, 0.006],
    ["Whole Grain Wheat", "Grain", 44.8, 6.4, 42.6, 1.6, 0.31, 0.03, 0.12, 0.32, 0.012, 0.008, 0.003, 0.0001, 0.009],
    ["Fresh Whole Milk", "Dairy", 49.1, 7.8, 38.6, 2.3, 0.15, 0.28, 0.02, 0.14, 0.065, 0.004, 0.001, 0.0002, 0.002],
    ["Red Organic Lentils", "Legume", 46.2, 6.8, 40.5, 3.2, 0.38, 0.12, 0.15, 0.45, 0.018, 0.015, 0.005, 0.0004, 0.012],
    ["Suspect Grains (Pb Contaminated)", "Grain", 44.6, 6.3, 42.4, 1.5, 0.3, 0.03, 0.11, 0.3, 0.01, 0.98, 0.02, 0.001, 0.025],
    ["Industrial Spinach (Hg Danger)", "Vegetable", 36.8, 5.8, 52.1, 0.8, 0.18, 0.14, 0.09, 0.38, 0.03, 0.12, 0.05, 0.42, 0.15],
    ["Standard Carrots", "Vegetable", 38.1, 6.1, 52.8, 0.6, 0.14, 0.08, 0.06, 0.32, 0.025, 0.008, 0.002, 0.0003, 0.005]
]

headers = [
    "name", "category", "c_pct", "h_pct", "o_pct", "n_pct", "p_pct", "ca_pct", "mg_pct", "k_pct", "na_pct",
    "trace_pb", "trace_cd", "trace_hg", "trace_as"
]

with open("sample_dataset.csv", mode="w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(headers)
    writer.writerows(data)

print("[SYSTEM] sample_dataset.csv created successfully with 8 realistic elemental food records.")
