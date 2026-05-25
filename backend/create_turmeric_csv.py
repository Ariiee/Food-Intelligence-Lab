import pandas as pd

# Data from the INAA study on raw and branded turmeric samples
data = [
    # Raw Turmeric Samples (RT-1 to RT-4)
    {
        "name": "Raw Turmeric UP (RT-1)",
        "category": "Vegetable",
        "c_pct": 42.4,
        "h_pct": 6.4,
        "o_pct": 46.2,
        "n_pct": 1.15,
        "p_pct": 0.22,
        "ca_pct": 0.18, # wt% from Table 3
        "mg_pct": 0.18,
        "k_pct": 3.63,  # wt% from Table 3
        "na_pct": 0.048, # 480 mg/kg -> 0.048%
        "trace_pb": 0.012, # Safe lead
        "trace_cd": 0.002,
        "trace_hg": 0.0005,
        "trace_as": 0.003
    },
    {
        "name": "Raw Turmeric West Bengal (RT-2) [ADULTERATED]",
        "category": "Vegetable",
        "c_pct": 41.2,
        "h_pct": 6.1,
        "o_pct": 43.5,
        "n_pct": 1.10,
        "p_pct": 0.20,
        "ca_pct": 0.32, # wt% from Table 3
        "mg_pct": 0.21,
        "k_pct": 3.79,  # wt% from Table 3
        "na_pct": 0.0255, # 255 mg/kg -> 0.0255%
        "trace_pb": 198.5, # Adulterated with Lead Chromate (50 ppm Cr corresponds to ~200 ppm Pb)
        "trace_cd": 0.004,
        "trace_hg": 0.0008,
        "trace_as": 0.005
    },
    {
        "name": "Raw Turmeric Noida (RT-3) [SUSPECT]",
        "category": "Vegetable",
        "c_pct": 42.1,
        "h_pct": 6.3,
        "o_pct": 45.4,
        "n_pct": 1.12,
        "p_pct": 0.21,
        "ca_pct": 0.25, # wt% from Table 3
        "mg_pct": 0.19,
        "k_pct": 3.66,  # wt% from Table 3
        "na_pct": 0.0385, # 385 mg/kg -> 0.0385%
        "trace_pb": 42.4,  # High Lead from chromate contamination (11 ppm Cr)
        "trace_cd": 0.003,
        "trace_hg": 0.0006,
        "trace_as": 0.004
    },
    {
        "name": "Raw Turmeric Haryana (RT-4) [SUSPECT]",
        "category": "Vegetable",
        "c_pct": 41.8,
        "h_pct": 6.2,
        "o_pct": 44.8,
        "n_pct": 1.14,
        "p_pct": 0.22,
        "ca_pct": 0.37, # wt% from Table 3
        "mg_pct": 0.20,
        "k_pct": 3.90,  # wt% from Table 3
        "na_pct": 0.0455, # 455 mg/kg -> 0.0455%
        "trace_pb": 29.8,  # Moderate Lead from chromate contamination (7.6 ppm Cr)
        "trace_cd": 0.003,
        "trace_hg": 0.0005,
        "trace_as": 0.004
    },
    # Branded Turmeric Samples (BT-1 to BT-6)
    {
        "name": "Branded Turmeric Brand 1 (BT-1)",
        "category": "Vegetable",
        "c_pct": 43.1,
        "h_pct": 6.5,
        "o_pct": 46.8,
        "n_pct": 1.25,
        "p_pct": 0.25,
        "ca_pct": 0.34, # wt% from Table 4
        "mg_pct": 0.17,
        "k_pct": 2.90,  # wt% from Table 4
        "na_pct": 0.0151, # 151 mg/kg -> 0.0151%
        "trace_pb": 0.015, # Safe
        "trace_cd": 0.002,
        "trace_hg": 0.0004,
        "trace_as": 0.003
    },
    {
        "name": "Branded Turmeric Brand 2 (BT-2)",
        "category": "Vegetable",
        "c_pct": 43.5,
        "h_pct": 6.6,
        "o_pct": 47.2,
        "n_pct": 1.28,
        "p_pct": 0.24,
        "ca_pct": 0.32, # wt% from Table 4
        "mg_pct": 0.16,
        "k_pct": 2.60,  # wt% from Table 4
        "na_pct": 0.0150, # 150 mg/kg -> 0.0150%
        "trace_pb": 0.010, # Safe
        "trace_cd": 0.001,
        "trace_hg": 0.0003,
        "trace_as": 0.002
    },
    {
        "name": "Branded Turmeric Brand 3 (BT-3)",
        "category": "Vegetable",
        "c_pct": 43.8,
        "h_pct": 6.7,
        "o_pct": 47.5,
        "n_pct": 1.30,
        "p_pct": 0.26,
        "ca_pct": 0.30, # wt% from Table 4
        "mg_pct": 0.18,
        "k_pct": 2.20,  # wt% from Table 4
        "na_pct": 0.0257, # 257 mg/kg -> 0.0257%
        "trace_pb": 0.008, # Safe
        "trace_cd": 0.002,
        "trace_hg": 0.0004,
        "trace_as": 0.003
    },
    {
        "name": "Branded Turmeric Brand 4 (BT-4)",
        "category": "Vegetable",
        "c_pct": 42.6,
        "h_pct": 6.4,
        "o_pct": 46.1,
        "n_pct": 1.22,
        "p_pct": 0.23,
        "ca_pct": 0.38, # wt% from Table 4
        "mg_pct": 0.19,
        "k_pct": 3.80,  # wt% from Table 4
        "na_pct": 0.0299, # 299 mg/kg -> 0.0299%
        "trace_pb": 0.022, # Safe
        "trace_cd": 0.003,
        "trace_hg": 0.0005,
        "trace_as": 0.004
    },
    {
        "name": "Branded Turmeric Brand 5 (BT-5) [CONTAMINATED]",
        "category": "Vegetable",
        "c_pct": 42.2,
        "h_pct": 6.2,
        "o_pct": 45.1,
        "n_pct": 1.20,
        "p_pct": 0.22,
        "ca_pct": 0.35, # wt% from Table 4
        "mg_pct": 0.18,
        "k_pct": 2.50,  # wt% from Table 4
        "na_pct": 0.0396, # 396 mg/kg -> 0.0396%
        "trace_pb": 18.6,  # Contaminated with lead chromate (5.1 ppm Cr)
        "trace_cd": 0.003,
        "trace_hg": 0.0006,
        "trace_as": 0.005
    },
    {
        "name": "Branded Turmeric Brand 6 (BT-6)",
        "category": "Vegetable",
        "c_pct": 42.9,
        "h_pct": 6.5,
        "o_pct": 46.4,
        "n_pct": 1.24,
        "p_pct": 0.24,
        "ca_pct": 0.27, # wt% from Table 4
        "mg_pct": 0.17,
        "k_pct": 3.70,  # wt% from Table 4
        "na_pct": 0.0210, # 210 mg/kg -> 0.0210%
        "trace_pb": 0.024, # Safe
        "trace_cd": 0.002,
        "trace_hg": 0.0004,
        "trace_as": 0.003
    }
]

df = pd.DataFrame(data)
csv_path = "turmeric_study_dataset.csv"
df.to_csv(csv_path, index=False)
print(f"[SUCCESS] Turmeric INAA research study dataset generated at '{csv_path}'.")
