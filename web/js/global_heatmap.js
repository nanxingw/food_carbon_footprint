// 全球饮食碳足迹热力图
class GlobalHeatmap {
    constructor() {
        this.map = null;
        this.heatmapData = null;
        this.currentYear = 2024;
        this.countriesLayer = null;
        this.selectedCountry = null;
        this.colorScale = null;
        this.timelineChart = null;
        
        this.init();
    }

    async init() {
        // 加载数据
        await this.loadData();
        
        // 初始化地图
        this.initMap();
        
        // 初始化颜色比例尺
        this.initColorScale();
        
        // 加载国家边界数据
        await this.loadCountriesGeoJSON();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 隐藏加载画面
        setTimeout(() => {
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }, 1500);
    }

    async loadData() {
        try {
            const response = await fetch('../data/global_heatmap_data.json');
            this.heatmapData = await response.json();
        } catch (error) {
            console.error('Failed to load heatmap data:', error);
        }
    }

    initMap() {
        // 初始化Leaflet地图
        this.map = L.map('map', {
            center: [20, 0],
            zoom: 2.5,
            minZoom: 2,
            maxZoom: 6,
            worldCopyJump: true,
            zoomControl: false
        });

        // 添加自定义深色地图样式
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        // 添加缩放控制到右下角
        L.control.zoom({
            position: 'bottomleft'
        }).addTo(this.map);
    }

    initColorScale() {
        // 使用chroma.js创建颜色比例尺
        this.colorScale = chroma.scale(['#4caf50', '#ffeb3b', '#ff9800', '#f44336'])
            .domain([0.5, 1.5, 2.5, 4.0]); // 碳足迹范围
    }

    async loadCountriesGeoJSON() {
        try {
            // 加载世界地图GeoJSON数据
            const response = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
            const geoData = await response.json();
            
            // 为每个国家添加碳足迹数据
            this.enrichGeoDataWithCarbon(geoData);
            
            // 创建GeoJSON图层
            this.countriesLayer = L.geoJSON(geoData, {
                style: (feature) => this.getCountryStyle(feature),
                onEachFeature: (feature, layer) => this.onEachCountry(feature, layer)
            }).addTo(this.map);
        } catch (error) {
            console.error('Failed to load countries GeoJSON:', error);
        }
    }

    enrichGeoDataWithCarbon(geoData) {
        // 将碳足迹数据添加到GeoJSON特征中
        geoData.features.forEach(feature => {
            const countryData = this.getCountryData(feature.properties.name);
            if (countryData) {
                feature.properties.carbonData = countryData;
            }
        });
    }

    getCountryData(countryName) {
        // 简单的国家名称匹配（实际应用中需要更复杂的匹配逻辑）
        const countryMap = {
            'China': 'CHN',
            'United States': 'USA',
            'United States of America': 'USA',
            'India': 'IND',
            'Brazil': 'BRA',
            'Germany': 'DEU'
        };
        
        const countryCode = countryMap[countryName];
        if (countryCode && this.heatmapData) {
            return this.heatmapData.countries.find(c => c.country_code === countryCode);
        }
        
        // 返回默认数据
        return {
            country_name: countryName,
            current_carbon_footprint: 2.5,
            diet_composition: { meat: 50, plant: 50 },
            trend: 'stable'
        };
    }

    getCountryStyle(feature) {
        const carbonData = feature.properties.carbonData;
        const carbonValue = carbonData ? carbonData.current_carbon_footprint : 2.5;
        
        return {
            fillColor: this.colorScale(carbonValue).hex(),
            weight: 1,
            opacity: 0.7,
            color: 'rgba(255, 255, 255, 0.3)',
            fillOpacity: 0.7
        };
    }

    onEachCountry(feature, layer) {
        // 添加交互事件
        layer.on({
            mouseover: (e) => this.highlightCountry(e),
            mouseout: (e) => this.resetHighlight(e),
            click: (e) => this.selectCountry(e)
        });
        
        // 添加工具提示
        const carbonData = feature.properties.carbonData;
        if (carbonData) {
            layer.bindTooltip(`${carbonData.country_name}: ${carbonData.current_carbon_footprint.toFixed(1)} 吨CO₂/人/年`, {
                permanent: false,
                direction: 'auto'
            });
        }
    }

    highlightCountry(e) {
        const layer = e.target;
        
        layer.setStyle({
            weight: 3,
            color: '#fff',
            fillOpacity: 0.9
        });
        
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }

    resetHighlight(e) {
        if (this.selectedCountry !== e.target) {
            this.countriesLayer.resetStyle(e.target);
        }
    }

    selectCountry(e) {
        // 重置之前选中的国家
        if (this.selectedCountry) {
            this.countriesLayer.resetStyle(this.selectedCountry);
        }
        
        // 高亮新选中的国家
        this.selectedCountry = e.target;
        this.highlightCountry(e);
        
        // 更新信息面板
        this.updateInfoPanel(e.target.feature);
        
        // 缩放到选中的国家
        this.map.fitBounds(e.target.getBounds(), {
            padding: [50, 50],
            maxZoom: 5
        });
    }

    updateInfoPanel(feature) {
        const carbonData = feature.properties.carbonData;
        if (!carbonData) return;
        
        const countryInfo = document.getElementById('country-info');
        
        // 获取趋势图标
        const trendIcon = this.getTrendIcon(carbonData.trend);
        
        // 更新HTML内容
        countryInfo.innerHTML = `
            <div class="country-name">${carbonData.country_name}</div>
            <div class="carbon-value">${carbonData.current_carbon_footprint.toFixed(2)} 吨CO₂/人/年</div>
            
            <div class="info-item">
                <span class="info-label">趋势</span>
                <span class="info-value">${trendIcon}</span>
            </div>
            
            <div class="info-item">
                <span class="info-label">人口</span>
                <span class="info-value">${this.formatPopulation(carbonData.population)}</span>
            </div>
            
            <div class="info-item">
                <span class="info-label">城市化率</span>
                <span class="info-value">${(carbonData.urbanization_rate * 100).toFixed(1)}%</span>
            </div>
            
            <h4 style="margin-top: 20px; margin-bottom: 10px;">饮食构成</h4>
            <div class="diet-bar">
                <div class="diet-segment meat-segment" style="width: ${carbonData.diet_composition.meat}%">
                    肉类 ${carbonData.diet_composition.meat}%
                </div>
                <div class="diet-segment plant-segment" style="width: ${carbonData.diet_composition.plant}%">
                    植物 ${carbonData.diet_composition.plant}%
                </div>
            </div>
            
            <div class="timeline-chart">
                <canvas id="country-timeline-chart"></canvas>
            </div>
        `;
        
        // 创建时间线图表
        this.createTimelineChart(carbonData);
        
        // 添加动画效果
        this.animateInfoPanel();
    }

    getTrendIcon(trend) {
        switch (trend) {
            case 'increasing':
                return '<span class="trend-indicator trend-up">📈 上升</span>';
            case 'decreasing':
                return '<span class="trend-indicator trend-down">📉 下降</span>';
            default:
                return '<span class="trend-indicator trend-stable">➡️ 稳定</span>';
        }
    }

    formatPopulation(population) {
        if (population >= 1e9) {
            return (population / 1e9).toFixed(2) + ' 十亿';
        } else if (population >= 1e6) {
            return (population / 1e6).toFixed(1) + ' 百万';
        } else {
            return population.toLocaleString();
        }
    }

    createTimelineChart(countryData) {
        const ctx = document.getElementById('country-timeline-chart');
        if (!ctx) return;
        
        // 如果已有图表，先销毁
        if (this.timelineChart) {
            this.timelineChart.destroy();
        }
        
        // 准备数据
        const years = [];
        const carbonValues = [];
        
        if (countryData.historical_data) {
            countryData.historical_data.forEach(data => {
                if (data.year <= this.currentYear) {
                    years.push(data.year);
                    carbonValues.push(data.carbon_per_capita);
                }
            });
        }
        
        // 创建图表
        this.timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: '碳足迹趋势',
                    data: carbonValues,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toFixed(2) + ' 吨CO₂/人/年';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    }
                }
            }
        });
    }

    animateInfoPanel() {
        const panel = document.getElementById('info-panel');
        panel.style.animation = 'none';
        setTimeout(() => {
            panel.style.animation = 'fadeIn 0.5s ease-out';
        }, 10);
    }

    updateYearDisplay() {
        document.getElementById('year-display').textContent = this.currentYear;
        
        // 更新地图样式
        if (this.countriesLayer) {
            this.countriesLayer.eachLayer(layer => {
                // 更新每个国家的样式基于新的年份数据
                const feature = layer.feature;
                const carbonData = this.getYearSpecificData(feature.properties.carbonData, this.currentYear);
                
                if (carbonData) {
                    const newStyle = {
                        fillColor: this.colorScale(carbonData.carbon_per_capita).hex(),
                        fillOpacity: 0.7
                    };
                    layer.setStyle(newStyle);
                }
            });
        }
    }

    getYearSpecificData(countryData, year) {
        if (!countryData || !countryData.historical_data) return null;
        
        // 查找指定年份的数据
        const yearData = countryData.historical_data.find(d => d.year === year);
        
        if (yearData) {
            return yearData;
        }
        
        // 如果没有精确数据，返回最近的数据
        const closestData = countryData.historical_data.reduce((prev, curr) => {
            return Math.abs(curr.year - year) < Math.abs(prev.year - year) ? curr : prev;
        });
        
        return closestData;
    }

    setupEventListeners() {
        // 年份滑块
        const yearSlider = document.getElementById('year-slider');
        yearSlider.addEventListener('input', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.updateYearDisplay();
        });
        
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectedCountry) {
                // 取消选择
                this.countriesLayer.resetStyle(this.selectedCountry);
                this.selectedCountry = null;
                
                // 重置视图
                this.map.setView([20, 0], 2.5);
                
                // 重置信息面板
                document.getElementById('country-info').innerHTML = `
                    <p style="text-align: center; color: rgba(255, 255, 255, 0.6);">
                        点击地图上的国家查看详细信息
                    </p>
                `;
            }
        });
        
        // 添加一些动态效果
        this.addDynamicEffects();
    }

    addDynamicEffects() {
        // 创建脉动标记显示高碳足迹地区
        if (this.heatmapData) {
            this.heatmapData.countries
                .filter(country => country.current_carbon_footprint > 3.5)
                .forEach(country => {
                    if (country.coordinates) {
                        // 创建自定义脉动标记
                        const pulseIcon = L.divIcon({
                            className: 'pulse-marker',
                            iconSize: [20, 20]
                        });
                        
                        L.marker([country.coordinates.lat, country.coordinates.lon], {
                            icon: pulseIcon,
                            interactive: false
                        }).addTo(this.map);
                    }
                });
        }
        
        // 定期更新全球统计数据
        this.updateGlobalStats();
        setInterval(() => this.updateGlobalStats(), 5000);
    }

    updateGlobalStats() {
        if (!this.heatmapData) return;
        
        // 计算当前年份的统计数据
        let totalEmissions = 0;
        let countryCount = 0;
        let totalCarbon = 0;
        
        this.heatmapData.countries.forEach(country => {
            const yearData = this.getYearSpecificData(country, this.currentYear);
            if (yearData) {
                totalCarbon += yearData.carbon_per_capita;
                totalEmissions += yearData.carbon_per_capita * country.population / 1e9;
                countryCount++;
            }
        });
        
        const avgCarbon = countryCount > 0 ? totalCarbon / countryCount : 2.5;
        
        // 更新显示
        this.animateNumber('global-average', avgCarbon, 1);
        this.animateNumber('total-emissions', totalEmissions, 1);
        document.getElementById('countries-count').textContent = countryCount;
    }

    animateNumber(elementId, targetValue, decimals) {
        const element = document.getElementById(elementId);
        const startValue = parseFloat(element.textContent);
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const currentTime = Date.now();
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const currentValue = startValue + (targetValue - startValue) * progress;
            
            element.textContent = currentValue.toFixed(decimals);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new GlobalHeatmap();
}); 