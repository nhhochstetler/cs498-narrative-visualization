function loadD3() {
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
            "translate(" + margin.left + "," + margin.top + ")")

    d3.csv("https://raw.githubusercontent.com/nhhochstetler/cs498-narrative-visualization/master/data/proj_april_26.csv",
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
            var dataByDate = d3.nest()
                .key(function (d) { return d.date; })
                .rollup(function (v) {
                    return {
                        tot_deaths: d3.sum(v, function (d) { return d.deaths; }),
                        tot_deaths_lower: d3.sum(v, function (d) { return d.deaths_lower; }),
                        tot_deaths_upper: d3.sum(v, function (d) { return d.deaths_upper; }),
                    };
                })
                .entries(data);

            // x-axis
            var xScale = d3.scaleTime()
                .domain(d3.extent(dataByDate, function (d) { return d3.timeParse("%m/%d/%Y")(d.key); }))
                .range([0, width]);
            var x = d3.axisBottom(xScale)
                .tickFormat(d3.timeFormat("%B"));
            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(x);

            // y-axis
            var yScale = d3.scaleLinear()
                .domain([0, d3.max(dataByDate, function (d) { return +d.value.tot_deaths_upper; })])
                .range([height, 0]);
            var y = d3.axisLeft(yScale);
            svg.append("g")
                .call(y);

            // confidence interval
            svg.append("path")
                .datum(dataByDate)
                .attr("fill", "#cce5df")
                .attr("stroke", "none")
                .attr("d", d3.area()
                    .x(function (d) { return xScale(d3.timeParse("%m/%d/%Y")(d.key)) })
                    .y0(function (d) { return yScale(d.value.tot_deaths_lower) })
                    .y1(function (d) { return yScale(d.value.tot_deaths_upper) })
                );

            // main line
            svg.append('path')
                .datum(dataByDate)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 5)
                .attr("d", d3.line()
                    .x(function (d) { return xScale(d3.timeParse("%m/%d/%Y")(d.key)) })
                    .y(function (d) { return yScale(d.value.tot_deaths) })
                    .curve(d3.curveMonotoneX)
                );

            loadTooltip(dataByDate, svg, xScale, yScale);
            loadSelectButton();
        });

    function loadTooltip(data, svg, xScale, yScale) {

        var bisect = d3.bisector(function (d) { return d3.timeParse("%m/%d/%Y")(d.key); }).left;
        
        // tooltip
        var focus = svg
            .append('g')
            .append('circle')
            .style("fill", "none")
            .attr("stroke", "black")
            .attr('r', 8.5)
            .style("opacity", 0)

        // tootip text
        var focusText = svg
            .append('g')
            .append('text')
            .style("opacity", 0)
            .attr("text-anchor", "left")
            .attr("alignment-baseline", "middle")

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
                .html("Date: " + selectedData.key + "<br>Total Deaths: " + selectedData.value.tot_deaths)
                .attr("x", xScale(d3.timeParse("%m/%d/%Y")(selectedData.key)) + 15)
                .attr("y", yScale(selectedData.value.tot_deaths))
        }
        function mouseout() {
            focus.style("opacity", 0)
            focusText.style("opacity", 0)
        }
    }

    function loadSelectButton() {
        
    }

}

loadD3();