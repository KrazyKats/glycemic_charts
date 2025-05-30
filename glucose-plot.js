// Path to the CSV file
const csvFilePath = './website_data/line_plot_differences.csv';

// Chart dimensions
const margin = {top: 20, right: 120, bottom: 60, left: 60};
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Color scale for different patients
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

function aggregateData(data) {
    // Group data by patient_id and time_after_meal_minutes (rounded to nearest 5 minutes for smoothing)
    const grouped = d3.group(data,
        d => d.patient_id,
        d => Math.round(d.time_after_meal_minutes / 5) * 5 // Round to nearest 5 minutes
    );

    const aggregatedData = [];

    grouped.forEach((patientData, patientId) => {
        patientData.forEach((timePoints, timeAfterMeal) => {
            const meanGlucoseDiff = d3.mean(timePoints, d => d.glucose_diff);
            const meanGlucose = d3.mean(timePoints, d => d.glucose);
            const meanPreMealGlucose = d3.mean(timePoints, d => d.pre_meal_glucose);

            aggregatedData.push({
                patient_id: patientId,
                time_after_meal_minutes: timeAfterMeal,
                glucose_diff: meanGlucoseDiff,
                glucose: meanGlucose,
                pre_meal_glucose: meanPreMealGlucose,
                count: timePoints.length
            });
        });
    });

    return aggregatedData;
}

function createChart(rawData) {
    // Clear existing chart
    d3.select("#chart").selectAll("*").remove();

    // Remove existing tooltip if present
    d3.select(".tooltip").remove();

    // Convert time_after_meal from seconds to minutes for better readability
    rawData.forEach(d => {
        d.time_after_meal_minutes = d.time_after_meal / 60;
    });

    // Aggregate data for smoothing
    const data = aggregateData(rawData);

    // Group data by patient_id
    const groupedData = d3.group(data, d => d.patient_id);

    // Create scales - now using glucose_diff for y-axis
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.time_after_meal_minutes))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.glucose_diff))
        .nice()
        .range([height, 0]);

    // Create SVG
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add grid
    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickSize(-height)
            .tickFormat("")
        );

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat("")
        );

    // Add zero line for glucose difference
    g.append("line")
        .attr("class", "zero-line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0));

    // Line generator with smoother curve
    const line = d3.line()
        .x(d => xScale(d.time_after_meal_minutes))
        .y(d => yScale(d.glucose_diff))
        .curve(d3.curveMonotoneX); // Smoother curve

    // Create tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Draw lines for each patient
    groupedData.forEach((patientData, patientId) => {
        const sortedData = patientData.sort((a, b) => a.time_after_meal_minutes - b.time_after_meal_minutes);

        // Draw line
        g.append("path")
            .datum(sortedData)
            .attr("class", "line")
            .attr("d", line)
            .style("stroke", colorScale(patientId))
            .style("opacity", 0.9);

        // Draw points
        g.selectAll(`.dot-patient-${patientId}`)
            .data(sortedData)
            .enter().append("circle")
            .attr("class", `dot dot-patient-${patientId}`)
            .attr("cx", d => xScale(d.time_after_meal_minutes))
            .attr("cy", d => yScale(d.glucose_diff))
            .attr("r", 4)
            .style("fill", colorScale(patientId))
            .style("stroke", "white")
            .style("stroke-width", 2)
            .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>Patient ${d.patient_id}</strong><br/>
                    Time: ${Math.round(d.time_after_meal_minutes)} min after meal<br/>
                    Glucose Diff: ${d.glucose_diff > 0 ? '+' : ''}${d.glucose_diff.toFixed(1)} mg/dL<br/>
                    Current: ${d.glucose.toFixed(1)} mg/dL<br/>
                    Pre-meal: ${d.pre_meal_glucose.toFixed(1)} mg/dL<br/>
                    ${d.count > 1 ? `Averaged from ${d.count} readings` : ''}
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    });

    // Add meal time marker (vertical line at x=0)
    g.append("line")
        .attr("class", "meal-marker")
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("y1", 0)
        .attr("y2", height);

    g.append("text")
        .attr("x", xScale(0))
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#e74c3c")
        .style("font-weight", "bold")
        .text("Meal Time");

    // Add axes
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale));

    // Add axis labels
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Glucose Difference from Pre-meal (mg/dL)");

    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style("text-anchor", "middle")
        .text("Time After Meal (minutes)");

    // Add legend
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, 20)`);

    const legendItems = legend.selectAll(".legend-item")
        .data(Array.from(groupedData.keys()))
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .style("stroke", d => colorScale(d))
        .style("stroke-width", 3);

    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .text(d => `Patient ${d}`);
}

function loadInitialData() {
    d3.csv(csvFilePath)
        .then(function(data) {
            // Process the data
            data.forEach(d => {
                d.patient_id = +d.patient_id;
                d.glucose = +d.glucose;
                d.time_after_meal = +d.time_after_meal;
                d.pre_meal_glucose = +d.pre_meal_glucose;
                d.glucose_diff = +d.glucose_diff;
            });
            createChart(data);
        })
        .catch(function(error) {
            console.error('Error loading CSV file:', error);
            // Show error message to user
            d3.select("#chart").html(`
                <div style="text-align: center; color: #e74c3c; padding: 50px;">
                    <h3>Error loading data file</h3>
                    <p>Could not load './website_data/line_plot_differences.csv'</p>
                    <p>Please check that the file exists in the correct location.</p>
                </div>
            `);
        });
}

// Load initial data when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
});