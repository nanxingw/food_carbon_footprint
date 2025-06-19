// 碳足迹时光机 - 交互式时间线可视化
class CarbonTimeline {
    constructor() {
        this.timelineData = null;
        this.currentYear = 2024;
        this.currentScenario = 'neutral';
        this.charts = {};
        
        this.init();
    }

    async init() {
        // 加载数据
        await this.loadData();
        
        // 初始化图表
        this.initCharts();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 初始化事件标记
        this.createEventMarkers();
        
        // 更新显示
        this.updateDisplay();
        
        // 启动动画
        this.startAnimations();
    }

    async loadData() {
        try {
            const response = await fetch('../data/timeline_data.json');
            this.timelineData = await response.json();
        } catch (error) {
            console.error('Failed to load timeline data:', error);
        }
    }

    initCharts() {
        // 配置Chart.js默认选项
        Chart.defaults.color = 'rgba(255, 255, 255, 0.8)';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        // 饮食结构图表
        this.charts.dietStructure = new Chart(document.getElementById('diet-structure-chart'), {
            type: 'doughnut',
            data: {
                labels: ['肉类', '植物性食物', '乳制品', '其他'],
                datasets: [{
                    data: [30, 50, 15, 5],
                    backgroundColor: [
                        'rgba(244, 67, 54, 0.8)',
                        'rgba(76, 175, 80, 0.8)',
                        'rgba(255, 152, 0, 0.8)',
                        'rgba(96, 125, 139, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + '%';
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });

        // 碳足迹趋势图表
        this.charts.carbonTrend = new Chart(document.getElementById('carbon-trend-chart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '全球平均碳足迹',
                    data: [],
                    borderColor: 'rgba(76, 175, 80, 1)',
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        title: {
                            display: true,
                            text: '碳足迹 (吨CO₂/人/年)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // 饮食类型分布图表
        this.charts.dietTypes = new Chart(document.getElementById('diet-types-chart'), {
            type: 'radar',
            data: {
                labels: ['高肉食', '均衡饮食', '素食', '纯素'],
                datasets: [{
                    label: '人口比例',
                    data: [20, 50, 25, 5],
                    borderColor: 'rgba(255, 152, 0, 1)',
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    pointBackgroundColor: 'rgba(255, 152, 0, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(255, 152, 0, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 14
                            }
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            backdropColor: 'transparent'
                        },
                        beginAtZero: true,
                        max: 60
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // 消费量对比图表
        this.charts.consumption = new Chart(document.getElementById('consumption-comparison-chart'), {
            type: 'bar',
            data: {
                labels: ['肉类', '植物性食物'],
                datasets: [{
                    label: '消费量 (kg/人/年)',
                    data: [57.5, 127.5],
                    backgroundColor: [
                        'rgba(244, 67, 54, 0.8)',
                        'rgba(76, 175, 80, 0.8)'
                    ],
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        title: {
                            display: true,
                            text: '消费量 (kg/人/年)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        // 初始化碳足迹趋势数据
        this.updateCarbonTrendChart();
    }

    updateCarbonTrendChart() {
        if (!this.timelineData) return;

        const years = [];
        const carbonData = [];

        // 添加历史数据
        this.timelineData.historical_data.forEach(data => {
            if (data.year <= this.currentYear) {
                years.push(data.year);
                carbonData.push(data.global_average.carbon_footprint);
            }
        });

        // 如果是未来年份，添加预测数据
        if (this.currentYear > 2024) {
            const futureData = this.timelineData.future_projections.filter(d => 
                d.year > 2024 && d.year <= this.currentYear
            );
            
            futureData.forEach(data => {
                years.push(data.year);
                const scenario = data.scenarios[this.currentScenario];
                const baseCarbon = 2.5; // 2024年基准
                const reduction = scenario.carbon_reduction;
                carbonData.push(baseCarbon * (1 - reduction));
            });
        }

        // 更新图表
        this.charts.carbonTrend.data.labels = years;
        this.charts.carbonTrend.data.datasets[0].data = carbonData;
        this.charts.carbonTrend.update('none');
    }

    createEventMarkers() {
        if (!this.timelineData) return;

        const container = document.getElementById('event-markers');
        const startYear = 1950;
        const endYear = 2050;
        const totalYears = endYear - startYear;

        this.timelineData.key_events.forEach(event => {
            const position = ((event.year - startYear) / totalYears) * 100;
            
            const marker = document.createElement('div');
            marker.className = 'event-marker';
            marker.style.left = `${position}%`;
            
            const tooltip = document.createElement('div');
            tooltip.className = 'event-tooltip';
            tooltip.textContent = `${event.year}: ${event.event}`;
            
            marker.appendChild(tooltip);
            container.appendChild(marker);

            // 添加点击事件
            marker.addEventListener('click', () => {
                this.currentYear = event.year;
                document.getElementById('year-slider').value = event.year;
                this.updateDisplay();
            });
        });
    }

    updateDisplay() {
        // 更新年份显示
        document.getElementById('current-year').textContent = this.currentYear;

        // 获取当前年份的数据
        const yearData = this.getYearData(this.currentYear);
        if (!yearData) return;

        // 更新统计数据
        this.updateStats(yearData);

        // 更新图表
        this.updateCharts(yearData);

        // 更新时代描述
        this.updateEraDescription();

        // 显示/隐藏场景选择器
        const scenarioSelector = document.getElementById('scenario-selector');
        if (this.currentYear > 2024) {
            scenarioSelector.style.display = 'block';
            gsap.from(scenarioSelector, {
                opacity: 0,
                y: 20,
                duration: 0.5
            });
        } else {
            scenarioSelector.style.display = 'none';
        }

        // 添加视觉效果
        this.addVisualEffects();
    }

    getYearData(year) {
        if (!this.timelineData) return null;

        // 查找历史数据
        let data = this.timelineData.historical_data.find(d => d.year === year);
        
        if (data) {
            return data;
        }

        // 如果是未来年份，使用插值或最近的数据
        if (year > 2024) {
            // 使用最近的历史数据作为基础
            const baseData = this.timelineData.historical_data[this.timelineData.historical_data.length - 1];
            
            // 查找未来预测
            const futureProjection = this.timelineData.future_projections.find(d => 
                Math.abs(d.year - year) < 3
            );

            if (futureProjection) {
                // 根据场景调整数据
                const scenario = futureProjection.scenarios[this.currentScenario];
                return this.applyScenarioToData(baseData, scenario, year - 2024);
            }
        }

        // 如果没有精确数据，使用插值
        return this.interpolateData(year);
    }

    applyScenarioToData(baseData, scenario, yearsAhead) {
        const adjustedData = JSON.parse(JSON.stringify(baseData));
        
        // 调整碳足迹
        adjustedData.global_average.carbon_footprint *= (1 - scenario.carbon_reduction);
        
        // 调整肉类消费
        const meatReduction = scenario.plant_based_growth * 0.01; // 转换为比例
        adjustedData.global_average.meat_consumption *= (1 - meatReduction);
        adjustedData.global_average.plant_consumption *= (1 + meatReduction * 0.5);
        
        // 调整饮食类型分布
        const veganGrowth = scenario.plant_based_growth;
        adjustedData.diet_types.vegan.percentage += veganGrowth;
        adjustedData.diet_types.high_meat.percentage -= veganGrowth * 0.7;
        adjustedData.diet_types.balanced.percentage -= veganGrowth * 0.3;
        
        return adjustedData;
    }

    interpolateData(year) {
        // 简单的线性插值
        const historicalData = this.timelineData.historical_data;
        
        // 找到前后的数据点
        let before = null;
        let after = null;
        
        for (let i = 0; i < historicalData.length - 1; i++) {
            if (historicalData[i].year <= year && historicalData[i + 1].year >= year) {
                before = historicalData[i];
                after = historicalData[i + 1];
                break;
            }
        }
        
        if (!before || !after) {
            return historicalData[historicalData.length - 1]; // 返回最后的数据
        }
        
        // 线性插值
        const ratio = (year - before.year) / (after.year - before.year);
        const interpolated = {
            year: year,
            global_average: {
                meat_consumption: this.lerp(before.global_average.meat_consumption, 
                    after.global_average.meat_consumption, ratio),
                plant_consumption: this.lerp(before.global_average.plant_consumption, 
                    after.global_average.plant_consumption, ratio),
                carbon_footprint: this.lerp(before.global_average.carbon_footprint, 
                    after.global_average.carbon_footprint, ratio),
                population: this.lerp(before.global_average.population, 
                    after.global_average.population, ratio)
            },
            diet_types: {}
        };
        
        // 插值饮食类型
        Object.keys(before.diet_types).forEach(type => {
            interpolated.diet_types[type] = {
                percentage: this.lerp(before.diet_types[type].percentage, 
                    after.diet_types[type].percentage, ratio),
                carbon: this.lerp(before.diet_types[type].carbon, 
                    after.diet_types[type].carbon, ratio)
            };
        });
        
        return interpolated;
    }

    lerp(start, end, ratio) {
        return start + (end - start) * ratio;
    }

    updateStats(data) {
        // 更新统计卡片
        gsap.to('#global-carbon', {
            textContent: data.global_average.carbon_footprint.toFixed(1),
            duration: 1,
            ease: 'power2.out',
            snap: { textContent: 0.1 }
        });

        gsap.to('#meat-consumption', {
            textContent: data.global_average.meat_consumption.toFixed(1),
            duration: 1,
            ease: 'power2.out',
            snap: { textContent: 0.1 }
        });

        gsap.to('#plant-consumption', {
            textContent: data.global_average.plant_consumption.toFixed(1),
            duration: 1,
            ease: 'power2.out',
            snap: { textContent: 0.1 }
        });

        gsap.to('#population', {
            textContent: (data.global_average.population / 1e9).toFixed(1),
            duration: 1,
            ease: 'power2.out',
            snap: { textContent: 0.1 }
        });
    }

    updateCharts(data) {
        // 更新饮食结构图
        const dietData = [
            data.global_average.meat_consumption,
            data.global_average.plant_consumption,
            30, // 乳制品（示例值）
            10  // 其他（示例值）
        ];
        const total = dietData.reduce((a, b) => a + b, 0);
        const percentages = dietData.map(d => (d / total * 100).toFixed(1));
        
        this.charts.dietStructure.data.datasets[0].data = percentages;
        this.charts.dietStructure.update();

        // 更新饮食类型分布
        const dietTypeData = [
            data.diet_types.high_meat.percentage,
            data.diet_types.balanced.percentage,
            data.diet_types.vegetarian.percentage,
            data.diet_types.vegan.percentage
        ];
        this.charts.dietTypes.data.datasets[0].data = dietTypeData;
        this.charts.dietTypes.update();

        // 更新消费量对比
        this.charts.consumption.data.datasets[0].data = [
            data.global_average.meat_consumption,
            data.global_average.plant_consumption
        ];
        this.charts.consumption.update();

        // 更新碳足迹趋势
        this.updateCarbonTrendChart();
    }

    updateEraDescription() {
        const descriptions = {
            1950: "1950年代：战后经济复苏期，肉类消费在发达国家开始增长，但全球大部分地区仍以植物性饮食为主。",
            1970: "1970年代：快餐文化兴起，工业化农业迅速发展，肉类生产效率提高，价格下降。",
            1990: "1990年代：全球化加速，西式饮食模式向发展中国家扩散，肉类消费快速增长。",
            2000: "2000年代：环保意识觉醒，有机食品和可持续农业开始受到关注，但整体肉类消费仍在上升。",
            2010: "2010年代：素食主义和纯素食运动兴起，植物基替代品开始进入主流市场。",
            2020: "2020年代：气候变化成为全球议题，可持续饮食受到前所未有的关注，但转型仍面临挑战。",
            2030: "2030年代（预测）：技术创新推动食品革命，培养肉和植物基产品可能占据重要市场份额。",
            2040: "2040年代（预测）：如果采取积极措施，全球饮食模式可能发生根本性转变，碳足迹显著下降。",
            2050: "2050年代（预测）：理想情况下，可持续饮食成为主流，食物系统实现碳中和或负排放。"
        };

        // 找到最接近的年代描述
        const decade = Math.floor(this.currentYear / 10) * 10;
        const description = descriptions[decade] || descriptions[2020];
        
        const descriptionEl = document.getElementById('era-description');
        descriptionEl.innerHTML = `<p>${description}</p>`;
        
        // 添加淡入效果
        gsap.from(descriptionEl, {
            opacity: 0,
            y: 20,
            duration: 0.5
        });
    }

    addVisualEffects() {
        // 根据年份改变背景色调
        const yearProgress = (this.currentYear - 1950) / 100;
        const hue = 240 - yearProgress * 60; // 从蓝色过渡到红色
        
        gsap.to('body', {
            background: `linear-gradient(135deg, 
                hsl(${hue}, 50%, 10%) 0%, 
                hsl(${hue + 20}, 40%, 20%) 50%, 
                hsl(${hue - 20}, 30%, 15%) 100%)`,
            duration: 1
        });

        // 添加粒子效果（可选）
        this.createParticles();
    }

    createParticles() {
        // 创建简单的粒子效果
        const particleCount = 50;
        const container = document.querySelector('.hero-section');
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 2px;
                height: 2px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                pointer-events: none;
            `;
            
            // 随机位置
            gsap.set(particle, {
                x: Math.random() * window.innerWidth,
                y: Math.random() * 400,
                opacity: Math.random()
            });
            
            // 动画
            gsap.to(particle, {
                y: '-=100',
                x: '+=50',
                opacity: 0,
                duration: 3 + Math.random() * 2,
                repeat: -1,
                ease: 'none'
            });
            
            container.appendChild(particle);
        }
    }

    setupEventListeners() {
        // 年份滑块
        const yearSlider = document.getElementById('year-slider');
        yearSlider.addEventListener('input', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.updateDisplay();
        });

        // 场景按钮
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 移除其他按钮的active类
                document.querySelectorAll('.scenario-btn').forEach(b => 
                    b.classList.remove('active')
                );
                
                // 添加active类到当前按钮
                btn.classList.add('active');
                
                // 更新场景
                this.currentScenario = btn.dataset.scenario;
                
                // 更新显示
                this.updateDisplay();
                
                // 添加点击效果
                gsap.fromTo(btn, {
                    scale: 1.2
                }, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'back.out(1.7)'
                });
            });
        });

        // 添加键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && this.currentYear > 1950) {
                this.currentYear--;
                yearSlider.value = this.currentYear;
                this.updateDisplay();
            } else if (e.key === 'ArrowRight' && this.currentYear < 2050) {
                this.currentYear++;
                yearSlider.value = this.currentYear;
                this.updateDisplay();
            }
        });
    }

    startAnimations() {
        // 启动一些持续的动画效果
        
        // 年份数字脉动效果
        gsap.to('.year-display', {
            scale: 1.05,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut'
        });

        // 统计卡片浮动效果
        document.querySelectorAll('.stat-card').forEach((card, index) => {
            gsap.to(card, {
                y: -10,
                duration: 2 + index * 0.2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });
        });

        // 自动播放功能（可选）
        // this.startAutoPlay();
    }

    startAutoPlay() {
        // 自动播放时间线
        let direction = 1;
        
        this.autoPlayInterval = setInterval(() => {
            this.currentYear += direction;
            
            if (this.currentYear >= 2050) {
                direction = -1;
            } else if (this.currentYear <= 1950) {
                direction = 1;
            }
            
            document.getElementById('year-slider').value = this.currentYear;
            this.updateDisplay();
        }, 500);
        
        // 鼠标悬停时暂停
        document.addEventListener('mousemove', () => {
            if (this.autoPlayInterval) {
                clearInterval(this.autoPlayInterval);
                this.autoPlayInterval = null;
            }
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new CarbonTimeline();
}); 