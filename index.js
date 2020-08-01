var csvIndex = 0;
var initial = true;
var csvs = [
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_march_25.csv",
        date: "3/25/20",
        data: {},
        text: 'This is the initial projections of the number of deaths due to Covid-19 in the USA as of March 25th. It appears that the total numbers flatten out and the rate of deaths will approach 0 in July.',
    },
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_april_26.csv",
        date: "4/26/20",
        data: {},
        text: 'In April, the projections of the number of deaths due to the coronavirus actually drops from the previous month. In this projection, we approach a death rate of 0 in the month of June, and at a lower total death toll.',
    },
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_may_25.csv",
        date: "5/25/20",
        data: {},
        text: 'In May\'s projection we see a large increase in predicted deaths, almost double the previous months projections. Furthermore, the month in which the death rate approaches 0 is pushed out even farther.',
    },
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_june_25.csv",
        date: "6/25/20",
        data: {},
        text: 'Again in June we see the projections continue to increase. What is interesting with this month\'s projection is that the death rate never approaches 0, it continues at an increasing rate well into October.',
    },
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_july_14.csv",
        date: "7/14/20",
        data: {},
        text: 'In the final month of available projection data, we still see the projections continue to rise, as well as the rate of deaths. The latest projection puts the death toll in the USA at 216,075 people by November. The rend of the projection says that this a number that will continue to increase, and the history of the projections show that the projections will continue to surpass what we previously thought.',
    }
];

var svgHeight = 500;
var svgWidth = 800;

var margin = { top: 10, right: 30, bottom: 30, left: 60 };
var width = svgWidth - margin.left - margin.right;
var height = svgHeight - margin.top - margin.bottom;

// Main svg
var svg = d3.select('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .append('g')
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

var projectionLine = svg.append('path');
var interval = svg.append('path');
var deathLines = [];
deathLines.push(svg.append('path'));

var deathLabels = [];
deathLabels.push(svg.append("text"));

var lines = [];
lines.push(svg.append('path'));

var xScale;
var yScale;

var xAxis = svg.append("g");
var yAxis = svg.append("g");
var dateRange;
var maxDeaths;

var monthLabel = svg.append('text');

function loadD3() {
    d3.csv(csvs[csvIndex].url,
        function (d) {
            return {
                date: d.date,
                location: d.location_name,
                deaths: d.totdea_mean,
                deaths_lower: d.totdea_lower,
                deaths_upper: d.totdea_upper,
            }
        },
        function (data) {
            csvs[csvIndex].data = data;
            var stateData = generateStateList(data);
            loadSelectButton(stateData);

            updateState(null);

            // projection date line
            var projectionDateData = [
                {
                    x: xScale(d3.timeParse("%m/%d/%Y")(csvs[csvIndex].date)),
                    y: yScale(0)
                },
                {
                    x: xScale(d3.timeParse("%m/%d/%Y")(csvs[csvIndex].date)),
                    y: yScale(maxDeaths)
                },
            ];
            generateProjectionLine(projectionLine, projectionDateData);
            addMonthLabel(monthLabel, d3.timeParse("%m/%d/%Y")(csvs[csvIndex].date), xScale)

            initial = false;
        });
}

function getDataByDate(data) {
    return d3.nest()
        .key(function (d) { return d.date; })
        .rollup(function (v) {
            return {
                tot_deaths: d3.sum(v, function (d) { return d.deaths; }),
                tot_deaths_lower: d3.sum(v, function (d) { return d.deaths_lower; }),
                tot_deaths_upper: d3.sum(v, function (d) { return d.deaths_upper; }),
            };
        })
        .entries(data);
}

// might need to move this for next data sets
function updateState(state) {
    var dataFilter = csvs[csvIndex].data.filter(function (d) { return (state == null || state == 'USA') || d.location == state })
    var dataByDate = getDataByDate(dataFilter);
    // x-axis
    dateRange = d3.extent(dataByDate, function (d) { return d3.timeParse("%m/%d/%Y")(d.key); });
    xScale = d3.scaleTime().domain(dateRange)
        .range([0, width]);
    var x = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%B"));
    xAxis
        .transition()
        .duration(initial ? 0 : 1000)
        .attr("transform", "translate(0," + height + ")")
        .call(x);

    // y-axis
    maxDeaths = d3.max(dataByDate, function (d) { return +d.value.tot_deaths_upper; });
    yScale = d3.scaleLinear().domain([0, maxDeaths])
        .range([height, 0]);
    var y = d3.axisLeft(yScale);
    yAxis
        .transition()
        .duration(initial ? 0 : 1000)
        .call(y);

    // confidence interval
    interval.datum(dataByDate)
        .transition()
        .duration(1000)
        .attr("fill", "#cce5df")
        .attr("stroke", "none")
        .attr("d", d3.area()
            .x(function (d) { return xScale(d3.timeParse("%m/%d/%Y")(d.key)) })
            .y0(function (d) { return yScale(d.value.tot_deaths_lower) })
            .y1(function (d) { return yScale(d.value.tot_deaths_upper) })
        );

    // main line
    for (var x = 0; x <= csvIndex; x++) {
        var dataFilter = csvs[x].data.filter(function (d) { return (state == null || state == 'USA') || d.location == state })

        var dataByDate = getDataByDate(dataFilter);

        loadTooltip(dataByDate, svg, xScale, yScale);

        lines[x].datum(dataByDate)
            .transition()
            .duration(1000)
            .attr("fill", "none")
            .attr("stroke", x == csvIndex ? "steelblue" : "lightgray")
            .attr("stroke-width", 5)
            .attr("d", d3.line()
                .x(function (d) { return xScale(d3.timeParse("%m/%d/%Y")(d.key)) })
                .y(function (d) { return yScale(d.value.tot_deaths) })
                .curve(d3.curveMonotoneX)
            );
        var deathData = [
            {
                x: xScale(dateRange[0]),
                y: yScale(d3.max(dataByDate, function (d) { return +d.value.tot_deaths; }))
            },
            {
                x: xScale(dateRange[1]),
                y: yScale(d3.max(dataByDate, function (d) { return +d.value.tot_deaths; }))
            },
        ];

        generateProjectionLine(deathLines[x], deathData);
        addMaxDeathLabel(deathLabels[x], csvs[x].date, yScale, d3.max(dataByDate, function (d) { return +d.value.tot_deaths; }));
    }
}

function loadTooltip(data, svg, xScale, yScale) {

    var bisect = d3.bisector(function (d) { return d3.timeParse("%m/%d/%Y")(d.key); }).left;

    // tooltip circle
    var focus = svg
        .append('g')
        .append('circle')
        .style("fill", "none")
        .attr("stroke", "black")
        .attr('r', 8.5)
        .style("opacity", 0)

    // tootip text
    var focusText = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // tooltip rect
    svg
        .append('rect')
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', mouseover)
        .on('mousemove', mousemove)
        .on('mouseout', mouseout);

    function mouseover() {
        focus.style("opacity", 1)
        focusText.style("opacity", 1)
    }

    function mousemove() {
        // recover coordinate we need
        var x0 = xScale.invert(d3.mouse(this)[0]);
        var i = bisect(data, x0, 1);
        selectedData = data[i];
        focus
            .attr("cx", xScale(d3.timeParse("%m/%d/%Y")(selectedData.key)))
            .attr("cy", yScale(selectedData.value.tot_deaths))
        focusText
            .html("Date: " + selectedData.key + "<br>Total Deaths: " + Math.floor(selectedData.value.tot_deaths))
            .style("left", (xScale(d3.timeParse("%m/%d/%Y")(selectedData.key))) + 100 + "px")
            .style("top", (yScale(Math.floor(selectedData.value.tot_deaths))) + 180 + "px")
    }
    function mouseout() {
        focus.style("opacity", 0)
        focusText.style("opacity", 0)
    }
}

function generateProjectionLine(line, data) {
    line.datum(data)
        .transition()
        .duration(1000)
        .attr("fill", "none")
        .attr("stroke", "lightgray")
        .style("stroke-dasharray", ("3, 3"))
        .attr("stroke-width", 2)
        .attr("d", d3.line()
            .x(function (d) { return d.x })
            .y(function (d) { return d.y })
        );
}

function addMaxDeathLabel(text, month, yScale, y) {
    text
        .transition()
        .duration(initial ? 0 : 1000)
        .attr("transform", "translate(0," + yScale(y) + ")")
        .attr("dx", "5px")
        .attr("dy", "-3px")
        .attr("class", "horizontal-label")
        .attr("text-anchor", "start")
        .text(month + " Max Deaths: " + Math.floor(y));
}

function addMonthLabel(text, month, xScale) {
    text
        .transition()
        .duration(initial ? 0 : 1000)
        .attr("transform", "translate(" + xScale(month) + ",0)")
        .attr("dx", "5px")
        .attr("dy", "-3px")
        .attr("class", "horizontal-label")
        .attr("text-anchor", "start")
        .text("Current Prediction Date: " + (month.getMonth() + 1) + '/' + month.getDate() + '/' + month.getFullYear());
}

function generateStateList(data) {
    const s = new Set();
    data.forEach(a => s.add(a.location));
    return Array.from(s);
}

function loadSelectButton(data) {
    d3.select("#select-state").html("");

    d3.select("#select-state")
        .selectAll('options')
        .data(['USA', ...data])
        .enter()
        .append('option')
        .text(function (d) { return d; })
        .attr("value", function (d) { return d; });

    // initialize dropdown update
    d3.select("#select-state").on("change", function (d) {
        var selectedOption = d3.select(this).property("value")
        updateState(selectedOption);
    })
}

function loadNext() {
    if (csvIndex < csvs.length - 1) {
        csvIndex++;
    }

    // add a new line to add to the graph
    lines.push(svg.append('path'));
    deathLines.push(svg.append('path'));
    deathLabels.push(svg.append("text"));

    loadD3();
    loadHtmlText();
}

function loadPrevious() {
    if (csvIndex > 0) {
        lines[csvIndex].remove();
        deathLines[csvIndex].remove();
        deathLabels[csvIndex].remove();
        lines.splice(csvIndex, 1);
        deathLines.splice(csvIndex, 1);
        deathLabels.splice(csvIndex, 1);

        csvIndex--;
    }
    loadD3();
    loadHtmlText();
}

function loadHtmlText() {
    d3.select("#current-date").text("Projection as of " + csvs[csvIndex].date);
    d3.select("#text-story").text(csvs[csvIndex].text);
    d3.select("#current-page").text((csvIndex + 1) + "/" + csvs.length);

    if (csvIndex == 0) {
        // disable previous
        d3.select("#previous").attr('disabled', 'true');
    } else if (csvIndex == csvs.length - 1) {
        // disable next
        d3.select("#next").attr('disabled', 'true');
    } else { 
        d3.select("#previous").attr('disabled', null);
        d3.select("#next").attr('disabled', null);
    }
}

function isFirstPage() {
    console.log('here', csvIndex)
    return csvIndex == 0;
}
function isLastPage() {
    return csvIndex == csvs.length - 1;
}

loadD3();
loadHtmlText();