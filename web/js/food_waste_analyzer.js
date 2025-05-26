document.addEventListener('DOMContentLoaded', () => {
    console.log('Food Waste Analyzer script loaded.');

    // --- 1. Mock Data (Placeholder - to be replaced with more accurate/dynamic data later) ---
    const GLOBAL_WASTE_STATS = {
        percentage_wasted: 17, // Approximate global food wasted (UNEP Food Waste Index Report 2021 - household level, can expand)
        annual_tonnage_million: 931, // Million tonnes (UNEP Food Waste Index Report 2021 - household, retail, food service)
        co2_emission_gt: 3.3, // Gigatonnes CO2eq (FAO estimate for food loss and waste, can be refined)
        people_fed_billion: 1.5 // Illustrative: number of people that could be fed
    };

    // More detailed mock data for waste composition (percentage of total waste by category, and their CO2 impact)
    // Note: These are highly illustrative and simplified.
    const WASTE_COMPOSITION_DATA = [
        { category: '水果和蔬菜', waste_percentage_of_total: 45, co2_kg_per_ton_wasted: 500, typical_household_waste_example_kg_per_year: 20 },
        { category: '谷物和烘焙食品', waste_percentage_of_total: 25, co2_kg_per_ton_wasted: 700, typical_household_waste_example_kg_per_year: 15 },
        { category: '乳制品和蛋类', waste_percentage_of_total: 15, co2_kg_per_ton_wasted: 1200, typical_household_waste_example_kg_per_year: 10 },
        { category: '肉类和禽类', waste_percentage_of_total: 10, co2_kg_per_ton_wasted: 5000, typical_household_waste_example_kg_per_year: 8 }, // Higher CO2 impact
        { category: '鱼类和海鲜', waste_percentage_of_total: 3, co2_kg_per_ton_wasted: 3000, typical_household_waste_example_kg_per_year: 3 },
        { category: '其他 (饮料、加工食品等)', waste_percentage_of_total: 2, co2_kg_per_ton_wasted: 400, typical_household_waste_example_kg_per_year: 5 },
    ];

    // --- 2. DOM Element Retrieval ---
    const heroStatsElements = {
        percentage: document.querySelector('.hero-stats .stat-item:nth-child(1) strong'),
        tonnage: document.querySelector('.hero-stats .stat-item:nth-child(2) strong'),
        co2: document.querySelector('.hero-stats .stat-item:nth-child(3) strong'),
    };
    const wasteCompositionChartPlaceholder = document.querySelector('#waste-composition-section .chart-placeholder');
    const wasteCategoryInfoDiv = document.getElementById('waste-category-info'); // Added for hover info
    const personalImpactPlaceholder = document.querySelector('#personal-impact-section .chart-placeholder');
    const viewByWastePercentageButton = document.getElementById('view-by-waste-percentage');
    const viewByCo2ContributionButton = document.getElementById('view-by-co2-contribution');
    // Personal Waste Calculator Elements
    const wasteInputsContainer = document.getElementById('waste-inputs-container');
    const calculatePersonalWasteButton = document.getElementById('calculate-personal-waste');
    const personalWasteResultsDiv = document.getElementById('personal-waste-results');
    const wasteReductionSuggestionDiv = document.getElementById('waste-reduction-suggestion');
    const reductionSlider = document.getElementById('reduction-slider');
    const reductionPercentageDisplay = document.getElementById('reduction-percentage-display');
    const reductionImpactDisplay = document.getElementById('reduction-impact-display');

    let wasteCompositionChartInstance = null; // To store the chart instance
    let currentChartViewMode = 'percentage'; // 'percentage' or 'co2'

    // --- 3. Functions ---

    /**
     * Animates a numerical value in a DOM element.
     * @param {HTMLElement} element The DOM element to update.
     * @param {number} start The starting value.
     * @param {number} end The target value.
     * @param {number} duration Animation duration in milliseconds.
     * @param {string} suffix Text to append after the number (e.g., '%', '亿吨').
     * @param {number} decimals Number of decimal places to show.
     */
    function animateValue(element, start, end, duration, suffix = '', decimals = 0) {
        if (!element) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = parseFloat((progress * (end - start) + start).toFixed(decimals));
            element.textContent = currentValue + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    /**
     * Populates the hero section with global waste statistics using animation.
     */
    function populateHeroStats() {
        const animationDuration = 2000; // 2 seconds for animation
        if (heroStatsElements.percentage) {
            animateValue(heroStatsElements.percentage, 0, GLOBAL_WASTE_STATS.percentage_wasted, animationDuration, '%');
        }
        if (heroStatsElements.tonnage) {
            // Convert million to 亿 for the end value
            animateValue(heroStatsElements.tonnage, 0, (GLOBAL_WASTE_STATS.annual_tonnage_million / 100), animationDuration, '亿吨', 1);
        }
        if (heroStatsElements.co2) {
            animateValue(heroStatsElements.co2, 0, GLOBAL_WASTE_STATS.co2_emission_gt, animationDuration, ' Gt CO₂eq', 1);
        }
        console.log('Hero stats population initiated with animation.');
    }

    /**
     * Calculates CO2 contribution data for the chart.
     * @returns {Array<Object>} Array of objects with category and co2_contribution_percentage.
     */
    function calculateCo2ContributionData() {
        const categoryCo2Contributions = WASTE_COMPOSITION_DATA.map(item => {
            // Nominal waste amount (can be considered as its percentage for relative calculation)
            const nominalWasteAmount = item.waste_percentage_of_total;
            const nominalCo2Emission = nominalWasteAmount * item.co2_kg_per_ton_wasted;
            return { category: item.category, nominalCo2Emission: nominalCo2Emission, originalData: item };
        });

        const totalNominalCo2Emissions = categoryCo2Contributions.reduce((sum, item) => sum + item.nominalCo2Emission, 0);
        
        if (totalNominalCo2Emissions === 0) {
            return WASTE_COMPOSITION_DATA.map(item => ({ category: item.category, co2_contribution_percentage: 0, originalData: item }));
        }

        return categoryCo2Contributions.map(item => ({
            category: item.category,
            co2_contribution_percentage: parseFloat(((item.nominalCo2Emission / totalNominalCo2Emissions) * 100).toFixed(1)),
            originalData: item.originalData // Keep original data for info panel
        }));
    }

    /**
     * Initializes or updates and renders the waste composition chart.
     * @param {string} mode - 'percentage' to show waste by percentage, 'co2' to show by CO2 contribution.
     */
    function initWasteCompositionChart(mode = 'percentage') {
        currentChartViewMode = mode;
        if (wasteCompositionChartPlaceholder) {
            wasteCompositionChartPlaceholder.innerHTML = '<canvas id="waste-composition-canvas" style="max-height: 350px;"></canvas>';
            const canvasElement = document.getElementById('waste-composition-canvas');
            if (!canvasElement) {
                console.error("Canvas element for waste composition chart not found after insertion.");
                return;
            }
            const ctx = canvasElement.getContext('2d');
            
            let chartTitle = '';
            let labels = [];
            let data = [];
            let datasetLabel = '';
            let tooltipSuffix = '';
            let sourceDataForInfo = WASTE_COMPOSITION_DATA; // Default

            if (mode === 'percentage') {
                labels = WASTE_COMPOSITION_DATA.map(item => item.category);
                data = WASTE_COMPOSITION_DATA.map(item => item.waste_percentage_of_total);
                chartTitle = '主要食物类别浪费占比估算';
                datasetLabel = '食物浪费构成 (%)';
                tooltipSuffix = '% (占总浪费)';
                sourceDataForInfo = WASTE_COMPOSITION_DATA;
            } else { // mode === 'co2'
                const co2Data = calculateCo2ContributionData();
                sourceDataForInfo = co2Data.map(d => ({ // Adapt for updateWasteCategoryInfo
                     ...d.originalData, // spread original data
                     co2_contribution_percentage: d.co2_contribution_percentage 
                }));
                labels = co2Data.map(item => item.category);
                data = co2Data.map(item => item.co2_contribution_percentage);
                chartTitle = '主要食物类别碳足迹贡献占比估算';
                datasetLabel = '碳足迹贡献 (%)';
                tooltipSuffix = '% (占总碳足迹贡献)';
            }

            const backgroundColors = [
                'rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(255, 205, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(153, 102, 255, 0.7)',
                'rgba(201, 203, 207, 0.7)'
            ];

            if (wasteCompositionChartInstance) {
                wasteCompositionChartInstance.destroy(); // Destroy previous instance if exists
            }

            wasteCompositionChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        label: datasetLabel,
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                        borderWidth: 1,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const chartElement = elements[0];
                            const index = chartElement.index;
                            // Use sourceDataForInfo which is adapted for the current view mode
                            updateWasteCategoryInfo(sourceDataForInfo[index]); 
                        }
                    },
                    onHover: (event, chartElements) => {
                        if (chartElements.length === 0) {
                            if (wasteCategoryInfoDiv) {
                                wasteCategoryInfoDiv.innerHTML = '<p>将鼠标悬停在上方图表的食物类别上以查看更多信息。</p>';
                            }
                            event.native.target.style.cursor = 'default';
                            return;
                        }
                        event.native.target.style.cursor = 'pointer';
                        const activeElement = chartElements[0];
                        const index = activeElement.index;
                        updateWasteCategoryInfo(sourceDataForInfo[index]);
                    },
                    plugins: {
                        legend: { position: 'top', labels: { font: {size: 11} } },
                        title: { display: true, text: chartTitle, font: { size: 16, weight: 'bold' }, color: '#333', padding: { top: 10, bottom: 20 } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) { label += ': '; }
                                    if (context.parsed !== null) {
                                        label += context.parsed + tooltipSuffix;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
            console.log(`Waste composition chart initialized in '${mode}' mode.`);
            // Visually indicate active button
            updateActiveButtonStates();
        } else {
            console.warn('Waste composition chart placeholder not found.');
        }
    }

    /**
     * Updates the visual state of the view mode buttons.
     */
    function updateActiveButtonStates() {
        if (currentChartViewMode === 'percentage') {
            viewByWastePercentageButton.style.opacity = '1';
            viewByWastePercentageButton.style.borderBottom = '3px solid #f1c40f';
            viewByCo2ContributionButton.style.opacity = '0.6';
            viewByCo2ContributionButton.style.borderBottom = 'none';
        } else {
            viewByCo2ContributionButton.style.opacity = '1';
            viewByCo2ContributionButton.style.borderBottom = '3px solid #f1c40f';
            viewByWastePercentageButton.style.opacity = '0.6';
            viewByWastePercentageButton.style.borderBottom = 'none';
        }
    }

    /**
     * Updates the waste category information display area.
     * @param {object} categoryItem The data item for the selected/hovered category.
     * This item might be from WASTE_COMPOSITION_DATA or the result of calculateCo2ContributionData (which includes originalData).
     */
    function updateWasteCategoryInfo(categoryItem) {
        if (!wasteCategoryInfoDiv || !categoryItem) return;

        const displayCategory = categoryItem.category; 
        const originalCategoryData = categoryItem.originalData || categoryItem; 

        let html = `<h4>${displayCategory}</h4>`;

        if (currentChartViewMode === 'percentage') {
            const percentageOfTotalWaste = originalCategoryData.waste_percentage_of_total;
            const estimatedCo2ContributionGt = (GLOBAL_WASTE_STATS.co2_emission_gt * (percentageOfTotalWaste / 100));
            const estimatedCo2ContributionMillionTonnes = estimatedCo2ContributionGt * 1000;
            html += `<p>该类别约占食物总浪费量的 <strong>${percentageOfTotalWaste}%</strong>。</p>`;
            html += `<p>估算其浪费产生的碳排放约占全球食物浪费总碳排的 <strong>${percentageOfTotalWaste}%</strong>，约为 <strong>${estimatedCo2ContributionMillionTonnes.toFixed(2)} 百万吨 CO₂eq</strong>。</p>`;
        } else { // mode === 'co2'
            const co2ContributionPercentage = categoryItem.co2_contribution_percentage;
            html += `<p>该类别对食物浪费总碳足迹的贡献占比约为 <strong>${co2ContributionPercentage}%</strong>。</p>`;
            html += `<p>其占食物总浪费量的比例约为 <strong>${originalCategoryData.waste_percentage_of_total}%</strong>。</p>`;
        }
        html += `<p style="font-size:0.8em; color:#555; margin-top:10px;"><em>单位重量碳排放: ${originalCategoryData.co2_kg_per_ton_wasted} kg CO₂eq/吨。计算基于模拟数据。</em></p>`;
        
        wasteCategoryInfoDiv.innerHTML = html;
    }

    /**
     * Populates the input fields for the personal waste calculator.
     */
    function populateWasteInputFields() {
        if (!wasteInputsContainer) return;
        let inputsHTML = '';
        WASTE_COMPOSITION_DATA.forEach((item, index) => {
            // Calculate a plausible weekly waste amount from the annual example for placeholder or default value
            const weeklyExampleKg = (item.typical_household_waste_example_kg_per_year / 52).toFixed(2);
            inputsHTML += `
                <div class="input-group" style="margin-bottom: 10px;">
                    <label for="waste-input-${index}" style="display: block; margin-bottom: 3px;">${item.category}:</label>
                    <input type="number" id="waste-input-${index}" name="${item.category}" value="${weeklyExampleKg}" min="0" step="0.1" style="width: 100px; padding: 5px; border: 1px solid #ccc; border-radius: 3px;" data-co2-per-ton="${item.co2_kg_per_ton_wasted}">
                </div>
            `;
        });
        wasteInputsContainer.innerHTML = inputsHTML;
    }

    let currentPersonalAnnualCo2Waste = 0; // Store the calculated annual CO2 waste for slider use

    /**
     * Calculates and displays the personal food waste footprint.
     */
    function calculateAndDisplayPersonalWaste() {
        if (!personalWasteResultsDiv) return;
        let totalAnnualWasteKg = 0;
        let totalAnnualCo2Kg = 0;

        WASTE_COMPOSITION_DATA.forEach((item, index) => {
            const inputElement = document.getElementById(`waste-input-${index}`);
            if (inputElement) {
                const weeklyWasteKg = parseFloat(inputElement.value) || 0;
                if (weeklyWasteKg < 0) return; // Ignore negative values

                const annualWasteKg = weeklyWasteKg * 52;
                const co2PerTon = parseFloat(inputElement.dataset.co2PerTon) || 0;
                const annualCo2Kg = (annualWasteKg / 1000) * co2PerTon; // Convert kg waste to tons for CO2 calculation

                totalAnnualWasteKg += annualWasteKg;
                totalAnnualCo2Kg += annualCo2Kg;
            }
        });
        
        currentPersonalAnnualCo2Waste = totalAnnualCo2Kg; // Store for slider

        let resultsHTML = `<h4>您的年度食物浪费足迹估算:</h4>`;
        resultsHTML += `<p>年度总浪费量: <strong>${totalAnnualWasteKg.toFixed(1)} 公斤</strong></p>`;
        resultsHTML += `<p>产生的CO₂排放: <strong>${totalAnnualCo2Kg.toFixed(1)} 公斤 CO₂eq</strong></p>`;
        resultsHTML += `<p style="font-size:0.9em; color:#777; margin-top:10px;">这相当于驾驶普通燃油小汽车行驶约 <strong>${(totalAnnualCo2Kg * (1/0.17)).toFixed(0)} 公里</strong>的碳排放。<br>(假设每公里排放0.17kg CO₂eq)</p>`; // Example equivalency

        personalWasteResultsDiv.innerHTML = resultsHTML;

        if (totalAnnualCo2Kg > 0) {
            wasteReductionSuggestionDiv.style.display = 'block';
            updateReductionImpact(); // Initial update for slider
        } else {
            wasteReductionSuggestionDiv.style.display = 'none';
        }
    }

    /**
     * Updates the displayed impact of reducing waste based on slider value.
     */
    function updateReductionImpact() {
        if (!reductionSlider || !reductionPercentageDisplay || !reductionImpactDisplay) return;
        const percentage = parseInt(reductionSlider.value);
        reductionPercentageDisplay.textContent = percentage;

        const co2SavedKg = (currentPersonalAnnualCo2Waste * (percentage / 100)).toFixed(1);
        reductionImpactDisplay.innerHTML = `如果您减少 <strong>${percentage}%</strong> 的浪费，每年可减少约 <strong>${co2SavedKg} 公斤 CO₂eq</strong> 的排放！`;
    }

    // --- 4. Initial Calls ---
    populateHeroStats();
    initWasteCompositionChart('percentage'); 
    populateWasteInputFields(); // Populate inputs on load

    // Add event listeners for view mode buttons
    if (viewByWastePercentageButton) {
        viewByWastePercentageButton.addEventListener('click', () => {
            if (currentChartViewMode !== 'percentage') {
                initWasteCompositionChart('percentage');
            }
        });
    }
    if (viewByCo2ContributionButton) {
        viewByCo2ContributionButton.addEventListener('click', () => {
            if (currentChartViewMode !== 'co2') {
                initWasteCompositionChart('co2');
            }
        });
    }

    // Event listener for personal waste calculator button
    if (calculatePersonalWasteButton) {
        calculatePersonalWasteButton.addEventListener('click', calculateAndDisplayPersonalWaste);
    }

    // Event listener for reduction slider
    if (reductionSlider) {
        reductionSlider.addEventListener('input', updateReductionImpact);
    }

}); 