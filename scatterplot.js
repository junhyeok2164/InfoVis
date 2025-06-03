class Scatterplot {
    margin = {
        top: 40, right: 160, bottom: 100, left: 100
    }

    constructor(svg, tooltip, data, width = 1000, height = 400) {
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
            .attr("y", this.margin.top + this.height + 40)
            .style("font-size", "15px");
    
        this.yLabel = this.svg.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .attr("transform", `translate(${this.margin.left - 75}, ${this.margin.top + this.height / 2}) rotate(-90)`)
            .style("font-size", "15px");
    
        this.xScale = d3.scaleLinear();
        this.yScale = d3.scaleLinear();
        this.zScale = d3.scaleOrdinal().range(d3.schemeCategory10);
    
        this.svg
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom);
    
        this.container.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
    
        this.brush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on("end", (event) => {
                this.brushCircles(event);
            });
    
        this.container.append("g")
            .attr("class", "brush")
            .call(this.brush);
    }
    

    update(xVar, yVar, colorVar, useColor) {

        this.xVar = xVar;
        this.yVar = yVar;

        this.xLabel.text(xVar);
        this.yLabel.text(yVar);

        let xExtent = d3.extent(this.data, d => d[xVar]);
        let yExtent = d3.extent(this.data, d => d[yVar]);

        let xPadding = (xExtent[1] - xExtent[0]) * 0.1;
        let yPadding = (yExtent[1] - yExtent[0]) * 0.1;

        this.xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding]).range([0, this.width]);
        this.yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]).range([this.height, 0]);

        this.xAxis.transition().call(d3.axisBottom(this.xScale));
        this.yAxis.transition().call(d3.axisLeft(this.yScale));

        this.circles = this.container.selectAll("circle")
            .data(data)
            .join("circle")
            .on("mouseover", (e, d) => {
                this.tooltip
                    .style("display", "block")  
                    .select(".tooltip-inner")
                    .html(`
                        <strong>${d["CPU Model"]}<strong><br />
                        Manufacturer : ${d["Manufacturer"]}<br />
                        Core : ${d["Core"]}<br />
                        Power : ${d["Power"]}W<br />
                        Clock : ${d["Clock Frequency"]}GHz<br />
                        Score : ${d["Score (CPU Mark)"]}<br />
                        Price : ${d["Price"]}$<br />
                    `);

                Popper.createPopper(e.target, this.tooltip.node(), {
                    placement: 'top',
                    modifiers: [
                        {
                            name: 'arrow',
                            options: {
                                element: this.tooltip.select(".tooltip-arrow").node(),
                            },
                        },
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 10],
                            },
                        },
                    ],
                });

                this.tooltip.style("display", "block");
            })
            .on("mouseout", () => {
                this.tooltip.style("display", "none");
            });

        this.circles
            .transition()
            .attr("cx", d => this.xScale(d[xVar]))
            .attr("cy", d => this.yScale(d[yVar]))
            .attr("fill", useColor ? d => this.zScale(d[colorVar]) : "black")
            .attr("r", 6)

        this.xAxis
            .attr("transform", `translate(${this.margin.left}, ${this.margin.top + this.height})`)
            .transition()
            .call(d3.axisBottom(this.xScale))
            .selection()
            .selectAll("text")
            .style("font-weight", "bold")
            .style("font-size", "15px");

        this.yAxis
            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)
            .transition()
            .call(d3.axisLeft(this.yScale))
            .selection()
            .selectAll("text")
            .style("font-weight", "bold")
            .style("font-size", "15px");

        if (useColor) {
            this.legend
                .style("display", "inline")
                .style("font-size", ".8em")
                .attr("transform", `translate(${this.width + this.margin.left + 30}, ${this.height / 2})`)
                .call(d3.legendColor().scale(this.zScale))
        }
        else {
            this.legend.style("display", "none");
        }

    }

    isBrushed(d, selection) {
        let [[x0, y0], [x1, y1]] = selection;
        let x = this.xScale(d[this.xVar]);
        let y = this.yScale(d[this.yVar]);

        return x0 <= x && x <= x1 && y0 <= y && y <= y1;
    }

    brushCircles(event) {
        let selection = event.selection;
        if (!selection) return;
    
        let [[x0, y0], [x1, y1]] = selection;

        let xMin = this.xScale.invert(x0);
        let xMax = this.xScale.invert(x1);
        let yMin = this.yScale.invert(y1);
        let yMax = this.yScale.invert(y0);

        this.xScale.domain([xMin, xMax]);
        this.yScale.domain([yMin, yMax]);
    
        this.xAxis
            .transition()
            .call(d3.axisBottom(this.xScale))
            .selection()
            .selectAll("text")
            .style("font-weight", "bold")
            .style("font-size", "15px");

        this.yAxis
            .transition()
            .call(d3.axisLeft(this.yScale))
            .selection()
            .selectAll("text")
            .style("font-weight", "bold")
            .style("font-size", "15px");
    
        this.circles
            .transition()
            .attr("cx", d => this.xScale(d[this.xVar]))
            .attr("cy", d => this.yScale(d[this.yVar]))
            .attr("opacity", d => {

                return (d[this.xVar] >= xMin && d[this.xVar] <= xMax &&
                        d[this.yVar] >= yMin && d[this.yVar] <= yMax) ? 1 : 0;
            });
            
        this.container.select("g.brush")
            .call(this.brush)
            .call(this.brush.move, null);

        if (this.handlers.brush) {
            this.handlers.brush(this.data.filter(d =>
                d[this.xVar] >= xMin && d[this.xVar] <= xMax &&
                d[this.yVar] >= yMin && d[this.yVar] <= yMax
            ));
        }
    }

    resetZoom() {
        let xExtent = d3.extent(this.data, d => d[this.xVar]);
        let yExtent = d3.extent(this.data, d => d[this.yVar]);

        let xPadding = (xExtent[1] - xExtent[0]) * 0.1;
        let yPadding = (yExtent[1] - yExtent[0]) * 0.1;

        this.xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding]);
        this.yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);

        this.xAxis
            .transition()
            .call(d3.axisBottom(this.xScale))
            .selection()
            .selectAll("text")
            .style("font-weight", "bold")
            .style("font-size", "15px");
            
        this.yAxis
            .transition()
            .call(d3.axisLeft(this.yScale))
            .selection()
            .selectAll("text")
            .style("font-weight", "bold")
            .style("font-size", "15px");

        this.circles
            .transition()
            .attr("cx", d => this.xScale(d[this.xVar]))
            .attr("cy", d => this.yScale(d[this.yVar]))
            .attr("opacity", 1);
    
        if (this.handlers.brush)
            this.handlers.brush(this.data);
    }
    

    on(eventType, handler) {
        this.handlers[eventType] = handler;
    }
}