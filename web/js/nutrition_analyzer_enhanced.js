document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const nutrientSelect = document.getElementById('nutrient-select');
    const categoryFilterOptionsContainer = document.getElementById('category-filter-options');
    const chartCanvas = document.getElementById('nutrition-carbon-chart');
    const categoryChartCanvas = document.getElementById('category-comparison-chart');
    const treemapContainer = document.getElementById('food-treemap');
    const selectedFoodInfoPanel = document.getElementById('selected-food-info');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // 统计元素
    const totalFoodsElement = document.getElementById('total-foods');
    const avgCarbonElement = document.getElementById('avg-carbon');
    const bestEfficiencyElement = document.getElementById('best-efficiency');
    const selectedCategoriesElement = document.getElementById('selected-categories');

    // 数据和图表
    let allFoodData = [];
    let nutritionChart = null;
    let categoryChart = null;
    let treemapChart = null;
    const foodCategories = new Map();

    // 营养素单位和名称
    const NUTRIENT_UNITS = {
        "energy_kcal": "kcal",
        "protein_g": "g",
        "fat_g": "g",
        "carbohydrate_g": "g",
        "fiber_g": "g",
        "calcium_mg": "mg",
        "iron_mg": "mg"
    };
    
    const NUTRIENT_UNITS_FULL = {
        "energy_kcal": "能量",
        "protein_g": "蛋白质",
        "fat_g": "脂肪",
        "carbohydrate_g": "碳水化合物",
        "fiber_g": "膳食纤维",
        "calcium_mg": "钙",
        "iron_mg": "铁"
    };

    // 类别颜色
    const CATEGORY_COLORS = {
        "fruit": "#FF6B6B",
        "vegetable": "#4ECDC4",
        "grain": "#FFE66D",
        "protein_meat": "#FF8B94",
        "protein_plant": "#95E1D3",
        "dairy": "#A8E6CF",
        "other": "#C7CEEA"
    };

    const CATEGORY_NAMES = {
        "fruit": "🍎 水果",
        "vegetable": "🥬 蔬菜",
        "grain": "🌾 谷物",
        "protein_meat": "🥩 肉类",
        "protein_plant": "🌱 植物蛋白",
        "dairy": "🥛 乳制品",
        "other": "🍵 其他"
    };

    // 加载数据
    async function loadNutritionData() {
        showLoading(true);
        try {
            const response = await fetch('../data/food_nutrients_and_carbon.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allFoodData = await response.json();
            console.log("Food nutrition data loaded:", allFoodData);
            
            extractCategories();
            populateCategoryFilters();
            initAllCharts();
            updateAllVisualizations();
            updateStatistics();
        } catch (error) {
            console.error("Error loading nutrition data:", error);
            selectedFoodInfoPanel.innerHTML = `<p style="color: red;">营养数据加载失败: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }

    function showLoading(show) {
        loadingSpinner.style.display = show ? 'block' : 'none';
    }

    function extractCategories() {
        allFoodData.forEach(food => {
            if (food.category) {
                foodCategories.set(food.category, (foodCategories.get(food.category) || 0) + 1);
            }
        });
    }

    function populateCategoryFilters() {
        categoryFilterOptionsContainer.innerHTML = '';
        foodCategories.forEach((count, category) => {
            const checkboxId = `cat-${category}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.value = category;
            checkbox.checked = true;
            checkbox.className = 'category-checkbox';
            checkbox.addEventListener('change', updateAllVisualizations);

            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.className = 'category-label';
            label.textContent = `${CATEGORY_NAMES[category] || category} (${count})`;

            categoryFilterOptionsContainer.appendChild(checkbox);
            categoryFilterOptionsContainer.appendChild(label);
        });
    }

    // 初始化所有图表
    function initAllCharts() {
        initNutritionChart();
        initCategoryChart();
        initTreemap();
    }

    // 主营养效率图表
    function initNutritionChart() {
        const ctx = chartCanvas.getContext('2d');
        nutritionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '碳排放效率',
                    data: [],
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(75, 192, 192, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kg CO2eq / 单位营养素',
                            color: '#333',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: { display: false }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { autoSkip: false, color: '#555' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: '食物碳排放效率排名',
                        color: '#333',
                        font: { size: 18, weight: 'bold' },
                        padding: { bottom: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const foodItem = context.dataset.foodDetails[context.dataIndex];
                                if (!foodItem) return '';
                                return `${context.parsed.x.toFixed(4)} kg CO2eq / ${NUTRIENT_UNITS[nutrientSelect.value]}`;
                            },
                            afterLabel: function(context) {
                                const foodItem = context.dataset.foodDetails[context.dataIndex];
                                if (!foodItem) return '';
                                const nutrientVal = foodItem.nutrients_per_100g[nutrientSelect.value];
                                return [
                                    `类别: ${CATEGORY_NAMES[foodItem.category] || foodItem.category}`,
                                    `总碳排放: ${foodItem.total_co2_per_kg} kg CO2eq/kg`,
                                    `营养含量: ${nutrientVal} ${NUTRIENT_UNITS[nutrientSelect.value]}/100g`
                                ];
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const foodItem = nutritionChart.data.datasets[0].foodDetails[elements[0].index];
                        displayFoodInfo(foodItem);
                    }
                }
            }
        });
    }

    // 类别对比图表
    function initCategoryChart() {
        const ctx = categoryChartCanvas.getContext('2d');
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 15, font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: ${value.toFixed(3)} kg CO2eq/${NUTRIENT_UNITS[nutrientSelect.value]}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 树状图
    function initTreemap() {
        const ctx = document.createElement('canvas');
        treemapContainer.innerHTML = '';
        treemapContainer.appendChild(ctx);
        
        treemapChart = new Chart(ctx, {
            type: 'treemap',
            data: {
                datasets: [{
                    tree: [],
                    key: 'value',
                    groups: ['category'],
                    spacing: 1,
                    borderWidth: 2,
                    borderColor: 'white',
                    backgroundColor: (ctx) => {
                        if (ctx.type !== 'data') return 'transparent';
                        const category = ctx.raw._data.category;
                        return CATEGORY_COLORS[category] || '#999';
                    },
                    labels: {
                        display: true,
                        align: 'center',
                        position: 'middle',
                        formatter: (ctx) => {
                            if (ctx.type !== 'data') return '';
                            return ctx.raw._data.name;
                        },
                        color: 'white',
                        font: { size: 11 }
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => items[0].raw._data.name,
                            label: (item) => {
                                const data = item.raw._data;
                                return [
                                    `类别: ${CATEGORY_NAMES[data.category] || data.category}`,
                                    `总碳足迹: ${data.total_co2_per_kg} kg CO2eq/kg`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    // 更新所有可视化
    function updateAllVisualizations() {
        updateStatistics();
        updateNutritionChart();
        updateCategoryChart();
        updateTreemap();
    }

    // 更新统计信息
    function updateStatistics() {
        const selectedCategories = getSelectedCategories();
        const filteredData = filterDataByCategories(selectedCategories);
        
        totalFoodsElement.textContent = filteredData.length;
        selectedCategoriesElement.textContent = selectedCategories.length;
        
        if (filteredData.length > 0) {
            const avgCarbon = filteredData.reduce((sum, food) => sum + food.total_co2_per_kg, 0) / filteredData.length;
            avgCarbonElement.textContent = avgCarbon.toFixed(2);
            
            // 找出当前营养素下最高效的食物
            const nutrientKey = nutrientSelect.value;
            const efficiencyData = filteredData
                .filter(food => food.nutrients_per_100g[nutrientKey] > 0)
                .map(food => ({
                    name: food.name,
                    efficiency: food.total_co2_per_kg / (food.nutrients_per_100g[nutrientKey] * 10)
                }))
                .sort((a, b) => a.efficiency - b.efficiency);
            
            if (efficiencyData.length > 0) {
                bestEfficiencyElement.textContent = efficiencyData[0].name;
            } else {
                bestEfficiencyElement.textContent = '-';
            }
        } else {
            avgCarbonElement.textContent = '0';
            bestEfficiencyElement.textContent = '-';
        }
    }

    // 获取选中的类别
    function getSelectedCategories() {
        const selected = [];
        categoryFilterOptionsContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            selected.push(cb.value);
        });
        return selected;
    }

    // 根据类别过滤数据
    function filterDataByCategories(categories) {
        return allFoodData.filter(food => categories.includes(food.category));
    }

    // 更新主营养图表
    function updateNutritionChart() {
        if (!allFoodData.length || !nutritionChart) return;

        const selectedNutrientKey = nutrientSelect.value;
        const selectedCategories = getSelectedCategories();
        const filteredData = filterDataByCategories(selectedCategories);

        const chartData = filteredData
            .filter(food => food.nutrients_per_100g[selectedNutrientKey] > 0)
            .map(food => {
                const nutrientPerKg = food.nutrients_per_100g[selectedNutrientKey] * 10;
                return {
                    name: food.name,
                    value: food.total_co2_per_kg / nutrientPerKg,
                    details: food
                };
            })
            .sort((a, b) => a.value - b.value)
            .slice(0, 20);

        nutritionChart.data.labels = chartData.map(d => d.name);
        nutritionChart.data.datasets[0].data = chartData.map(d => d.value);
        nutritionChart.data.datasets[0].foodDetails = chartData.map(d => d.details);
        
        const nutrientName = NUTRIENT_UNITS_FULL[selectedNutrientKey];
        nutritionChart.options.scales.x.title.text = `kg CO2eq / ${NUTRIENT_UNITS[selectedNutrientKey]} ${nutrientName}`;
        nutritionChart.options.plugins.title.text = `${nutrientName}的碳排放效率 TOP 20`;
        
        nutritionChart.update();
    }

    // 更新类别对比图
    function updateCategoryChart() {
        if (!categoryChart) return;

        const selectedNutrientKey = nutrientSelect.value;
        const selectedCategories = getSelectedCategories();
        
        const categoryAverages = new Map();
        
        selectedCategories.forEach(category => {
            const categoryFoods = allFoodData.filter(food => 
                food.category === category && 
                food.nutrients_per_100g[selectedNutrientKey] > 0
            );
            
            if (categoryFoods.length > 0) {
                const avgEfficiency = categoryFoods.reduce((sum, food) => {
                    const nutrientPerKg = food.nutrients_per_100g[selectedNutrientKey] * 10;
                    return sum + (food.total_co2_per_kg / nutrientPerKg);
                }, 0) / categoryFoods.length;
                
                categoryAverages.set(category, avgEfficiency);
            }
        });

        const sortedCategories = Array.from(categoryAverages.entries())
            .sort((a, b) => a[1] - b[1]);

        categoryChart.data.labels = sortedCategories.map(([cat]) => CATEGORY_NAMES[cat] || cat);
        categoryChart.data.datasets[0].data = sortedCategories.map(([, avg]) => avg);
        categoryChart.data.datasets[0].backgroundColor = sortedCategories.map(([cat]) => CATEGORY_COLORS[cat] || '#999');
        
        categoryChart.update();
    }

    // 更新树状图
    function updateTreemap() {
        if (!treemapChart) return;

        const selectedCategories = getSelectedCategories();
        const filteredData = filterDataByCategories(selectedCategories);
        
        const treeData = filteredData.map(food => ({
            name: food.name,
            category: food.category,
            value: 1 / food.total_co2_per_kg, // 倒数表示效率
            _data: food
        }));

        treemapChart.data.datasets[0].tree = treeData;
        treemapChart.update();
    }

    // 显示食物详情
    function displayFoodInfo(foodItem) {
        if (!foodItem) {
            selectedFoodInfoPanel.innerHTML = '<h3>📋 详细信息</h3><p>请选择一个食物查看详情。</p>';
            return;
        }

        let html = `<h3>📋 ${foodItem.name} 详细信息</h3>`;
        html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">`;
        
        // 左侧：基本信息
        html += `<div>`;
        html += `<h4>🏷️ 基本信息</h4>`;
        html += `<p><strong>类别:</strong> ${CATEGORY_NAMES[foodItem.category] || foodItem.category}</p>`;
        html += `<p><strong>总碳排放:</strong> ${foodItem.total_co2_per_kg.toFixed(3)} kg CO2eq/kg</p>`;
        html += `<p><strong>生产碳排放:</strong> ${foodItem.production_co2_per_kg.toFixed(2)} kg CO2eq/kg</p>`;
        html += `<p><strong>运输碳排放:</strong> ${foodItem.average_transport_co2_per_kg.toFixed(3)} kg CO2eq/kg</p>`;
        html += `<p><strong>平均浪费率:</strong> ${(foodItem.average_consumer_waste_percentage * 100).toFixed(1)}%</p>`;
        html += `</div>`;
        
        // 右侧：营养成分
        html += `<div>`;
        html += `<h4>🥗 营养成分 (每100g)</h4>`;
        html += `<ul style="list-style: none; padding: 0;">`;
        for (const [key, value] of Object.entries(foodItem.nutrients_per_100g)) {
            const nutrientName = NUTRIENT_UNITS_FULL[key] || key;
            const unit = NUTRIENT_UNITS[key] || '';
            html += `<li><strong>${nutrientName}:</strong> ${value} ${unit}</li>`;
        }
        html += `</ul>`;
        html += `</div>`;
        html += `</div>`;
        
        selectedFoodInfoPanel.innerHTML = html;
    }

    // 事件监听器
    nutrientSelect.addEventListener('change', updateAllVisualizations);

    // 初始加载
    loadNutritionData();
}); 