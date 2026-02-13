from pathlib import Path

base_dir = Path(__file__).resolve().parent

print(base_dir)
data_dir = base_dir / "data"
print(data_dir)

input_path = data_dir / "Multi_Sku.xlsx"
demand_path = data_dir / "Multi_Sku.xlsx"
lead_path = data_dir / "Leadtime_MultiSKU.xlsx"
cost_input_path = data_dir / "Node_Costs.xlsx"


base_output_dir = base_dir / "output_data"
print(base_output_dir)

monthly_demand_path = base_output_dir/"monthly_demand"
calculated_metrics_path = base_output_dir/"calculated_metrics"
distribution_path = base_output_dir/"distribution"
schedule_path = base_output_dir/"schedule_data"
cost_path  = base_output_dir/"cost"

for path in [monthly_demand_path, calculated_metrics_path, distribution_path, schedule_path,cost_path]:
    path.mkdir(parents=True, exist_ok=True)