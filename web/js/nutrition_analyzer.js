document.addEventListener('DOMContentLoaded', () => {
    const nutrientSelect = document.getElementById('nutrient-select');
    const categoryFilterOptionsContainer = document.getElementById('category-filter-options');
    const updateChartButton = document.getElementById('update-chart-button');
    const chartCanvas = document.getElementById('nutrition-carbon-chart');
    const selectedFoodInfoPanel = document.getElementById('selected-food-info');

    let allFoodData = [];
    let nutritionChart = null;
    const foodCategories = new Set();

    // --- Load Data ---
    async function loadNutritionData() {
        try {
            const response = await fetch('../data/food_nutrients_and_carbon.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allFoodData = await response.json();
            console.log("Food nutrition data loaded:", allFoodData);
            extractCategories();
            populateCategoryFilters();
            initNutritionChart();
            updateNutritionChart(); // Initial chart draw
        } catch (error) {
            console.error("Error loading nutrition data:", error);
            if (chartCanvas.parentNode) {
                chartCanvas.parentNode.innerHTML = `<p style="color: red;">营养数据加载失败: ${error.message}。请确保 data/food_nutrients_and_carbon.json 文件存在且可访问。</p>`;
            }
        }
    }

    function extractCategories() {
        allFoodData.forEach(food => {
            if (food.category) {
                foodCategories.add(food.category);
            }
        });
    }

    function populateCategoryFilters() {
        foodCategories.forEach(category => {
            const checkboxId = `cat-${category}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.value = category;
            checkbox.checked = true; // Default to all selected

            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = category;
            label.style.marginRight = '10px';
            label.style.marginLeft = '3px';

            categoryFilterOptionsContainer.appendChild(checkbox);
            categoryFilterOptionsContainer.appendChild(label);
        });
    }

    // --- Initialize Chart ---
    function initNutritionChart() {
        const ctx = chartCanvas.getContext('2d');
        nutritionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [], // Food names
                datasets: [{
                    label: '单位营养素的碳排放量',
                    data: [], // Calculated values
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', // Updated to Teal
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    borderRadius: 5, // Rounded bars
                    hoverBackgroundColor: 'rgba(75, 192, 192, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Display food names on Y-axis for better readability
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kg CO2eq / 单位营养素', // Placeholder, will be updated
                            color: '#333',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false // Remove X-axis grid lines
                        },
                        border: {
                            display: true,
                            color: '#ccc' // X-axis line color
                        },
                        ticks: {
                            color: '#555' // X-axis labels color
                        }
                    },
                    y: {
                        grid: {
                            display: false // Remove Y-axis grid lines
                        },
                        border: {
                            display: true,
                            color: '#ccc' // Y-axis line color
                        },
                        ticks: {
                            autoSkip: false, // Ensure all labels are shown if possible
                            color: '#555' // Y-axis labels color
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#333',
                            font: {
                                size: 14
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: '食物碳排放效率对比', // Placeholder
                        color: '#333',
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20 // Add more padding to the title
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const foodItem = context.dataset.foodDetails[context.dataIndex];
                                if (!foodItem) return '';
                                const selectedNutrientKey = nutrientSelect.value;
                                const nutrientInfo = foodItem.nutrients_per_100g[selectedNutrientKey];
                                const nutrientUnit = NUTRIENT_UNITS[selectedNutrientKey] || '';
                                
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.x !== null) {
                                    label += `${context.parsed.x.toFixed(4)} kg CO2eq / ${nutrientUnit}`;
                                }
                                return label;
                            },
                            afterLabel: function(context) {
                                const foodItem = context.dataset.foodDetails[context.dataIndex];
                                if (!foodItem) return '';
                                const selectedNutrientKey = nutrientSelect.value;
                                const nutrientVal = foodItem.nutrients_per_100g[selectedNutrientKey];
                                const nutrientUnitLabel = NUTRIENT_UNITS_FULL[selectedNutrientKey] || selectedNutrientKey;
                                
                                return [
                                    `食物: ${foodItem.name}`,
                                    `总碳排放: ${foodItem.total_co2_per_kg} kg CO2eq/kg 食物`,
                                    `${nutrientUnitLabel}: ${nutrientVal} ${NUTRIENT_UNITS[selectedNutrientKey]}/100g 食物`
                                ];
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const chartElement = elements[0];
                        const foodItem = nutritionChart.data.datasets[chartElement.datasetIndex].foodDetails[chartElement.index];
                        displayFoodInfo(foodItem);
                    }
                }
            }
        });
    }
    
    // Helper for units in tooltips and labels
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

    // --- Update Chart Logic ---
    function updateNutritionChart() {
        if (!allFoodData.length || !nutritionChart) return;

        const selectedNutrientKey = nutrientSelect.value;
        const selectedNutrientUnit = NUTRIENT_UNITS[selectedNutrientKey] || '';
        const selectedNutrientFullName = NUTRIENT_UNITS_FULL[selectedNutrientKey] || selectedNutrientKey;

        const selectedCategories = [];
        categoryFilterOptionsContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            selectedCategories.push(cb.value);
        });

        const filteredData = allFoodData.filter(food => {
            return selectedCategories.includes(food.category) && 
                   food.nutrients_per_100g && 
                   food.nutrients_per_100g[selectedNutrientKey] !== undefined &&
                   parseFloat(food.nutrients_per_100g[selectedNutrientKey]) > 0; // Ensure nutrient value is positive
        });

        const chartData = filteredData.map(food => {
            const totalCo2PerKg = parseFloat(food.total_co2_per_kg);
            const nutrientAmountPer100g = parseFloat(food.nutrients_per_100g[selectedNutrientKey]);
            
            // Convert nutrient_amount_per_100g to nutrient_amount_per_kg
            const nutrientAmountPerKg = nutrientAmountPer100g * 10;
            
            let carbonPerNutrientUnit = Infinity; // Default for cases where nutrientAmountPerKg is 0
            if (nutrientAmountPerKg > 0) {
                carbonPerNutrientUnit = totalCo2PerKg / nutrientAmountPerKg;
            }
            
            return {
                name: food.name,
                value: carbonPerNutrientUnit,
                details: food // Store full food details for tooltip/info panel
            };
        }).sort((a, b) => a.value - b.value); // Sort by ascending carbon efficiency
        
        // Limit number of items displayed for clarity, e.g., top 20
        const topN = 20;
        const displayData = chartData.filter(d => d.value !== Infinity).slice(0, topN);

        nutritionChart.data.labels = displayData.map(d => d.name);
        nutritionChart.data.datasets[0].data = displayData.map(d => d.value);
        nutritionChart.data.datasets[0].foodDetails = displayData.map(d => d.details); // Pass details to dataset
        nutritionChart.data.datasets[0].label = `kg CO2eq / ${selectedNutrientUnit} ${selectedNutrientFullName}`;
        
        nutritionChart.options.scales.x.title.text = `kg CO2eq / ${selectedNutrientUnit} ${selectedNutrientFullName}`;
        nutritionChart.options.plugins.title.text = `${selectedNutrientFullName}的碳排放效率对比 (越低越高效)`;
        nutritionChart.update();

        if (displayData.length === 0) {
            selectedFoodInfoPanel.innerHTML = '<p>没有找到符合当前筛选条件且含有该营养素的食物数据。</p>';
        } else {
            selectedFoodInfoPanel.innerHTML = '<p>点击或将鼠标悬停在图表中的食物条上以查看详细信息。</p>';
        }
    }

    function displayFoodInfo(foodItem) {
        if (!foodItem) {
            selectedFoodInfoPanel.innerHTML = '<p>请选择一个食物查看详情。</p>';
            return;
        }
        const selectedNutrientKey = nutrientSelect.value;
        const nutrientVal = foodItem.nutrients_per_100g[selectedNutrientKey];
        const nutrientUnitLabel = NUTRIENT_UNITS_FULL[selectedNutrientKey] || selectedNutrientKey;
        const nutrientDisplayUnit = NUTRIENT_UNITS[selectedNutrientKey] || '';

        let html = `<h3>${foodItem.name} (${foodItem.category})</h3>`;
        html += `<p><strong>总碳排放:</strong> ${foodItem.total_co2_per_kg.toFixed(3)} kg CO2eq/kg 食物</p>`;
        html += `<p><strong>生产碳排放:</strong> ${foodItem.production_co2_per_kg.toFixed(2)} kg CO2eq/kg</p>`;
        html += `<p><strong>平均运输碳排放:</strong> ${foodItem.average_transport_co2_per_kg.toFixed(3)} kg CO2eq/kg</p>`;
        html += `<p><strong>所选营养素 (${nutrientUnitLabel}):</strong> ${nutrientVal} ${nutrientDisplayUnit}/100g 食物</p>`;
        html += `<h4>完整营养成分 (每100g):</h4><ul>`;
        for (const [key, value] of Object.entries(foodItem.nutrients_per_100g)) {
            html += `<li><strong>${NUTRIENT_UNITS_FULL[key] || key}:</strong> ${value} ${NUTRIENT_UNITS[key] || ''}</li>`;
        }
        html += `</ul>`;
        selectedFoodInfoPanel.innerHTML = html;
    }

    // --- Event Listeners ---
    nutrientSelect.addEventListener('change', updateNutritionChart);
    updateChartButton.addEventListener('click', updateNutritionChart);
    // Dynamic checkboxes don't need individual listeners if we read them on update

    // --- Initial Load ---
    loadNutritionData();
}); 