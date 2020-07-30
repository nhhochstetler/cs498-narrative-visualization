var csvIndex = 0;
var initial = true;
var csvs = [
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_march_25.csv",
        date: "3/25/20",
        data: {},
        text: 'This is a test 1This is a test 1This is a test 1This is a test 1This is a test 1This is a test 1This is a test 1' +
        'This is a test 1This is a test 1This is a test 1This is a test 1This is a test 1This is a test 1This is a test 1',
    },
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_april_26.csv",
        date: "4/26/20",
        data: {},
        text: 'This is a test 2',
    },
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_may_25.csv",
        date: "5/25/20",
        data: {},
        text: 'This is a test 3',
    },
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_june_25.csv",
        date: "6/25/20",
        data: {},
        text: 'This is a test 4',
    },
    {
        url: "https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_july_14.csv",
        date: "7/14/20",
        data: {},
        text: 'This is a test 5',
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
// var interval = svg.append('path');
var deathLine = svg.append('path');
var lines = [];
for (var i = 0; i < csvs.length; i++) {
    lines.push(svg.append('path'));
}


var xScale;
var yScale;

var xAxis = svg.append("g");
var yAxis = svg.append("g");
var dateRange;
var maxDeaths;

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
                    x: d3.timeParse("%m/%d/%Y")(csvs[csvIndex].date),
                    y: 0
                },
                {
                    x: d3.timeParse("%m/%d/%Y")(csvs[csvIndex].date),
                    y: maxDeaths
                },
            ];
            generateProjectionLine(projectionLine, projectionDateData, xScale, yScale);

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
    // interval.datum(dataByDate)
    //     .transition()
    //     .duration(1000)
    //     .attr("fill", "#cce5df")
    //     .attr("stroke", "none")
    //     .attr("d", d3.area()
    //         .x(function (d) { return xScale(d3.timeParse("%m/%d/%Y")(d.key)) })
    //         .y0(function (d) { return yScale(d.value.tot_deaths_lower) })
    //         .y1(function (d) { return yScale(d.value.tot_deaths_upper) })
    //     );

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
                x: dateRange[0],
                y: d3.max(dataByDate, function (d) { return +d.value.tot_deaths; })
            },
            {
                x: dateRange[1],
                y: d3.max(dataByDate, function (d) { return +d.value.tot_deaths; })
            },
        ];

        generateProjectionLine(deathLine, deathData, xScale, yScale);
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
            .style("left", (xScale(d3.timeParse("%m/%d/%Y")(selectedData.key))) + "px")
            .style("top", (yScale(Math.floor(selectedData.value.tot_deaths))) + 100 + "px")
    }
    function mouseout() {
        focus.style("opacity", 0)
        focusText.style("opacity", 0)
    }
}

function generateProjectionLine(line, data, xScale, yScale) {
    line.datum(data)
        .attr("fill", "none")
        .attr("stroke", "lightgray")
        .style("stroke-dasharray", ("3, 3"))
        .attr("stroke-width", 2)
        .transition()
        .duration(1000)
        .attr("d", d3.line()
            .x(function (d) { return xScale(d.x) })
            .y(function (d) { return yScale(d.y) })
        );
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
    loadD3();
    loadHtmlText();
}

function loadPrevious() {
    if (csvIndex > 0) {
        csvIndex--;
    }
    loadD3();
    loadHtmlText();
}

function loadHtmlText() {
    d3.select("#current-date").text(csvs[csvIndex].date);
    d3.select("#text-story").text(csvs[csvIndex].text);
}

loadD3();
loadHtmlText();