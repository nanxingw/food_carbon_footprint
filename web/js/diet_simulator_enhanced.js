document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const dietCards = document.querySelectorAll('.diet-card');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // 统计元素
    const annualCarbonElement = document.getElementById('annual-carbon');
    const dailyCarbonElement = document.getElementById('daily-carbon');
    const treesNeededElement = document.getElementById('trees-needed');
    const carEquivalentElement = document.getElementById('car-equivalent');
    const carbonChangeElement = document.getElementById('carbon-change');
    
    // 图表画布
    const compositionCanvas = document.getElementById('diet-composition-chart');
    const consumptionCanvas = document.getElementById('diet-consumption-chart');
    const comparisonCanvas = document.getElementById('diet-comparison-chart');
    const impactCanvas = document.getElementById('diet-impact-chart');
    
    // 图表实例
    let compositionChart = null;
    let consumptionChart = null;
    let comparisonChart = null;
    let impactChart = null;
    
    // 当前选中的饮食类型
    let currentDiet = null;
    let previousDiet = null;
    
    // 饮食数据
    const DIET_DATA = {
        high_meat: {
            name: '高肉食饮食',
            annualCarbon: 3300, // kg CO2
            composition: {
                '牛肉': 1200,
                '猪肉': 600,
                '鸡肉': 400,
                '乳制品': 500,
                '谷物': 300,
                '蔬菜水果': 300
            },
            consumption: {
                '牛肉': 52,
                '猪肉': 45,
                '鸡肉': 35,
                '牛奶': 200,
                '面包': 80,
                '蔬菜': 150
            },
            color: '#e74c3c'
        },
        balanced: {
            name: '均衡饮食',
            annualCarbon: 2500,
            composition: {
                '肉类': 800,
                '乳制品': 400,
                '谷物': 500,
                '蔬菜': 400,
                '水果': 300,
                '其他': 100
            },
            consumption: {
                '肉类总计': 65,
                '牛奶': 150,
                '鸡蛋': 200,
                '米面': 120,
                '蔬菜': 200,
                '水果': 100
            },
            color: '#3498db'
        },
        vegetarian: {
            name: '素食饮食',
            annualCarbon: 1700,
            composition: {
                '乳制品': 600,
                '鸡蛋': 200,
                '谷物': 400,
                '蔬菜': 300,
                '水果': 150,
                '豆类': 50
            },
            consumption: {
                '牛奶': 250,
                '奶酪': 30,
                '鸡蛋': 250,
                '谷物': 150,
                '蔬菜': 300,
                '水果': 150
            },
            color: '#2ecc71'
        },
        vegan: {
            name: '纯素饮食',
            annualCarbon: 1500,
            composition: {
                '谷物': 500,
                '蔬菜': 400,
                '水果': 300,
                '豆类': 200,
                '坚果': 100
            },
            consumption: {
                '谷物': 200,
                '蔬菜': 400,
                '水果': 200,
                '豆腐': 100,
                '豆类': 80,
                '坚果': 50
            },
            color: '#27ae60'
        }
    };
    
    // 图表配置
    const chartColors = {
        primary: 'rgba(76, 175, 80, 0.8)',
        secondary: 'rgba(33, 150, 243, 0.8)',
        tertiary: 'rgba(255, 193, 7, 0.8)',
        quaternary: 'rgba(233, 30, 99, 0.8)'
    };
    
    // 初始化
    function init() {
        initEventListeners();
        initCharts();
        // 默认选择均衡饮食
        selectDiet('balanced');
    }
    
    // 事件监听器
    function initEventListeners() {
        dietCards.forEach(card => {
            card.addEventListener('click', () => {
                const diet = card.dataset.diet;
                selectDiet(diet);
            });
        });
    }
    
    // 选择饮食类型
    function selectDiet(dietType) {
        if (currentDiet === dietType) return;
        
        previousDiet = currentDiet;
        currentDiet = dietType;
        
        // 更新卡片样式
        dietCards.forEach(card => {
            if (card.dataset.diet === dietType) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        
        // 更新所有内容
        updateStatistics();
        updateAllCharts();
        
        // 添加动画效果
        document.querySelectorAll('.stat-card, .chart-box').forEach(el => {
            el.classList.add('fade-in');
            setTimeout(() => el.classList.remove('fade-in'), 500);
        });
    }
    
    // 更新统计信息
    function updateStatistics() {
        const dietData = DIET_DATA[currentDiet];
        const annualCarbon = dietData.annualCarbon;
        const dailyCarbon = annualCarbon / 365;
        
        // 更新数值
        annualCarbonElement.textContent = (annualCarbon / 1000).toFixed(1);
        dailyCarbonElement.textContent = dailyCarbon.toFixed(1);
        treesNeededElement.textContent = Math.ceil(annualCarbon / 21); // 一棵树每年吸收约21kg CO2
        carEquivalentElement.textContent = Math.round(annualCarbon / 0.12).toLocaleString(); // 汽车每公里约0.12kg CO2
        
        // 更新变化指示
        if (previousDiet) {
            const previousCarbon = DIET_DATA[previousDiet].annualCarbon;
            const change = annualCarbon - previousCarbon;
            const changePercent = (change / previousCarbon * 100).toFixed(1);
            
            if (change > 0) {
                carbonChangeElement.textContent = `↑ ${changePercent}%`;
                carbonChangeElement.className = 'stat-change negative-change';
            } else {
                carbonChangeElement.textContent = `↓ ${Math.abs(changePercent)}%`;
                carbonChangeElement.className = 'stat-change positive-change';
            }
        } else {
            carbonChangeElement.textContent = '';
        }
    }
    
    // 初始化所有图表
    function initCharts() {
        initCompositionChart();
        initConsumptionChart();
        initComparisonChart();
        initImpactChart();
    }
    
    // 饮食构成图
    function initCompositionChart() {
        const ctx = compositionCanvas.getContext('2d');
        compositionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6B6B',
                        '#4ECDC4',
                        '#45B7D1',
                        '#96CEB4',
                        '#FECA57',
                        '#DDA0DD'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} kg CO₂ (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 食物消费量图
    function initConsumptionChart() {
        const ctx = consumptionCanvas.getContext('2d');
        consumptionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: '年消费量',
                    data: [],
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
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
                        title: {
                            display: true,
                            text: '消费量 (kg/年)',
                            font: { size: 14 }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} kg/年`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 饮食对比图
    function initComparisonChart() {
        const ctx = comparisonCanvas.getContext('2d');
        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['高肉食', '均衡', '素食', '纯素'],
                datasets: [{
                    label: '年碳排放',
                    data: [3.3, 2.5, 1.7, 1.5],
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.7)',
                        'rgba(52, 152, 219, 0.7)',
                        'rgba(46, 204, 113, 0.7)',
                        'rgba(39, 174, 96, 0.7)'
                    ],
                    borderColor: [
                        'rgba(231, 76, 60, 1)',
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(39, 174, 96, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '碳排放 (吨 CO₂/年)',
                            font: { size: 14 }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {}
                    }
                }
            }
        });
    }
    
    // 影响趋势图
    function initImpactChart() {
        const ctx = impactCanvas.getContext('2d');
        impactChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1年', '5年', '10年', '20年', '30年'],
                datasets: [
                    {
                        label: '高肉食',
                        data: [3.3, 16.5, 33, 66, 99],
                        borderColor: 'rgba(231, 76, 60, 1)',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '均衡',
                        data: [2.5, 12.5, 25, 50, 75],
                        borderColor: 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '素食',
                        data: [1.7, 8.5, 17, 34, 51],
                        borderColor: 'rgba(46, 204, 113, 1)',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '纯素',
                        data: [1.5, 7.5, 15, 30, 45],
                        borderColor: 'rgba(39, 174, 96, 1)',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '累计碳排放 (吨 CO₂)',
                            font: { size: 14 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { padding: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} 吨 CO₂`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 更新所有图表
    function updateAllCharts() {
        updateCompositionChart();
        updateConsumptionChart();
        updateComparisonChart();
    }
    
    // 更新构成图
    function updateCompositionChart() {
        const dietData = DIET_DATA[currentDiet];
        const labels = Object.keys(dietData.composition);
        const data = Object.values(dietData.composition);
        
        compositionChart.data.labels = labels;
        compositionChart.data.datasets[0].data = data;
        compositionChart.update();
    }
    
    // 更新消费量图
    function updateConsumptionChart() {
        const dietData = DIET_DATA[currentDiet];
        const labels = Object.keys(dietData.consumption);
        const data = Object.values(dietData.consumption);
        
        consumptionChart.data.labels = labels;
        consumptionChart.data.datasets[0].data = data;
        consumptionChart.update();
    }
    
    // 更新对比图（高亮当前选择）
    function updateComparisonChart() {
        const dietTypes = ['high_meat', 'balanced', 'vegetarian', 'vegan'];
        const backgroundColors = dietTypes.map(diet => {
            if (diet === currentDiet) {
                return DIET_DATA[diet].color;
            }
            return DIET_DATA[diet].color + '80'; // 添加透明度
        });
        
        comparisonChart.data.datasets[0].backgroundColor = backgroundColors;
        comparisonChart.update();
    }
    
    // 初始化
    init();
}); 