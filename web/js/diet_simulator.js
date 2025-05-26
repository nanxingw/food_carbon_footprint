document.addEventListener('DOMContentLoaded', () => {
    const dietChartCanvas = document.getElementById('diet-carbon-chart');
    const dietInfoPanel = document.getElementById('diet-info-panel');
    const dietRadioButtons = document.querySelectorAll('input[name="diet-type"]');
    const consumptionInfoDiv = document.getElementById('selected-category-consumption-info');
    const dietConsumptionChartCanvas = document.getElementById('diet-consumption-chart');

    let foodCarbonData = [];
    let dietComparisonChart = null;
    let dietCompositionChart = null;
    let dietConsumptionQuantityChart = null;

    // --- 1. Define Food Category Mappings (from data category to broader diet categories) ---
    // This mapping helps group detailed food items into broader categories used in diet definitions.
    // KEY: category string from food_nutrients_and_carbon.json
    // VALUE: broader diet category string
    const CATEGORY_MAPPING = {
        // Meats
        '牛肉': '红肉',
        '猪肉': '红肉',
        '羊肉': '红肉',
        '禽肉': '禽肉',
        '鱼类': '鱼类及海鲜',
        '海鲜': '鱼类及海鲜',
        // Dairy & Eggs
        '乳制品': '乳制品',
        '奶酪': '乳制品', // Assuming cheese is a dairy product
        '鸡蛋': '蛋类',
        // Plant-based proteins
        '豆类': '豆类及坚果',
        '坚果': '豆类及坚果',
        '豆腐': '豆类及坚果',
        // Grains & Starchy
        '谷物': '谷物',
        '米饭': '谷物',
        '面食': '谷物',
        '土豆': '淀粉类蔬菜',
        // Fruits & Vegetables
        '蔬菜': '蔬菜',
        '绿叶蔬菜': '蔬菜',
        '根茎蔬菜': '蔬菜',
        '水果': '水果',
        '浆果': '水果',
        // Others
        '糖和甜品': '其他',
        '植物油': '其他',
    };

    // --- 2. Define Diet Structures (Annual consumption in kg/person/year) ---
    // These are illustrative and simplified values.
    const DIET_STRUCTURES = {
        high_meat: {
            name: '高肉食饮食',
            color: 'rgba(211, 47, 47, 0.8)', // Red
            annual_consumption_kg: {
                '红肉': 70,
                '禽肉': 30,
                '鱼类及海鲜': 15,
                '乳制品': 150,
                '蛋类': 12,
                '谷物': 100,
                '豆类及坚果': 10,
                '淀粉类蔬菜': 50, 
                '蔬菜': 100,
                '水果': 80,
                '其他': 20,
            }
        },
        balanced: {
            name: '均衡饮食',
            color: 'rgba(76, 175, 80, 0.8)', // Green
            annual_consumption_kg: {
                '红肉': 25,
                '禽肉': 25,
                '鱼类及海鲜': 25,
                '乳制品': 180,
                '蛋类': 13,
                '谷物': 120,
                '豆类及坚果': 30,
                '淀粉类蔬菜': 60,
                '蔬菜': 150,
                '水果': 110,
                '其他': 15,
            }
        },
        vegetarian: {
            name: '素食饮食 (含蛋奶)',
            color: 'rgba(173, 223, 173, 0.8)', // Updated to Light Green
            annual_consumption_kg: {
                '红肉': 0,
                '禽肉': 0,
                '鱼类及海鲜': 0,
                '乳制品': 200,
                '蛋类': 15,
                '谷物': 130,
                '豆类及坚果': 50,
                '淀粉类蔬菜': 70,
                '蔬菜': 200,
                '水果': 150,
                '其他': 10,
            }
        },
        vegan: {
            name: '纯素饮食',
            color: 'rgba(33, 150, 243, 0.8)', // Blue
            annual_consumption_kg: {
                '红肉': 0,
                '禽肉': 0,
                '鱼类及海鲜': 0,
                '乳制品': 0, // Or plant-based alternatives, but their footprint varies widely
                '蛋类': 0,
                '谷物': 140,
                '豆类及坚果': 70,
                '淀粉类蔬菜': 80,
                '蔬菜': 250,
                '水果': 180,
                '其他': 5,
            }
        }
    };

    // --- 3. Load Food Carbon Data ---
    async function loadFoodData() {
        try {
            const response = await fetch('../data/food_nutrients_and_carbon.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            foodCarbonData = await response.json();
            console.log("Food carbon data for diet simulator loaded:", foodCarbonData);
            calculateAndDisplayDiets();
        } catch (error) {
            console.error("Error loading food carbon data:", error);
            dietInfoPanel.innerHTML = `<p style="color: red;">食物碳排放数据加载失败: ${error.message}。请确保 data/food_nutrients_and_carbon.json 文件存在且可访问。</p>`;
        }
    }

    // --- 4. Calculate Average Carbon Footprint for Broad Diet Categories ---
    function getAverageCarbonFootprints() {
        const averageFootprints = {};
        const categoryCounts = {};

        foodCarbonData.forEach(food => {
            const mappedCategory = CATEGORY_MAPPING[food.category] || '其他'; // Default to '其他' if not mapped
            const carbonPerKg = parseFloat(food.total_co2_per_kg);

            if (!isNaN(carbonPerKg)) {
                averageFootprints[mappedCategory] = (averageFootprints[mappedCategory] || 0) + carbonPerKg;
                categoryCounts[mappedCategory] = (categoryCounts[mappedCategory] || 0) + 1;
            }
        });

        for (const category in averageFootprints) {
            if (categoryCounts[category] > 0) {
                averageFootprints[category] = averageFootprints[category] / categoryCounts[category];
            }
        }
        console.log("Average footprints per category:", averageFootprints);
        return averageFootprints;
    }

    // --- 5. Calculate Total Carbon Footprint for Each Diet ---
    function calculateDietFootprints(averageCarbonFootprints) {
        const dietResults = [];
        for (const dietKey in DIET_STRUCTURES) {
            const diet = DIET_STRUCTURES[dietKey];
            let totalAnnualFootprint = 0;
            for (const foodCategory in diet.annual_consumption_kg) {
                const consumptionKg = diet.annual_consumption_kg[foodCategory];
                const avgFootprintPerKg = averageCarbonFootprints[foodCategory] || 0; // Assume 0 if category not in avg footprints
                totalAnnualFootprint += consumptionKg * avgFootprintPerKg;
            }
            dietResults.push({
                name: diet.name,
                totalFootprint: totalAnnualFootprint, // kg CO2eq/person/year
                color: diet.color
            });
        }
        console.log("Calculated diet footprints:", dietResults);
        return dietResults.sort((a, b) => a.totalFootprint - b.totalFootprint); // Sort for consistent display
    }

    // --- 6. Initialize and Update Chart ---
    function initOrUpdateChart(dietFootprintResults) {
        const labels = dietFootprintResults.map(d => d.name);
        const data = dietFootprintResults.map(d => d.totalFootprint.toFixed(0)); // Round to integer for display
        const backgroundColors = dietFootprintResults.map(d => d.color);

        if (dietComparisonChart) {
            dietComparisonChart.data.labels = labels;
            dietComparisonChart.data.datasets[0].data = data;
            dietComparisonChart.data.datasets[0].backgroundColor = backgroundColors;
            dietComparisonChart.data.datasets[0].borderColor = backgroundColors.map(color => color.replace('0.8', '1')); // Make border solid
            dietComparisonChart.update();
        } else {
            const ctx = dietChartCanvas.getContext('2d');
            dietComparisonChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '估算年度碳足迹 (kg CO2eq/人/年)',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
                        borderWidth: 1,
                        borderRadius: 5,
                        hoverBackgroundColor: backgroundColors.map(color => color.replace('0.8', '1'))
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', // Easier to read diet names
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '估算年度碳足迹 (kg CO2eq/人/年)',
                                color: '#333',
                                font: { size: 14, weight: 'bold' }
                            },
                            grid: { display: false },
                            border: { display: true, color: '#ccc' },
                            ticks: { color: '#555' }
                        },
                        y: {
                            grid: { display: false },
                            border: { display: true, color: '#ccc' },
                            ticks: { color: '#555', font: {size: 12} }
                        }
                    },
                    plugins: {
                        legend: {
                           display: false // Dataset label is descriptive enough
                        },
                        title: {
                            display: true,
                            text: '不同饮食结构年度碳足迹对比',
                            color: '#333',
                            font: { size: 18, weight: 'bold' },
                            padding: { top: 10, bottom: 20 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.x !== null) {
                                        label += `${parseFloat(context.parsed.x).toLocaleString()} kg CO2eq`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
        // Update info panel based on the initially selected diet (or first one)
        const selectedDietValue = document.querySelector('input[name="diet-type"]:checked').value;
        updateInfoPanel(selectedDietValue, dietFootprintResults);
        // Also initialize the composition chart for the default selected diet
        const averageCarbonFootprints = getAverageCarbonFootprints(); // Make sure these are available
        initOrUpdateCompositionChart(selectedDietValue, averageCarbonFootprints);
        initOrUpdateConsumptionQuantityChart(selectedDietValue);
    }
    
    // --- 6.5 Initialize or Update Diet Composition Pie Chart ---
    function initOrUpdateCompositionChart(selectedDietKey, averageCarbonFootprints) {
        const selectedDietStructure = DIET_STRUCTURES[selectedDietKey];
        if (!selectedDietStructure) return;

        const compositionData = [];
        const compositionLabels = [];
        let totalDietFootprintForComposition = 0;

        for (const foodCategory in selectedDietStructure.annual_consumption_kg) {
            const consumptionKg = selectedDietStructure.annual_consumption_kg[foodCategory];
            const avgFootprintPerKg = averageCarbonFootprints[foodCategory] || 0;
            const categoryFootprint = consumptionKg * avgFootprintPerKg;

            if (categoryFootprint > 0) { // Only include categories with non-zero footprint contribution
                compositionLabels.push(foodCategory);
                compositionData.push(categoryFootprint.toFixed(0));
                totalDietFootprintForComposition += categoryFootprint;
            }
        }
        
        // Sort by footprint to make the bar chart more readable (e.g., highest to lowest)
        const sortedComposition = compositionLabels.map((label, index) => ({
            label: label,
            value: parseFloat(compositionData[index])
        })).sort((a, b) => b.value - a.value);

        const sortedLabels = sortedComposition.map(item => item.label);
        const sortedData = sortedComposition.map(item => item.value);

        const compositionCtx = document.getElementById('diet-composition-chart').getContext('2d');
        const barChartColor = 'rgba(75, 192, 192, 0.7)'; // Teal color for bars

        if (dietCompositionChart) {
            dietCompositionChart.data.labels = sortedLabels;
            dietCompositionChart.data.datasets[0].data = sortedData;
            dietCompositionChart.options.plugins.title.text = `${selectedDietStructure.name} - 碳足迹构成 (估算总计: ${totalDietFootprintForComposition.toFixed(0)} kg CO2eq/年)`;
            dietCompositionChart.update();
        } else {
            dietCompositionChart = new Chart(compositionCtx, {
                type: 'bar', 
                data: {
                    labels: sortedLabels,
                    datasets: [{
                        label: '各类食物碳足迹贡献 (kg CO2eq/年)',
                        data: sortedData,
                        backgroundColor: barChartColor,
                        borderColor: barChartColor.replace('0.7','1'),
                        borderWidth: 1,
                        borderRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', 
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '碳足迹贡献 (kg CO2eq/年)',
                                color: '#333',
                                font: { size: 12 }
                            },
                            grid: { display: false },
                            border: { display: true, color: '#ccc' },
                            ticks: { color: '#555' }
                        },
                        y: {
                            grid: { display: false },
                            border: { display: true, color: '#ccc' },
                            ticks: { color: '#555', font: {size: 11} }
                        }
                    },
                    plugins: {
                        legend: {
                           display: false // Usually not needed for single dataset bar chart
                        },
                        title: {
                            display: true,
                            text: `${selectedDietStructure.name} - 碳足迹构成 (估算总计: ${totalDietFootprintForComposition.toFixed(0)} kg CO2eq/年)`,
                            color: '#333',
                            font: { size: 16, weight: 'bold' },
                            padding: { top: 10, bottom: 15 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    // For horizontal bar chart, value is on x-axis
                                    if (context.parsed.x !== null) {
                                        label += `${parseFloat(context.parsed.x).toLocaleString()} kg CO2eq`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // --- 6.6 Initialize or Update Diet Consumption Quantity Bar Chart ---
    function initOrUpdateConsumptionQuantityChart(selectedDietKey) {
        const selectedDietStructure = DIET_STRUCTURES[selectedDietKey];
        if (!selectedDietStructure || !dietConsumptionChartCanvas) return;

        const consumptionLabels = [];
        const consumptionData = [];

        for (const foodCategory in selectedDietStructure.annual_consumption_kg) {
            const consumptionKg = selectedDietStructure.annual_consumption_kg[foodCategory];
            if (consumptionKg > 0) { // Only include categories with actual consumption
                consumptionLabels.push(foodCategory);
                consumptionData.push(consumptionKg);
            }
        }

        // Sort by consumption to make the bar chart more readable (e.g., highest to lowest)
        const sortedConsumption = consumptionLabels.map((label, index) => ({
            label: label,
            value: parseFloat(consumptionData[index])
        })).sort((a, b) => b.value - a.value);

        const sortedLabels = sortedConsumption.map(item => item.label);
        const sortedValues = sortedConsumption.map(item => item.value);

        const barChartColor = 'rgba(33, 150, 243, 0.7)'; // Using a blue for this chart

        if (dietConsumptionQuantityChart) {
            dietConsumptionQuantityChart.data.labels = sortedLabels;
            dietConsumptionQuantityChart.data.datasets[0].data = sortedValues;
            dietConsumptionQuantityChart.options.plugins.title.text = `${selectedDietStructure.name} - 年消费量估算`;
            dietConsumptionQuantityChart.update();
        } else {
            const ctx = dietConsumptionChartCanvas.getContext('2d');
            dietConsumptionQuantityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedLabels,
                    datasets: [{
                        label: '年估算消费量 (kg)',
                        data: sortedValues,
                        backgroundColor: barChartColor,
                        borderColor: barChartColor.replace('0.7', '1'),
                        borderWidth: 1,
                        borderRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', 
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '年估算消费量 (kg)',
                                color: '#333',
                                font: { size: 12 }
                            },
                            grid: { display: false },
                            border: { display: true, color: '#ccc' },
                            ticks: { color: '#555' }
                        },
                        y: {
                            grid: { display: false },
                            border: { display: true, color: '#ccc' },
                            ticks: { color: '#555', font: {size: 11} }
                        }
                    },
                    plugins: {
                        legend: {
                           display: false 
                        },
                        title: {
                            display: true,
                            text: `${selectedDietStructure.name} - 年消费量估算`,
                            color: '#333',
                            font: { size: 16, weight: 'bold' },
                            padding: { top: 10, bottom: 15 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) { label += ': '; }
                                    if (context.parsed.x !== null) {
                                        label += `${parseFloat(context.parsed.x).toLocaleString()} kg`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    function calculateAndDisplayDiets(){
        const averageCarbonFootprints = getAverageCarbonFootprints();
        if (Object.keys(averageCarbonFootprints).length === 0) {
            dietInfoPanel.innerHTML = '<p style="color: orange;">未能计算食物类别的平均碳足迹，请检查食物数据和类别映射。</p>';
            return;
        }
        const dietFootprintResults = calculateDietFootprints(averageCarbonFootprints);
        initOrUpdateChart(dietFootprintResults);
    }

    // --- 7. Event Listeners and Info Panel Update ---
    dietRadioButtons.forEach(radio => {
        radio.addEventListener('change', (event) => {
            // The chart now shows all diets, so we mainly update the info panel.
            // If we wanted to highlight selected, we'd do more here.
            const averageCarbonFootprints = getAverageCarbonFootprints(); // Recalculate for safety, though could be cached
            const dietFootprintResults = calculateDietFootprints(averageCarbonFootprints);
            updateInfoPanel(event.target.value, dietFootprintResults);
            initOrUpdateCompositionChart(event.target.value, averageCarbonFootprints);
            initOrUpdateConsumptionQuantityChart(event.target.value);
        });
    });

    function updateInfoPanel(selectedDietKey, dietFootprintResults) {
        const selectedDietData = DIET_STRUCTURES[selectedDietKey];
        const selectedDietResult = dietFootprintResults.find(d => d.name === selectedDietData.name);

        if (selectedDietData && selectedDietResult) {
            let html = `<h3>${selectedDietData.name}</h3>`;
            html += `<p>估算年度总碳足迹: <strong>${selectedDietResult.totalFootprint.toFixed(0)} kg CO2eq/人/年</strong></p>`;
            html += `<p class="small-text" style="margin-top:15px;"><em>注意: 所有数值均为基于通用食物类别和平均消费量的估算，实际碳足迹会因具体食物选择、来源地、加工方式等多种因素而异。图表仅显示对碳足迹有贡献的食物类别。</em></p>`;
            dietInfoPanel.innerHTML = html;
        } else {
            dietInfoPanel.innerHTML = '<p>请选择一个饮食结构查看详情。</p>';
        }
        // Also initialize/update the new consumption quantity chart for the default selected diet
        const averageCarbonFootprints = getAverageCarbonFootprints(); 
        initOrUpdateCompositionChart(selectedDietKey, averageCarbonFootprints);
        initOrUpdateConsumptionQuantityChart(selectedDietKey);
    }

    // --- Initial Load ---
    loadFoodData(); 
}); 