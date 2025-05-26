document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const wasteInputsContainer = document.getElementById('waste-inputs-container');
    const calculateButton = document.getElementById('calculate-personal-waste');
    const resultsContainer = document.getElementById('results-container');
    const annualImpactResults = document.getElementById('annual-impact-results');
    const reductionSlider = document.getElementById('reduction-slider');
    const reductionPercentage = document.getElementById('reduction-percentage');
    const reductionImpact = document.getElementById('reduction-impact');
    
    // 图表画布
    const compositionCanvas = document.getElementById('waste-composition-chart');
    const wasteRateCanvas = document.getElementById('waste-rate-chart');
    const carbonImpactCanvas = document.getElementById('carbon-impact-chart');
    
    // 图表实例
    let compositionChart = null;
    let wasteRateChart = null;
    let carbonImpactChart = null;
    
    // 食物类别数据
    const FOOD_CATEGORIES = {
        '水果蔬菜': {
            icon: '🥬',
            wasteRate: 0.45,
            carbonPerKg: 0.5,
            color: '#4ECDC4'
        },
        '谷物面包': {
            icon: '🍞',
            wasteRate: 0.30,
            carbonPerKg: 1.2,
            color: '#FFE66D'
        },
        '肉类': {
            icon: '🥩',
            wasteRate: 0.20,
            carbonPerKg: 15.0,
            color: '#FF6B6B'
        },
        '乳制品': {
            icon: '🥛',
            wasteRate: 0.20,
            carbonPerKg: 3.5,
            color: '#A8E6CF'
        },
        '海鲜': {
            icon: '🐟',
            wasteRate: 0.35,
            carbonPerKg: 5.0,
            color: '#45B7D1'
        },
        '其他': {
            icon: '🍽️',
            wasteRate: 0.25,
            carbonPerKg: 2.0,
            color: '#C7CEEA'
        }
    };
    
    // 全球食物浪费数据
    const GLOBAL_WASTE_DATA = {
        totalWaste: 1300000000, // 吨/年
        totalCarbon: 3300000000, // 吨CO2eq/年
        wasteByStage: {
            '生产环节': 0.24,
            '处理储存': 0.24,
            '零售环节': 0.12,
            '消费环节': 0.40
        }
    };
    
    // 初始化
    function init() {
        createWasteInputs();
        initCharts();
        initEventListeners();
        updateCharts();
    }
    
    // 创建浪费输入框
    function createWasteInputs() {
        wasteInputsContainer.innerHTML = '';
        
        Object.entries(FOOD_CATEGORIES).forEach(([category, data]) => {
            const inputItem = document.createElement('div');
            inputItem.className = 'waste-input-item';
            inputItem.innerHTML = `
                <label>
                    <span style="font-size: 24px; margin-right: 8px;">${data.icon}</span>
                    ${category} (kg/周)
                </label>
                <input type="number" 
                       id="waste-${category}" 
                       min="0" 
                       step="0.1" 
                       value="0" 
                       placeholder="0.0">
            `;
            wasteInputsContainer.appendChild(inputItem);
        });
    }
    
    // 初始化事件监听器
    function initEventListeners() {
        calculateButton.addEventListener('click', calculatePersonalWaste);
        
        reductionSlider.addEventListener('input', (e) => {
            reductionPercentage.textContent = e.target.value + '%';
            updateReductionImpact();
        });
    }
    
    // 初始化所有图表
    function initCharts() {
        initCompositionChart();
        initWasteRateChart();
        initCarbonImpactChart();
    }
    
    // 浪费构成图
    function initCompositionChart() {
        const ctx = compositionCanvas.getContext('2d');
        compositionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(GLOBAL_WASTE_DATA.wasteByStage),
                datasets: [{
                    data: Object.values(GLOBAL_WASTE_DATA.wasteByStage).map(v => v * 100),
                    backgroundColor: [
                        '#FF6B6B',
                        '#4ECDC4',
                        '#45B7D1',
                        '#FECA57'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: { size: 14 }
                        }
                    },
                    title: {
                        display: true,
                        text: '全球食物浪费发生环节',
                        font: { size: 16 },
                        padding: 20
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: ${value.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 浪费率图表
    function initWasteRateChart() {
        const ctx = wasteRateCanvas.getContext('2d');
        const categories = Object.keys(FOOD_CATEGORIES);
        const wasteRates = categories.map(cat => FOOD_CATEGORIES[cat].wasteRate * 100);
        const colors = categories.map(cat => FOOD_CATEGORIES[cat].color);
        
        wasteRateChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: '浪费率 (%)',
                    data: wasteRates,
                    backgroundColor: colors.map(c => c + '80'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 50,
                        title: {
                            display: true,
                            text: '浪费率 (%)',
                            font: { size: 14 }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `浪费率: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 碳足迹影响图表
    function initCarbonImpactChart() {
        const ctx = carbonImpactCanvas.getContext('2d');
        const categories = Object.keys(FOOD_CATEGORIES);
        const carbonImpacts = categories.map(cat => {
            const data = FOOD_CATEGORIES[cat];
            return data.wasteRate * data.carbonPerKg * 100; // 相对影响值
        });
        
        carbonImpactChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: categories,
                datasets: [{
                    label: '碳足迹影响指数',
                    data: carbonImpacts,
                    backgroundColor: 'rgba(255, 107, 107, 0.2)',
                    borderColor: 'rgba(255, 107, 107, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(255, 107, 107, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(255, 107, 107, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                scales: {
                    r: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '影响指数'
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `影响指数: ${context.parsed.r.toFixed(1)}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 计算个人浪费
    function calculatePersonalWaste() {
        let totalWasteKg = 0;
        let totalCarbonKg = 0;
        const wasteDetails = {};
        
        Object.entries(FOOD_CATEGORIES).forEach(([category, data]) => {
            const input = document.getElementById(`waste-${category}`);
            const weeklyWaste = parseFloat(input.value) || 0;
            const yearlyWaste = weeklyWaste * 52;
            const carbonEmission = yearlyWaste * data.carbonPerKg;
            
            totalWasteKg += yearlyWaste;
            totalCarbonKg += carbonEmission;
            
            if (yearlyWaste > 0) {
                wasteDetails[category] = {
                    waste: yearlyWaste,
                    carbon: carbonEmission
                };
            }
        });
        
        // 显示结果
        displayResults(totalWasteKg, totalCarbonKg, wasteDetails);
        resultsContainer.style.display = 'grid';
        
        // 滚动到结果区域
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // 显示结果
    function displayResults(totalWaste, totalCarbon, details) {
        let detailsHtml = '<ul style="list-style: none; padding: 0;">';
        
        Object.entries(details).forEach(([category, data]) => {
            detailsHtml += `
                <li style="margin-bottom: 10px;">
                    <strong>${FOOD_CATEGORIES[category].icon} ${category}:</strong> 
                    ${data.waste.toFixed(1)} kg/年 
                    (${data.carbon.toFixed(1)} kg CO₂)
                </li>
            `;
        });
        
        detailsHtml += '</ul>';
        
        annualImpactResults.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p style="font-size: 24px; margin-bottom: 10px;">
                    <strong>总浪费量:</strong> 
                    <span style="color: #ff6b6b;">${totalWaste.toFixed(1)} kg/年</span>
                </p>
                <p style="font-size: 24px;">
                    <strong>碳排放量:</strong> 
                    <span style="color: #ff6b6b;">${(totalCarbon / 1000).toFixed(2)} 吨 CO₂/年</span>
                </p>
            </div>
            <div style="margin-bottom: 20px;">
                <p><strong>相当于:</strong></p>
                <ul style="margin-left: 20px;">
                    <li>🚗 开车 ${Math.round(totalCarbon / 0.12).toLocaleString()} 公里</li>
                    <li>🌳 需要 ${Math.ceil(totalCarbon / 21)} 棵树来吸收</li>
                    <li>💡 点亮100瓦灯泡 ${Math.round(totalCarbon / 0.4).toLocaleString()} 小时</li>
                </ul>
            </div>
            <div>
                <p><strong>分类明细:</strong></p>
                ${detailsHtml}
            </div>
        `;
        
        // 保存当前数据用于减少计算
        window.currentWasteData = {
            totalWaste,
            totalCarbon
        };
        
        updateReductionImpact();
    }
    
    // 更新减少影响
    function updateReductionImpact() {
        if (!window.currentWasteData) return;
        
        const reductionPercent = parseFloat(reductionSlider.value) / 100;
        const { totalWaste, totalCarbon } = window.currentWasteData;
        
        const reducedWaste = totalWaste * reductionPercent;
        const reducedCarbon = totalCarbon * reductionPercent;
        
        reductionImpact.innerHTML = `
            <p style="color: #27ae60; font-size: 18px;">
                <strong>您可以减少:</strong>
            </p>
            <ul style="list-style: none; padding: 0;">
                <li>🗑️ ${reducedWaste.toFixed(1)} kg 食物浪费/年</li>
                <li>💨 ${(reducedCarbon / 1000).toFixed(2)} 吨 CO₂ 排放/年</li>
                <li>💰 节省约 ¥${Math.round(reducedWaste * 15)} /年</li>
            </ul>
        `;
    }
    
    // 更新图表
    function updateCharts() {
        // 图表已在初始化时填充了数据
        // 这里可以添加动态更新逻辑
    }
    
    // 初始化
    init();
}); 