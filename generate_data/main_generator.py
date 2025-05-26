import json
import random
from math import radians, sin, cos, sqrt, atan2
import os

# --- 配置项 ---
NUM_FOODS_TO_GENERATE = 20
NUM_ORIGINS_PER_FOOD_MIN = 1
NUM_ORIGINS_PER_FOOD_MAX = 3
NUM_DESTINATIONS_PER_ORIGIN_MIN = 2
NUM_DESTINATIONS_PER_ORIGIN_MAX = 5

# 修正输出目录的路径构建
# __file__ 是当前脚本 (main_generator.py) 的路径
# os.path.dirname(__file__) 是 generate_data 目录
# os.path.dirname(os.path.dirname(__file__)) 是 Data visualize 目录
# 使用 os.path.abspath 确保路径的绝对性，避免相对路径问题
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
OUTPUT_DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# --- 辅助函数：计算两点间球面距离 (Haversine) ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # 地球半径 (公里)
    try:
        lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    except ValueError:
        print(f"Warning: Invalid coordinates for Haversine: ({lat1}, {lon1}) to ({lat2}, {lon2})")
        return random.uniform(1000, 15000) # 返回一个随机距离作为备用

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c
    return round(distance, 2)

# --- 预定义数据 ---
FOOD_CATEGORIES = {
    "fruit": ["苹果", "香蕉", "橙子", "葡萄", "草莓", "芒果", "菠萝"],
    "vegetable": ["西红柿", "西兰花", "胡萝卜", "菠菜", "土豆", "洋葱", "生菜"],
    "grain": ["大米", "小麦", "玉米", "燕麦", "面包"],
    "protein_meat": ["牛肉", "鸡肉", "猪肉", "鱼肉", "羊肉"],
    "protein_plant": ["豆腐", "扁豆", "鹰嘴豆", "黑豆"],
    "dairy": ["牛奶", "奶酪", "酸奶"],
    "other": ["咖啡豆", "可可豆", "茶叶", "鸡蛋", "坚果"]
}

ALL_FOOD_NAMES = sum(FOOD_CATEGORIES.values(), [])

COUNTRIES_DATA = {
    "中国": {"lat": 35.8617, "lon": 104.1954},
    "美国": {"lat": 38.9637, "lon": -95.7129},
    "印度": {"lat": 20.5937, "lon": 78.9629},
    "巴西": {"lat": -14.2350, "lon": -51.9253},
    "俄罗斯": {"lat": 61.5240, "lon": 105.3188},
    "加拿大": {"lat": 56.1304, "lon": -106.3468},
    "澳大利亚": {"lat": -25.2744, "lon": 133.7751},
    "阿根廷": {"lat": -38.4161, "lon": -63.6167},
    "德国": {"lat": 51.1657, "lon": 10.4515},
    "法国": {"lat": 46.6033, "lon": 1.8883},
    "日本": {"lat": 36.2048, "lon": 138.2529},
    "韩国": {"lat": 35.9078, "lon": 127.7669},
    "南非": {"lat": -30.5595, "lon": 22.9375},
    "埃及": {"lat": 26.8206, "lon": 30.8025},
    "墨西哥": {"lat": 23.6345, "lon": -102.5528},
    "印度尼西亚": {"lat": -0.7893, "lon": 113.9213},
    "泰国": {"lat": 15.8700, "lon": 100.9925},
    "越南": {"lat": 14.0583, "lon": 108.2772},
    "西班牙": {"lat": 40.4637, "lon": -3.7492},
    "意大利": {"lat": 41.8719, "lon": 12.5674},
    "土耳其": {"lat": 38.9637, "lon": 35.2433},
    "肯尼亚": {"lat": -0.0236, "lon": 37.9062},
    "埃塞俄比亚": {"lat": 9.1450, "lon": 40.4897},
    "哥伦比亚": {"lat": 4.5709, "lon": -74.2973},
    "秘鲁": {"lat": -9.1900, "lon": -75.0152},
    "智利": {"lat": -35.6751, "lon": -71.5430},
    "新西兰": {"lat": -40.9006, "lon": 174.8860},
    "厄瓜多尔": {"lat": -1.8312, "lon": -78.1834},
    "菲律宾": {"lat": 12.8797, "lon": 121.7740}
}

TRANSPORT_MODES = ["sea", "air", "land_truck", "land_train"]

BASE_TRANSPORT_FACTORS = {
    "sea": 15,        # g CO2eq/tonne-km
    "air": 600,
    "land_truck": 75,
    "land_train": 30
}

# --- 新增：营养素定义和生成范围 ---
NUTRIENT_DEFINITIONS = {
    "energy_kcal": {"unit": "kcal", "range_by_category": {
        "fruit": (30, 100), "vegetable": (10, 80), "grain": (100, 380),
        "protein_meat": (100, 300), "protein_plant": (70, 200), "dairy": (40, 150), "other": (0, 600) # other 范围大，咖啡豆/茶叶能量低，坚果高
    }},
    "protein_g": {"unit": "g", "range_by_category": {
        "fruit": (0.1, 2), "vegetable": (0.5, 5), "grain": (2, 15),
        "protein_meat": (15, 30), "protein_plant": (5, 25), "dairy": (3, 10), "other": (0, 25) # 鸡蛋、坚果蛋白质高
    }},
    "fat_g": {"unit": "g", "range_by_category": {
        "fruit": (0.1, 1), "vegetable": (0.1, 1), "grain": (0.5, 5),
        "protein_meat": (2, 25), "protein_plant": (1, 15), "dairy": (0.5, 10), "other": (0, 50) # 坚果、可可豆脂肪高
    }},
    "carbohydrate_g": {"unit": "g", "range_by_category": {
        "fruit": (5, 25), "vegetable": (1, 15), "grain": (20, 80),
        "protein_meat": (0, 2), "protein_plant": (5, 30), "dairy": (3, 6), "other": (0, 60) # 糖、咖啡豆(处理后)
    }},
    "fiber_g": {"unit": "g", "range_by_category": {
        "fruit": (1, 5), "vegetable": (1, 7), "grain": (1, 15),
        "protein_meat": (0, 0.5), "protein_plant": (3, 15), "dairy": (0, 0.1), "other": (0, 10)
    }},
    "calcium_mg": {"unit": "mg", "range_by_category": {
        "fruit": (5, 50), "vegetable": (20, 200), "grain": (5, 100),
        "protein_meat": (5, 50), "protein_plant": (50, 300), "dairy": (100, 200), "other": (10, 150)
    }},
    "iron_mg": {"unit": "mg", "range_by_category": {
        "fruit": (0.1, 1), "vegetable": (0.5, 5), "grain": (0.5, 5),
        "protein_meat": (1, 5), "protein_plant": (2, 10), "dairy": (0, 0.2), "other": (0.1, 10)
    }}
}

# --- 数据生成主函数 ---
def generate_foods_with_routes_data():
    generated_foods_data = []
    country_names = list(COUNTRIES_DATA.keys())

    # 使用分类的食物名称
    current_food_selection = random.sample(ALL_FOOD_NAMES, min(NUM_FOODS_TO_GENERATE, len(ALL_FOOD_NAMES)))

    # 为 transport_factors.json 生成随机但一致的因子
    transport_factors_for_json = {
        mode: round(random.uniform(BASE_TRANSPORT_FACTORS[mode]*0.8, BASE_TRANSPORT_FACTORS[mode]*1.2), 2)
        for mode in TRANSPORT_MODES
    }

    for food_name in current_food_selection:
        production_co2 = 0
        if any(food_name in category_list for category_list in [FOOD_CATEGORIES["protein_meat"], FOOD_CATEGORIES["dairy"]]):
            production_co2 = round(random.uniform(2.0, 20.0), 2) # 肉类和乳制品生产碳排放较高
        elif any(food_name in category_list for category_list in [FOOD_CATEGORIES["protein_plant"], FOOD_CATEGORIES["grain"]]):
            production_co2 = round(random.uniform(0.5, 3.0), 2)
        else: # 水果蔬菜等
            production_co2 = round(random.uniform(0.1, 1.5), 2)

        food_item = {
            "name": food_name,
            "production_co2_per_kg": production_co2,
            "routes": []
        }

        num_origins_for_this_food = random.randint(NUM_ORIGINS_PER_FOOD_MIN, NUM_ORIGINS_PER_FOOD_MAX)
        possible_origins = random.sample(country_names, min(num_origins_for_this_food * 3, len(country_names))) # 多选一些以备用
        actual_origins = random.sample(possible_origins, min(num_origins_for_this_food, len(possible_origins)))

        for origin_country_name in actual_origins:
            origin_coords = COUNTRIES_DATA[origin_country_name]

            possible_destinations = [c for c in country_names if c != origin_country_name]
            if not possible_destinations:
                continue

            num_dests_for_this_origin = random.randint(NUM_DESTINATIONS_PER_ORIGIN_MIN, NUM_DESTINATIONS_PER_ORIGIN_MAX)
            actual_destinations = random.sample(possible_destinations, min(num_dests_for_this_origin, len(possible_destinations)))

            for dest_country_name in actual_destinations:
                dest_coords = COUNTRIES_DATA[dest_country_name]
                distance = haversine(origin_coords["lat"], origin_coords["lon"], dest_coords["lat"], dest_coords["lon"])
                transport_mode = random.choice(TRANSPORT_MODES)

                # 运输易腐食品（水果、部分蔬菜、乳制品、肉类）时，空运概率稍高
                if food_name in FOOD_CATEGORIES["fruit"] or \
                   food_name in ["西兰花", "菠菜", "生菜"] or \
                   food_name in FOOD_CATEGORIES["dairy"] or \
                   food_name in FOOD_CATEGORIES["protein_meat"]:
                    if random.random() < 0.15: # 15% 概率空运
                        transport_mode = "air"

                route = {
                    "origin_country": origin_country_name,
                    "origin_lat": origin_coords["lat"],
                    "origin_lon": origin_coords["lon"],
                    "destination_country": dest_country_name,
                    "destination_lat": dest_coords["lat"],
                    "destination_lon": dest_coords["lon"],
                    "distance_km": distance,
                    "transport_mode": transport_mode
                }
                food_item["routes"].append(route)

        if food_item["routes"]:
            generated_foods_data.append(food_item)

    return generated_foods_data, transport_factors_for_json

# --- 新增：生成食物营养和碳足迹数据 (food_nutrients_and_carbon.json) ---
def generate_food_nutrients_and_carbon_data(foods_with_routes, transport_factors):
    food_nutrients_data = []

    for food_from_routes in foods_with_routes:
        food_name = food_from_routes["name"]
        production_co2 = food_from_routes["production_co2_per_kg"]

        # 估算平均运输碳足迹
        avg_transport_co2 = 0
        if food_from_routes["routes"]:
            total_transport_co2_for_routes = 0
            for route in food_from_routes["routes"]:
                distance = route["distance_km"]
                mode = route["transport_mode"]
                factor = transport_factors.get(mode, BASE_TRANSPORT_FACTORS[mode]) # 获取一致的因子
                total_transport_co2_for_routes += (distance * factor) / 1000000 # kg CO2eq per kg food
            avg_transport_co2 = round(total_transport_co2_for_routes / len(food_from_routes["routes"]), 3)
        else: # 如果没有路线数据，给一个基于类型的随机值
            if any(food_name in category_list for category_list in [FOOD_CATEGORIES["protein_meat"], FOOD_CATEGORIES["dairy"], FOOD_CATEGORIES["fruit"]]):
                 avg_transport_co2 = round(random.uniform(0.2, 1.5), 3) # 易腐或高价值，运输碳排放可能较高
            else:
                 avg_transport_co2 = round(random.uniform(0.05, 0.5), 3)

        total_co2 = round(production_co2 + avg_transport_co2, 3)

        # 生成营养素
        nutrients = {}
        food_cat_assigned = "other" # 默认分类
        for cat, names in FOOD_CATEGORIES.items():
            if food_name in names:
                food_cat_assigned = cat
                break

        for nutrient, details in NUTRIENT_DEFINITIONS.items():
            val_range = details["range_by_category"].get(food_cat_assigned, (0,1)) # 获取该食物分类的营养素范围
            if nutrient == "energy_kcal":
                 nutrients[nutrient] = random.randint(int(val_range[0]), int(val_range[1]))
            elif nutrient in ["protein_g", "fat_g", "carbohydrate_g", "fiber_g"]:
                 nutrients[nutrient] = round(random.uniform(val_range[0], val_range[1]), 1)
            else: # mg 单位的
                 nutrients[nutrient] = round(random.uniform(val_range[0], val_range[1]), 2)

        # 消费环节浪费百分比 (为后续功能三准备)
        waste_percentage = 0.0
        if food_cat_assigned in ["fruit", "vegetable", "dairy"]:
            waste_percentage = round(random.uniform(0.15, 0.40), 2) # 15-40% 浪费
        elif food_cat_assigned in ["protein_meat"]:
            waste_percentage = round(random.uniform(0.10, 0.25), 2) # 10-25%
        else:
            waste_percentage = round(random.uniform(0.05, 0.15), 2) # 5-15%

        food_nutrients_data.append({
            "name": food_name,
            "category": food_cat_assigned,
            "production_co2_per_kg": production_co2,
            "average_transport_co2_per_kg": avg_transport_co2,
            "total_co2_per_kg": total_co2,
            "nutrients_per_100g": nutrients,
            "average_consumer_waste_percentage": waste_percentage
        })

    return food_nutrients_data

# --- 主执行函数 ---
def generate_all_data():
    if not os.path.exists(OUTPUT_DATA_DIR):
        os.makedirs(OUTPUT_DATA_DIR)
        print(f"Created directory: {OUTPUT_DATA_DIR}")
    else:
        print(f"Output directory already exists: {OUTPUT_DATA_DIR}")

    # 1. 生成 foods_with_routes.json 和 transport_factors.json
    foods_with_routes, transport_factors = generate_foods_with_routes_data()

    foods_file_path = os.path.join(OUTPUT_DATA_DIR, "foods_with_routes.json")
    with open(foods_file_path, 'w', encoding='utf-8') as f:
        json.dump(foods_with_routes, f, ensure_ascii=False, indent=4)
    print(f"Generated {foods_file_path} with {len(foods_with_routes)} food items.")

    factors_file_path = os.path.join(OUTPUT_DATA_DIR, "transport_factors.json")
    with open(factors_file_path, 'w', encoding='utf-8') as f:
        json.dump(transport_factors, f, ensure_ascii=False, indent=4)
    print(f"Generated {factors_file_path}")

    # 2. 生成 food_nutrients_and_carbon.json
    food_nutrients_carbon_data = generate_food_nutrients_and_carbon_data(foods_with_routes, transport_factors)
    nutrients_file_path = os.path.join(OUTPUT_DATA_DIR, "food_nutrients_and_carbon.json")
    with open(nutrients_file_path, 'w', encoding='utf-8') as f:
        json.dump(food_nutrients_carbon_data, f, ensure_ascii=False, indent=4)
    print(f"Generated {nutrients_file_path} with {len(food_nutrients_carbon_data)} food items.")

if __name__ == "__main__":
    generate_all_data()
    print(f"All data generation complete. Files saved in {os.path.abspath(OUTPUT_DATA_DIR)}")
