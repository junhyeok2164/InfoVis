class Heatmap {
    margin = {
        top: 40, right: 40, bottom: 100, left: 130
    }

    constructor(svg, tooltip, data, width = 400, height = 400) {
        this.svg = svg;
        this.tooltip = tooltip;
        this.data = data;
        this.width = width;
        this.height = height;
        this.handlers = {};
    }

    initialize() {
        this.svg = d3.select(this.svg);
        this.tooltip = d3.select(this.tooltip);
        this.container = this.svg.append("g");
        this.xAxis = this.svg.append("g");
        this.yAxis = this.svg.append("g");
        this.legend = this.svg.append("g");

        this.xLabel = this.svg.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("x", this.margin.left + this.width / 2)
            .attr("y", this.margin.top + this.height + 60)
            .style("font-size", "16px");

        this.yLabel = this.svg.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("transform", `translate(${this.margin.left - 80}, ${this.margin.top + this.height / 2}) rotate(-90)`)
            .style("font-size", "16px");

        this.svg
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom);

        this.container.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

        this.colorScale = d3.scaleSequential(d3.interpolateYlOrRd);
    }

    update(xVar, yVar, valueVar, Binsize1, Binsize2) {
        this.xVar = xVar;
        this.yVar = yVar;
        this.valueVar = valueVar;
        this.xLabel.text(xVar);
        this.yLabel.text(yVar);

        let xBinSize = Binsize1;
        let yBinSize = Binsize2;

        // =============== bin setting (help from GPT) ====================
        let binnedData = this.data.map(d => {
            let xVal = +d[xVar];
            let yVal = +d[yVar];
            let xBin = Math.floor(xVal / xBinSize) * xBinSize;
            let yBin = Math.floor(yVal / yBinSize) * yBinSize;
            return {
                binX: xBin,
                binY: yBin,
                value: +d[valueVar]
            };
        });

        let grouped = d3.rollup(
            binnedData,
            v => d3.mean(v, d => d.value),
            d => d.binX,
            d => d.binY
        );

        let avgData = [];
        for (let [x, yMap] of grouped.entries()) {
            for (let [y, val] of yMap.entries()) {
                avgData.push({ x: x, y: y, value: val });
            }
        }
        
        let xExtent = d3.extent(avgData, d => d.x);
        let yExtent = d3.extent(avgData, d => d.y);
        let xMax = d3.max(avgData, d => d.x);
        let yMax = d3.max(avgData, d => d.y);
        // ================================================================

        this.xScale = d3.scaleLinear()
            .domain([xExtent[0], xMax + xBinSize])
            .range([0, this.width]);

        this.yScale = d3.scaleLinear()
            .domain([yExtent[0], yMax + yBinSize])
            .range([this.height, 0]);

        let valueExtent = d3.extent(avgData, d => d.value);
        this.colorScale.domain(valueExtent);

        let xTicks = d3.range(xExtent[0], xExtent[1] + xBinSize + 0.1, xBinSize);
        let yTicks = d3.range(yExtent[0], yExtent[1] + yBinSize + 0.1, yBinSize);

        this.xAxis
            .transition().duration(500)
            .attr("transform", `translate(${this.margin.left}, ${this.margin.top + this.height})`)
            .call(d3.axisBottom(this.xScale).tickValues(xTicks).tickFormat(d3.format(".0f")))
            .selectAll("text")
            .style("font-weight", "bold")
            .style("font-size", "15px");

        this.yAxis
            .transition().duration(500)
            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
            .call(d3.axisLeft(this.yScale).tickValues(yTicks).tickFormat(d3.format(".1f")))
            .selectAll("text")
            .style("font-weight", "bold")
            .style("font-size", "15px");


        this.rects = this.container.selectAll("rect")
            .data(avgData, d => `${d.x}-${d.y}`)
            .join("rect")
            .attr("x", d => this.xScale(d.x))
            .attr("y", d => this.yScale(d.y + yBinSize))
            .attr("width", this.xScale(xBinSize) - this.xScale(0))
            .attr("height", this.yScale(0) - this.yScale(yBinSize))
            .attr("fill", d => this.colorScale(d.value));

        this.rects
            .transition()
            .duration(800)
            .attr("x", d => this.xScale(d.x))
            .attr("y", d => this.yScale(d.y + yBinSize))
            .attr("width", this.xScale(xBinSize) - this.xScale(0))
            .attr("height", this.yScale(0) - this.yScale(yBinSize))
            .attr("fill", d => this.colorScale(d.value));

        this.svg.select("defs").remove();
        let defs = this.svg.append("defs");


        // ============Legend setting (help from GPT)=================
        let gradientId = this.svg.attr("id") + "-gradient";
        let gradient = defs.append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%").attr("y1", "100%")
            .attr("x2", "0%").attr("y2", "0%");

        let nStops = 10;
        let domain = this.colorScale.domain();
        let step = (domain[1] - domain[0]) / (nStops - 1);
        for (let i = 0; i < nStops; i++) {
            let val = domain[0] + i * step;
            gradient.append("stop")
                .attr("offset", `${(i / (nStops - 1)) * 100}%`)
                .attr("stop-color", this.colorScale(val));
        }
        // ==========================================================
        let legendHeight = 200;
        let legendWidth = 20;
        let legendX = this.margin.left + this.width + 40;
        let legendY = this.margin.top;

        this.legend
            .style("display", "inline")
            .attr("transform", `translate(${legendX}, ${legendY})`);

        this.legend.selectAll("rect").data([0]).join("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", `url(#${gradientId})`); //<= help from GPT (Color setting)

        let legendScale = d3.scaleLinear()
            .domain(this.colorScale.domain())
            .range([legendHeight, 0]);

        this.legend.selectAll("g.axis").data([0]).join("g")
            .attr("class", "axis")
            .attr("transform", `translate(${legendWidth}, 0)`)
            .call(d3.axisRight(legendScale).ticks(6).tickFormat(d3.format("d")));

        this.legend.selectAll("text.title").data([0]).join("text")
            .attr("class", "title")
            .attr("x", 0)
            .attr("y", -10)
            .text(valueVar)
            .style("font-weight", "bold")
            .style("font-size", "15px");
        
    }

    on(eventType, handler) {
        this.handlers[eventType] = handler;
    }
}
